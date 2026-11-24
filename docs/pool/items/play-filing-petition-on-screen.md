---
id: play-filing-petition-on-screen
title: "The filing counter and the campaign screen show the petition: signatures the clerk will count, those held, the deadline and the clerk's verdict"
area: play
kind: feature
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-filing-petition-on-screen
pr: #8466
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: medium
root: rc7-player-cannot-drive
checked: fable 2026-11-10
claimed-at: 2026-11-11T01:54:18.288Z
branch: claude/pool-play-filing-petition-on-screen
---

**What.** Filing is a petition (owner, Oct 28): the elections engine keeps the petition record (`petitionOf`: the rule read, the signatures needed, the signers with the day and how they were asked, and the clerk's check). The bench shows none of it: the filing result shows only its status label, and the campaign screen shows doors knocked but not signatures. The counter should say how many signatures the clerk will count and by what day, the campaign screen should show the signatures held against those needed, and the morning after the deadline the player should see the clerk's verdict (the petition-checked record). The filing route already spends the afternoon on the clock.

**Cause.** Found in code: `petitionOf` in src/core2/modules/elections.ts (line 1362) keeps the rule, the signatures and the clerk's check; src/bench/filing.ts (lines 220 to 301) uses the petition for status only, and src/bench/campaign.ts shows no signatures.

**Fix.** Show the signatures the clerk will count and the deadline at the counter, the signatures held against those needed on the campaign screen, and the clerk's verdict the morning after the deadline, all read from the petition record and worded by the English engine (controls file or banks, Review: words).

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: every label comes from the English engine's banks or the controls file, with Review: words. One rule, all 56 places: the counts and the deadline come from the petition record, never typed. Player screen text: no raw ids, ISO dates or unrounded numbers on screen.

**Done when.** A second session, in a drawn place (named with its seed) in the played world, files at the counter and reads the needed signatures and the deadline on screen from the petition record, canvasses until the deadline, and screenshots the clerk's verdict the morning after, naming the petition record id; the shots land in docs/play-first/shots.

**Waits on.** Nothing.

**Files.** src/bench/filing.ts, src/bench/campaign.ts, src/bench/play.mjs, src/bench/data/controls.json, src/core2/modules/elections.ts

**Notes.** lead: play-first. Filed by the elections wire session, Oct 28, for the petition line of wire-elections-and-campaigns; blocked on that PR landing.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:54 UTC) on branch claude/pool-play-filing-petition-on-screen.
