# The pressure layer

Large social change in the game is never scripted. It comes from pressure
that builds in a place from causes the world can read, fades when nothing
feeds it, and sets things off when it runs high. The owner's rule and the
design are in the Drive document "Big events should come from pressure that
builds, not from a script" (source copy
`/mnt/project-files/research/PRESSURE-LAYER-PLAN-2026-09-22.md`).

## What is built

- **Readings** (`src/simulation/pressure/step.ts`). Each quarter, inside the
  migration review's transition, every state's pressures (leave, arrive,
  anger, fear, hope) lose a share and the quarter's causes add to them. A
  state gets a reading only when it carries something.
- **Causes** (`src/simulation/pressure/causes.ts`). Declared hazard episodes
  and taxes the game enacts. Each contribution keeps the record that caused it.
- **Flows** (`src/simulation/pressure/flows.ts`). Once a year, when any state
  carries pressure, each state's share of people moving out and its largest
  destinations are recorded, and a public `migration.state-flows` event names
  the state pushing hardest.
- **Town movers.** The migration review weights a leaving household's
  destination by pull and a newcomer's origin by push, and multiplies the
  chance a free household in town leaves by its own state's push.
- **More reasons** (`src/simulation/migration/review.ts`). Losing a job, the
  town's unemployment against the nation's, an unusually bad quarter of crime
  in town, and a relative in another state all change who leaves and where
  they go. A state's own recorded unemployment feeds its pressure. Each
  reason, read or not, is a row in `PRESSURE_SEAMS`; the research question
  is `why-americans-move-causes-and-strengths`.
- **Displacement** (`src/simulation/migration/review.ts`). At the next
  quarterly review, a household whose home a disaster destroyed or damaged may
  leave town for good, and its occupancy and tenure end on the move. A
  household held by a job, school, membership or campaign stays. Newcomers now
  live in a one-person household in town, which is what lets a disaster reach
  them. Leaving for a while and coming back is not built
  (`displacement-and-return` in `MIGRATION_SEAMS`); the research question is
  `disaster-displacement-and-return`.

## What is not

`PRESSURE_SEAMS` in `src/simulation/pressure/contract.ts` lists every cause and
effect with the rule the code follows meanwhile. Not built: starting state
taxes, state economies, living costs, climate, opinion of laws, state
populations, a screen showing the flows, unrest, violent death of prominent
people, a calming presence, generational memory, civil war and revolution.

Every number marked BLANKET is a placeholder. The research questions are
`state-to-state-moves-what-pushes-and-pulls`,
`unrest-what-builds-it-and-what-calms-it` and
`civil-war-and-revolution-preconditions`.
