---
id: words-news-brief-prints-a-code-name
title: "A News brief prints a code name: 'State campaign contribution limit: stateHouse took effect on January 1, 2025' (Blodgett Landing, New Hampshire, day one)"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-words-news-brief-prints-a-code-name
pr: #8549
after:
blocked-on:
lead: words
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 5, "The news")
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:58:46.113Z
---

**What.** On day one of a played life in Blodgett Landing, New Hampshire (a random world; the audit gives no seed), a News brief read "State campaign contribution limit: stateHouse took effect on January 1, 2025," with a code name on the page. That was measured on the screen. Read in the code on main: the brief's name comes straight from the bill catalog, where six law names end in a code word: "State campaign contribution limit: stateHouse", "State campaign contribution limit: stateSenate", "Spending: healthAndHospitals", "Spending: higherEducation", "Spending: welfareAndMedicaid" and "Spending: naturalResources". Every screen that reads the catalog's names can print them, the News, the draft-a-bill list and the Government screen among them. The English engine already has plain words for these laws ("the state limit on a gift to a state house candidate"). Fix it at the cause: no catalog name carries a code word, the News names a law through the English engine's own subject for it, and a guard fails when any name a player can see contains a joined code word.

**Cause.** Found in code: src/core2/data/legislature/bill-catalog.json holds six law names that end in a joined code word (line 1724 "State campaign contribution limit: stateHouse", and "…: stateSenate", "Spending: healthAndHospitals", "Spending: higherEducation", "Spending: welfareAndMedicaid", "Spending: naturalResources"); policyNames (src/bench/words.ts, line 86) hands those names to every screen that reads them, and wordArchiveStory (src/bench/archive-words.ts, lines 90 to 97) prints the name in the News. Seen on day one in Blodgett Landing, New Hampshire (Fable audit, Nov 9; no seed).

**Fix.** Correct the six catalog names, make the News name a law through the English engine's own subject for it (data/english/bill-sections.json), and add a guard that fails on any name a player can see that has a lower-case letter followed directly by a capital.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: a screen shows record data only through worded labels from the English engine, never a raw kind, id or key, so the catalog's code words must not reach a page. Replace, never layer: the six names are corrected in the catalog and the fallback that prints a raw catalog name in the News is replaced by the engine's subject, not wrapped. American English: the corrected names read as a paper would print them. Owner, November 8, quoted by the audit: "This news is terrible. There's no information here."

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed. Read every law item in the News on day one and after a played year (dev mode's Run on the Calendar, 366 days), and open the draft-a-bill list as a legislator through Advanced, Play as: no name on either screen holds a joined code word such as "stateHouse" or "healthAndHospitals". Take a screenshot of each with the place and seed under it. Then the named repro: a new game in Blodgett Landing, New Hampshire shows no brief that reads "State campaign contribution limit: stateHouse". A guard test walks every name in the bill catalog and every law name the News can print and fails on a lower-case letter followed directly by a capital. The owner plays it: the first paper names the limit on gifts to state house candidates in plain words.

**Waits on.** Nothing.

**Files.** src/core2/data/legislature/bill-catalog.json, src/bench/words.ts, src/bench/archive-words.ts, src/english/policy-names.ts, data/english/bill-sections.json, tests/guards/english

**Notes.** From the Fable audit, Pillar 5, measured in the audit's browser session in Blodgett Landing, New Hampshire. No seed is given for that world. The audit saw one of the six names on the page; the other five were found by reading the catalog on main, Nov 10 (helper), and were not seen in play. Also read: `policyNames()` is used by `src/bench/government-bodies.ts`, `src/bench/office.ts`, `src/bench/legislature.ts` and `src/bench/handler.ts`, so the same names reach those screens. Related: `words-paper-law-and-budget-briefs-read-right` (in a pull request since Nov 2, open and unmerged on Nov 10: the first paper's law items are reworded; it does not correct the catalog's names), `words-income-tax-story-printed-in-a-state-with-no-wage-tax` (the brief beside this one).
