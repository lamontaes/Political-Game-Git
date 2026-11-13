# The name reader's last misses: a government employer, a job's article, and the out-of-town stand-in

Reports: Playtester P2 (Nov 13, batch 3): "Shannon Dawson works at the County of Mcdowell as a public works director." Playtester P1 (Nov 13, 07:38Z): "You work as aide at TOWN OF SMITHTOWN treasury." Fable A, rule 20: "A stand-in for somewhere outside town is never said as a place or an employer."

Bench at 1440x900: a new life, "Who I am", then each relative's card. Before is main; after is this branch.

| Place (seed), card                                                                | Before                                                     | After                                                              |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Bartley, West Virginia (`c9b435a2-2d6a-498e-b511-1c8e25b2a260`), Brian Harrington | Works as planning director at COUNTY OF MCDOWELL treasury. | Works as a planning director at the government of McDowell County. |
| Woonsocket, Rhode Island (`w8-f`), Brittney Livingston                            | Works as planning director at CITY OF WOONSOCKET treasury. | Works as a planning director at the City of Woonsocket.            |
| Woonsocket (`w8-f`), a neighbor                                                   | Works as janitor at Cortez Building Services.              | Works as a janitor at Cortez Building Services.                    |
| Fairview, Kentucky (`84f2626c-06e2-4b64-95cc-ab59382b866b`), Thomas Pickett       | Works as teacher at Pickett Academy.                       | Works as a teacher at Pickett Academy.                             |

How: a government organization keeps its recorded name (the listing's words are its identity, `opening-public-owner.ts` checks them), and one reader, `organizationName` in `src/director/words.ts`, says it by its place record's proper name for the card and the Journal; `employerSaid` then says a treasury as its government. A job's title takes its article (`withArticle`).

The out-of-town stand-in: the player's own job line reads "Works outside {town}" (`personCard`), and a scene's setting never names "Buyers and sellers outside the town" (`scene.ts`): the arrival falls to its lines with no place ("{name} stops by while you work."). Not pictured: it needs a commuter player on a workday scene.
