# Opening arrival hour: lines as played

Owner, Nov 8, 2026, about 2:10 p.m. (v0.94.0): "I accidentally clicked skip intro, but that's fine. So then I show up somewhere randomly at 8:30 again."

Three drawn places (random draw from all localities, seed 86470, first of each of three zones): Mason TX (geoid 4846968, Central), Pratt WV (5465356, Eastern), Springhill MT (3070375, Mountain). World seeds `8647-mason`, `8647-pratt`, `8647-springhill`. Before = the train without #8647, so it has no landing line at all; after = this branch. Played and skipped intro give the same landing. Landing wording is the Words lead's of Nov 14 (#8928, 16:29Z): "It's the evening of January 20." then a second sentence, the date said with no ordinal.

| Place         | Before: clock                      | Before: landing line | After: clock                        | After: landing line                              |
| ------------- | ---------------------------------- | -------------------- | ----------------------------------- | ------------------------------------------------ |
| Mason TX      | Monday, January 20, 2025 8:30 p.m. | no line              | Monday, January 20, 2025, 8:00 p.m. | It's the evening of January 20. The day is done. |
| Pratt WV      | Monday, January 20, 2025 8:30 p.m. | no line              | Monday, January 20, 2025, 9:00 p.m. | It's the evening of January 20. You stay in.     |
| Springhill MT | Monday, January 20, 2025 8:30 p.m. | no line              | Monday, January 20, 2025, 7:00 p.m. | It's the evening of January 20. The day is done. |

The address airs at 9 p.m. Eastern (ESTIMATED, spread 8 to 9 p.m.; NHPR, Feb 24, 2026), so it is 8 p.m. in Central, 9 p.m. Eastern, 7 p.m. Mountain. A household whose last shift ends later lands at that shift's end instead.

The four arrival pieces now read "It's {the part of the day and date}. The house is quiet." / "You stay in." / "The day is done." / "You stay in, thinking about what happened {since}." The Words lead's third line, "You're at home.", is pulled by the rule `no-placing-narration` (owner, Oct 27: "It shouldn't say you're at home"), so "The day is done." stands in for it; the Words lead is asked to confirm. Where the same moment is the next local date (Guam, the Northern Marianas) the game keeps the opening day at the true local clock hour; filed as a pool item.

## A later scene at home alone, morning and evening (second reader, Nov 14)

The four pieces are shared: the opening's landing and every later scene at home alone (src/director/scene.ts) now take one day form from `homeAloneDayFacts` (the part of the day after "It's", the date with no ordinal), and "The day is done." carries `requiresFacts: ["evening"]`, so it is drawn only from 5 p.m. on (the director's evening mark). `src/director/home-alone-arrival.test.ts` (removed) pins this at Mason TX (geoid 4846968, seed 8647-mason). The arrival line a later scene at home plays at each hour (composeScene) and every line the bank can draw there (60 moments), in the three drawn places:

| Place           | Hour  | Scene plays                                           | Bank can draw                                                                                                                                         |
| --------------- | ----- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8647-mason      | 8:00  | It's early on January 20. You stay in.                | It's early on January 20. You stay in. / It's early on January 20. The house is quiet.                                                                |
| 8647-mason      | 10:00 | It's the morning of January 20. You stay in.          | It's the morning of January 20. You stay in. / It's the morning of January 20. The house is quiet.                                                    |
| 8647-mason      | 14:00 | It's the afternoon of January 20. You stay in.        | It's the afternoon of January 20. You stay in. / It's the afternoon of January 20. The house is quiet.                                                |
| 8647-mason      | 19:00 | It's the evening of January 20. The day is done.      | It's the evening of January 20. The day is done. / It's the evening of January 20. The house is quiet. / It's the evening of January 20. You stay in. |
| 8647-mason      | 22:00 | It's late on January 20. The day is done.             | It's late on January 20. The day is done. / It's late on January 20. The house is quiet. / It's late on January 20. You stay in.                      |
| 8647-pratt      | 8:00  | It's early on January 20. You stay in.                | It's early on January 20. The house is quiet. / It's early on January 20. You stay in.                                                                |
| 8647-pratt      | 10:00 | It's the morning of January 20. You stay in.          | It's the morning of January 20. The house is quiet. / It's the morning of January 20. You stay in.                                                    |
| 8647-pratt      | 14:00 | It's the afternoon of January 20. You stay in.        | It's the afternoon of January 20. The house is quiet. / It's the afternoon of January 20. You stay in.                                                |
| 8647-pratt      | 19:00 | It's the evening of January 20. The day is done.      | It's the evening of January 20. The house is quiet. / It's the evening of January 20. You stay in. / It's the evening of January 20. The day is done. |
| 8647-pratt      | 22:00 | It's late on January 20. The day is done.             | It's late on January 20. The house is quiet. / It's late on January 20. You stay in. / It's late on January 20. The day is done.                      |
| 8647-springhill | 8:00  | It's early on January 20. The house is quiet.         | It's early on January 20. You stay in. / It's early on January 20. The house is quiet.                                                                |
| 8647-springhill | 10:00 | It's the morning of January 20. The house is quiet.   | It's the morning of January 20. You stay in. / It's the morning of January 20. The house is quiet.                                                    |
| 8647-springhill | 14:00 | It's the afternoon of January 20. The house is quiet. | It's the afternoon of January 20. You stay in. / It's the afternoon of January 20. The house is quiet.                                                |
| 8647-springhill | 19:00 | It's the evening of January 20. The house is quiet.   | It's the evening of January 20. The house is quiet. / It's the evening of January 20. You stay in. / It's the evening of January 20. The day is done. |
| 8647-springhill | 22:00 | It's late on January 20. The house is quiet.          | It's late on January 20. The house is quiet. / It's late on January 20. You stay in. / It's late on January 20. The day is done.                      |

"You stay in." is not tied to an hour: it is the original piece, which already played in the morning before this change ("Late in the morning on January 20th, you stay in."). If the Words lead wants it only from the evening, it takes one `requiresFacts: ["evening"]` on its use.
