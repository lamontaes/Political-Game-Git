---
id: words-dev-mode-scene-trace
title: "Dev mode traces and forces every scene and shows each line's tie class"
area: words
kind: feature
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: words builder A
pr: 9661
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Owner, Nov 16 ("a part of the dev mode should be able to trace and force every scene to play. So see why every scene played and why dialogue options were chosen")
claimed-at: 2026-11-16
checked: words builder A 2026-11-16
---

**What.** Dev mode's Calendar panel lists every scene type the director stages, the way dev mode can cause it, how often it was staged for the player and why scenes were held back, the cause record and the people placed with their reasons, and every line the scene can say with the line register's tie class. Seen: the panel lists all 87 scene types and names the one dev mode cannot cause.

**Cause.** Found in code: dev mode's `DevMode.scenes()` lists the types and recipes but nothing showed the schedule rows' cause, held-back reasons or the lines a type can say with what each is tied to; the register (scripts/words/line-register.ts) holds the ties but no screen read it.

**Fix.** One view in src/bench/dev-views/scene-trace.ts (the #9619 registry) over `scenes()`, the director's schedule rows and the register; a page part in src/bench/ui/dev-scene-trace.mjs; forcing goes through `DevMode.forceScene` and writes a `scene-forced` mark. No second tracer.

**Time box.** Done in the PR: 3 hours, Sonnet at medium effort.

**Rules.** Replace, never layer: the view reads the existing scene list, the director's ledger and the register and keeps none of its own. A forced scene is a dev act marked on the record and is never counted as played for a Words stamp or a test. The scenes dev mode cannot cause are named, not hidden (at this head: polling-place).

**Done when.** The test src/bench/dev-scene-trace.test.ts passes at the pinned place (Ridgeville AL), and the browser check src/bench/dev-scene-trace.browser.mjs passes in a played life at Sheridan WY seed 7 with the 1440x900 screenshot. A second session (not the builder) opens a scene's lines in dev mode at a drawn place from all 56 (place and seed named) and sees each line's tie class.

**Waits on.** PR #9619 (the view registry) and PR #9658 (the line register).

**Files.** src/bench/dev-views/scene-trace.ts, src/bench/ui/dev-scene-trace.mjs, src/bench/dev-scene-trace.test.ts, src/bench/dev-scene-trace.browser.mjs, scripts/words/line-register.ts
