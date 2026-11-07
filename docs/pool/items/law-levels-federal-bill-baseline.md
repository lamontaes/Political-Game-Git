---
id: law-levels-federal-bill-baseline
title: "Congress drafting reads the federal rate applicable to the played state"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The law reader represents a state-specific federal amount with the target state jurisdiction. billValueInForce searches only for US when Congress drafts, so the existing Medicaid-match law is shown as no baseline. Read the federal level for the federal body.

**Rules.** Use the existing lawInForce answer and one drafting reader. Keep state and local body matching unchanged. No view, campaign, electorate or state-bar edits.

**Done when.** A generated-world test drawn from all 56 proves the Congress catalog and billValueInForce both return the actual opening federal Medicaid-match amount and source row for that state. It fails on old code, passes ten fresh draws, and a new game opens and plays four weeks.

**Files.** src/core2/laws-bill-values.ts,src/core2/federal-bill-baseline.test.ts

**Notes.** Astra follow-up found while tracing federal amount replacement. Two-hour time box, one session, no helpers. This is a drafting read; it does not invent a uniform current FMAP or claim played votes.
