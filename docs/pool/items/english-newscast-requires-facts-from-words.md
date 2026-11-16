---
id: english-newscast-requires-facts-from-words
title: "The newscast reads a line's story facts from its declared facts, not from words in its text"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: governor's briefing room builder, Nov 15; Account lead asked for the rule and every line it can misread
lead: words-engine
claimed-at:
---

**What.** A paper line is held back unless the story's record has an outcome fact, and the fact is guessed from words in the line's text ("passed", "won", "lost", "failed" and their forms), not only from what the line declares. A line that uses one of those words in another sense is never printed. Seen: a death notice "{name} passed away on {date}." in `news.json` can never play, because it is held for a "passed" fact that only a bill carries; a disaster lapse lede "before the deadline passed" printed no lede until its wording was changed.

**Cause.** Found in code: `src/english/english-newscast.ts` function `variants` adds `["won"]`, `["lost"]`, `["passed"]`, `["failed"]`, `["unemployment-down"]`, `["morning"]` and `["evening"]` to a line's `requiresFacts` when a regular expression finds a word in its text. Lines that read the sniff wrongly: `news.life-death.name-passed-away-on-date` (passed), `news.local-address-style.name-spoke-of-lost-confidence-and-took-a-share` (lost; also declares style-crisis), `news.committee-next.the-bill-wont-reach-the-body-floor-unless-the-committee-takes-it-up-ag` ("won't" reads as won; also declares failed and body), `news.emergency-lapsed.*` before its wording changed. About 100 other lines in `headlines.json`, `news.json` and `notice.json` use the same words in the sense the guess assumes and depend on it for their outcome.

**Fix.** Give every line that depends on the guess an explicit `requiresFacts` naming the outcome fact (the Words lead lists them from the three files), then delete the regular expressions from `variants` so only declared facts decide. A guard test fails when a line's text names an outcome word and its uses declare no fact for it, so a new line cannot depend on the old guess.

**Time box.** 3 hours for one Opus session. When it runs out, push what passes and say so.

**Rules.** No dice. Words lead writes the line edits; the builder changes only the code and the guard.

**Done when.** A second session, on main at a drawn place and a seed the builder did not choose, sees in the running game a death story print among its variants, in the paper; and on a drawn place and a seed the builder did not choose, a death story prints "passed away" lines among its variants, a law, election and roll-call story prints exactly the lines it printed before, and `tests/english-parts-banks.test.ts` fails for a line that names "passed" with no declared fact.

**Waits on.** Nothing.

**Files.** src/english/english-newscast.ts, data/english/parts/news.json, data/english/parts/headlines.json, data/english/parts/notice.json, tests/english-parts-banks.test.ts

**Notes.** Nov 15. Found while making the disaster lapse story print its lede.
