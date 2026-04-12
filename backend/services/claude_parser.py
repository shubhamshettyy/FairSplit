from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any

import anthropic
from fastapi import HTTPException, UploadFile, status

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


def _extract_text_block(response: Any) -> str:
    if not getattr(response, "content", None):
        raise ValueError("Claude returned an empty response")
    first_block = response.content[0]
    text = getattr(first_block, "text", "").strip()
    if not text:
        raise ValueError("Claude response text was empty")
    return text


async def _build_content(images: list[UploadFile]) -> list[dict[str, Any]]:
    content: list[dict[str, Any]] = []
    for image_file in images:
        raw = await image_file.read()
        b64 = base64.standard_b64encode(raw).decode("utf-8")
        media_type = image_file.content_type or "image/jpeg"
        logger.info(
            "claude-parser image prepared filename=%s content_type=%s size_bytes=%s",
            image_file.filename,
            media_type,
            len(raw),
        )
        content.append(
            {
                "type": "image",
                "source": {"type": "base64", "media_type": media_type, "data": b64},
            }
        )

    content.append(
        {
            "type": "text",
            "text": (
                "These are screenshots of one Instacart receipt, possibly split across "
                "multiple images. Extract every line item from all images combined."
            ),
        }
    )
    return content


def _normalize_items(parsed: Any) -> list[ReceiptItem]:
    if not isinstance(parsed, list):
        raise ValueError("Claude output was not a JSON array")

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


async def extract_items(images: list[UploadFile]) -> list[ReceiptItem]:
    api_key = (os.getenv("ANTHROPIC_API_KEY") or "").strip().strip("\"'")
    if not api_key:
        logger.error("claude-parser missing ANTHROPIC_API_KEY")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ANTHROPIC_API_KEY is not configured on the server",
        )

    logger.info(
        "claude-parser extraction started image_count=%s model=%s",
        len(images),
        "claude-opus-4-5",
    )
    client = anthropic.Anthropic(api_key=api_key)
    content = await _build_content(images)

    try:
        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content}],
        )
        logger.info("claude-parser primary request completed")
        raw_text = _extract_text_block(response)
        logger.info("claude-parser primary response text_length=%s", len(raw_text))
        parsed = json.loads(raw_text)
        logger.info("claude-parser primary JSON parse succeeded")
    except json.JSONDecodeError:
        logger.warning("claude-parser primary JSON parse failed, retrying with stricter prompt")
        try:
            response = client.messages.create(
                model="claude-opus-4-5",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": content},
                    {"role": "user", "content": STRICTER_FOLLOWUP_PROMPT},
                ],
            )
            logger.info("claude-parser retry request completed")
            raw_text = _extract_text_block(response)
            logger.info("claude-parser retry response text_length=%s", len(raw_text))
            parsed = json.loads(raw_text)
            logger.info("claude-parser retry JSON parse succeeded")
        except Exception as retry_error:  # noqa: BLE001
            logger.exception("claude-parser retry failed")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Could not parse model output as JSON: {retry_error}",
            ) from retry_error
    except anthropic.AuthenticationError as exc:
        logger.exception("claude-parser authentication failed: invalid API key")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ANTHROPIC_API_KEY. Update backend/.env and restart server.",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("claude-parser provider call failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Receipt parsing failed, try again ({exc})",
        ) from exc

    try:
        normalized = _normalize_items(parsed)
        logger.info("claude-parser normalized items count=%s", len(normalized))
        return normalized
    except Exception as exc:  # noqa: BLE001
        logger.exception("claude-parser normalized payload invalid")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid parsed payload: {exc}",
        ) from exc
