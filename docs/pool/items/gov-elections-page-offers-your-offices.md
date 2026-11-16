---
id: gov-elections-page-offers-your-offices
title: "The Elections page offers the player the offices they can run for, with the day they can file"
area: gov
lead: civic roles
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9676
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "Owner, Nov 16 04:18Z, played 0.111.1 (no way to run for anything; five commissioner seats shown)"
checked:
---

**What.** The owner's Elections page listed every seat of a district body (seven commissioner seats at McMinnville, Tennessee) and no way to run, and a refusal named the wrong cause. It now leads with "Offices you can run for" and the day each can be filed, shows only the player's own district seat, labels county offices as the county's, and refuses in words for the real cause. Seen: Politics, Elections at McMinnville TN and Bonanza OR, 1440x900.

**Cause.** Found in code: `localRaces` (function) in src/bench/government.ts listed every contest of the date, district seats included, and play.mjs drew them in one list; playerMayFileWith in src/core2/modules/elections.ts returned a bare yes or no, so the page and the counter kept separate reasons.

**Fix.** One reader, playerFilingBar in elections.ts, names the one bar (not your office, not your town, window not open, window closed, other district, filed elsewhere, at-large elsewhere); the page and the counter both read it; worded refusals live in controls.json.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Standing rule one-engine-per-mechanic: the page asks the clerk's own check and keeps no rules copy of its own. Standing rule player-screen-text: every label is a worded control, never a raw kind or id.

**Done when.** At a drawn place and seed (McMinnville TN and Bonanza OR first), a second session plays a new life in the running game, opens Politics, Elections, and sees its own offices first with the filing date, one seat of its district body, county offices labeled, and the dev view saying why each is or is not offered; a pinned test is red without the district filter and green with it.

**Waits on.** Words lead stamp on the controls.json labels.

**Files.** src/core2/modules/elections.ts, src/bench/government.ts, src/bench/play.mjs, src/bench/data/controls.json, src/bench/dev-views/election-offers.ts

**Notes.** Filed Nov 16 on the branch of its PR.

Removed for want of a screen that shows it (Words lead, #9676): "You turn {age} on {date}" and the words for another-district, not-your-town, filed-elsewhere and at-large-elsewhere refusals. The new game starts at 18 (owner, Nov 16), and only Guam and Northern Marianas villages set a municipal minimum above 18 and hold no local race on this page, so no press reaches an age wait. What would show it: a place whose town office asks more than 18 with a local race, or a state office on this page. The filing date for a not-yet-old-enough player still shows as "Filing opens {date}" (the later of the age date and the window).

Whoever makes one of the four cut reasons (another district, not your town, filed elsewhere, at-large elsewhere) reachable by a press adds its own true sentence to controls.json in the same pull request. The generic "You can't run for this office." (it gives no reason, because the record holds none) is never shown for them: it would hide the true reason for a player who already filed elsewhere or picked another district's seat (Words lead, #9676).

Open question for the lead: the repository guide lists county offices (Trustee, Commissioner) as playable in early access, yet the page says "You can't run for this office." for them, because `PLAYER_OFFICES` does not list them. When it is answered, the sentence gets its true reason (Words lead, #9676).
