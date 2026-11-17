---
id: play-elections-offers-something-on-day-one
title: "Elections on day one offers only a race whose filing opens months later, so the player has nothing to do in politics"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: claude/blockers-elections-day-one
pr:
after:
blocked-on:
lead: screens
model: fable
effort: medium
root: rc10-screens-keep-own-facts
source: owner's play of v0.112.0, Nov 16, 2026 ("There's not much I can do since I can't run for anything"; Desk answer "Work for someone else's campaign, a party committee or an appointed board until a race opens"), crew list issue 9747 item 3a ("Done when Elections offers something on day one")
checked:
---

**What.** On a new life's first day, Elections lists the player's one office with a filing window months away and the county's offices they cannot run for. Nothing on it can be done. The owner read that as being unable to do anything in politics.
Seen: Beesleys Point, New Jersey (seed 1c0c38ab-cccf-45f2-943d-b108847e2981), day one, filing opens June 27.

**Cause.** Found in code: src/bench/government.ts `localRaces` returns only races and src/bench/play.mjs draws only them, so the parties the player could join and the campaigns that asked for help never reach the page.

**Fix.**

1. `localRaces` also returns `nowYouCan`, read from the records: each party here to join with its committee's next meeting day, or the player's own party; and each campaign that asked the player to help and was not turned down.
2. Elections draws them first as one group; a party opens Parties, where joining is done.
3. Story writes the group's words (`localRaces.nowYouCan`).

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the group's words are Story's, filled with record names and days only.

**Done when.** A second session starts a new life in a drawn place it writes down with its seed and opens Politics, then Elections, on day one: the page names the parties to join with their next meeting day, and a party opens Parties.

**Waits on.** Story's words under `localRaces.nowYouCan`; play-party-invites-the-player-to-its-meetings and play-campaign-asks-the-player-to-volunteer, which this builds on.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/elections-now-you-can.test.ts (new)

**Notes.** Filed and built by the Blockers lane, Nov 17. Stacked on #9811 and #9814.
