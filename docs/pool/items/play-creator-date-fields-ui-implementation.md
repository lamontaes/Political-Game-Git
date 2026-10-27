---
id: play-creator-date-fields-ui-implementation
title: "Align creator birthday fields and show their input borders on the bench"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #6087
blocked-on:
source: added with npm run pool -- add
---

**What.** The creator birthday selectors sit in separate rows and its name inputs hide their borders at rest. Align the three date selectors and make every creator input show its box when empty or filled. This bounded bench implementation is separate from the original item installed-build acceptance under the October25 ruling.

**Rules.** Replace, never layer: replace the three stacked birthday rows with one aligned row, retaining all existing fields and actions. Browser visual acceptance: inspect native screenshots and use the changed controls by ordinary pointer and keyboard before merging.

**Done when.** At1440x900 and1024x768 on the bench the three birthday selectors share top and bottom edges, all name and date inputs show visible borders empty and filled, and real pointer and keyboard checks pass without page errors. Native screenshots are inspected and the subsequent drawn place and seed are named.

**Files.** src/bench/play.css, src/bench/play.html, src/bench/creator-fields.browser.mjs

**Notes.** Bounded implementation for PR6087; play-first-03-creator-date-fields-aligned stays open for owner installed-build acceptance.
