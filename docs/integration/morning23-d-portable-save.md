# MORNING23 D — Portable-save migration seam

Owner: Section A owns the portable-save root and interface-state envelope.
Section D owns only the World migration described here.

## Import order

After Section A has validated and deserialized a supported portable World, call
`migrateLegacyStudyProgression(world)` before installing that World into a new
slot. The function is exported from `src/simulation/index.ts` and is pure with
respect to the input object.

The migration:

- retains the enrollment, organization, person, accepted terms/evidence,
  session events, payments, credentials, notes, and every unrelated World
  record;
- credits preserved completed sessions and their already-paid tuition toward
  the period model;
- cancels only an open legacy study-session activity sourced by that enrollment;
- appends at most one next-period future due item; and
- remains unchanged after JSON round-trip and a repeated migration call.

Section A must keep its existing atomic rule: a future envelope version, a
malformed World, or an interface-state write failure refuses the import without
replacing or merging any existing slot. D adds no root storage, envelope,
scheduler, or interface-state store.

## Combined acceptance evidence

- `education-study-progression.test.ts` constructs an active legacy study with
  24 preserved sessions, migrates it to period 2 of 4, charges only the unpaid
  next-period remainder, and round-trips the exact World.
- `career-path7.test.ts` preserves employment, resignation, pay-once behavior,
  credentials, and exact save/reload while exercising the same composed handler
  registry.
- `player-places.test.ts` round-trips the combined travel/arrival/attendance
  history and proves the completed journey and meeting cannot be charged or
  performed again.
