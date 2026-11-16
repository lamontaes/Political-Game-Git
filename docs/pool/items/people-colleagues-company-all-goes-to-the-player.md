---
id: people-colleagues-company-all-goes-to-the-player
title: "Every colleague's time with a friend goes to the player, the only colleague they have a written tie with"
area: people
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/project-thread-csmftn-known
pr: #9539
after:
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Found by the lying thread, Nov 15 2026, building cause C of legislature-vote-asks-never-written-in-drawn-places
merged-at: 2026-11-16T20:00:58.675Z
---

**What.** In a chamber whose members are filled in, almost every member's daily time with someone they know (`contact-known-person`) goes to the player. At 4846968 (Texas) seed 8647-mason, from Feb 1 to 14, 2025, the player got 177 of these acts from senate colleagues at seat 001 and 197 at seat 016. No other senator got one in either run. The player becomes close to the whole chamber, with mean closeness 0.43 by May 18 and about 24 hours of colleagues' company a day, so the vote on the player's own bill is never short on the eve and the evening ask never comes. Seen: in dev mode, a state legislator player is close to nearly every colleague by spring, while colleagues are close to almost no one but the player.

**Cause.** Found in code: colleagues know each other only through hours the sitting reader works out when asked (src/core2/sitting-closeness.ts, `registerSharedHours`), which leaves no relationship row. The player's own office day writes rows (spendTime in src/core2/office-day-state.ts, the `api.meet` for a first meeting). `contact-candidate` (src/core2/modules/people.ts:820-846) offers only people with a row (`tiedTo`, people.ts:167-181), plus one untied person, so each colleague's only tied senator is the player. `tiePull` (people.ts:83-100) then weighs the hours the tie has lost, so the first pick keeps pulling.

**Fix.** Make `contact-candidate` offer the colleagues one knows through a registered shared-hours reader (the sitting's known set, `nearestInService` in sitting-closeness.ts) as ties, with their pull read from `sharedHoursBetween`, so a member's company spreads over the colleagues they sit with. No new parameter, and no rows written for pairs nobody played.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the spread comes from each tie's own hours, never a draw. Wire to the world: prove it in a played world, not a hand-built one. Speed: no new scan, since the known set is already kept per chamber.

**Done when.** A pinned test at 4846968 seed 8647-mason (about a minute, seen red on today's code) shows that from Feb 1 to 14, 2025 the player gets no more than a third of the senators' `contact-known-person` acts. A played year in a drawn place, and at three named places, stays within the speed bar. A second session sees in dev mode on main that a legislator player's closeness to colleagues grows like a colleague's.

**Waits on.** Nothing.

**Files.** src/core2/modules/people.ts, src/core2/sitting-closeness.ts
