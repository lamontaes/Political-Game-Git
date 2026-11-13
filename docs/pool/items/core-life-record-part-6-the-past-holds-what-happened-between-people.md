---
id: core-life-record-part-6-the-past-holds-what-happened-between-people
title: "The life record, part 6: a person's past holds an earlier partner and a serious illness or injury, at real rates"
area: people
kind: feature
priority: 1
size: M
status: merged
standard: 2
claimed-by: claude/pool-core-life-record-part-6-the-past-holds-what-happened-between-people
pr: #8957
after:
blocked-on:
lead: lives
model: opus
effort: high
root: design-life-record
source: split from core-life-record by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
claimed-at: 2026-11-11T06:03:12.138Z
branch: claude/pool-core-life-record-part-6-the-past-holds-what-happened-between-people
merged-at: 2026-11-13T03:56:34.960Z
---

**What.** The owner, Nov 8: "None of my history is simulated. I can't see anything that my character went through. No, a girlfriend or a car accident or college or whatever." The past now tells school, work and moves. Nothing in it happened between people or to a body. Seen: a person's card, which now tells an earlier partner and a serious illness or injury (owner, Nov 8).

**Cause.** Found in code: the opening already works out each adult's chance of having a partner now from a yearly chain of first marriage, divorce, widowhood and remarriage at researched rates (`partneredByAge`, src/core2/opening-partnership.ts line 234, with `partneringPerYear` at line 879 and `separatingPerYear` at line 905), but only the end state reaches a person: partnered or not. The earlier marriage the chain implies is never written as an event. The writers of the past (src/core2/past-school.ts `schoolHistoryFor` line 176, src/core2/past-work.ts `pastWorkFor` line 896, src/core2/past-moves.ts, src/core2/past-elections.ts, src/core2/past-business.ts) write no earlier partnership that ended and no hospital stay or serious injury before the start.

**Fix.** For the earlier partner, add no new rates: when a person is opened, read the same chain the opening used (`partneringPerYear` and `separatingPerYear` in src/core2/opening-partnership.ts) to say whether this person, at their age and with the household they are in now, had an earlier marriage or long partnership that ended, in which year, and whether by parting or by death, made from the seed so the same person always has the same past, with the town's shares of previously married adults checked against what `partneredByAge` implies. An earlier partner is a named person kept as a few facts, never a full person until met. For a hospital stay or serious injury, research first (skill researcher): the share of adults by age with one, from published tables, as rows in a parameter table with citations; then give an opened person such an event from their age, traits and health record, made from the seed, with the town's totals checked against the researched rates. Each of these is a remembered event told by a bank sentence; name the spots on the pull request and Story writes them. College is already told from the school record: confirm it in the pull request.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice: seeded generation of who exists is allowed; real rates check totals and never pick one person's outcome. Research calibrates the simulation and never adds a step to the player's life. Two-level population. Story writes every line (CTO, Nov 10). Nothing about a pregnancy is shown beyond what the world already shows (owner, Oct 20).

**Done when.** A second session, on main in a drawn place it names with its seed, opens ten adults' cards: at least one tells an earlier partner or a serious illness or injury from before the start, each with a year, and Trace on the sentence opens its record. The part's test prints the town's shares beside the researched rates.

**Waits on.** Nothing. The life record's steps it waited on are on main (pull requests #8115 and #8139, which holds #8123). The build does not wait for lines: its pull request names each spot that needs them, and Story writes them after.

**Files.** src/core2/person-life.ts (new), src/core2/past-work.ts, src/core2/modules/partnerships.ts, src/core2/modules/health.ts

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:03 UTC) on branch claude/pool-core-life-record-part-6-the-past-holds-what-happened-between-people. Nov 13, Life records builder opus-lr: carried to main by #8957, which holds this branch's commits with the other-parent change, merged with main and gated together; #8670 closes as contained when #8957 merges. The words bar's cards for this item are in `docs/seen/life-record-partners-and-stays/` (Fable A read and passed them at 03:22Z). Set this item to merged with `npm run pool -- status core-life-record-part-6-the-past-holds-what-happened-between-people merged --pr 8957` once #8957 merges, since line 1 of #8957 names part 15.
