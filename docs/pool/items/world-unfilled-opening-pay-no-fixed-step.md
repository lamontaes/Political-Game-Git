---
id: world-unfilled-opening-pay-no-fixed-step
title: "An unfilled opening's raise reads the employer, not a fixed 3% after 60 days"
area: world
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/unfilled-pay-by-books
pr: #5146
after:
blocked-on:
source: "owner ruling Oct 16 (no cap, no fixed step); acting CTO, Oct 19, closing PR #4992"
claimed-at: 2026-10-19T20:22:31.720Z
---

**What.** PR #4838 (`world-unfilled-opening-pay`) raises an unfilled opening's pay by a fixed 3% (`jobsRaiseStepShare`) after a fixed 60 days (`jobsRaiseAfterDays`), which the owner's Oct 16 ruling forbids: "if they can't afford it they can't afford it; if they're stubborn they might not do it." The raise reads the employer's books (what the seat costs empty against what a higher wage costs filled), the empty seat's cost to the business, and the owner's traits, on a sliding scale: no step, no cap, no fixed waiting period. Real wage growth for open positions calibrates the spread of outcomes, never one coefficient. The two parameters are removed, not left beside the new read.

**Rules.** No dice: no fixed percentage decides what a business does, and no fixed day count decides when it decides. An effect is a read: the raise follows from the employer's own books and traits as the records show them.

**Done when.** A played year in a drawn place (`buildBenchWorld`, every module installed) shows one employer raising an opening's pay by its own reasons on named dates, and one that could not or would not, each by record id with the books it read; `jobsRaiseStepShare` and `jobsRaiseAfterDays` are gone from src/, and a test names the place and seed. The owner plays it: a business that is short-handed and flush offers more; a tight or stubborn one does not.

**Files.** src/core2/modules/jobs.ts, src/core2/data/parameters.json

**Notes.** The read-only crash in the same path is jobs-raise-unfilled-pay-read-only (#4967); land that first or on the same branch. The GLM Flash trial (#4992) that was to do this opened no PR.

Oct 20: PR #5146 merged to main: an unfilled opening is raised from the employer's books and its owner, with no fixed step or wait.
