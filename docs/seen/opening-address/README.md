# The President's address, before and after (Nov 11, 2026)

Pool item `words-opening-address-says-the-same-sentences-in-every-world`.

Three new lives were started in the running game (`npm run bench`, page `/play`, New life, then New world) at 1440x900. Each seed was drawn at random by the check script and sent with the request, so the same three places were played on main's code ("before") and on this branch ("after"). Each address was played part by part with Continue, and the text of every part was read from the talk box.

| Place                  | Seed             | Before                                        | After                                       |
| ---------------------- | ---------------- | --------------------------------------------- | ------------------------------------------- |
| Gold Hill, Oregon      | 7dfdc746a865e173 | [text](before-1.txt), [picture](before-1.jpg) | [text](after-1.txt), [picture](after-1.jpg) |
| Orchard Mesa, Colorado | 15778bb9c5906926 | [text](before-2.txt), [picture](before-2.jpg) | [text](after-2.txt), [picture](after-2.jpg) |
| Lyons, Colorado        | b700894ab4a5b625 | [text](before-3.txt), [picture](before-3.jpg) | [text](after-3.txt), [picture](after-3.jpg) |

## Whole sentences two addresses share

A sentence is the text between two full stops, question marks or exclamation points. The names of officials the montage shows under a part are left out.

| Pair of addresses          | Before | After |
| -------------------------- | -----: | ----: |
| Gold Hill and Orchard Mesa |      0 |     0 |
| Gold Hill and Lyons        |     14 |     0 |
| Orchard Mesa and Lyons     |      0 |     0 |

Before, the Gold Hill and Lyons Presidents, who speak in the same manner, shared 14 sentences. The Orchard Mesa President speaks in the other manner, whose pieces are separate, so its pairs shared none either way.

Across ten worlds drawn with the probe (places drawn by `drawPlace` on seeds e1 to e10, built with `buildBenchWorld` on Jan 20, 2025): before, 87 sentences were said in two or more of the ten addresses and 46 in three or more; after, 12 in two and none in three.

## What each address now names from its own world

- Gold Hill: the President's home state (Pennsylvania), the Vice President (Thomas Houston), the President's line on legal cannabis sales, and how far pay, prices and work moved ("rose a little", "rose steadily").
- Orchard Mesa: the home state (Montana), the Vice President (Allison Molina) and the Speaker (Cindy Chambers).
- Lyons: the Speaker (Carol Lee), the Vice President (Patricia Parker) and the home state (South Carolina).

The test `src/director/opening-address-versions.test.ts` checks the same on ten drawn worlds every run.
