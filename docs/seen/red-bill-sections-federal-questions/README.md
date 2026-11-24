# A bill before Congress has its paper, before and after

Red on main: `src/english/bill-sections.test.ts`, "H.R. 14: expected null to be truthy", in Wildwood, Tennessee (`BILL_SECTIONS_SEED=b76a4edbac167a54`). Congress files bills on every federal question in `data/research/campaigns/federal-questions-2026.json`. Twelve of the 27 had no words in `data/english/bill-sections.json`, so such a bill had no title and no sections.

Each picture is the bench at 1440x900 (`npm run bench`, page `/play`). The steps:

- start a new life in the drawn place: `POST /api/newlife?seed=<place seed>&placeKey=<key>`, the place drawn as the test draws it;
- run 250 days in dev mode: `POST /api/dev/run-until {"days": 250}`;
- open Politics, then Bills, and pick the bill before Congress.

The same bill is opened before (main at 382123f7) and after (this branch at 5bdd884c).

| #   | Place                   | Test seed          | Bill    |
| --- | ----------------------- | ------------------ | ------- |
| 1   | Wildwood, Tennessee     | `b76a4edbac167a54` | H.R. 15 |
| 2   | Lincoln Park, Colorado  | `w3-bill-2`        | H.R. 14 |
| 3   | Ivanhoe, North Carolina | `w3-bill-3`        | H.R. 18 |

## Before

Each bill is listed and titled by its number alone ("H.R. 15"), and its paper has one section that also reads "H.R. 15". A player cannot tell what it does.

## After

Each bill is titled by what it does, and its section reads as an act's section:

- Wildwood: "A bill for an act to raise the top rate of the federal income tax." The section: "Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled That the tax rate on the highest bracket of taxable income shall be raised to the rate set here."
- Lincoln Park: "A bill for an act to expand passenger rail service." The section: "… That grants shall be made to build and run new and longer passenger rail routes."
- Ivanhoe: "A bill for an act to raise the full retirement age for Social Security." The section: "… That the age at which full Social Security retirement benefits begin shall be raised to the age set here."

The enacting words come from the act's form, unchanged.
