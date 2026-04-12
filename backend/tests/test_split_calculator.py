from models.schema import Person, ReceiptItem, SplitSession
from services.split_calculator import compute_summary


def test_compute_summary_equal_split_is_default() -> None:
    p1 = Person(id="p1", name="Alex", color="#3B82F6")
    p2 = Person(id="p2", name="Priya", color="#10B981")
    session = SplitSession(
        session_id="s1",
        items=[
            ReceiptItem(
                id="i1",
                name="Milk",
                quantity=1,
                unit_price=10,
                total=10,
                category="item",
                assignees=["p1"],
            ),
            ReceiptItem(
                id="i2",
                name="Bread",
                quantity=1,
                unit_price=20,
                total=20,
                category="item",
                assignees=["p2"],
            ),
            ReceiptItem(
                id="fee1",
                name="Service fee",
                quantity=1,
                unit_price=6,
                total=6,
                category="fee",
                assignees=[],
            ),
        ],
        people=[p1, p2],
    )

    by_id = {s.person_id: s for s in compute_summary(session)}
    assert by_id["p1"].subtotal == 10
    assert by_id["p2"].subtotal == 20
    assert by_id["p1"].tax_and_fees_share == 3
    assert by_id["p2"].tax_and_fees_share == 3


def test_compute_summary_prorated_mode() -> None:
    p1 = Person(id="p1", name="Alex", color="#3B82F6")
    p2 = Person(id="p2", name="Priya", color="#10B981")
    session = SplitSession(
        session_id="s1",
        charge_split_mode="prorated",
        items=[
            ReceiptItem(
                id="i1",
                name="Milk",
                quantity=1,
                unit_price=10,
                total=10,
                category="item",
                assignees=["p1"],
            ),
            ReceiptItem(
                id="i2",
                name="Bread",
                quantity=1,
                unit_price=20,
                total=20,
                category="item",
                assignees=["p2"],
            ),
            ReceiptItem(
                id="fee1",
                name="Service fee",
                quantity=1,
                unit_price=6,
                total=6,
                category="fee",
                assignees=[],
            ),
        ],
        people=[p1, p2],
    )
    by_id = {s.person_id: s for s in compute_summary(session)}
    assert by_id["p1"].tax_and_fees_share == 2
    assert by_id["p2"].tax_and_fees_share == 4


def test_compute_summary_shared_item_equal_split() -> None:
    p1 = Person(id="p1", name="Alex", color="#3B82F6")
    p2 = Person(id="p2", name="Priya", color="#10B981")
    session = SplitSession(
        session_id="s2",
        items=[
            ReceiptItem(
                id="i1",
                name="Pizza",
                quantity=1,
                unit_price=30,
                total=30,
                category="item",
                assignees=["p1", "p2"],
            )
        ],
        people=[p1, p2],
    )

    summary = compute_summary(session)
    assert summary[0].subtotal == 15
    assert summary[1].subtotal == 15
