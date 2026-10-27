---
id: words-scene-concession-received
title: "The winner takes the loser's call after the count: a phone scene cast from the result record's totals"
area: words
kind: feature
priority: 1
size: S
status: claimed
claimed-by: words/helper-b-concession-call-received
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T05:28:27.124Z
---

**What.** The count's result record names the winner and the totals, but only the loser's side of the call exists (concession-call, the loser's manager urging the dial) and the winner never hears from anyone. Add the winner's side from real calls (docs/design/scenes/from-life/concession-call-received.md): situation type concession-received on election-result, the runner-up on the totals cast as the caller (new opponent fill), on the phone, with four stances for the winner and the loser's answers chosen by the loser's traits.

**Rules.** Cast from the world: the caller is the runner-up on the result totals, never a stranger; the scene does not fire for the loser or without a second candidate. No dice: the loser's answers follow their traits through the shared decision table. Every line from the bank, no real name or quote. Replace never layer: no old line of this scene exists.

**Done when.** src/director/concession-received.test.ts in the played world (buildBenchWorld), places drawn from all 56 with a seed the builder did not choose, shows the count fire the winner's call with the runner-up as caller, the lead in votes citing the result record, four replies that are four stances, a recorded scene.reply and tie contact, and no call for the loser; bench screenshots at 1440x900.

**Files.** src/director/civic-roles.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/purpose-scene.ts, data/english/parts/scene-talk.json

**Notes.** TODO
