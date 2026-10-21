---
id: effect-web-reach
title: "Outcome-web birth moderators reach full and counted people by the same rule"
area: core
kind: wiring
priority: 2
size: M
status: done
claimed-by: effect-web-reach
pr: #5557
blocked-on:
source: PR #5557, branch effect-web-reach; no existing matching pool item found
claimed-at: 2026-10-20T06:24:39.356Z
---

**What.** PR #5557 adds an age-specific unemployment effect on births in src/core2/births-counted.ts. The full-person family-plan and birth paths do not read the new web factor, so the same cause affects the two tiers differently. Apply the same researched rule to both paths, or register the missing full-person path as an explicit stopgap and accurately label the partial change before it ships.

**Rules.** One model, two tiers: the same unemployment cause and age moderation must be read by full and counted birth decisions. Placeholders: any missing consumer has a registry row and code marker, with an accurate release declaration.

**Done when.** A test in a drawn place built with buildBenchWorld names the seed, place and web record id and proves the same age-specific unemployment factor reaches full and counted women; or the missing full-person path has a stopgap row and marker and the release declaration accurately says counted-only.

**Files.** src/core2/births-counted.ts, src/core2/births-plan.ts, src/core2/modules/renewal.ts, src/core2/outcome-web-reach.ts, src/core2/data/stopgaps.json

**Notes.** Sent back 2026-10-20 from PR #5557 (branch effect-web-reach): the new age-specific birth rule reaches only counted women without a registered tier omission; finish on that branch, merge main into it first.
