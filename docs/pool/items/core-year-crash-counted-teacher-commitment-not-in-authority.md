---
id: core-year-crash-counted-teacher-commitment-not-in-authority
title: "A played year stops on Dec 5 in Discovery Harbour, Hawaii (seed m7a): a counted public-schools teacher's work commitment is not in the school district's pay authority index"
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: claude/counted-teacher-authority
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T20:12:32.812Z
---

**What.** npm run speed:year -- --seed m7a (Discovery Harbour, Hawaii, place key 1505900) throws 'Public pay does not match its actual owned work obligation.' (src/core2/public-work-pay.ts:177, from the work module's payroll day) on 2025-12-05, with main merged and the private-share re-enrollment fix (PR 5746) applied. Measured by adding the ids to the message: job job:public-schools:person_14229a4a93709a7f:counted:2025-10-01, employer organization:public-schools:jurisdiction_65b8870c7e9750bd. The commitment's publicPayAuthorityId equals the employer's authority id (opening-public-pay:d2b4516e2c76dae1) but the authority's commitment index (commitmentIndex(authority)) does not list the commitment, so resolvePublicWorkPayDue throws. The job is a counted worker's (id ends counted:2025-10-01) that the school engine or a fill-in created; find which path starts a counted public-schools job without joining its commitment to the authority's workCommitmentIds, and join it there, as PR 4891 did for a staffing-law hire. Earlier closes of this message: core-year-crash-public-pay-work-obligation and world-public-hire-joins-pay-authority.

**Rules.** Wire to the world: a public hire is paid through its employer's pay authority from the first payday; every dollar balances. One rule, all 56 places: fix the path, not the place. Replace, never layer: one place joins a commitment to its authority.

**Done when.** In a one-year buildBenchWorld run on the repro place (seed m7a) and on two further drawn places (named, with seeds) no payroll day throws, and a test in src/core2 asserts that every commitment of a job at an employer with a public pay authority is listed in that authority's index, by job id.

**Files.** src/core2/public-work-pay.ts,src/core2/opening-public-pay.ts,src/core2/modules/school.ts,src/core2/modules/counted-demotion.ts

**Notes.** TODO
