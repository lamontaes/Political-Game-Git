---
id: core-life-record-part-3-school-and-work-before-a-move-are-named
title: "The life record, part 3: someone who moved here has a named school and a named employer from where they lived before"
area: people
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-core-life-record-part-3-school-and-work-before-a-move-are-named
pr: #8648
after:
blocked-on:
lead: lives
model: opus
effort: medium
root: design-life-record
source: split from core-life-record by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:23:47.736Z
---

**What.** A person's past now reaches back to their birth. For the years before they moved to town, the school has no name and the work has no employer, so the card reads as a gap. This part names a school and an employer in the place the person came from, the same every time they are opened. Seen: the school and employer a person's card names for the years before they moved to town.

**Cause.** Found in code: `schoolHistoryFor` (src/core2/past-school.ts line 176) and `pastWorkFor` (src/core2/past-work.ts line 896) build schooling and work from the played town's own schools and employers; for years a person lived elsewhere (before the date of their move record, src/core2/past-moves.ts) they have none to name. Noted after the life record's step 2, pull request 8123.

**Fix.** For the years before the move, name a school and an employer in the place the move record says they came from. Where the world holds that place's schools or employers, use them. Where it does not, make one of each from the place and the seed, of a kind common for the place and the person's schooling, marked as an estimate, the same every time the person is opened. The card tells them with the bank rows that tell in-town schools and jobs.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Estimate, never unknown: a made name is an estimate with its basis. One rule, all 56 places: no place is named in the logic. Seeded generation of who exists is allowed; no roll decides an outcome. A filled-in person must match what the records already say.

**Done when.** A second session, on main in a drawn place it names with its seed, opens the card of an adult who moved to town after finishing school: the card names a school in the place they came from and at least one employer there, and reads the same when opened a second time and after a reload.

**Waits on.** Nothing. The life record's steps it waited on are on main (pull requests #8115 and #8139, which holds #8123).

**Files.** src/core2/past-school.ts, src/core2/past-work.ts, src/core2/past-moves.ts
