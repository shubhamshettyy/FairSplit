from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from auth import UserId
from models.schema import ShareTokenResponse, SplitSession, SummaryResponse, UpdateSessionRequest
from services.split_calculator import compute_summary
from storage import session_store

router = APIRouter(prefix="/api", tags=["sessions"])


def _get_session_or_404(session_id: str, user_id: str) -> SplitSession:
    session = session_store.get(session_id, user_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    return session


def _compute_summary_response(session: SplitSession) -> SummaryResponse:
    people_summary = compute_summary(session)
    grand_total = round(sum(i.total for i in session.items), 2)
    unassigned_total = round(
        sum(
            i.total
            for i in session.items
            if i.category in ("item", "discount") and len(i.assignees) == 0
        ),
        2,
    )
    return SummaryResponse(
        people=people_summary,
        grand_total=grand_total,
        unassigned_total=unassigned_total,
    )


# ── Authenticated endpoints ──────────────────────────────────────


@router.get("/sessions", response_model=list[SplitSession])
def list_sessions(user_id: UserId) -> list[SplitSession]:
    return session_store.list_sessions(user_id)


@router.get("/sessions/{session_id}", response_model=SplitSession)
def get_session(session_id: str, user_id: UserId) -> SplitSession:
    return _get_session_or_404(session_id, user_id)


@router.put("/sessions/{session_id}", response_model=SplitSession)
def update_session(session_id: str, body: UpdateSessionRequest, user_id: UserId) -> SplitSession:
    existing = _get_session_or_404(session_id, user_id)
    updated = SplitSession(
        session_id=existing.session_id,
        created_at=existing.created_at,
        name=body.name or existing.name,
        items=body.items,
        people=body.people,
        charge_split_mode=body.charge_split_mode,
    )
    session_store.update(session_id, updated, user_id)
    return updated


@router.get("/sessions/{session_id}/summary", response_model=SummaryResponse)
def get_summary(session_id: str, user_id: UserId) -> SummaryResponse:
    session = _get_session_or_404(session_id, user_id)
    return _compute_summary_response(session)


@router.post("/sessions/{session_id}/share", response_model=ShareTokenResponse)
def create_share_token(session_id: str, user_id: UserId) -> ShareTokenResponse:
    session = _get_session_or_404(session_id, user_id)
    token = session_store.create_share_snapshot(session)
    return ShareTokenResponse(share_token=token)


# ── Public endpoints (no auth) ───────────────────────────────────


@router.get("/share/{share_token}", response_model=SplitSession)
def get_share_snapshot(share_token: str) -> SplitSession:
    payload = session_store.get_share_snapshot(share_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share snapshot not found or expired",
        )
    return SplitSession.model_validate(payload)


@router.get("/share/{share_token}/summary", response_model=SummaryResponse)
def get_share_summary(share_token: str) -> SummaryResponse:
    payload = session_store.get_share_snapshot(share_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share snapshot not found or expired",
        )
    session = SplitSession.model_validate(payload)
    return _compute_summary_response(session)
