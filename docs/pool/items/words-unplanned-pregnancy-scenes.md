---
id: words-unplanned-pregnancy-scenes
title: "An unplanned pregnancy and its decision are told by the English engine and the director"
area: words
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: sonnet
effort: medium
root: design-life-record
source: added with npm run pool -- add
---

**What.** Per the owner's Oct 20 ruling nothing new is shown to the player about their own household, so this is only for people the player meets or hears of. When a background person's unplanned pregnancy and decision reach the player through a conversation or the news, the English engine words it from the plan record. The words come from the engine's banks and the director only stages them when the record reaches the player. Nothing is shown for the player's own household.

**Cause.** Design: the owner's Oct 20, 2026 ruling (nothing new shown for the player's own household), the plan record in src/core2/births-unplanned.ts, and docs/design/life-record.md.

**Fix.** Word a met person's unplanned pregnancy and decision from the plan record through the English engine and the director, only when it reaches the player in a talk or news; show nothing for the player's household.

**Time box.** 6 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the decision comes from the plan record, never a roll. One rule, all 56 places: proved in a drawn place. No hand-written player text: the words are bank pieces. Replace, never layer.

**Done when.** A second session (not the builder) plays a one-year run of the played world (`buildBenchWorld`) in a drawn place (place and seed named) and sees a scene or news line for a met person's unplanned pregnancy worded by the English engine from the plan record, cited by record id, and sees nothing shown for the player's own household.

**Waits on.** Nothing.

**Files.** data/english/parts/, src/director/, src/core2/births-unplanned.ts

**Notes.** Split from people-unplanned-pregnancy-decision (PR for claude/political-game-pool-yucp92-bg).
