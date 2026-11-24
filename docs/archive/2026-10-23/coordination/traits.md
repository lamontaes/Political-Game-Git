# OPUS-TRAITS: every trait in every decision

> **History.** This describes the old engine or a process that ended in October 2026. Don't follow it; read `AGENTS.md`, `ARCHITECTURE.md` and `docs/README.md`.

Only OPUS-TRAITS writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** `data/content/trait-act-pulls.json`, `data/content/trait-decisions.json`, `data/content/trait-coverage.json`, `src/core2/trait-decisions.ts`, the trait coverage test, and the trait terms in other pillars' decisions (small commits, listed in the PR).
- **Branch:** `opus-traits` (PR #4056).
- **Model:** Opus, high.

## What the owner can play now

- Every generated person carries all 98 traits, and can be low as well as high in each one. Those traits change their choices across 60 decisions: work, jobs, homes, loans, businesses, running for office, a bribe, believing a lie, having a child, moving away and retirement; voting and turning out, backing the incumbent, ballot measures, recalls, signing petitions, volunteering, giving, endorsing, joining a party or an employers' group, accepting an appointment, filing for unemployment, passing on news; and in office, every legislator's vote, a chair's hearing, an executive's signature or veto, budget priorities, the agenda, constituent cases and staff follow-through.

## Checklist

- [x] A researched low side and a cited basis for all 98 traits (Big Five and HEXACO facets plus each trait's own research).
- [x] Every full person carries every trait. The level comes from one of the five temperament dimensions plus the person's own part, cut at the 10/20/40/20/10 levels.
- [x] The chooser scores one trait lean per person, so carrying every trait doesn't slow a choice.
- [x] A decision table listing every person-decision, its options and each option's act kinds (30 decisions).
- [x] Formula decisions use the same trait lean. Five that used hand-picked trait sums now read every trait: candidacy, corruption, speech, business, moves. Seven had no trait term at all and now have one: counted job look/retire/apply/accept, retirement claim, blame, believing a lie.
- [x] Coverage table and test: every trait's high side and low side each change at least 5 decisions. In a generated town of a random place, everyone high or low in a trait chooses differently from the middle in every decision listed for that end.
- [x] The government and civic engines that main gained on Oct 12 (30 more decisions), through three Sonnet sub-agents on separate files (voting/measures/recalls; campaigns/elections/parties/groups/offices; legislature/agenda/cases/staff/benefits/news), reviewed and committed one module at a time.
- [x] The trait lean is monotonic: summed pulls over a fixed per-kind norm (`traitPullsPerKind`), so a pull toward an option always raises it. The old mean-of-pulls could cancel a trait out.
- [x] Group decisions by bands and institutional rules are listed under "outside" in the decision table, each with its reason.

## Sub-agents

- Oct 12: one Explore survey of the first decisions and one of the new government engines (read-only). Three Sonnet builders, one per file group above; all finished, and their tests pass.

## Needs from other sessions

- None blocking. Each pillar whose file I touched is listed in the PR body, commit by commit.
- OPUS-GOV: `turnoutBase` moved from -1 to -0.6 and `recallOrganizerEffort` from 1.3 to 0.5, so turnout and recalls still happen with the smaller trait term. Please re-check both against real turnout and recall counts.
- OPUS-GOV: appointers are party-side numbers, not people. Once an appointer is a person, the nomination can weigh their traits.

## Questions for the owner

- One-sided facets such as "Shy" or "Cruel" were researched as "present or not", so the old catalog says a low score "does not establish the opposite". Your order is that both ends matter, so a person low in "Shy" now leans toward speaking up. Each low side is grounded in the matching Big Five or HEXACO facet's opposite pole and cited in the data.
