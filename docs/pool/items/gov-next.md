---
id: gov-next
title: "Next:"
area: gov
kind: feature
priority: 2
status: blocked
claimed-by: claude/gov-next-campaign-controls
pr:
blocked-on: "words-speech-part-words, play-speech-builder, play-join-party"
milestone:
source: "docs/coordination/OPUS-GOV.md line 156 (unchecked checklist line)"
claimed-at: 2026-10-16T02:51:24.228Z
---

**What.** OPUS-GOV's last unchecked line names two pieces of the campaign day that were built in the engine but never given controls or words: the bench controls for campaign day, speech parts and joining a party, and the English adapter for speech parts. Without them the player cannot knock a door, ask for a donation or join a party from `/play`, and a speech can only be a stub. Verify what is on main (`src/bench/campaign.ts` already has a speech case and `src/core2/campaign-day.ts` has the engine calls), then finish the controls and have the English engine word the speech parts.

**Rules.** No hand-written player text: button names and speech lines come from `src/bench/data/controls.json` and the English engine's banks, never typed by hand; An effect is a read, not a record: the controls call the engine's `knockDoors`, `askToVolunteer`, `askForDonation`, `giveSpeech` and `joinParty`, and the bench reads `doorsKnockedCount`; Wire to the world: each act moves votes, money or relationships in a generated world; This is a game, not a spreadsheet: no filing-form or paperwork step is added; the campaign day is people and choices; Replace, never layer: any bench stand-in for these acts is deleted in the same change; Speed: the campaign day acts on the player's choices only.

**Done when.** In a drawn place and seed (named) the player, from `/play`, files for a local seat, knocks doors, asks for a donation, gives a staged speech and joins a party, and each act appears as a record id read by the voters' views or the campaign tallies. A browser spec in `src/bench/sheets.browser.mjs` (or a new `campaign.browser.mjs`) walks the controls, and the screenshot at 1672x941 is merged on the owner's yes. The owner plays it: runs a door-to-door day and sees who he met.

**Files.** src/bench/campaign.ts, src/bench/data/controls.json, src/bench/play.mjs, src/core2/campaign-day.ts, src/director/speech-builder.ts

**Notes.** Checklist line from OPUS-GOV.md; verify against main before starting.

**Split (Oct 16).** Checked against main: the campaign-day controls (knock doors, volunteers, donations, endorsements, an ad, a poll) and a one-statement speech are on the politics sheet, and the filing overlay picks a party label. What is missing: the English adapter for speech parts (`words-speech-part-words`), the part-by-part speech builder on /play (`play-speech-builder`) and a join-a-party control (`play-join-party`). This item is done when the three are.
