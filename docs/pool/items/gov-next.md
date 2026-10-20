---
id: gov-next
title: "Next:"
area: gov
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
after: words-speech-part-words,play-speech-builder,play-join-party
source: "docs/coordination/OPUS-GOV.md line 156 (unchecked checklist line)"
claimed-at:
---

**What.** This is the roll-up for the campaign day's last unbuilt pieces named in OPUS-GOV. Checked against main: the campaign-day controls (knock doors, volunteers, donations, endorsements, an ad, a poll) and a staged speech are on the politics sheet (src/bench/campaign.ts, src/core2/campaign-day.ts), and the filing overlay picks a party label. The three missing pieces are separate items: the English adapter for speech parts (words-speech-part-words), the part-by-part speech builder on /play (play-speech-builder, done) and a join-a-party control (play-join-party, done). When all three are done, this item is closed by playing the whole day once: file, knock doors, ask for a donation, give a staged speech and join a party.

**Rules.** No hand-written player text: control names come from src/bench/data/controls.json and speech lines from the English engine's banks. An effect is a read: each act is read by the voters' views or the campaign tallies by record id. Wire to the world: each act moves votes, money or relationships in a generated world. This is a game, not a spreadsheet: no filing-form or paperwork step is added. Replace, never layer: any bench stand-in for these acts is deleted in the same change.

**Done when.** In a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), the player from /play files for a local seat, knocks doors, asks for a donation, gives a staged speech and joins a party, and each act appears as a record id read by the voters' views or the campaign tallies; the browser spec src/bench/campaign.browser.mjs walks the controls. The owner plays it: runs a door-to-door day and sees who he met.

**Files.** src/bench/campaign.ts, src/bench/data/controls.json, src/bench/play.mjs, src/core2/campaign-day.ts, src/bench/campaign.browser.mjs

**Notes.** Checklist line from OPUS-GOV.md; verify against main before starting.

**Split (Oct 16).** Checked against main: the campaign-day controls (knock doors, volunteers, donations, endorsements, an ad, a poll) and a one-statement speech are on the politics sheet, and the filing overlay picks a party label. What is missing: the English adapter for speech parts (`words-speech-part-words`), the part-by-part speech builder on /play (`play-speech-builder`) and a join-a-party control (`play-join-party`). This item is done when the three are.

Oct 20 (pool feeder): spec written; the three children exist (words-speech-part-words in a PR, the other two done); the item closes with one end-to-end play of the day.
