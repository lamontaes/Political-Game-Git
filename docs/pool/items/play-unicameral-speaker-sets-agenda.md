---
id: play-unicameral-speaker-sets-agenda
title: "A member of a one-chamber legislature could not get a bill on the floor: the chamber has a speaker and no majority leader"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/path-session-bills
pr: #4956
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T17:55:36.138Z
---

**What.** A member of a one-chamber legislature could not get a bill on the floor. A state-level legislator's bill is put on the floor by asking the chamber's majority leader (`askLeaderForHearing`, `src/core2/office-day-state.ts`), but the unicameral organization (`data/research/legislature/chamber-leadership.json`, nonpartisan) has only a speaker, so the request failed with "The chamber has no majority leader" and the bill stayed drafted forever. In Coral Bay, U.S. Virgin Islands (seed sw7a9c115c) and Washington, D.C. (seed swa26d59c4) the golden-path check ended at step 8 with a bill "drafted (0 to 0)" after 18 more months of play. The chamber's presiding officer (the speaker) now sets the agenda when there is no majority leader. Also, `path-check` asks the leader to schedule a legislature's bill, since these bodies have no meeting rule to put it on an agenda.

**Rules.** No dice: the speaker answers from their party, their tie to the member and their own traits, as the leader does. One rule, all 56 places: the fallback reads the chamber's posts, no place named.

**Done when.** `src/core2/office-day-unicameral-agenda.test.ts` finds a resident member of a unicameral chamber in a drawn place, drafts a bill, and the request names the speaker with reasons; it fails on main. In Coral Bay (seed sw7a9c115c) `path-check` reports the bill enacted 15 to 0 and reaches step 11.

**Files.** src/core2/office-day-state.ts, src/bench/path-check.ts, src/core2/office-day-unicameral-agenda.test.ts

**Notes.** Found by the fourth path-check sweep, Oct 17 (claude). Checked later Oct 17: D.C.'s council has 12 seats in the offices data (eight wards and four at large; the chair is its own office), and only 5 cover the town, which is what `townSeats` listed; not a defect. The D.C. run after this change reaches step 10 (see tests-path-check-legislature-session-days). The speaker's reasons use the speaker's party; in a nonpartisan chamber that term is zero.
