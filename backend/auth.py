"""Supabase JWT auth dependency for FastAPI."""
from __future__ import annotations

import logging
import os
import json
from typing import Annotated

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)
_jwks_cache: dict | None = None


def _get_jwks() -> dict:
    """Fetch and cache Supabase JWKS (public keys for JWT verification)."""
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache

    supabase_url = os.getenv("SUPABASE_URL", "")
    if not supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_URL not configured",
        )

    jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(jwks_url, timeout=10)
    resp.raise_for_status()
    _jwks_cache = resp.json()
    return _jwks_cache


def _get_jwt_secret() -> str:
    """Return the JWT secret for HS256 verification (Supabase default)."""
    secret = os.getenv("SUPABASE_JWT_SECRET", "")
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWT_SECRET not configured",
        )
    return secret


def _verify_with_supabase_auth(token: str) -> dict:
    """Validate token with Supabase Auth API and return minimal JWT-like payload."""
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    if not supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_URL not configured",
        )

    api_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_SERVICE_ROLE_KEY not configured",
        )

    try:
        resp = httpx.get(
            f"{supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": api_key,
            },
            timeout=10,
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        user = resp.json()
        user_id = user.get("id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user id",
            )
        return {"sub": user_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Supabase auth verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


def _decode_token(token: str) -> dict:
    """Decode a Supabase access token and return the payload."""
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "")
        if not alg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing alg header",
            )

        # HS256 projects can be verified with local JWT secret.
        if alg == "HS256":
            secret = os.getenv("SUPABASE_JWT_SECRET", "")
            if secret:
                return jwt.decode(
                    token,
                    secret,
                    algorithms=["HS256"],
                    audience="authenticated",
                )
            # If JWT secret is unavailable, verify token against Supabase Auth API.
            return _verify_with_supabase_auth(token)

        # Newer Supabase projects commonly use asymmetric signing (RS256).
        if alg.startswith("RS"):
            jwks = _get_jwks()
            keys = jwks.get("keys", [])
            kid = header.get("kid")
            key_data = next((k for k in keys if k.get("kid") == kid), None)
            if not key_data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Signing key not found",
                )

            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_data))
            return jwt.decode(
                token,
                public_key,
                algorithms=[alg],
                audience="authenticated",
            )

        # Any other asymmetric algorithm (e.g. ES256) is validated via Supabase.
        return _verify_with_supabase_auth(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except HTTPException:
        raise
    except jwt.InvalidTokenError as exc:
        logger.warning("JWT decode failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


async def get_current_user_id(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    """Extract and verify the Supabase JWT, return the user id (sub claim)."""
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    payload = _decode_token(creds.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing sub claim",
        )
    return user_id


# Type alias for use in route signatures
UserId = Annotated[str, Depends(get_current_user_id)]
