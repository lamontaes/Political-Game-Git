# Movements

A movement is people in one state organized around one demand: a question in
the world's policy catalog and the answer they want. It grows out of a
grievance the world recorded, never from a timer. The owner asked for civil
rights and other movements, led by people who may hold no office, that march,
meet backlash, win laws and change over time, and that the player can join,
lead, oppose or answer (September 23, 2026, 12:19 a.m. ET).

## What is built

- **Founding** (`src/simulation/movements/step.ts`), each quarter right after
  what pressure sets off. Lasting unrest in a state whose anger came mostly
  from rising unemployment can found a worker movement; its demand is a
  question the catalog says bears on worker protection that the state has not
  already answered that way. A state law the catalog says runs against equal
  treatment or equal opportunity can found a rights movement to reverse it.
- **Leaders.** Drawn among living adults whose home is in the state,
  preferring people who hold no prominent office. A leader who dies is
  succeeded by a member or someone else in the state, and the loss rallies the
  movement.
- **Over time.** Strength grows with the state's anger, its leader and its
  members, and is held back by backlash. A strong movement marches in public;
  each march adds backlash, and opponents keep it up. A law answering the
  demand, in the state or nationally, ends it as won; a movement that dwindles
  fades.
- **What a person can do** (`src/simulation/movements/actions.ts`): found
  one in their home state and lead it, join, oppose, leave or step down, take
  up an empty lead, and speak in support, condemn it or call for calm, once a
  quarter. None moves the clock.
- **The player's view** (`src/presentation/movements-view.ts`,
  `src/player/MovementsPanel.tsx`), under Who you are: movements in the
  player's state with what each can do, those that ended there, those
  elsewhere, and a form to found one.

## What is not built

Every seam, built or not, is in `MOVEMENT_SEAMS` with the rule followed
meanwhile. The largest gaps: unequal treatment in daily life is recorded
nowhere, so it founds nothing; movement leaders are not yet on the threat
step's target list (the crises and political violence lane owns it); a
movement changes neither the state's pressure readings nor anyone's views;
it never files a bill itself; and a statement does not change the speaker's
standing, because no approval rating exists yet.

Every rate is in `BLANKET_MOVEMENTS` and is a placeholder, filed with ChatGPT
as `movements-how-they-form-spread-and-win`.
