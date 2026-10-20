---
id: play-step-8-new-member-bill-left-off-floor
title: "A new member's first bill is left off the floor by the majority leader, and nothing the player does can change that (Waiahole-Waikane, Hawaii, seed onelife1)"
area: play
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/step8-floor
pr:
blocked-on:
milestone:
source: "play-golden-path-one-life, first one-life run, Oct 19"
claimed-at: 2026-10-20T15:18:53.487Z
---

**What.** In the one-life golden path in Waiahole-Waikane, Hawaii (seed onelife1), the player lost the State Representative race, won the State Senate seat two years later, drafted a minimum-wage bill and talked a colleague into a favor deal, and then the majority leader left the bill off the floor, so it was never voted and steps 8 to 11 were never reached. The leader's answer comes from their party, their tie to the member and their own traits, which is right, but the player has no way to change it: the only act aimed at a colleague names the bill's co-members, not the leader who sets the agenda. Give the player the move a real new member has, asking the leader for the floor with something to offer, so that negotiating the bill can change the leader's answer.

**Rules.** No dice: the leader's answer follows their party, their closeness to the member and their traits, plus what the member offers, never a roll. The chain is the acceptance: the request, the leader's reasons, the offer, the agenda date and the vote are each followed by record id. This is a game, not a spreadsheet: asking the leader is one conversation move with a person, not a form.

**Done when.** In the one-life golden-path check (src/bench/path-check.ts) in the Hawaii place and seed above and in two other drawn places, a new member whose first request is refused can make an offer to the leader, the leader's new answer cites the offer by record id, and the bill either reaches the floor and is voted or the refusal's reasons stay on the record; tests/golden-path/one-life.node-test.ts still passes.

**Files.** src/core2/office-day-state.ts, src/bench/path-check.ts, src/bench/office.ts

**Notes.** Found by the first honest one-life run (play-golden-path-one-life): it reached steps 3 to 7 as the player. The earlier path-check switched to an already seated official, which hid this.
