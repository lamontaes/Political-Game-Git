---
id: nation-other-states-change-laws-in-year-one-then-almost-never
title: "Other states change a pile of laws in year one and then almost none: 467 changes in the first year, then 41 in the next ten (Wickliffe, Oklahoma)"
area: gov
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by: claude/pool-nation-other-states-change-laws-in-year-one-then-almost-never
pr: #8482
after:
blocked-on:
lead: nation
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 3, "One tally per session" and "A flood in year one, then silence")
model: opus
effort: high
root: design-country-tier
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:37:10.909Z
branch: claude/pool-nation-other-states-change-laws-in-year-one-then-almost-never
merged-at: 2026-11-12T19:01:20.017Z
---

**What.** The other states' legislatures act once, at the start, and then stop. Measured in the Wickliffe, Oklahoma world (seed 8832429ff1e53841): 54 other states and territories changed 467 laws in the first year, and fourteen states capped property tax growth in the same year. In the ten years after, the whole country changed 41 laws: 1, 15, 5, 15, 0, 1, 3, 1, 0 and 0. Over the eighteen years after the first, the count was 54 laws. Read in the code: on the day a session convenes the engine walks the yes-or-no questions once, and a change passes if each chamber has more members leaning yes than no and the governor agrees. Public opinion, the state's economy and lobbying are not inputs. So the year-one flood is the starting law being brought into line with the members' leanings all at once, and after that a state changes a law only when an election changes its members. The owner's finish line, at least 40 states changing a law in force in a played year, is met in year one only, by the flood. Fix it at the cause for every state and territory: what a legislature takes up in a session follows from what moved in that state since its last one (its people's opinion, its economy and budget, organized pressure, who won seats), so laws change in every year for a recorded reason and the first year is not a one-time sort. Seen: the paper's stories of other states passing laws in every year, not only the first (the country tier is on the critical path).

**Cause.** Found in code: src/core2/modules/world-legislating.ts openOutsideSession (line 1354) tallies PLATFORM_QUESTIONS once on member leanings and reads no opinion, economy or lobbying.

**Fix.** Drive what an outside session takes up from what moved in that state since its last session, never from a one-time tally of member leanings. Read the state's own figures from the country tier (`countryStateNow` and `countryStates` in src/core2/modules/macro.ts: people out of work, prices, pay, and the ledger's revenue against its budget) and compare them with the same figures at the last session's close, kept on the session's result row. Which question a moved figure raises is a table in data, and how strongly is a sliding scale, never a threshold. Members still decide each question by their own leanings and the views of the people they answer to. Counts only: no member rows are kept for a state the player is not in. Keep the cause (which figure moved, by how much) on the result row so the news and dev mode's Trace can say why the state acted.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Sliding scales and causes: a state changes a law because something moved there, its opinion, its economy, an election or a lobby, and each change keeps that cause on its result row; nothing passes on a fixed pace or a yearly quota. No dice: the members' and the governor's views and the state's conditions decide, with no chance, cap or rate. Ask why: every change can answer why this year and not last, by record. Speed: one result per change on session days, and no per-member rows for a state the player has not opened. Owner, November 8: "The other 49 states changing laws and, stuff happening nationally and locally and stuff is to the utmost importance, even simulation kind of stuff." Owner, November 5: the members' and governor's views decide, keep only the result, build the detail on demand; the finish line is "at least 40 states change a law in force" in a played year. Owner, October 14: "a legislature passing its whole year on one day... each is a defect until the record answers why."

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed. With dev mode's Run on the Calendar, play five years, 366 days at a time. After each year read the count of laws other states changed that year from dev mode's Watch panel and the Nation heading in the News (the builder adds the yearly count to Watch from the law rows if no line shows it): no year after the first has none, the first year is not many times the later ones, and the 40-state line is met in year three, not only year one. Open three changes from different years: each names what moved in that state before it, by record id (a screenshot of each). Then the named repro, Wickliffe, Oklahoma, seed 8832429ff1e53841, eleven years: the yearly counts are no longer 467 and then 1, 15, 5, 15, 0, 1, 3, 1, 0 and 0. A test draws a place, plays four years and fails when the first year holds more than half of all the changes or any year holds none. The owner plays it: five years in, the News still carries other states passing and repealing laws, each for a reason he can open.

**Waits on.** Nothing. The country tier it reads is on main (pull request 8116).

**Files.** src/core2/modules/world-legislating.ts (`openOutsideSession`, line 1354; the tally loop over `PLATFORM_QUESTIONS` at lines 1386 to 1420; `needsChange`, line 320; `outsideEnact`, line 1486), src/core2/modules/national-opinion.ts, src/core2/modules/outside-budgets.ts, src/core2/regional-model.ts, src/core2/state-sessions.test.ts, src/bench/nation-news.ts, src/bench/ui/dev-watch.mjs

**Notes.** Fable's country tier design (pool item core-country-tier-first-slice) decides the shape; this item is the measured defect it must close. From the Fable audit, Pillar 3. Measured there: a 19-year run of the Wickliffe, Oklahoma world with readings each year; the tally was read in the code and confirmed by the audit's independent reviewer. The audit did not measure how often control of a statehouse changes over a long run, and its call is that nobody should claim the country's politics turn over until a long run records it year by year. Confirmed on main, Nov 10 (helper): `openOutsideSession` computes, for each question and each direction, each chamber's count of members whose `officialStance` leans that way, requires every chamber to have more yes than no and the governor to agree or two thirds to override, and reads nothing else. Related: `laws-session-moves-too-many-questions` (open, priority 3: the home state's own session moves 10 to 19 questions in one sitting, the same one-time sort seen from inside), `nation-other-states-never-change-an-amount`, `nation-another-states-law-reaches-nobody`, `play-states-screen-opens-any-state`, `words-nation-newsworthy-by-reach-and-ties` (open: which of these laws the paper prints).

**Notes (Fable, Nov 10, model).** The sort marked this for a Fable-level model. Read again by Fable: One engine (the outside sessions) and a written fix: Opus at high effort.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 02:37 UTC) on branch claude/pool-nation-other-states-change-laws-in-year-one-then-almost-never.
