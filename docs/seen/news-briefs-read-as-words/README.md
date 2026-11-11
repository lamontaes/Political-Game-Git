# News briefs read as words, before and after (Nov 11, 2026)

Pool item `words-news-brief-prints-a-code-name`. The bench at 1440x900 (`npm run bench`, page `/play`): a new life with the seed below, the President's address played with Continue, Day, then News with the briefs scrolled to the law. Before is main; after is this branch.

| Place             | Seed                                   | Before                                                                          | After                                                                            |
| ----------------- | -------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Ellsworth, Maine  | `40a84c6d-e496-4d50-b6f7-ff889a1d44e3` | "State campaign contribution limit: stateHouse took effect on January 1, 2025." | "State campaign contribution limit: state house took effect on January 1, 2025." |
| Woodruff, Arizona | `c7e011a0-3271-4c6a-98d9-70fec19e7cca` | "State campaign contribution limit: stateHouse took effect on January 1, 2025." | "State campaign contribution limit: state house took effect on January 1, 2025." |

Each of the two also prints the Senate's limit, "stateSenate" before and "state senate" after.

Three more drawn places printed no brief with one of these names on the first morning, before or after, so they show nothing either way: Polkville, Mississippi (`dc46979e-5cd3-4ef4-aa57-4500488ec8ed`), Broomall, Pennsylvania (`3b6a0a84-2612-4224-b6d9-2801c5662eb5`) and Panama, Nebraska (`f06ba996-7a12-41f6-a670-66607f7659bb`).

The six spending and Medicaid names ("Spending: welfare and Medicaid", "expand Medicaid eligibility" and the rest) are printed when a budget line or one of those laws makes the news; none did on these first mornings. The test `src/core2/bill-catalog-names.test.ts` holds them.

It answers the owner's standing rule that a screen shows no raw kinds or ids (skill `player-screen-text`) and the Oct 24 playtest note on names printed as the records spell them.
