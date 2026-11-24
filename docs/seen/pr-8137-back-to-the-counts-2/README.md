# Back-to-the-counts check, corrected (PR #8137), second session, Nov 10, 2026

Main at `cd3f6a7e`. Not recorded as seen: see the result.

**Worlds.** Both started with the game's own draw (new-game API with no place; the creator form does not allow an empty place). Both ran 254 days with dev mode's Run route (world A through the panel's stepper: 180, 7, 7, 60; world B posting the same route: 180, 60, 14). Nothing threw on screen or in the server log in either.

- **A: Woodlawn Park, Kentucky**, seed `e0f25d5a-1180-4307-be95-8c4aba8c4e13`, Jan 20 to Oct 4, 2025.
- **B: Eastpointe, Michigan**, seed `c57f57fb-cc99-48c5-8fed-69fda90edb93`, same dates.

**What I did.** Looked in on private businesses from the Travel screen (the places list) without talking to anyone (A: Hester's Kitchen, Le's Kitchen, Paul's Market; B: Phelps's Kitchen, Cox's Market, Short's Kitchen). The visit shows who is in the room; I took the people each visit returned. None had any tie to the player (no relationship row), all tier `weekly` before.

**Finding about the check itself.** Dev mode's person route fills a returned person in again when it reads them (`personOrFillIn` in `src/bench/dev-mode.ts`), so after the run every person reads `weekly` in the town, returned or not. The tell is the memory route: a fresh `person.recorded` stamped on the day of the read (Oct 4) marks someone who was in the counts and was filled in by that read. In world B, the people who had been filled in by the visit carried `person.recorded` on Jan 21 before the run, which shows what the stamp is. Follow the money's "people returned to the counts" line did not separate them (213,253 minor units before and after the reads in B; the Follow the money button sits on the bill page's dev card, behind introducing a bill, so I called its route `POST /api/dev/twin-money` directly and took no screenshot of it).

Screenshots: `01-town-places.png` (Travel, places list), `01b-town-howells.png` (one place chosen), `02-visit-Howell-s-Market.png` (a visit, 8:00 AM Jan 23, nobody shown at that hour), `03-dev-run-panel-before.png`, `04-dev-run-panel-after.png` (Calendar and Run panel on Oct 4, 2025), `00-start.png`.

## Result: not decided (three households still full with no reason dev mode shows)

Went back to the counts (fresh `person.recorded` on Oct 4, no tie to the player): world A, Cynthia Rojas (alone), Brian Shaw (with Austin Shaw, who works outside the town), Donald Chang (alone); world B, Sabrina Schwartz, Sabrina Pena, Robert Graham and Linda Gallagher with their households (Linda's Cook job is gone after the read; the others kept theirs). That is 7 of 14 households watched, plus Devon Rush and David Bennett in A, who were in view at a visit and also carry the Oct 4 stamp.

Still full, kept on purpose (from dev mode's jobs): A, Rachel Roberts (two aides at state and county treasuries); A, Jeremy Roman (Dawn Roman edits for a newspaper); A, Kevin Yoder (Sofia Yoder reports for a radio station); B, Madeline Douglas (Joshua Douglas reports for a television station). The press jobs are kept by the game's rule for employers that are not plain private ones (`protectedPeople`); I did not check whether that is intended.

Still full, no reason I can find in dev mode: A, Morgan Torres (restaurant manager, partner at home); A, Amit Rowland (five in the house, Nancy a farmworker); B, Gia Small (Server, Cook, one works outside the town). Business ownership is the one kept reason dev mode does not show, so they may be owners; I did not confirm it.

Moved away or died: none.

By the item's rule this is not a pass (three households in the last group), and nothing threw. Gaps in the check as written: step 5's "tier reads inactive" cannot be seen through the person route (it fills the person in), and Follow the money is on the bill page's dev card.
