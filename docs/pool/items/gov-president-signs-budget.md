---
id: gov-president-signs-budget
title: "A federal budget the president proposed is enacted with no signature or veto on record"
area: gov
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/president-signs-budget
pr:
blocked-on:
milestone:
source: "found closing gov-president-not-newsworthy: Liberty, New York, seed president-news-1"
claimed-at: 2026-10-16T03:47:20.984Z
---

**What.** In a three-year played world the only federal bills are the president's own budgets (H.R. 2 on October 1, 2025 and another on October 1, 2026), and Congress's roll calls enact them with no `executive-action` event. So a national outlet has a roll call to print but never a president's signature or veto. The register already rules it: "The executive (owner, Oct 14) ... signs or vetoes everywhere" (`DECISION-REGISTER.md` line 108). Build it: a budget the chambers pass goes to the executive's desk like any bill (federal, state, county and city), and the signature or veto is recorded as `executive-action`.

**Rules.** Decided: the executive signs or vetoes everywhere (register line 108). The chain is the acceptance: the budget line that changes, the payment, and the story.

**Done when.** A year in a drawn place shows a national outlet printing the president's signature or veto of an enacted budget, by record id.

**Files.** src/core2/modules/legislature.ts (`enactBudget` path), src/core2/modules/budgets.ts

**Notes.** Roll calls on federal budgets are now filed at the national level (gov-president-not-newsworthy), so the president's budget is already news; the signature is the missing half.
