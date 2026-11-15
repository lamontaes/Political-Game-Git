---
id: director-donor-ask-plain-friend-again-never-stage
title: "A donor of middling means, a close friend or a donor put off twice gets the donor's ask in their own words"
area: director
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: "Words lead's ruling on #9537, Nov 15, 2026, 18:55Z, and the Account lead's ruling the same day: a variant no played year stages does not ship"
checked:
---

**What.** The donor's ask has five arcs: small, large, plain, friend and again. In twelve drawn places of one candidate year each, the ask staged only as small (a donor's gift is a few hundred dollars) and once as large (Cambridge, Massachusetts); plain, friend and again never staged, so their lines (the plain greetings and requests, the friend's "I hate to ask", the again donor's "You put me off last time") came out of #9537 and are kept in `/mnt/project-files/words-lead/donor-ask/held-officeholder-lines.md`. A mid-size gift, a close friend's gift or a second ask after two put-offs now picks a variant with no lines of its own, so the scene is not told. Seen: in the Census of `scripts/dev-tests/campaign-events-played.ts`, donor-ask staged with only the small and large variants.

**Cause.** Found in code: `src/director/arc-variant.ts` `chooseVariant` scores each donor-ask row in `src/director/data/arc-variants.json` by its reads. Small reads a gift well under what the donor gives in a month (`gift-size` low); large reads a big gift and share; plain is the flat 0.3 base that wins only when both are lower; friend reads `close` (the tie between donor and candidate) above about 0.5; again reads `put-off-before` (the replies the scene engine kept as put-off) and needs a gift after two of them. The played donors are townspeople whose gifts read small, the player's close ties seldom give, and a donor gives again only after the campaign asks, weeks later, when the ask staging cadence (`directorCircumstanceStreetEveryDays`) has passed.

**Fix.** Play one year at a place and seed where a donor of means gives a mid-size gift (plain), where a friend of the candidate gives (friend) and where a donor put off twice gives again (again), through the game's own gift path (`donationAnswer` in `src/core2/modules/campaigns.ts`), and then write the lines for each variant the Words lead rules on, from `held-officeholder-lines.md`. The variant is added back only with a played ask.

**Time box.** 3 hours for one session: a hunt script outside the tests, then the lines.

**Rules.** Ask why: each variant's lines are written only after a played ask shows the reads that chose it, named by record. No dice: who gives and what they give follow from means and ties, never a roll.

**Done when.** A second session plays a candidate year in a drawn place, named with its seed, and sees the ask staged as each of plain, friend and again, with the gift, the tie or the put-offs that chose it named by record id, and every line of the tree played.

**Waits on.** #9537 folded.

**Files.** src/director/data/arc-variants.json, data/english/parts/scene-talk.json, scripts/dev-tests/campaign-events-played.ts
