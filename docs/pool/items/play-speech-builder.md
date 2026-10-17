---
id: play-speech-builder
title: "The player builds a speech part by part from /play"
area: play
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/speech-screen
pr: #4815
blocked-on:
source: "split from gov-next, Oct 16"
claimed-at: 2026-10-16T20:26:27.378Z
---

**What.** The bench's Speech button gives one fixed statement. The engine offers four parts at each step of a speech; add the bench routes (offer the four parts, choose one, deliver the finished speech) and the controls on the politics sheet, with the words from the English adapter, so the player builds the speech and sees the people it reached. The act records through the campaign engine as for any speech.

**Rules.** No hand-written player text: control names come from src/bench/data/controls.json. Replace, never layer: the single-statement speech control is deleted in the same change. This is a game, not a spreadsheet: a speech is choosing among four parts, not a form.

**Done when.** In a drawn place and seed (named in the PR body) the player files for a local seat, builds a speech of an opening, body parts and a close from /play, and the delivered speech's cause records are read by the voters' views, shown by record ids; a browser spec in src/bench/campaign.browser.mjs walks the controls and a 1672x941 screenshot is attached.

**Files.** src/bench/campaign.ts, src/bench/handler.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Split from gov-next. After words-speech-part-words.
