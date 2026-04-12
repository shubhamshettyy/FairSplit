from __future__ import annotations

import logging
import os

from fastapi import HTTPException, UploadFile, status

from services.claude_parser import extract_items as extract_items_claude
from services.gemini_parser import extract_items as extract_items_gemini

logger = logging.getLogger(__name__)


async def extract_items(images: list[UploadFile]):
    provider = (os.getenv("AI_PROVIDER") or "gemini").strip().lower()
    logger.info("receipt-parser provider selected provider=%s", provider)

    if provider == "gemini":
        return await extract_items_gemini(images)
    if provider == "claude":
        return await extract_items_claude(images)

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Unsupported AI_PROVIDER '{provider}'. Use 'gemini' or 'claude'.",
    )
