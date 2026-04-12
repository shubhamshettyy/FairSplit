from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import redis

from models.schema import SplitSession

_sessions: dict[str, SplitSession] = {}
_session_owners: dict[str, str] = {}
_share_snapshots: dict[str, dict[str, Any]] = {}
_supabase_client_cache: Any | None = None
logger = logging.getLogger(__name__)

SESSIONS_TABLE = os.getenv("SUPABASE_SESSIONS_TABLE", "split_sessions")


def _redis_client() -> redis.Redis | None:
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        return None
    return redis.from_url(redis_url, decode_responses=True)


def _share_ttl_seconds() -> int:
    ttl_days = int(os.getenv("SESSION_TTL_DAYS", "7"))
    return int(timedelta(days=ttl_days).total_seconds())


def _supabase_client() -> Any | None:
    global _supabase_client_cache
    if _supabase_client_cache:
        return _supabase_client_cache

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None

    try:
        from supabase import create_client
    except ImportError:
        logger.warning("supabase package not installed; using in-memory session store")
        return None

    _supabase_client_cache = create_client(url, key)
    return _supabase_client_cache


def _supabase_upsert_session(session: SplitSession, user_id: str) -> None:
    client = _supabase_client()
    if not client:
        return

    now_iso = datetime.now(timezone.utc).isoformat()
    payload = session.model_dump(mode="json")
    record = {
        "session_id": session.session_id,
        "user_id": user_id,
        "created_at": payload.get("created_at"),
        "updated_at": now_iso,
        "payload": payload,
    }
    client.table(SESSIONS_TABLE).upsert(record).execute()


def _supabase_get_session(session_id: str, user_id: str | None = None) -> SplitSession | None:
    client = _supabase_client()
    if not client:
        return None

    query = client.table(SESSIONS_TABLE).select("payload, user_id").eq("session_id", session_id).limit(1)
    response = query.execute()
    rows = response.data or []
    if not rows:
        return None
    row = rows[0]
    if user_id and row.get("user_id") and row["user_id"] != user_id:
        return None
    payload = row.get("payload")
    if not payload:
        return None
    return SplitSession.model_validate(payload)


def _supabase_list_sessions(user_id: str) -> list[SplitSession]:
    client = _supabase_client()
    if not client:
        return []

    response = (
        client.table(SESSIONS_TABLE)
        .select("payload")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    rows = response.data or []
    sessions: list[SplitSession] = []
    for row in rows:
        payload = row.get("payload")
        if not payload:
            continue
        sessions.append(SplitSession.model_validate(payload))
    return sessions


def save(session: SplitSession, user_id: str = "") -> None:
    _sessions[session.session_id] = session
    if user_id:
        _session_owners[session.session_id] = user_id
    try:
        _supabase_upsert_session(session, user_id)
    except Exception:  # noqa: BLE001
        logger.exception("session-store supabase save failed, using in-memory fallback")


def get(session_id: str, user_id: str | None = None) -> SplitSession | None:
    try:
        supabase_session = _supabase_get_session(session_id, user_id)
        if supabase_session:
            _sessions[supabase_session.session_id] = supabase_session
            return supabase_session
    except Exception:  # noqa: BLE001
        logger.exception("session-store supabase get failed, using in-memory fallback")

    session = _sessions.get(session_id)
    if session and user_id:
        owner = _session_owners.get(session_id, "")
        if owner and owner != user_id:
            return None
    return session


def update(session_id: str, session: SplitSession, user_id: str = "") -> None:
    _sessions[session_id] = session
    uid = user_id or _session_owners.get(session_id, "")
    try:
        _supabase_upsert_session(session, uid)
    except Exception:  # noqa: BLE001
        logger.exception("session-store supabase update failed, using in-memory fallback")


def list_sessions(user_id: str = "") -> list[SplitSession]:
    if user_id:
        try:
            supabase_sessions = _supabase_list_sessions(user_id)
            if supabase_sessions:
                for session in supabase_sessions:
                    _sessions[session.session_id] = session
                return supabase_sessions
        except Exception:  # noqa: BLE001
            logger.exception("session-store supabase list failed, using in-memory fallback")
        return sorted(
            [s for sid, s in _sessions.items() if _session_owners.get(sid) == user_id],
            key=lambda s: s.created_at, reverse=True,
        )
    # No user_id = fallback for backwards compat
    try:
        supa = _supabase_client()
        if supa:
            response = supa.table(SESSIONS_TABLE).select("payload").order("created_at", desc=True).limit(100).execute()
            rows = response.data or []
            return [SplitSession.model_validate(r["payload"]) for r in rows if r.get("payload")]
    except Exception:  # noqa: BLE001
        logger.exception("session-store supabase list failed, using in-memory fallback")
    return sorted(_sessions.values(), key=lambda s: s.created_at, reverse=True)


def create_share_snapshot(session: SplitSession) -> str:
    token = str(uuid.uuid4())
    payload = session.model_dump()
    client = _redis_client()
    if client:
        client.setex(f"share:{token}", _share_ttl_seconds(), json.dumps(payload))
    else:
        _share_snapshots[token] = payload
    return token


def get_share_snapshot(token: str) -> dict[str, Any] | None:
    client = _redis_client()
    if client:
        raw = client.get(f"share:{token}")
        if not raw:
            return None
        return json.loads(raw)
    return _share_snapshots.get(token)
