---
id: play-filing-petition-on-screen
title: "The filing counter and the campaign screen show the petition: signatures the clerk will count, those held, the deadline and the clerk's verdict"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Filing is now a petition (owner, Oct 28, 18:15 UTC); the elections engine keeps the petition record on branch claude/elections-petition-filing (petitionOf: the rule read, the signatures needed, the signers with the day and how they were asked, and the clerk's check). The bench shows none of it yet: the filing result shows only its status label, and the campaign screen shows doors knocked but not signatures. The counter should say how many signatures the clerk will count and by what day, the campaign screen should show the signatures held against those needed, and the morning after the deadline the player should see the clerk's verdict (the petition-checked record). The filing route already spends the afternoon on the clock.

**Rules.** No hand-written player text in code: every label comes from the English engine's banks or the controls file, with Review: words. One rule, all 56 places: the counts and the deadline come from the petition record, never typed. Player screen text: no raw ids, ISO dates or unrounded numbers on screen.

**Done when.** In a drawn place (named with its seed) in the played world, a browser check files at the counter, reads the needed signatures and the deadline on screen from the petition record, canvasses until the deadline, and screenshots the clerk's verdict the morning after, naming the petition record id; the shots land in docs/play-first/shots.

**Files.** src/bench/filing.ts,src/bench/campaign.ts,src/bench/play.mjs,src/bench/data/controls.json

**Notes.** lead: play-first. Filed by the elections wire session, Oct 28, for the petition line of wire-elections-and-campaigns; blocked on that PR landing.
