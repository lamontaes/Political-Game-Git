---
id: play-speech-steps-send-the-trail-back-to-doors
title: "Each step of Give a speech sends the campaign trail back to Knock on doors, so the speech seems to do nothing"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: "Playtester P3, Nov 13, 2026 (crew line #8928, comment 6844698994)"
checked:
claimed-at:
---

**What.** On the campaign trail, pressing Give a speech, then each opener, point and closing, closes the speech card and shows Knock on doors selected; nothing says the speech moved on. A player who does not click the Give a speech tile again after every step thinks the button is dead. Under Speak a stray ': 0 / 1' shows where the tile was. Seen: the campaign trail's speech card after each choice.

**Cause.** Found in code: speechCard's onBegin and onPick in src/bench/play.mjs (about line 2025) call reopenTrail(filing.id), and reopenTrail (line 2168) rebuilds the trail from campaignParts with its default selection (the first tile, Knock on doors), not the speech tile that was open. Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89 (Playtester P3, Nov 13, 2026), Feb 3, 2025: six steps, each needing the tile clicked again.

**Fix.** Give reopenTrail an optional title of the act to keep open, and have the speech's begin and pick steps (and the poll and ad, which use the same call) pass their own, so the trail comes back with that card showing its next step. Find and remove the stray ': 0 / 1' text while there (it is the speech's step count drawn outside its card).

**Time box.** 2 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: the change adds no words, only keeps the open card. Screens follow the mocks: the shared trail card is reused, not a new one.

**Done when.** A second session, on main in a drawn place with a filed campaign, gives a speech from the trail by pressing only the buttons the speech card shows, start to finish, without clicking the tile again, and sees the speech given where it was given.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs

**Notes.** Still seen on the train (Account lead T25, Nov 13, 2026; Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71): Campaign, Go out on the trail, Give a speech, then the second 'Give a speech' button lands on Travel with Knock on doors chosen. The trail's record line also stays 'Knock on doors · 54 doors · 5 reached' after 4,215 doors.
