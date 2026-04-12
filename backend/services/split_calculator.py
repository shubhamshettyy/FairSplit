from __future__ import annotations

from models.schema import PersonSummary, SplitSession


def _split_item_total(item_total: float, assignee_count: int) -> float:
    if assignee_count <= 0:
        return 0.0
    return item_total / assignee_count


def compute_summary(session: SplitSession) -> list[PersonSummary]:
    assignable_items = [
        i for i in session.items if i.category in ("item", "discount")
    ]
    charges = [i for i in session.items if i.category in ("tax", "fee", "tip")]
    total_charges = sum(i.total for i in charges)

    grand_item_total = 0.0
    for item in assignable_items:
        if item.assignees:
            grand_item_total += item.total

    summaries: list[PersonSummary] = []
    people_count = len(session.people)

    for person in session.people:
        person_items = [i for i in assignable_items if person.id in i.assignees]
        person_subtotal = sum(
            _split_item_total(i.total, len(i.assignees)) for i in person_items
        )

        if session.charge_split_mode == "prorated":
            if grand_item_total > 0:
                fraction = person_subtotal / grand_item_total
            else:
                fraction = (1.0 / people_count) if people_count else 0.0
        else:
            # Default mode: split all non-item charges equally across people.
            fraction = (1.0 / people_count) if people_count else 0.0

        tax_share = round(total_charges * fraction, 2)
        subtotal = round(person_subtotal, 2)
        total_owed = round(subtotal + tax_share, 2)

        summaries.append(
            PersonSummary(
                person_id=person.id,
                name=person.name,
                color=person.color,
                subtotal=subtotal,
                tax_and_fees_share=tax_share,
                total_owed=total_owed,
                items=person_items,
            )
        )

    return summaries
