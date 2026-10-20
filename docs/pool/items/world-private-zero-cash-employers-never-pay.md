---
id: world-private-zero-cash-employers-never-pay
title: "Nonprofits, unions, nursing homes and political consultancies hold no cash, so their staff are never paid"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/private-zero-cash-employers
pr: #5016
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T00:23:46.588Z
---

**What.** Employers the opening classifies outside the business kinds hold zero cash and so never pay their staff: community organizing nonprofits, labor unions, nursing homes, private schools and political consultancies ("Campaign Works"). In a one-year run (Moyock, North Carolina, seed sp3; Arlington, Wisconsin, seed sp1) Neighbors United requested $122,808 and paid $0, Campaign Works $327,120 and $0, the union local $23,714 and $21,214. `createOpeningEmployerCapital` (`src/core2/opening-capital.ts`) funds only classifications `classifyBusiness` knows; the rest start at zero and take in nothing, since no customers buy from them. Give each a cash source that follows its causes: a nonprofit's donations and grants, a union's member dues, a nursing home's resident payments and Medicaid, a private school's tuition, a consultancy's campaign clients, so staff are paid from what the employer takes in.

**Rules.** An effect is a read: the employer's receipts come from other engines' payments (households, campaigns, benefits), not a top-up. Every dollar balances. No dice. Estimate, never UNKNOWN: a figure with no source starts from the real average marked ESTIMATED. One rule, all 56 places.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, each of these employers with staff pays them in full on every payday from money it received (journal record ids named), and a test beside `src/core2/opening-capital.test.ts` states it.

**Files.** src/core2/opening-capital.ts, src/core2/modules/business.ts

**Notes.** Found while building world-public-employer-staff-never-paid (Oct 17, claude/public-staff-never-paid). Those jobs are few (one to four per employer) so the size of the loss is small per town, but each is a person with a job and no pay.
