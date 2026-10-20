---
id: gov-offices-spec-opening-careers-rillito
title: "Offices spec M2-01 fails in Rillito, Arizona: a holder at the opening has no earlier term or a term that begins on the opening"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/rillito
pr: #5696
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T15:16:16.536Z
---

**What.** The accepted golden-path spec M2-01 (src/core2/offices.test.ts) fails on clean main in Rillito, Arizona, place key 0459900, seed 181ef9d4696d2f8756c2a8a2a892f0d4aaf02e26b55d559f1f4f929005317f91. The failing case is 'holders at the opening have careers of real length: terms begin before it and earlier terms are on the record'. It turns every pull request's golden-path run red when the PR draw lands on this place, as it did on the law-wiring rights pull request.

**Rules.** Ask why: name the seat and the holder whose opening term or record is short, and the line in the offices seeding that produced it, before changing the test or the seeding.

**Done when.** GOLDEN_PATH_SEED=181ef9d4696d2f8756c2a8a2a892f0d4aaf02e26b55d559f1f4f929005317f91 GOLDEN_PATH_PLACE_KEY=0459900 npx vitest run src/core2/offices.test.ts passes in Rillito, Arizona, and the test still passes in two further places drawn at random from all 56, named with their seeds.

**Files.** src/core2/offices.test.ts, src/core2/modules/offices.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5696 (branch claude/rillito-careers): merging main conflicts in src/core2/modules/offices.ts; finish on that branch, merge main into it first.
