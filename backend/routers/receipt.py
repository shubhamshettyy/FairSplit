from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from auth import UserId
from models.schema import ParseReceiptResponse, SplitSession
from services.receipt_parser import extract_items
from storage import session_store

router = APIRouter(prefix="/api", tags=["receipt"])
logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_MB = int(os.getenv("MAX_IMAGE_SIZE_MB", "10"))
MAX_IMAGES_PER_REQUEST = int(os.getenv("MAX_IMAGES_PER_REQUEST", "3"))


async def _assert_valid_images(images: list[UploadFile]) -> None:
    logger.info("parse-receipt validation started: image_count=%s", len(images))
    if len(images) > MAX_IMAGES_PER_REQUEST:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Max {MAX_IMAGES_PER_REQUEST} images allowed",
        )

    max_bytes = MAX_IMAGE_SIZE_MB * 1024 * 1024
    for image in images:
        if image.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported image type: {image.content_type}",
            )

        raw = await image.read()
        size = len(raw)
        await image.seek(0)
        if size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"{image.filename} exceeds {MAX_IMAGE_SIZE_MB}MB",
            )


@router.post("/parse-receipt", response_model=ParseReceiptResponse)
async def parse_receipt(
    user_id: UserId,
    images: list[UploadFile] = File(...),
    created_at: str | None = Form(None),
) -> ParseReceiptResponse:
    logger.info("parse-receipt request started user_id=%s", user_id)
    await _assert_valid_images(images)
    items = await extract_items(images)
    logger.info("parse-receipt extraction succeeded: item_count=%s", len(items))
    item_names = [i.name for i in items if i.category == "item" and i.name]
    auto_name = ", ".join(item_names[:3])
    if len(item_names) > 3:
        auto_name += f" +{len(item_names) - 3} more"

    ts = datetime.now(timezone.utc)
    if created_at:
        try:
            ts = datetime.fromisoformat(created_at).replace(tzinfo=timezone.utc)
        except ValueError:
            try:
                ts = datetime.strptime(created_at, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                logger.warning("parse-receipt invalid created_at=%s, using now", created_at)

        if ts.date() > datetime.now(timezone.utc).date():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create a split for a future date",
            )

    session = SplitSession(items=items, name=auto_name or "Untitled receipt", created_at=ts)
    session_store.save(session, user_id)
    logger.info("parse-receipt session saved: session_id=%s user_id=%s", session.session_id, user_id)
    return ParseReceiptResponse(session_id=session.session_id, items=items)
