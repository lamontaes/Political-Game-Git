# Trait loader — one scoped engine job

Measured 2026-09-22 on `origin/main` `4965f63c`. Nothing here is built; this is
the job description.

## Why it exists

lamontae's standing requirement is that the game be modder-friendly like
RimWorld and The Sims: content as data, discovered rather than compiled in. For
traits that is not true today. The 121-trait personality catalog
(`/mnt/project-files/research/personality/personality-catalogue.json`) is the
first content that needs it, and it cannot land until this exists. It will not
be the last.

## What is missing — three places, one job

1. **The registry is a literal.** `src/simulation/trait-registry.ts:30`,
   `loadedTraitRegistry`, calls `loadTraitPacks([peopleTraitPack(),
legislatureTraitPack()], DECISIONS)`. Two packs, written into the code.
   Nothing installed can join them.
2. **Content packs have no trait field.** `RuntimeContentPack` in
   `src/simulation/runtime-content-packs.ts` carries `durations` and `scenes`
   and nothing else. There is no place in the pack format for a trait to
   arrive.
3. **The person card reads a fixed five.** `personTraits` in
   `src/simulation/people-traits.ts:146` maps `PEOPLE_TRAITS`, an `as const`
   tuple in `src/simulation/people-trait-definitions.ts:12`
   (`deliberation, sociability, conflict, reliability, risk`), not the
   registry. So even a pack that did register would never reach the person
   card or any reader built on `personTraits`.

## The job

- **A trait field on `RuntimeContentPack`**, carrying the existing
  `TraitPack` shape from `src/simulation/trait-packs.ts` unchanged. The shape
  already exists and is validated by `loadTraitPacks`; the pack format only
  needs to be able to carry one.
- **The registry reads installed packs** in addition to the two compiled ones,
  through the same `loadTraitPacks` validation, so a malformed installed pack
  is refused with a stated reason and skipped rather than refusing the whole
  load — his rule: "Ignore it and say so. That shouldn't hold the game back."
- **`personTraits` and the person card read the loaded registry**, not
  `PEOPLE_TRAITS`. The five become the first compiled pack's traits rather
  than a separate list. Old saves must keep reading: every existing record
  written against the five keys must resolve to the same trait afterwards.
- **Tests:** an installed pack's trait reaches the person card; a malformed
  pack is skipped with a reason and the rest loads; an old save's five traits
  read identically before and after.

## What it is not

- **Not the catalogue.** Landing the 121 traits needs a design pass first:
  which words pair as opposite ends, and the rules their tuning follows. That
  is filed to ChatGPT as
  `docs/research/requests/trait-catalogue-poles-and-tuning-rules.json`, and
  nobody should invent the numbers to get ahead of it.
- **Not new mechanics.** No weights, prevalence or change rates. The loader
  carries whatever a pack declares and validates it.
- **Not an `src/` import of research data.** The catalog stays research until
  the design answer exists.

## Whose lane

**People and life**, on scope: people, their traits and the person card are
that lane's surface. It did not build the trait system. It read the trait
code and recorded what is missing, which is the gap this job closes, so it
is starting from a reading of the code rather than from authorship of it.
The three locations above were confirmed on `origin/main` at `b8a620ed`:
`PEOPLE_TRAITS` in `src/simulation/people-trait-definitions.ts`, and
`cached ??= loadTraitPacks([peopleTraitPack(), legislatureTraitPack()], DECISIONS)`
in `src/simulation/trait-registry.ts`. The content-pack format has had no
active owner since the 2026-09-14 composition landing (`810c1939`), so the
field addition travels with this job rather than waiting for one. The
hardcoded-content audit lane, whose remit is content as data, is the natural
reviewer.
