---
id: life-relatives-who-live-elsewhere-have-a-past
title: "A relative who lives elsewhere has no schooling or working life on their card"
area: core
kind: bug
priority: 1
size: M
status: claimed
standard: 2
claimed-by: claude/pool-life-relatives-who-live-elsewhere-have-a-past
pr:
after:
blocked-on:
lead: fable
model: opus
effort: medium
root: design-life-record
source: the life record's second session, Nov 10 (not seen; its note is on core-life-record); cause found by Fable
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:19:06.835Z
---

**What.** A person's past (where they lived, their schools, their working life) is written when they are first opened or met. That holds for people in the town. A relative who lives elsewhere gets none: their card tells only what the family facts give, such as "had a child". The owner's ruling of Nov 9 is that each person's past covers their whole life, written when they are opened, and a relative the player opens is a person.

**Cause.** Found in code: `openWholePast` in src/core2/modules/people.ts returns at once for the husk tier (`person.tier === "husk"`, line 577), which is the tier every relative outside the town is kept in. So `pastMovesFor`, `schoolHistoryFor` and `pastWorkFor` never run for them. Measured: the second session's acceptance check on main b094bee1 (Notes on docs/pool/items/core-life-record.md): in Caño Martín Peña, Puerto Rico (seed 50fe2d1143af) the adults on the People screen born before 1980 (born 1952, 1954, 1971, 1974 and 1977) show only "had a child" sentences, with no school or work, while a 62-year-old in the player's own household in the other place has twelve sentences with school from 1968 to 1977.

**Fix.** Write a husk's whole past when their card is first opened, by the same three passes with the person's own window, read against the place they live in. First read what each pass needs from a person and a place (`pastMovesFor`, `schoolHistoryFor` in src/core2/past-school.ts, `pastWorkFor` in src/core2/past-work.ts) and say in the pull request what a husk lacks; where a pass needs the town's own schools or employers, a husk's school is told by its place and stage and their work by its kind, as the card already tells a school in another place (`awayFirst` in `historyLines`, src/bench/card.ts line 237). Keep the husk a husk: writing their past must not fill them in or move them into the town's tiers. Do not open husks at the opening: `openStartingCircle` (line 584) keeps skipping them, and the past is written on the first open only, so the opening costs nothing more. The rows must be the same whenever and however the person is opened.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: nothing is written until a card is opened, so a year costs no more than before. This is a game (owner, Nov 10): detail on demand, one person at the moment the player opens them, never a pass over every relative. Two-level population: a husk stays minimal until opened and is not filled in by this. Seeded generation of who exists is allowed; the past must come out the same for the same world. One rule, all 56 places. Follow .agents/skills/lives/SKILL.md and .agents/skills/drawn-place-tests/SKILL.md.

**Done when.** A second session, on main, starts a game in a drawn place (place and seed named) and in Caño Martín Peña, Puerto Rico with seed 50fe2d1143af, opens the card of a relative who lives elsewhere and was born before the player, and sees schooling and work dated before the player's birth year; it starts the same place and seed again and sees the same sentences. A test in src/core2 names the places and seeds, opens every relative elsewhere on the player's list, and fails when one born more than 25 years before the opening has no school and no work on their list. A year on `npm run speed:year` is no slower than its base by more than the run's own noise, because nothing is written until a card is opened.

**Waits on.** Nothing.

**Files.** src/core2/modules/people.ts, src/core2/past-school.ts, src/core2/past-work.ts, src/core2/past-moves.ts, src/core2/whole-past.test.ts, src/bench/card.ts
