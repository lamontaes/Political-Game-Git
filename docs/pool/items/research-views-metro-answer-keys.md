---
id: research-views-metro-answer-keys
title: "M1-10 asks for metro answer keys for views; only state and national keys exist, and territories fall back to national"
area: people
kind: research
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
standard: 2
model: sonnet
effort: medium
root: none
lead: researcher
after:
checked: fable 2026-11-10
---

**What.** Roadmap M1-10 says views are checked against state and metro answer keys. src/core2/modules/views.ts reads VIEWS_KEYS with state keys (CES 2024) and a national key only; no metro key exists, and a territory such as Barrigada, Guam opens on the national key ('no state sample'). M1-10 stays false until metro keys exist and the check reads them. The work is to add metro keys from fetched survey data with sample sizes and spread, read them in views.ts, and make the M1-10 command check a drawn place against its metro key where one exists.

**Cause.** Found in code: `VIEWS_KEYS` (src/core2/modules/views.ts, line 69) carries state keys (CES 2024) and a national key only; src/bench/m1-10-check.ts checks against them, so a territory such as Barrigada, Guam falls to the national key.

**Fix.** Add metro keys from fetched CES or comparable survey data with sample sizes and spread to data/research/views/, read them in views.ts, and make the M1-10 command check a drawn place against its metro key where one exists.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: each metro key is SOURCED from fetched survey data (CES or a comparable sample) with its sample size and spread, and it checks totals; it never assigns one person's view. Estimate, never UNKNOWN: a place with no metro key falls back to its state key, marked.

**Done when.** A second session runs the M1-10 command in a drawn place (place and seed named in the PR) and sees the town's opening views checked against its metro key where one exists, with the town's mean lean reported beside the key and a failure when the mean lean is moved outside the key's published sample spread. VIEWS_KEYS carries metro keys for the metros the survey samples, each with its source.

**Waits on.** Nothing.

**Files.** data/research/views/derive-ces-2024-views.py, src/core2/modules/views.ts, src/bench/m1-10-check.ts

**Notes.** TODO

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have added metro answer keys for views; the item says nothing on screen reads it.
