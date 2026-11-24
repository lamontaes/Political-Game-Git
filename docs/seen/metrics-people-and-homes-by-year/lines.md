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

## What the title-screen run showed (not clean evidence)

Started a life through the browser (title menu, Start a life, Male, Randomize name, Random place, Begin my life; then `POST /api/dev/advance` `{step:"date", to:"2026-03-25"}`, reload, Continue, Politics, Metrics). The seed field does not choose the place: "Random place" drew Olivia, Minnesota, then Washington, DC (`ui-life-olivia-mn.png`, `ui-life-washington-dc.png`). In both, Your town shows only People at work, People looking for work and Jobs open: no People in town, no Households, no Homes section, and no last-year figures at all. Rent, home value, claims and the other kept rows were already absent on the train, so this is not new with this change, but it means a life started from the title screen does not show any kept town figure after 14 months, while the test world (`buildBenchWorld`, same date) does. The cause is not found; the likely place to look is whether the played town's id matches a `world-metrics` row (`metrics:<placeId>:<date>`) in a world built by the server. A "before" picture on the train would look the same.
