---
id: laws-nine-links-rights-env
title: "Every rights, technology, environment, farms and parks law passes all nine wiring links in a played year"
area: laws
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr: #5669
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at:
---

**What.** This is one bounded family of the umbrella `laws-wiring-every-law`, which no single family PR could finish. Every law in the rights, technology, environment, farms and parks family must pass all nine links of the law-wiring standard: it exists in all 56 places, a body can enact and repeal it, it reaches people and organizations, the engine it changes reads it, it moves money between real accounts, it moves its outcome-web measures, people learn of it only by a read, repeal stops it, and one code path serves every place. The laws, as the Oct 20 matrix assigns them (the lead corrects the list on its first rebuild): ban-discrimination-in-housing-and-work, restrict-abortion, dedicated-parks-funding, budget-line:parks, age-verification-for-social-media, restrict-government-facial-recognition, consumer-data-privacy-law, clean-air-plan-for-polluted-counties, budget-line:naturalResources, limit-groundwater-withdrawal, protect-farmland-from-development, budget-line:highways and shift-highway-funds-to-transit.

**Rules.** An effect is a read, not a record: the engine that pays or decides reads the law and records whom it applied it to through `lawApplied`. One model, two tiers: counted groups take the same rule as full people, times the count. Ask why: a person attributes a change to the law only after news they received, a conversation, a notice or an ad. The chain is the acceptance: each law is followed to a named person and a dollar.

**Done when.** In a played year (`buildBenchWorld`, every module installed) in two places drawn from all 56 with seeds the builder did not choose, named in the PR body, `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade every law in this family wired on all nine links in `docs/reports/law-wiring-matrix.json`. A link declared not applicable in `scripts/law-wiring/declared.json` with its statute or research reason counts; a registered stopgap does not. The family test names, for each law, its `lawApplied` record id, the journal entry of the money and the person or household reached. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** src/core2/modules/business.ts, src/core2/data/laws/reach-group-a.json, src/core2/law-reach/group-a.ts, src/core2/law-reach/applied.ts

**Notes.** Split Oct 24 by the CTO from `laws-wiring-every-law` (the lead order: `docs/work-orders/lead-laws-2026-10-24.md`). Family PR state on Oct 23: open, #5669 (branch claude/law-wiring-rights-env), conflicting with main since Oct 22 (src/core2/modules/business.ts) and sent back to correct its removed-row count. A PR for this family names this item on line 1 (`Pool item: laws-nine-links-rights-env`) and `Lead: laws` in its body, never the umbrella: family PRs looped because the umbrella's done-when is one no single family can meet, and a bare umbrella id on line 1 closes the umbrella on merge. The discrimination ban is not a question for the owner: he ruled sex and race go on the record (OWNER-DECISIONS.md, Oct 24, "Sex and race on the record") and, on Oct 26, that discrimination is yes and is not asked again. The ban reads age, which the world already records, until `people-protected-traits-on-record` lands; the stopgap SG-GOV-REACH-A-discrimination-protected-traits (missing-mechanic) carries the gap and no owner-decision stopgap is registered for it. The bounded item `laws-nine-links-rights-eight` takes eight of the thirteen laws; this item stays open for the other five.

Sent back 2026-10-25 from PR #5669 (branch claude/law-wiring-rights-env): family Done-when still partly met at 9 of 13 laws; two stopgap web links and two partial reach/allPlaces chains cannot complete the all-laws item; complete them or bound the landed subset while retaining family open; finish on that branch, merge main into it first.
