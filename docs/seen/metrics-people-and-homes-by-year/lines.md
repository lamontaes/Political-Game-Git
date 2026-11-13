# Metrics, people and homes: the lines as played (March 25, 2026, 14 months in)

Read from `metricsView` with the bench's own labels (`src/bench/data/controls.json`, `metrics` block), three drawn places. Money rows are shown as the kept minor units here; the screen words them as dollars. **Before** (the train without this change) the same screens show every line below except the five new ones (People in town, Households, People without a home, and the last-year figure beside Rental homes and Rentals standing empty). No picture is attached: the lines are the whole change, and Fable A's read of the three labels is asked on #8928.

New labels, word for word: "People in town", "Households", "People without a home". Existing, unchanged: "Rental homes", "Rentals standing empty".

## Cashmere, Washington, seed 1303d611ab4dc929

Your town

- People in town: 3420 (Last year: 3453)
- Households: 1363 (Last year: 1375)

Homes

- Rental homes: 463 (Last year: 463)
- Rentals standing empty: 31 (Last year: 31)
- People without a home: 1 (Last year: 0)

## Everett, Georgia, seed 7a5e19c2b3d84f60

Your town

- People in town: 97 (Last year: 99)
- Households: 50 (Last year: 51)

Homes

- Rental homes: 21 (Last year: 21)
- Rentals standing empty: 1 (Last year: 1)
- People without a home: 0 (Last year: 0)

## Castleford, Idaho, seed c0ffee1234abcd56

Your town

- People in town: 253 (Last year: 246)
- Households: 130 (Last year: 127)

Homes

- Rental homes: 49 (Last year: 49)
- Rentals standing empty: 3 (Last year: 3)
- People without a home: 0 (Last year: 0)

The owner's instruction these follow: "a small town shows its own count with the people behind it, never a blend or county figure" (Nov 12, `docs/design/output-numbers.md`). Everett's 97 people is its own count: named people plus the counted tier by weight, kept apart in dev Trace as `peopleNamed` and `peopleCounted`.
