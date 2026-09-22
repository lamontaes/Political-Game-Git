# The dual-systems count, walked: rows A2 and A3

Walked 2026-09-22 ~17:45–18:05Z on `main` at `4965f63c`, Chromium 141 (build 1194) driven by Playwright 1.62, through the ordinary creator and the shell's
own controls. No world, seat or result was injected. This is the walk that
`docs/playtest/dual-systems-count-2026-09-22.md` (PR #400) said would turn A2
and A3 from code findings into player findings.

## A2: what a governor can act on, and what a legislator can

**The governor.** Seed `gov-win-CO-1`, Acres Green, Colorado, age 40. The life
filed for governor, campaigned every week the controls offered, won, qualified
and took office on January 5, 2027 as **Zara Ward, Governor of Colorado**.
Hired Cynthia Shannon as chief of staff, then passed 52 weeks, deciding each
matter with its first option.

What the office offered, word for word:

| When             | Matter                 | Program subjects offered                                                                                               |
| ---------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| January 5, 2027  | Set the first priority | Agricultural conservation assistance · Assistance eligibility · Social-service application access · No single priority |
| December 7, 2027 | Set the budget request | Reporting and oversight · Agricultural conservation assistance · Hold spending where it is                             |

Four distinct subjects in a year, all from the governing office's thirteen.
None is transit, bridges, broadband, water service lines, disaster recovery,
utility resilience or critical infrastructure.

**The legislator.** The Kentucky regression hometown (Lexington), age 38, seed
`l-onboard-ordinary-mount`, through `reachMemberOffice`: filed for the Kentucky
House, worked every offered campaign day, won, and entered the term. The
drafting table offered **43 configurations**, and the first eight are the
infrastructure families the governor never sees: transit access (two),
bridge and culvert maintenance (two), broadband access (two), water service
lines (two).

**What this settles, and what it does not.** A2 is now a player finding: on
the screens a player actually reaches, a governor is offered program subjects
from a list that has no infrastructure in it, while a legislator's drafting
table leads with infrastructure. The walk is a sample of four subjects, so it
cannot by itself show that infrastructure never appears. That half rests on
the code: both governor draws (`state-governing.ts:934` for the first-year
agenda, `:1756` for each budget season) sample only from `PROGRAM_FAMILIES`,
which has no infrastructure or resilience family in it.

**Not one save, and why.** The handoff asked for both screens on one save. A
Colorado life cannot reach a legislative seat at all: Colorado's legislature
is not compiled, the Campaigns screen draws no legislative office browser, and
the governor's own record says so in February 2027 (below). A Kentucky
governor on seed `gov-win-KY-1` lost the election. So the comparison is a
governor in Colorado against a legislator in Kentucky. The two lists do not
depend on the state, so this does not weaken the finding. It is still two
lives, not one.

## A3: what a city candidate is told

Augusta, Maine; Atlanta, Georgia; Phoenix, Arizona. Age 40, ordinary creator,
first morning, January 5, 2026. The three states whose legislative offices
the game refuses. Politics → Campaigns, then Government → Local meetings and
records.

**Campaigns**, identical in all three:

> The game has not read this state's elected offices yet, so there is nothing
> to stand for here. It will not borrow another state's rules to fill the gap.

It is followed by "You may stand for Governor of your state today." No city
office is offered or mentioned anywhere on the screen, though "City of
Augusta" (or Atlanta, or Phoenix) is listed under "Who governs where you
live".

**Local government:**

- **Augusta, Atlanta:** "Your town's own government is not in this build yet,
  so there is nothing to attend or work on here."
- **Phoenix:** the city is represented. "No manager election is recorded for
  this government in this save." Both known people read "Unknown … not
  represented in this save".

**What the unread corpus holds for these three states:**
`data/municipal-elections/92O-national-state-baseline.json`, compiled by
`simulation/municipal-election-rule-packs.ts`, carries a row for ME, GA and AZ.
Each row has the ballot structure, election timing, runoff rule, seat
structure, election administration, vacancy, recall, initiative and
referendum rules, each with a statute citation, plus mayor-selection options. None of it reaches any of the three screens above.
A3 is now a player finding: a candidate in these states is told there is
nothing, while state-level municipal election law for their state sits
compiled and sourced on a route nothing takes.

Wiring it in is not a one-liner. The corpus is state baseline law (how cities
in Maine elect), and play asks a per-government question (what Augusta's
charter says). The corpus could supply the baseline where no charter has been
read, which is the "realistic range" rule applied to municipal elections.
That is a design choice, not a repair.

## Three defects found on the way, not dual systems

1. **Internal language on a player surface.** The Colorado governor's office
   history, February 15, 2027: "No bill reached Governor of Colorado this
   session: the game has not compiled CO's legislature, so it files no
   measures." The text shows the USPS code and says "compiled".
   `state-governing.ts:1733`. The same template, with `stateUsps`, is at
   `office-continuity.ts:244` and `:526`.
2. **Internal language in Phoenix.** "An attributed report does not establish
   operative office authority. A scoped enacted reading is required for this
   action." The player sees this on the Local government screen.
3. **Overlapping panels on the governor's office screen.** At 1280×720, text
   from the panel behind ("What this office is answerable for", "No program of
   this government has a record here yet", "Who works here") draws over the
   budget-request card's options. Captured December 7, 2027. This is from a
   screenshot, not a layout measurement, so it needs a look at the real
   viewport before anyone fixes it.

The walk's captures were kept outside the tree.
