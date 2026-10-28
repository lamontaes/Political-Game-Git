---
id: play-law-on-your-record-unreachable
title: "What the law in force puts on your own record is on no screen: the Law here panel that shows it has no menu entry"
area: play
lead: play-first
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: laws-and-effects lead, Oct 27 (from laws-in-force-every-question, PR #6289)
---

**What.** The play page still holds a "Law here" panel (`law()` in `src/bench/play.mjs`, about line 3918), but no menu, rail or button opens it: its key is in neither `mountMenu` nor `mountRail` nor the Politics group, and nothing calls `openSheet("law")`. It is the only screen that reads the card's `lawEffects` (`src/bench/card.ts:161`, from `reachOn`), so what the law in force puts on the player's own record (a duty, a right, a benefit the law reached them with) is on no screen. Issues (Politics → Issues) took over the list of laws in force and, with PR #6289, lists every policy question's law; the old panel's list duplicates it and would read a question's law as 1 or 0.

**Rules.** Replace, never layer: the old panel goes, and the one part only it shows, the law on your own record, moves to the screen that replaced it. Wire to the world: the line reads the card's reach rows by record id. No hand-written player text: the line's words come from worded labels (`player-screen-text`).

**Done when.** In a drawn place built with buildBenchWorld where a law in force reaches the player (a reach row naming them), Issues shows that law's effect on the player beside its card, read from the reach row by record id, and the `law()` panel and its title are deleted from `src/bench/play.mjs`; a browser check names the place and seed.

**You will see.** On Issues, the laws that reach you say what they do to you.

**Screenshot.** Before and after of Issues in a drawn place where a law reaches the player, in the PR body.

**Time box.** 2 hours, one lane agent.

**Files.** src/bench/play.mjs, src/bench/card.ts, src/bench/government.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27, while building `laws-in-force-every-question`, which leaves the unreachable panel alone because deleting it would leave the law on your own record on no screen.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: surface under Politics as sentences or delete the orphan (replace, never layer).
