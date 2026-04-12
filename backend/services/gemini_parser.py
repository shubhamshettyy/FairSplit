from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

from fastapi import HTTPException, UploadFile, status
from google import genai
from google.genai import types

from models.schema import ReceiptItem

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are a receipt parser. Extract every line from the receipt image(s) into structured JSON.

Rules:
- Include ALL rows: grocery items, alcohol, produce, household goods, etc.
- Include taxes, delivery fees, service fees, tips, and bag fees as separate entries
- Include discounts and coupons as separate entries with negative total values
- Do NOT merge rows or combine items
- Extract quantity and unit price where visible; if not shown, set quantity=1 and unit_price=total
- For multi-image receipts, treat all images as one continuous receipt
- Respond ONLY with a JSON array. No preamble, no explanation, no markdown fences.

JSON schema for each item:
{
  "name": string,
  "quantity": number,
  "unit_price": number,
  "total": number,
  "category": "item" | "tax" | "fee" | "tip" | "discount"
}
""".strip()

STRICTER_FOLLOWUP_PROMPT = """
Return valid JSON only.
No markdown.
No backticks.
No explanation text.
Return a JSON array of receipt rows following the requested schema.
""".strip()


def _normalize_items(parsed: Any) -> list[ReceiptItem]:
    if not isinstance(parsed, list):
        raise ValueError("Gemini output was not a JSON array")

    normalized: list[ReceiptItem] = []
    for row in parsed:
        normalized.append(
            ReceiptItem(
                name=str(row["name"]).strip(),
                quantity=float(row.get("quantity", 1)),
                unit_price=float(row.get("unit_price", row["total"])),
                total=float(row["total"]),
                category=row["category"],
                assignees=[],
            )
        )
    return normalized


def _strip_markdown_fences(text: str) -> str:
    trimmed = text.strip()
    fenced = re.match(r"^```(?:json)?\s*(.*?)\s*```$", trimmed, flags=re.DOTALL)
    if fenced:
        return fenced.group(1).strip()
    return trimmed


def _extract_text(response: Any) -> str:
    text = getattr(response, "text", None)
    if text and str(text).strip():
        return _strip_markdown_fences(str(text))

    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        collected = [getattr(part, "text", "") for part in parts if getattr(part, "text", "")]
        if collected:
            return _strip_markdown_fences("\n".join(collected))

    raise ValueError("Gemini response text was empty")


async def _read_images(images: list[UploadFile]) -> list[tuple[str, str, bytes]]:
    payloads: list[tuple[str, str, bytes]] = []
    for image in images:
        raw = await image.read()
        await image.seek(0)
        media_type = image.content_type or "image/jpeg"
        payloads.append((image.filename or "receipt.jpg", media_type, raw))
        logger.info(
            "gemini-parser image prepared filename=%s content_type=%s size_bytes=%s",
            image.filename,
            media_type,
            len(raw),
        )
    return payloads


def _build_user_parts(
    image_payloads: list[tuple[str, str, bytes]],
    extra_text: str | None = None,
) -> list[types.Part]:
    parts: list[types.Part] = []
    for _filename, media_type, raw in image_payloads:
        parts.append(types.Part.from_bytes(data=raw, mime_type=media_type))

    parts.append(
        types.Part.from_text(
            text=(
                "These are screenshots of one Instacart receipt, possibly split across "
                "multiple images. Extract every line item from all images combined."
            )
        )
    )
    if extra_text:
        parts.append(types.Part.from_text(text=extra_text))
    return parts


async def extract_items(images: list[UploadFile]) -> list[ReceiptItem]:
    api_key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip().strip("\"'")
    if not api_key:
        logger.error("gemini-parser missing GEMINI_API_KEY/GOOGLE_API_KEY")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY (or GOOGLE_API_KEY) is not configured on the server",
        )

    model = os.getenv("GEMINI_MODEL", "gemini-1.5-pro").strip()
    logger.info("gemini-parser extraction started image_count=%s model=%s", len(images), model)

    image_payloads = await _read_images(images)
    user_parts = _build_user_parts(image_payloads)
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        temperature=0,
        max_output_tokens=4096,
    )

    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model=model,
            contents=[types.Content(role="user", parts=user_parts)],
            config=config,
        )
        logger.info("gemini-parser primary request completed")
        raw_text = _extract_text(response)
        logger.info("gemini-parser primary response text_length=%s", len(raw_text))
        parsed = json.loads(raw_text)
        logger.info("gemini-parser primary JSON parse succeeded")
    except json.JSONDecodeError:
        logger.warning("gemini-parser primary JSON parse failed, retrying with stricter prompt")
        retry_parts = _build_user_parts(image_payloads, STRICTER_FOLLOWUP_PROMPT)
        try:
            response = client.models.generate_content(
                model=model,
                contents=[types.Content(role="user", parts=retry_parts)],
                config=config,
            )
            logger.info("gemini-parser retry request completed")
            raw_text = _extract_text(response)
            logger.info("gemini-parser retry response text_length=%s", len(raw_text))
            parsed = json.loads(raw_text)
            logger.info("gemini-parser retry JSON parse succeeded")
        except Exception as retry_error:  # noqa: BLE001
            logger.exception("gemini-parser retry failed")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Could not parse model output as JSON: {retry_error}",
            ) from retry_error
    except Exception as exc:  # noqa: BLE001
        lower = str(exc).lower()
        if "api key" in lower and ("invalid" in lower or "expired" in lower or "unauthorized" in lower):
            logger.exception("gemini-parser authentication failed: invalid API key")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid GEMINI_API_KEY. Update backend/.env and restart server.",
            ) from exc
        if (
            "503" in lower
            or "unavailable" in lower
            or "high demand" in lower
            or "temporarily overloaded" in lower
        ):
            logger.exception("gemini-parser provider temporarily unavailable")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini is temporarily overloaded. Please try again in a minute.",
            ) from exc
        logger.exception("gemini-parser provider call failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Receipt parsing failed due to an AI provider error. Please try again.",
        ) from exc

    try:
        normalized = _normalize_items(parsed)
        logger.info("gemini-parser normalized items count=%s", len(normalized))
        return normalized
    except Exception as exc:  # noqa: BLE001
        logger.exception("gemini-parser normalized payload invalid")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid parsed payload: {exc}",
        ) from exc
