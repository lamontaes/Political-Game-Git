# OPUS-TRAITS: every trait in every decision

Only OPUS-TRAITS writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** `data/content/trait-act-pulls.json`, `data/content/trait-decisions.json`, `data/content/trait-coverage.json`, `src/core2/trait-decisions.ts`, the trait coverage test, and the trait terms in other pillars' decisions (small commits, listed in the PR).
- **Branch:** `opus-traits` (PR #4056).
- **Model:** Opus, high.

## What the owner can play now

- Every generated person carries all 98 traits, and can be low as well as high in each one. Those traits change their choices: going to work, looking for a job, taking an offer, buying a home, borrowing, starting a business, running for office, retelling a speech, a bribe, blaming an official, believing a lie, having a child, moving away and when to claim retirement. Two people with the same money and job now choose differently because of who they are.

## Checklist

- [x] A researched low side and a cited basis for all 98 traits (Big Five and HEXACO facets plus each trait's own research).
- [x] Every full person carries every trait. The level comes from one of the five temperament dimensions plus the person's own part, cut at the 10/20/40/20/10 levels.
- [x] The chooser scores one trait lean per person, so carrying every trait doesn't slow a choice.
- [x] A decision table listing every person-decision, its options and each option's act kinds (30 decisions).
- [x] Formula decisions use the same trait lean. Five that used hand-picked trait sums now read every trait: candidacy, corruption, speech, business, moves. Seven had no trait term at all and now have one: counted job look/retire/apply/accept, retirement claim, blame, believing a lie.
- [x] Coverage table and test: every trait's high side and low side each change at least 5 decisions. In a generated town of a random place, everyone high or low in a trait chooses differently from the middle in every decision listed for that end.
- [ ] The government engines that main gained on Oct 12: voting, legislature, campaigns, parties, recalls, appointments, staff, interest groups (survey running).

## Needs from other sessions

- None blocking. Each pillar whose file I touched is listed in the PR body, commit by commit.

## Questions for the owner

- One-sided facets such as "Shy" or "Cruel" were researched as "present or not", so the old catalogue says a low score "does not establish the opposite". Your order is that both ends matter, so a person low in "Shy" now leans toward speaking up. Each low side is grounded in the matching Big Five or HEXACO facet's opposite pole and cited in the data.
