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

**What.** In a played town the campaign-staff firm ("Campaign Works", classification enterprise:political-consulting) opened with no cash and no business books, so its organizers and manager were never paid. In 11 drawn towns every one of them paid nothing at its last payday. The classification now maps to professional services, so the firm opens with the overall cash buffer, the business engine keeps its books, and campaigns buy polls and mail from it before any other seller.

**Rules.** Wire to the world: the firm's money comes from a campaign's purchase on the journal, read by the business engine. Replace, never layer: no second funding path was added. Estimate, never UNKNOWN: the buffer is the sourced overall median because no industry match is claimed.

**Done when.** `src/core2/campaign-consulting-firm.test.ts` passes in a drawn place and seed (named in its failure message): the firm opens with cash and books, is the poll and mail seller, and its wage flows paid at their last payday after 120 days.

**Files.** src/core2/data/business-books.json, src/core2/modules/campaigns.ts, src/core2/campaign-consulting-firm.test.ts

**Notes.** Nonprofits, unions and nursing homes were not unpaid in 11 drawn towns (the unions have dues, the nursing homes are a business kind). Two private classes still pay nothing and have their own items: world-utility-staff-never-paid and world-corporate-office-staff-never-paid. Survey: `scripts/core2-year/wages-unpaid-check.ts` (PR #5011).
