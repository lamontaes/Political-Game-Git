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

- Gold Hill: the home state (Pennsylvania), the Vice President (Thomas Houston) and the Speaker (Lois Fuller), each at most twice; the President's line on legal cannabis sales once; the economy, prices and work each moved once, in words.
- Orchard Mesa: the home state (Montana), the Vice President (Allison Molina) and the Speaker (Cindy Chambers), each at most twice.
- Lyons: the home state (South Carolina), the Vice President (Patricia Parker) and the Speaker (Carol Lee), each at most twice.

## Retaken after the words lead's two reads (Nov 11, #8743)

The "after" texts and pictures were retaken on the same seeds after both reads:

- Lead-ins only say who is spoken to, when or where. None is said twice, and a time lead-in is never joined to a core that names the same time.
- A priority is one sentence, led in by its rank. Congress is sent "a bill on" a priority.
- A subject's movement is told once. A pledge says what the President will do, naming its subject plainly.
- The year's hard news and good news are worded apart ("a shrinking paycheck", "rising pay").
- No name is said more than twice, and no subject's words more than three times.
- (Third read) The year's trouble is only put where a trouble fits ("fixing a shrinking paycheck is next", never "a shrinking paycheck is next"), and the Vice President is not praised twice in the same words.

The addresses are shorter than before (12 to 15 sentences against 25 to 31), because each priority is now one sentence instead of four.

The test `src/director/opening-address-versions.test.ts` checks all of this on ten drawn worlds every run.
