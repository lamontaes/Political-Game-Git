---
id: play-law-page-lists-replaced-law-steps
title: "The law page lists a replaced law's later steps as state laws that reached no one"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
source: Account lead thread "Check state and federal laws take effect", Nov 14, 2026 (/mnt/project-files/laws/take-effect.md)
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** After a bill replaces a law that had later steps, the Issues law page's "What this did" still lists those steps as laws, each saying "It has reached no one yet". In Eveleth, Minnesota, after the state raised the minimum wage to $14.13 from August 1, 2025, the page lists "State law $11.41/hour from January 1, 2026" and "$11.87/hour from January 1, 2027", which will never take effect: the law in force on both dates is $14.13 (read with `lawInForce` on each date). Seen: Politics, Issues, Minimum wage, "What this did" (/mnt/project-files/laws/state-minimum-wage-what-this-did.png).

**Cause.** Measured: Eveleth, Minnesota (2719934), seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, train 9ed4bf9c. Found in code: src/bench/law-did.ts `lawDid` keeps every row "dated from the opening on" (the starting law's own later steps qualify), and its `replacedOn` only looks for later-dated rows, while the law reader lets an enacted row outrank later starting rows (`lawRowIsLater`, src/core2/laws-in-force.ts line 180).

**Fix.** In `lawDid`, drop a starting row that an enacted row outranks by `lawRowIsLater` before its date, and take the replaced row's `replacedOn` from the same rule, so the page shows only laws that took or will take effect.

**Time box.** 1.5 hours for one Sonnet session.

**Rules.** Replace, never layer: the page reads the law reader's own rule for which row governs and keeps no version of its own.

**Done when.** A second session, not the builder, in a drawn place with a phased minimum wage passes a state raise in dev mode and opens the law page: the replaced steps are gone or say they were replaced, by date.

**Waits on.** Nothing.

**Files.** src/bench/law-did.ts, src/core2/laws-in-force.ts
