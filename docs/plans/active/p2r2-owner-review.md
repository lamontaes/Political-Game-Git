# P2R2 — sustained adult play and a coherent callback surface

**READY FOR INDEPENDENT P2R2 ACCEPTANCE AND OWNER PROSE TASTE REVIEW. Leave
unmerged.** This is the combined canonical-opportunity/playability and editorial
repair on existing PR #129, not a second prose pass. The P2R1 report at
[p2-owner-review.md](p2-owner-review.md) is superseded as the current state of
this branch and retained as the record of that repair.

## Exact tree

- Start / P2R1 head: `2660796ca67e96494158d7f6835aa4572e0268fb`.
- Accepted main at activation and at return: `89b2f7649f4db6225f8b16fdc1d2e762013ad62f`, already an ancestor of this branch. No merge, rebase or force-push was needed or performed.
- Branch: `claude/p2-prose-01-wave-yz0ft4`, PR #129, sole production writer.
- Worktree: `/Users/lamontae/Documents/Political-Game-P2R2`, created from the shared repository and owned by this session alone. No other agent's checkout was touched, stashed, reset or cleaned.

## The defect this repair owns

P2A2 accepted P2R1's grounding and anchors and rejected its playability. The
reproduction, confirmed against this tree before anything was changed:

- The one 150-minute errands work item completes after 151 minutes. Both
  remaining offered families depend on it, so both disappear. Another 600 and
  another 5,000 minutes bring nothing back, because nothing in the game was ever
  going to write a second one.
- All six people in `createDemoWorld()` had zero adult situations.
- A normal browser route reached "Let the weeks run on" with no scene and no
  choices, and fewer than five distinct situations were ever offered.

P2R1's withholding was right about grounding and left the world with nothing to
read. The scene bank reads premises and never invents them; what was missing was
a writer that creates them.

## What was built

`src/simulation/life-opportunities.ts`, and it is a writer, not a renderer.
Every function there that returns a `World` creates canonical records during a
transition the player actually took — opening an ordinary life, choosing
something, or letting a stretch of time pass. Nothing on the reading path calls
it, and `life-opportunities.test.ts` holds that shut.

Three mechanisms, all bounded:

1. **The household week recurs.** A new errands item is written once the last
   one is finished and seven days have gone by, under a stable key that names
   its week. The first week keeps the fixed key a save already carries; the date
   comes off the work item's own creation moment, not off the key.
2. **Seven kinds of canonical opportunity**, each the minimum proposition an
   existing record can already carry — somebody asked something, of somebody,
   about something, at a time. A world event, a scheduled occasion where the
   thing has a day, and a knowledge record for the person who was told. An ask
   is not an agreement: nothing here records a yes, a plan or an outcome, and a
   test asserts that no relationship interaction, memory, commitment or
   participation is written alongside one.
3. **A clock that does not stop short of the world's own calendar.** An adult
   step will not park inside 41 days of a due item the world has already
   scheduled. Nothing is resolved there and no outcome is decided there — the
   advance runs with the handler registry it always ran with — and it is what
   stopped a candidate being shown a scene about the shopping two days before
   their own election.

Idempotency is structural: every record is keyed by person, day and kind, and a
kind already open is not a candidate. Running the writer twice against the same
world, or against a reloaded save, produces a byte-identical serialized world.

## What is playable, and what is not

Nine of 35 authored families are offered, up from two. Twenty-six stay withheld
with their reasons unchanged, and each names the record it still needs. The full
table, including what each newly offered family still refuses to claim, is in
[restored-families.md](../evidence/p2r2/restored-families.md).

`createDemoWorld` was **not** changed. An earlier draft opened the ordinary life
inside `createScenarioWorld`, which broke 50 accepted byte-level world fixtures;
that is an accepted contract and the draft was reverted rather than the fixtures
regenerated. The two unit fixtures that had assumed a world with relationships
but no records were repaired at the fixture instead — see the test dispositions
below.

## The editorial repair

The 133 rows were read again, with their real neighbours. Two systematic
failures were measured, repaired, and then re-measured on the repair itself:

| Measure, bounded P2 scope                                       | P2R1                   | P2R2                                         |
| --------------------------------------------------------------- | ---------------------- | -------------------------------------------- |
| Rows opening `Your decision about`                              | 20 of 33 callback rows | 0                                            |
| Callback rows sharing one return frame                          | 31 of 33               | 0 (largest shared ending: 1)                 |
| `You chose to` / `You chose not to` / `You decided to` memories | 19                     | 0                                            |
| Near-duplicate clusters                                         | 6                      | 2 — the same two that exist at accepted main |
| Bounded review warnings                                         | 75                     | 77                                           |
| Distinct texts / rows                                           | 425 / 427              | 427 / 429                                    |

The two remaining near-duplicate clusters (`Go to the meeting` against the
meeting work-item title, and one label/description pair) are present at
publication main `89b2f76` and are not P2's to close. Bounded warnings are two
higher than P2R1's: the callback rows that now name who asked read as
`Somebody …`, which the deterministic lint counts as a vague referent. That is
the honest state — the string is family-level and no name is bound at render
time — and it is a trade of a converged frame for a named actor, not a
regression hidden in a total.

Per-row evidence, with a distinct reason for every changed row and every kept
row, is in [editorial-rows.md](../evidence/p2r2/editorial-rows.md) and
[callback-surface.md](../evidence/p2r2/callback-surface.md). P2A2 was right that
all 133 of P2R1's rationales were byte-identical; there is no repeated sentence
in either file.

All four owner calibration controls were re-read:

- **Candidacy** now says running for public office in those words, in the scene line as well as the memory.
- **Care** no longer says "the care" anywhere. The three rows that did now name a share of looking after a relative.
- **Privacy** claims a disclosure that is a real private two-person record, and does not claim nobody has heard since.
- **Priority** records putting something first rather than a completed result.

## Anchors

405 anchors, zero added, zero retired, zero moved. Forty revised their
`textRevision`, reached through 65 accepted one-edit-at-a-time rebinds — several
rows were edited twice, once for the register and again after the repair was
re-measured against itself. Every one went through the mint, which refuses to
guess whenever a symbol group has more than one unmapped site and more than one
orphan; it was never asked to guess and never reported a refusal. No PR128
allocator code was imported and no id was hand-numbered.

## Seeds

Both control seeds P2R1 substituted are restored and the substitutes are gone.

- `shape-c` is the divergence witness again in `narrative-life.test.ts`. It converges with `shape-a` on the bare constructor — byte for byte, date for date — and diverges on the life the product actually hands a player, which is what the fixture now builds.
- `corpus-campaign-b` is the second candidacy lane again. Under the repair it wins and `p85c-owner-clock` loses, so the matrix demonstrates both branches from its two original seeds. No third lane was added and no outcome was written.

The transcript campaign was also repaired, and it is the reason the outcomes are
readable at all: the session loop took whichever offer came first, which is
always fundraising, so every corpus candidate ran a campaign of nothing but
phone calls. Money moves no canonical support — the campaign suite pins that —
so both contests were being settled inside the bounded keyed swing. At accepted
main this matrix's only win was seven tenths of a point wide. The loop now
prefers outreach, support moves for reasons, and the contests are decided by
what the candidate did.
