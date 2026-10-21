---
id: laws-medicaid-medical-debt-link-silent-ridgebury
title: "The Medicaid-to-medical-debt web link never fires in Ridgebury, CT"
area: laws
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/medicaid-debt-link
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T11:12:55.982Z
---

**What.** law-wiring-health-schools.test.ts fails on main in Ridgebury, Connecticut (place 0963830, world seed 2186551f3981cb41cc86ebd5984f5ab14c19f77cc7abeac86bca6eabf3716631): Medicaid expansion was in force at the start and is repealed and held for eight months, the medicaid-expansion-to-coverage link fires, but medicaid-expansion-to-medical-debt never does. Other drawn places pass.

**Rules.** TODO

**Done when.** The pinned Ridgebury world passes law-wiring-health-schools.test.ts, or the PR names by record why the medical-debt link has no cause there and the test's place draw accounts for it.

**Files.** src/core2/law-wiring-health-schools.test.ts, src/core2/data/outcome-web/

**Notes.** TODO
