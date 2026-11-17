---
id: play-vacant-seat-offered-to-the-player
title: "A vacant town seat filled by appointment is never offered to the player, whatever their record"
area: play
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/blockers-vacancy-appointment
pr: #9823
after:
blocked-on:
lead: governing
model: fable
effort: medium
root: rc10-screens-keep-own-facts
source: owner, Nov 16, 2026 ("you can only be appointed to council, like the playable offices"), and his first-year answer ("Work for someone else's campaign, a party committee or an appointed board until a race opens"); CTO lines on crew list issue 9747, Nov 17, 01:51Z and 01:53Z
checked:
---

**What.** A player with no race open can, by the owner's answer, be appointed to a playable seat when it falls vacant. When a town seat is vacated and the place's law fills it by appointment, the body seats the first suited resident who would accept and never considers the player. A player who filed, worked a campaign or came to a party meeting is passed over like a stranger.
Seen: North Plymouth, Massachusetts (place seed a1c29ecd20ea8aa97990ce0d6daf18e8f6c95217ca90700c69e5303d4b175943), a board seat vacated after the player filed is filled by a resident with no word to the player.

**Cause.** Found in code: src/core2/modules/offices.ts `fillVacancy` seats a resident at once under an appointment rule, and `suitedResidents` leaves the player out by name, so nothing offers the seat to the player.

**Fix.**

1. The offices engine takes a named offer (`registerVacancyOffer`): under an appointment rule it asks the offer first and, when one is made, the vacancy waits as `offered`; `answerVacancyOffer` seats the person or fills it as before.
2. The elections engine registers the player's offer: a seat the player could run for, in their district, to a player of voting age in the town whose filing, campaign work or party meeting brings them to notice, with a `seat-appointment-offered` record and a lapse after the offer spacing days.
3. The player's reply in the scene (`seat-appointment-offer`) answers it; Story writes the scene.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: the player's seat is their own reply in a scene, never chosen for them, and the body's offer reads the player's records.

**Done when.** A second session plays a drawn place it writes down with its seed, files or joins a campaign, and when a council seat falls vacant under an appointment rule, the body offers it in a scene; a yes seats the player, and dev mode's Trace of the seat shows the term.

**Waits on.** Story's `seat-appointment-offer` scene.

**Files.** src/core2/modules/offices.ts, src/core2/modules/elections.ts, src/core2/scene-replies.ts (new, shared with #9814), src/core2/modules/press.ts, src/core2/vacancy-offered-to-player.test.ts (new)

**Notes.** Filed and built by the Blockers lane, Nov 17. The five territories have no row in data/municipal-elections/92O-national-state-baseline.json and fall to an appointment rule with no citation; no research was added, by the CTO's line.
