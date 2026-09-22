# What is held shut on purpose, and what a bare number decides

Measured on `origin/main` at `1c4992e8`, 2026-09-22. Three questions were
filed into `docs/research/requests/` from this sweep and are named at the end.

This covers the player-facing surfaces and the content and identity systems.
Everything downstream of an enacted law — the production catalogue boundary,
the causal-effects engine, the economy derivations, the forecast refusal — is
the "What passing a law actually does" lane's, by an agreed split, and is
deliberately absent here rather than missing.

## 1. A content pack may carry scenes and durations, and nothing else

`RuntimeContentPack` in `src/simulation/runtime-content-packs.ts` has eight
fields, of which two carry content: `durations` and `scenes`. `shape()` throws
on any key not in its list, so the whitelist is enforced rather than merely
documented, and the API's own version string says so plainly:
`ordinary-scenes-v1`.

Measured by feeding the validator packs identical but for one added field:

```
bare pack, scenes+durations only:  ACCEPTED
pack adding a trait:               REFUSED — Content pack has missing or unsupported fields.
pack adding a first name:          REFUSED — Content pack has missing or unsupported fields.
pack adding a job:                 REFUSED — Content pack has missing or unsupported fields.
pack adding a policy issue:        REFUSED — Content pack has missing or unsupported fields.
pack adding a place:               REFUSED — Content pack has missing or unsupported fields.
```

Two standing rules meet here. "Modders may change content AND rules,
explicitly NOT a small whitelisted vocabulary" — it is a small whitelist, of
two field kinds. And "ignore it and say so", unknown content skipped with a
stated reason, never refused whole, never silent — one unknown field loses the
whole pack, and the message names no field, so a modder is not told which one
was wrong. `importContentPack` in `src/presentation/content-pack-import.ts` is
the only import path and adds no soft-fail layer above the throw.

Filed as `mod-api-vocabulary-is-two-fields` (P0).

## 2. Seven of seventeen room surfaces are painted by nothing

`src/presentation/scene-consumers.ts` declares every player-facing surface that
could show a room and derives whether it is actually wired. Seventeen
consumers; seven painted by nothing. Most are honestly blocked on artwork or on
lamontae's own visual acceptance, which is correct.

Two are not, and they are the expensive ones. **The chamber floor** and **a
committee hearing** both have finished, registered production art and are dark
for one shared reason, which `src/presentation/scene-venues.ts` states in its
own words: committee hearings and floor votes "are scheduled as future due
items rather than as located activities, so they carry no location key for this
table to map. The room is ready; the hearing needs a location before it has
one."

So the two rooms where legislating visibly happens are one missing fact away
from lighting up, in a game whose owner rates governing and legislative play 8
to 9 out of 10. Three other surfaces already work through this exact seam — the
posted public meeting, the campaign office, the staff workroom — so the
mechanism is proven and only the producer's write is absent.

A caution that has cost time before: **the shared staff workroom looks
reachable and is not.** Its venue mapping is declared and proven, but the key
`lexington-legislative-office` is written ONLY by `createRunDLiteFixture`, a
development fixture at `?view=office-fixture`. Verified by searching every
writer of that key. No ordinary life reaches that room either.

Filed as `finished-rooms-waiting-on-a-location` (P1).

## 3. The numbers that decide what a person does

The category lamontae named as "if asking someone three times then makes them
say yes". Two of this shape were found and fixed today by other lanes — a party
breakaway gate counting two decision records with no date guard, and
`bargainingMannerFromRecord` reading three clauses in one sitting as "strong".
Both were defensible numbers counting the wrong thing, which is the distinction
worth carrying: a better number would have fixed neither.

`PARTY_BODY_CADENCE` in `src/simulation/living-world/party-evolution.ts` is six
of them in one named block — a review every 3 months, a standing committee of
4, a national committee of 5, a unit inactive after 180 days, and a dispute
that must recur at least 2 times before anyone considers leaving.

Two more are not in that block at all, but inline literals in the middle of the
logic, at lines 708 and 716:

```ts
const leave = allies.length >= 2 ? "split" : "found";
confidence: disputed.length >= 3 ? "high" : "medium",
```

Two allies decides whether leaving is a split or a founding. Three disputes
decides whether the consideration a player reads is labelled "high" confidence.
That second line is lamontae's own example, in the code, deciding a word on
screen. None of the six is reachable from a content pack.

`LEGISLATIVE_CADENCE_PROFILE` in `src/simulation/governing/legislative-clock.ts`
is labelled in the source as a "PROPOSED balance parameter, pending the
director's confirmation" and carries 3 days between institutional steps and 7
days from referral to hearing. The comment records that an answer was wanted.
Nothing records that one arrived, and it has been running as if confirmed.

A count-comparison sweep across `src/simulation` and `src/presentation`
separated structure from judgement, which is the useful half. Most numeric
comparisons are structural and belong in code: a decision needs at least 2
options, a merger at least 2 organizations, a birth 1 or 2 parents. The ones
that read as judgement are the party numbers above, plus
`life-personality.ts:137` (at least 2 pieces of evidence), `life-episodes.ts:922`
(at least 2 non-context anchors), `career-path7.ts:404` (at least 2 pieces of
work history) and `life-paths2.ts:1643` (at least 10 shifts). Each decides
whether something about a person is established or ignored.

Filed as `decision-thresholds-are-constants-in-code` (P1).

## What this sweep did not establish

`PARTY_BODY_CADENCE.repeatedDisputes` still reads 2 on `1c4992e8`. The
people-and-life lane's date-guard fix may be on a branch that has not merged.
This records the threshold, not the state of that fix.

The judgement list in section 3 came from a comparison sweep, not from reading
every one of those call sites in full. Each named line was opened and read; the
sweep's coverage of lines it did not match is unmeasured, so treat the list as
a floor rather than a total.
