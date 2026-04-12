from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


ItemCategory = Literal["item", "tax", "fee", "tip", "discount"]
ChargeSplitMode = Literal["equal", "prorated"]


class ReceiptItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    quantity: float = 1
    unit_price: float
    total: float
    category: ItemCategory = "item"
    assignees: list[str] = Field(default_factory=list)


class Person(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str


class SplitSession(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    name: str = ""
    items: list[ReceiptItem] = Field(default_factory=list)
    people: list[Person] = Field(default_factory=list)
    charge_split_mode: ChargeSplitMode = "equal"


class PersonSummary(BaseModel):
    person_id: str
    name: str
    color: str
    subtotal: float
    tax_and_fees_share: float
    total_owed: float
    items: list[ReceiptItem]


class ParseReceiptResponse(BaseModel):
    session_id: str
    items: list[ReceiptItem]


class UpdateSessionRequest(BaseModel):
    name: str = ""
    items: list[ReceiptItem]
    people: list[Person]
    charge_split_mode: ChargeSplitMode = "equal"


class SummaryResponse(BaseModel):
    people: list[PersonSummary]
    grand_total: float
    unassigned_total: float


class ShareTokenResponse(BaseModel):
    share_token: str
