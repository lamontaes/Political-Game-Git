---
id: life-sentences-open-the-trace-in-dev-mode
title: "In dev mode a sentence of a life story cannot be clicked to open its record"
area: play
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/pool-life-sentences-open-the-trace-in-dev-mode
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: design-life-record
source: the life record's second session, Nov 10 (not seen; its note is on core-life-record); cause found by Fable
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:34:14.755Z
branch: claude/pool-life-sentences-open-the-trace-in-dev-mode
---

**What.** Every sentence of My life and of a person's card comes from a record, and dev mode is how a second session checks that. The record ids are there and the Trace opens them when asked by id, but the sentence itself takes no click. So a checker cannot go from the words to the record on the screen. That is the check the acceptance rule asks for.

**Cause.** Measured: the second session's acceptance check on main b094bee1 (Notes on docs/pool/items/core-life-record.md): in Rock Hill, Missouri (seed 0cf1896a-28d6-4915-b0d4-7cf95baa3efd), "the sentences carry record ids and the Trace endpoint opens all three, but the sentence itself is not clickable". Found in code by search, not read line by line: each line of a story carries its record id (`HistoryLine`, src/bench/card.ts line 574), the paragraphs are drawn by `lifeStory` (called at src/bench/play.mjs line 3163), and the Trace's own control is src/bench/ui/dev-trace-box.mjs. The first step is to read how `lifeStory` draws a sentence and confirm it drops the record id.

**Fix.** With dev mode on, draw each sentence of a life story so that a click opens the Trace on its record id, using the Trace control the other lists use (src/bench/ui/dev-trace-box.mjs), in My life and on every person card. With dev mode off the story is plain text, as now. Follow .agents/skills/screen-to-mock/SKILL.md: no new control and no new look.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the one Trace control the other lists use, never a second one beside it. The lane owns src/bench. One shared control for the Trace, never a second one. Read-only screens spend no game time and create no facts. No raw record id is shown to a player with dev mode off.

**Done when.** A second session, on main in a drawn place (place and seed named), turns dev mode on, clicks three sentences of My life and three on a household member's card, and each opens the Trace on a record; with dev mode off the sentences take no click. A browser check under src/bench names the place and seed, with a screenshot at 1440 by 900.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/card.ts, src/bench/ui/dev-trace-box.mjs

**Notes.** Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:34 UTC) on branch claude/pool-life-sentences-open-the-trace-in-dev-mode.
