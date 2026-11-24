---
id: design-donor-gives-to-rivals-in-the-same-race
title: "Design question: a donor can give to two rivals in the same race"
area: elections
kind: owner-decision
priority: 3
size: S
status: blocked
standard: 2
claimed-by:
pr:
after:
blocked-on: a ruling on whether a donor may back more than one candidate of a race
lead: governing
source: "the gift-crowding cause-finder, Nov 14, 2026, on the Account lead's order"
model: opus
effort: medium
root: none
checked: sonnet 2026-11-14
---

**What.** At Williamstown, Kentucky (seed survey-b), 215 of 978 donor-and-race pairs gave to two or more rivals in the same race. Real donors do this sometimes (an incumbent and a likely winner), but 22% of pairs may be too many, and which share is right is a design call. Seen: the Campaign tab's list of who gave to whom in a race, and the paper's gift stories for a race.

**Cause.** Found in code: `reachablePeople` and `donationAnswer` in src/core2/modules/campaigns.ts weigh each filing alone: a donor's reason to give to one candidate does not read what they gave to a rival in the same contest.

**Fix.** None until the design is ruled: the options are no second gift in a race, a second gift only where the donor's reasons for both are strong (a sliding weight), or leave it. Rule it, then build it as its own item.

**Time box.** 1 hour to put the question to the owner with the reading line.

**Rules.** Look first: `OWNER-DECISIONS.md`, `DECISION-REGISTER.md`, `prior-rulings/`, `LAW.md` and a `docs/` search before asking. Real rates calibrate; they never decide a donor's gift.

**Done when.** A second session, not the builder, finds the ruling recorded in `OWNER-DECISIONS.md`, and the matching build item filed with a cause and fix that names a drawn place and seed where a donor gave to two rivals.

**Waits on.** A ruling from the owner (through the CTO).

**Files.** src/core2/modules/campaigns.ts
