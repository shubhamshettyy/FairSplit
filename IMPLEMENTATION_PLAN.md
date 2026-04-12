# FairSplit — Implementation Plan

## What we're building

A two-part web app: a FastAPI backend that uses Claude Vision to extract structured line items from Instacart receipt screenshots, and a Next.js frontend that lets you assign those items to people and compute each person's share. The whole thing is session-based — no user accounts, no permanent storage beyond a short-lived share link.

---

## Tech stack

### Frontend
- **Next.js 14** with App Router
- **React 18**
- **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** — screen transitions and item row animations
- **react-dropzone** — multi-image drag-and-drop upload
- **html2canvas** — screenshot the summary card for export
- **axios** — HTTP client

### Backend
- **Python 3.11+**
- **FastAPI**
- **Pydantic v2** — request/response validation and data models
- **Anthropic SDK** (`anthropic`) — Claude Vision for receipt parsing
- **uvicorn** — ASGI server
- **redis-py** — optional, for share link storage
- **python-multipart** — multipart file upload support

### Infrastructure (local dev)
- **Docker Compose** — runs FastAPI + Redis together
- No database required unless share links are enabled

---

## Project structure

```
fairsplit/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── routers/
│   │   ├── receipt.py           # POST /api/parse-receipt
│   │   └── sessions.py          # CRUD for split sessions
│   ├── services/
│   │   ├── claude_parser.py     # Claude Vision extraction logic
│   │   └── split_calculator.py  # Totals and proration math
│   ├── models/
│   │   └── schema.py            # All Pydantic models
│   ├── storage/
│   │   └── session_store.py     # In-memory dict + optional Redis
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Redirects to /split/new
│   │   └── split/
│   │       ├── new/
│   │       │   └── page.tsx     # Upload screen
│   │       └── [id]/
│   │           ├── page.tsx     # Main split flow (steps 2-4)
│   │           └── share/
│   │               └── page.tsx # Read-only share view
│   ├── components/
│   │   ├── upload/
│   │   │   ├── DropZone.tsx
│   │   │   └── ImagePreviewGrid.tsx
│   │   ├── review/
│   │   │   └── ItemReviewTable.tsx
│   │   ├── people/
│   │   │   └── PeopleInput.tsx
│   │   ├── assign/
│   │   │   ├── AssignmentTable.tsx    # Core UI — see spec below
│   │   │   ├── PersonColumnHeader.tsx
│   │   │   └── StickyTotalsBar.tsx
│   │   └── summary/
│   │       ├── PersonCard.tsx
│   │       └── ExportPanel.tsx
│   ├── lib/
│   │   ├── api.ts               # Typed API client
│   │   ├── types.ts             # Shared TypeScript types
│   │   └── utils.ts             # Currency formatting, color assignment
│   ├── hooks/
│   │   └── useSplitSession.ts   # Session state management
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

---

## Data models

### Backend (Pydantic, `models/schema.py`)

```python
from pydantic import BaseModel, Field
from typing import Literal
import uuid

class ReceiptItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    quantity: float
    unit_price: float
    total: float
    category: Literal["item", "tax", "fee", "tip", "discount"]
    assignees: list[str] = []   # list of Person.id — empty = unassigned

class Person(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str   # hex, auto-assigned from palette

class SplitSession(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    items: list[ReceiptItem] = []
    people: list[Person] = []

class PersonSummary(BaseModel):
    person_id: str
    name: str
    color: str
    subtotal: float
    tax_and_fees_share: float   # prorated from all non-item rows
    total_owed: float
    items: list[ReceiptItem]

class ParseReceiptResponse(BaseModel):
    session_id: str
    items: list[ReceiptItem]

class UpdateSessionRequest(BaseModel):
    items: list[ReceiptItem]
    people: list[Person]

class SummaryResponse(BaseModel):
    people: list[PersonSummary]
    grand_total: float
    unassigned_total: float
```

### Frontend (TypeScript, `lib/types.ts`)

```typescript
export type ItemCategory = "item" | "tax" | "fee" | "tip" | "discount";

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
  category: ItemCategory;
  assignees: string[];
}

export interface Person {
  id: string;
  name: string;
  color: string;
}

export interface SplitSession {
  session_id: string;
  items: ReceiptItem[];
  people: Person[];
}

export interface PersonSummary {
  person_id: string;
  name: string;
  color: string;
  subtotal: number;
  tax_and_fees_share: number;
  total_owed: number;
  items: ReceiptItem[];
}

export interface SummaryResponse {
  people: PersonSummary[];
  grand_total: number;
  unassigned_total: number;
}
```

---

## API endpoints

### `POST /api/parse-receipt`

Accepts one or more receipt screenshots (multipart), sends them all to Claude Vision in a single API call, returns extracted line items.

**Request:** `multipart/form-data`
- `images`: list of image files (JPEG or PNG, max 3 files, 10MB each)

**Response:** `ParseReceiptResponse`

```python
# routers/receipt.py
@router.post("/parse-receipt", response_model=ParseReceiptResponse)
async def parse_receipt(images: list[UploadFile] = File(...)):
    items = await claude_parser.extract_items(images)
    session = SplitSession(items=items)
    session_store.save(session)
    return ParseReceiptResponse(session_id=session.session_id, items=items)
```

### `GET /api/sessions/{session_id}`

Returns the full session (items + people).

### `PUT /api/sessions/{session_id}`

Saves the current state of items (including assignees) and people list.

**Request:** `UpdateSessionRequest`

### `GET /api/sessions/{session_id}/summary`

Computes and returns per-person totals. No request body.

**Response:** `SummaryResponse`

### `POST /api/sessions/{session_id}/share`

Generates a short-lived share token (UUID), stores the current session snapshot in Redis with a 7-day TTL. Returns `{ share_token: string }`.

### `GET /api/share/{share_token}`

Returns a read-only snapshot of the session for the share view. Served by Next.js as a separate page — the frontend fetches this from the backend.

---

## Claude Vision extraction

### Service: `services/claude_parser.py`

```python
import anthropic
import base64
from models.schema import ReceiptItem

client = anthropic.Anthropic()

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
"""

async def extract_items(images: list) -> list[ReceiptItem]:
    content = []

    for image_file in images:
        raw = await image_file.read()
        b64 = base64.standard_b64encode(raw).decode("utf-8")
        media_type = image_file.content_type or "image/jpeg"
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": b64}
        })

    content.append({
        "type": "text",
        "text": (
            "These are screenshots of one Instacart receipt, possibly split across "
            "multiple images. Extract every line item from all images combined."
        )
    })

    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": content}]
    )

    import json
    raw_json = response.content[0].text.strip()
    parsed = json.loads(raw_json)

    import uuid
    items = []
    for row in parsed:
        items.append(ReceiptItem(
            id=str(uuid.uuid4()),
            name=row["name"],
            quantity=row["quantity"],
            unit_price=row["unit_price"],
            total=row["total"],
            category=row["category"],
            assignees=[]
        ))

    return items
```

---

## Split calculation logic

### Service: `services/split_calculator.py`

The key design decision: taxes and fees are distributed proportionally based on each person's item subtotal relative to the grand item subtotal. This matches how Instacart actually charges tax.

```python
from models.schema import SplitSession, PersonSummary

def compute_summary(session: SplitSession) -> list[PersonSummary]:
    items_only = [i for i in session.items if i.category == "item"]
    charges = [i for i in session.items if i.category in ("tax", "fee", "tip")]
    # discounts are negative totals, already factored into subtotals

    total_charges = sum(i.total for i in charges)
    grand_item_total = sum(i.total for i in items_only)

    summaries = []
    for person in session.people:
        person_items = [
            i for i in items_only
            if person.id in i.assignees
        ]

        # Each item is split equally among its assignees
        person_subtotal = sum(
            i.total / len(i.assignees)
            for i in person_items
        )

        # Prorate taxes/fees based on fraction of item total
        if grand_item_total > 0:
            fraction = person_subtotal / grand_item_total
        else:
            fraction = 1 / len(session.people) if session.people else 0

        tax_share = round(total_charges * fraction, 2)
        total_owed = round(person_subtotal + tax_share, 2)

        summaries.append(PersonSummary(
            person_id=person.id,
            name=person.name,
            color=person.color,
            subtotal=round(person_subtotal, 2),
            tax_and_fees_share=tax_share,
            total_owed=total_owed,
            items=person_items
        ))

    return summaries
```

---

## Session storage

### `storage/session_store.py`

Starts as a simple in-memory dict. Swapping to Redis later requires changing only this file.

```python
import os
from models.schema import SplitSession

_store: dict[str, SplitSession] = {}

def save(session: SplitSession):
    _store[session.session_id] = session

def get(session_id: str) -> SplitSession | None:
    return _store.get(session_id)

def update(session_id: str, session: SplitSession):
    _store[session_id] = session
```

For share links with Redis, add a separate `ShareStore` that serializes to JSON and stores under `share:{token}` with a 7-day TTL.

---

## Frontend — screen flow

The app is a single Next.js route `/split/[id]` that manages a local step state. No full page navigations between steps — Framer Motion handles the transitions.

```
Step 0: Upload      → POST /api/parse-receipt → get session_id, redirect to /split/[id]
Step 1: Review      → edit extracted items inline before proceeding
Step 2: Add people  → build the people list locally
Step 3: Assign      → the assignment table (see below)
Step 4: Summary     → GET /api/sessions/[id]/summary
```

State is kept in `useSplitSession` hook, which also auto-saves to the backend on a debounce whenever items or people change.

---

## Assignment table — detailed UI spec

This is the most important screen. The layout is a table where:
- **Rows** = receipt line items
- **Columns** = one column per person added in step 2
- **Cells** = a single checkbox

### Column structure

```
| Item name         | Qty | Price |  Alex  |  Priya  |  Sam  |
|-------------------|-----|-------|--------|---------|-------|
| Organic milk      |  1  | $4.99 |   ☑    |    ☑    |   ☐   |
| Sourdough bread   |  2  | $6.50 |   ☐    |    ☑    |   ☑   |
| ─── Taxes & fees ───────────────────────────────────────── |
| CA Sales Tax      |  —  | $1.23 | (auto-prorated, not assigned manually)
| Delivery fee      |  —  | $3.99 | (auto-prorated, not assigned manually)
```

### Column header behavior

Each person column header has two buttons:
- **All** — checks every item row in this column
- **None** — unchecks every item row in this column

The header also shows the running subtotal for that person, updated live as checkboxes change.

### Item rows

- Checking a cell adds that person to `item.assignees`
- A row can have zero, one, or multiple assignees checked
- If multiple people are checked on one item, the item cost splits equally between them
- Unassigned rows are highlighted with an amber left border

### Tax and fee rows

Taxes and fees appear in a visually distinct section at the bottom of the table, separated by a divider. They show a "(prorated)" label in the person columns instead of checkboxes — no manual assignment. The person's share is calculated automatically based on their fraction of item subtotal.

### Sticky totals bar

A fixed bar at the bottom of the viewport shows each person's running total, updating in real time. Also shows the total of any unassigned items so you know what still needs to be dealt with.

### Color coding

Each person gets a color assigned from a fixed palette (8 colors). That color is used for:
- Their column header background (light tint)
- Their avatar in the summary view
- The pill/chip next to items they own in the summary

```typescript
const PERSON_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
];
```

---

## Upload screen — multi-image spec

The drop zone accepts multiple images in one drop or multiple sequential uploads. Before sending:
- Preview grid shows thumbnails of all uploaded images
- User can remove individual images
- "Parse receipt" button sends all images together

On the backend, all images go to Claude in a single API call as separate image blocks. The prompt explicitly tells Claude to treat them as sequential parts of one receipt.

File validation:
- Accepted types: `image/jpeg`, `image/png`, `image/webp`
- Max file size per image: 10MB
- Max images: 3

---

## Review screen — inline editing

After parsing, every extracted item is shown in an editable table before the user proceeds. Fields that can be edited:
- Item name (text input)
- Quantity (number input)
- Unit price (number input — auto-recalculates total)
- Category (dropdown: item / tax / fee / tip / discount)
- Delete button to remove a row
- "Add row" button at the bottom for anything Claude missed

This step exists because Claude Vision is good but not perfect, especially with overlapping text or low-contrast screenshots.

---

## Summary screen — export options

Three export paths:

**1. Copy text summary**
A plain-text breakdown formatted for pasting into iMessage or WhatsApp:

```
FairSplit — April 7

Alex owes $18.42
  • Organic milk (×1): $4.99
  • Sourdough bread (×2): $6.50
  • CA Sales Tax (share): $1.23
  • Delivery (share): $3.99
  + 2 more items

Priya owes $22.15
  ...

Pay via Venmo / Zelle
```

**2. Screenshot export (html2canvas)**
Renders the summary cards as a PNG image. Sized for mobile (390px wide). User can long-press to save on iOS or right-click to save on desktop.

**3. Share link**
Calls `POST /api/sessions/{id}/share`, gets back a token, shows a URL like `yourapp.com/share/{token}`. The link renders a read-only version of the summary — no editing. This is the best option for sending to multiple people at once.

---

## Error handling

### Backend
- Claude API failure → 502 with a user-facing message ("Receipt parsing failed, try again")
- JSON parse failure from Claude → retry once with a stricter prompt, then 422
- Invalid image type → 415
- Session not found → 404
- Images too large → 413

### Frontend
- Show inline error state on the upload screen if parsing fails, with a retry button
- Auto-save failures are silent — show a small "Saving..." / "Saved" indicator in the header
- If a share link fails to generate, fall back to the copy-text export

---

## Environment variables

### Backend (`.env`)
```
ANTHROPIC_API_KEY=sk-ant-...
REDIS_URL=redis://localhost:6379    # optional, omit to use in-memory only
MAX_IMAGE_SIZE_MB=10
MAX_IMAGES_PER_REQUEST=3
SESSION_TTL_DAYS=7
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Development setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### `requirements.txt`
```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
anthropic>=0.26.0
pydantic>=2.7.0
python-multipart>=0.0.9
redis>=5.0.0
python-dotenv>=1.0.0
```

### `package.json` dependencies
```json
{
  "dependencies": {
    "next": "14.2.0",
    "react": "18.3.0",
    "react-dom": "18.3.0",
    "axios": "^1.7.0",
    "framer-motion": "^11.0.0",
    "react-dropzone": "^14.2.0",
    "html2canvas": "^1.4.1"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/forms": "^0.5.7"
  }
}
```

---

## Build order (recommended)

Build in this sequence. Each phase is independently testable.

1. **Backend: receipt parser** — get the Claude Vision extraction working and returning clean JSON. Test it against 4-5 real Instacart screenshots with varying formats. This is the riskiest piece.

2. **Backend: session CRUD + split calculator** — wire up the in-memory store, the PUT/GET/summary endpoints, and the proration math. Write unit tests for the calculator.

3. **Frontend: upload screen + API client** — the drop zone, image preview, and the call to `POST /api/parse-receipt`. At this point you can do a full end-to-end upload → parsed items.

4. **Frontend: review screen** — the editable item table. Inline editing, delete, add row.

5. **Frontend: people input** — simple name input with chip UI, color auto-assignment.

6. **Frontend: assignment table** — the main event. Person columns, checkboxes, "All/None" column headers, sticky totals bar, amber highlight for unassigned rows.

7. **Frontend: summary screen + export** — person cards, copy text, share link generation.

8. **Share link backend** — Redis or in-memory snapshot, read-only share page.

9. **Polish** — Framer Motion transitions between steps, loading skeletons, mobile responsiveness.

---

## Key decisions locked in

| Decision | Choice | Reason |
|---|---|---|
| Receipt extraction | Claude Vision (claude-opus-4-5) | Best multimodal accuracy on real receipts |
| Multi-image | Up to 3 images, single API call | Realistic for long Instacart receipts |
| Assignment UI | Table with person columns + checkboxes | Fast, scalable to many items |
| Tax distribution | Prorated by item subtotal fraction | Matches how Instacart actually charges |
| Item multi-assign | Equal split among checked people | Simple, covers 95% of real cases |
| Storage | In-memory dict → Redis for share links | Zero-dependency start, upgrade path clear |
| Share link TTL | 7 days | Long enough to be useful, short enough to not accumulate |
| Export formats | Copy text + PNG screenshot + share link | Covers iMessage, Instagram, and browser |
