---
id: words-scene-concession-received
title: "The winner takes the loser's call after the count: a phone scene cast from the result record's totals"
area: words
kind: feature
priority: 1
size: S
status: done
claimed-by: words/helper-b-concession-call-received
pr: #6260
blocked-on:
source: "owner, Oct 27: a victory speech needs a concession speech, and a contentious call with the other candidate can be a branch; episode packet docs/design/scenes/from-life/concession-call-received.md"
lead: words
claimed-at: 2026-10-27T05:28:27.124Z
---

**What.** The count's result record names the winner and the totals, but only the loser's side of the call exists (concession-call, the loser's manager urging the dial) and the winner never hears from anyone. The loser's side asks who dials; the winner's side is the call itself. Add the winner's side from real calls (docs/design/scenes/from-life/concession-call-received.md): situation type concession-received on election-result, the runner-up on the totals cast as the caller (new opponent fill), on the phone, with four stances for the winner and the loser's answers chosen by the loser's traits.

**Rules.** Cast from the world: the caller is the runner-up on the result totals, never a stranger; the scene does not fire for the loser or without a second candidate. No dice: the loser's answers follow their traits through the shared decision table. Every line from the bank, no real name or quote. Replace never layer: no old line of this scene exists.

**Done when.** src/director/concession-received.test.ts in the played world (buildBenchWorld), places drawn from all 56 with a seed the builder did not choose, shows the count fire the winner's call with the runner-up as caller, the lead in votes citing the result record, four replies that are four stances, a recorded scene.reply and tie contact, and no call for the loser; bench screenshots at 1440x900.

**Files.** src/director/civic-roles.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/purpose-scene.ts, data/english/parts/scene-talk.json

**Notes.** Built on branch words/helper-b-concession-call-received (Helper B, Sonnet). Reached in a played world only by naming the type: an election-result entry stages several purpose scenes and the bench plays the first one it can word (race-won's victory night), so this call plays in ordinary play once scenes of one record play in turn (item director-moment-plays-every-staged-scene-in-turn). Lines vary by the speaker's bearing; versions by tie need a tie fact the scene-talk path does not carry (item words-scene-talk-lines-by-tie). The hard branch (a loser who will not concede until certification) is lines only: no recount record exists (item elections-contested-count-record). Oct 28, 21:50 UTC (elections wire session): src/director/concession-received.test.ts fails on clean main with GOLDEN_PATH_SEED=pet-run-1 in Hansville, Washington (5329430), draw 10, on one bank gap: "concession-received/follow/warn after scene-talk.reply-warn.i-ll-speak-to-my-people-either-way-i-d-rather-you-did-too" (no line for that node).
