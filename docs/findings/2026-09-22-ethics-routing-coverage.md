# Where an ethics complaint goes, state by state

Measured and landed 2026-09-22. Merged to `main` as #299, at head `4b24dd1e`.

## What a player sees

File an ethics complaint against a legislator or a legislative candidate, and
until tonight it reached a real commission in exactly one state. Kentucky had
the Kentucky Legislative Ethics Commission. Everywhere else the complaint went
to a "simulated oversight review", which told the player on its face that it
could not discipline anyone.

Twenty-four jurisdictions now route to their own body, named the way the state
names it, and the proceeding is called what that state calls it. A complaint in
Ohio goes to the Joint Legislative Ethics Committee. In Nevada, the Nevada
Commission on Ethics. In Texas, the Texas Ethics Commission. In Alaska, the
Select Committee on Legislative Ethics.

The steps run from the complaint, through notice to the respondent, an answer
period, an inquiry, and findings. Then the body stops. Whether anyone is
disciplined is decided separately, and the game says so rather than inventing a
punishment nobody read.

## The twenty-four that are answered

AK, AL, CT, DC, FL, HI, IL, KY, MD, MN, MO, NC, NE, NJ, NV, NY, OH, OR, PA, RI,
SC, TX, WA, WI.

Each was read from that state's own official sources on 2026-09-22, recorded in
`/mnt/project-files/research/ethics-routing-research.json` (`asOf` 2026-09-22,
24 rows). The runtime table is `src/simulation/press/state-ethics-bodies.ts`,
which carries, per state: the body a complaint is filed with, the other bodies
the research names in the same route, the state's own term for the proceeding,
how its chambers are arranged around it, the constitutional or statutory
citations, and what the research explicitly declined to establish.

Kentucky is deliberately not in that table. It keeps a hand-written procedure
whose step deadlines were read from statute and rule — ten days to serve, twenty
to answer — which is strictly more than the table can say about anywhere else.

## The twenty-seven that are not

AR, AZ, CA, CO, DE, GA, IA, ID, IN, KS, LA, MA, ME, MI, MS, MT, ND, NH, NM, OK,
SD, TN, UT, VA, VT, WV, WY.

A complaint in any of these still reaches the simulated review. That is the
honest answer and it is not a refusal: the review runs, issues a report, and
says plainly that it has no power to discipline anyone. What it never does is
hand an unread state the nearest researched commission.

The open research question for these twenty-seven is filed as
`docs/research/requests/state-legislative-ethics-procedure.json`. It was
narrowed from all fifty-one to these twenty-seven before anyone worked it,
because asking for the whole country again would have spent a researcher's time
re-answering twenty-four rows already sitting in the project folder.

## What was deliberately not claimed

**No timeline.** The research read _who_ hears a complaint and under what
instrument. It did not read answer periods, inquiry deadlines or sanction
powers, and it warned in as many words that filing, investigation, findings,
publicity and sanctions are not the same event. So every interval in the shared
step machine is declared `authored`, none is declared a rule. Borrowing
Kentucky's ten-day service and twenty-day answer period for the other
twenty-three would have read as researched law and been false.

**No sanctions.** In `canInstitutionAct`, the researched bodies answer
`available` for procedure — receiving a complaint, opening an inquiry,
dismissing, issuing a finding — and `unknown` for every sanction. Kentucky's
reprimand power is Kentucky's. `unknown` means nothing happens, never
permission.

**No chamber-specific routing where the research flagged it.** Alaska, Minnesota
and South Carolina route complaints differently by chamber. The table carries
the intake body and records the chamber arrangement and the routing limits, and
the procedure names the intake body only.

**No citations on screen.** The authority and source URLs live in the record.
Nothing in the player-facing prose carries them, and no UI reads
`procedureDefinition`, which is where they would otherwise surface.

## A gap worth naming

Fifteen of the newly routed states have a researched ethics body but no
legislature rule pack, so they declare no candidacy prefixes. A seated
legislator there still routes correctly, by the state their legislative work
sits in. A candidate cannot route, because there is no candidacy to route. That
is a gap in the legislature packs rather than in the routing, and the test
asserts that every prefix which _is_ declared names a pack that exists.

## How the shape is held

Adding a state is adding a row to the table and its key to `PROCEDURE_KEYS`. A
key with no row, or a row with no key, is a type error rather than a silent
route to somebody else's commission. Nothing in the routing compares a state by
name.

## Checks run

At head `4b24dd1e`, with `main` merged in: `npm run typecheck` clean,
`npx prettier --check src/ docs/` clean, `npm run release:check` OK,
`npm run corpus:prose` 0 hard errors, and 17 test files green across
`src/simulation/press`, `src/simulation/governing` and the veto readings
invariant. No CI verdict exists for that head; the runners had every check
queued and none started.
