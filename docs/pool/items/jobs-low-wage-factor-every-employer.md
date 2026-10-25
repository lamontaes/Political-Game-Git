---
id: jobs-low-wage-factor-every-employer
title: "A higher wage floor's effect on low-wage jobs reaches the organizations that hold them"
area: core
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The two minimum-wage links (minimum-wage-to-low-wage-jobs, federal-minimum-wage-to-low-wage-jobs) scale only the staffing targets of employers the jobs engine reviews (lowWageStaffFactor in src/core2/jobs-web.ts, read in reviewEmployers in src/core2/modules/jobs.ts). In played towns those employers hold no job under the line; the town's low-wage jobs sit with organizations outside the employers table (stopgap SG-LABOR-low-wage-unreviewed: in Sail Harbor, Connecticut, seed 6bad944e1a974146, about 190 of 208 low-wage jobs). So the static matrix grades both links as reaching, but no record moves. Make the factor reach every organization whose jobs labor.low-wage-jobs counts, by the same rule for full and counted workers.

**Rules.** An effect is a read, not a record: staffing must change in a played world because the factor was read. One model, two tiers. No dice: which job goes follows the employer's own records, never a draw.

**Done when.** In a drawn bench world with the federal minimum wage raised (seed named), the low-wage jobs of at least one organization outside today's reviewed employers change after the link's lag, by record id, and SG-LABOR-low-wage-unreviewed is resolved.

**Files.** src/core2/jobs-web.ts, src/core2/modules/jobs.ts

**Notes.** Filed Oct 25 by the effects lead while auditing web-reach-labor; the family's waiting links are named on claude/web-reach-labor.
