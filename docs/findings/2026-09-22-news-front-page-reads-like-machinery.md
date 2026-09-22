# The front page read like machinery, and only half of that was the renderer

Measured 2026-09-22 by the playtesting lane, which drove a party founding
through the simulation's own writers, advanced sixty days, let the press desk
sweep and read the result. The pipeline works end to end. What came out of it
did not read like a newspaper.

## What a player saw

Two things, and they have different causes.

**The headline was the record's note to itself.** A party founding printed as
"2 organizers publicly decided to form The Commons Party." In
`src/simulation/press/desk.ts`, `composeStory` set the headline to the basis
event's `summary` field verbatim. That field is written for a log: a numeral
where a newspaper writes a word, a count where the event holds the founders'
names, and "publicly", which is the event's `visibility` flag describing
itself. Every story on the page had that shape.

**Three papers printed one sentence.** The Evening Compass, Longwire Public
Affairs and Civic Ledger all ran "Several governments opened talks over fishing
rights in shared waters." word for word, and ten of the twelve stories under
the lead were one of three sentences.

Three papers covering one story is right. Three papers printing an identical
sentence is not.

## The renderer half, fixed

`src/simulation/press/story-voice.ts` now writes the headline from the same
recorded facts, and every repair is fact-preserving:

- A count is spelled out up to twelve, as a newspaper does. Typography.
- A subject given as a count becomes the names the event holds, **only** when
  it holds exactly that many and there are no more than two. Naming two of
  three would be a claim about which two mattered.
- "publicly" is dropped where the event's visibility is already public, because
  the word restates the flag. On a record that is not public it stays, because
  there it is saying something.
- The verb is never touched. The predicate is the record's own words.

Outlets differ because they already differ, on properties each one declares.
Room for names comes from the product — a broadcaster, or a newsroom of one,
carries a count where a broadsheet carries names. Whether the place belongs in
the headline comes from scope alone: a national broadcaster is short _and_ has
to say which state, because its listeners are not standing in it. Running those
two questions together was a bug caught by the test that asserts three outlets
produce three sentences.

Worked example, one event, three outlets:

- The Evening Compass (local, text, standard) — "Dana Reyes and Amara Silva
  decided to form The Commons Party."
- Longwire Public Affairs (national broadcaster) — "Two organizers decided to
  form The Commons Party in Kentucky."
- Civic Ledger (national, text, major) — "Dana Reyes and Amara Silva decided to
  form The Commons Party in Kentucky."

The body still prints the record's sentence unchanged. Rewriting every
paragraph is where invention starts; a headline is one line and can be held to
the record word by word.

## The other half, not fixed, and it is content rather than code

Ten of twelve stories being one of three sentences is not a rendering defect.
`src/simulation/living-world/developments.ts` holds the whole bank of things
that can happen in the wider world as two `const` arrays in the source file:

- `INTERNATIONAL_SUBJECTS` — **two** entries, each with three phases.
- `LOCAL_SUBJECTS` — **four** entries.

Six authored subjects for every world, forever, baked into logic. The press
desk is faithfully reporting the only things there are to report. No headline
writer can fix that, and a modder cannot add a seventh without editing
TypeScript, which is the opposite of the stated goal for this project.

This is the same defect class as the hardcoded-content audit: content living in
code instead of in data the game discovers. The fix is to read these from a
content pack the way the opening life scenes are read, which also makes them
the first real thing a mod could contribute. It was not done tonight because
it touches the living world on a night with no CI verdict available, and a
wrong move there is not visible until sixty simulated days later.

## Checks run

typecheck clean, prettier clean over `src/` and `docs/`, `npm run corpus:prose`
0 hard errors, `npx vitest run src/simulation` 121 test files passing including
the new headline tests. No CI verdict exists for this head.
