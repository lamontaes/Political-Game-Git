# PR79 / 79R2 — retained-context chamber revalidation and evidence-scoped prior-work wording

Repair baseline: the rejected 79R1 head `6d4e7f4cdad1456c25b5603bd7b88d3768b2bd9f`.
Same PR #79, same branch `claude/legislative-bargaining-dialogue-realism`.
No rebase, no force-push, no current-main merge. PR remains OPEN and UNMERGED.

The controlling authority is the 79A2 independent recheck: SEMANTICS REPAIR
REQUIRED, with two reproduced defects. Both are closed here. Everything the
79C / 79F / 79R1 record banked is preserved and re-run unchanged.

## Finding A — a retained chamber context could write after the bill moved

`assertSeatStillHeld` verified only that the member's seat relationship still
resolved. It never asked where the bill was, and both floor actions then read
the chamber from the live measure with a `?? "house"` default. So a House
member could open the members' room, keep the returned context, pass HB 214 out
of the House and transmit it to the Senate — at which point a _fresh_ entry
correctly refused — and then call the two floor actions with the retained House
context.

Reproduced at `6d4e7f4` in this container, through the canonical first-win
route and canonical writers:

| stale action               | history records written                                                                                                                | included a vote | world still integrity-valid |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------------------- |
| `offerNegotiatedAmendment` | 8 (`events` 2, `legislativeAmendments` 1, `legislativeProvisions` 1, `legislativeVotes` 1, `legislativeActions` 1, `decisionTraces` 2) | yes             | yes                         |
| `takeNegotiatedFloorVote`  | 5 (`events` 1, `legislativeVotes` 1, `legislativeActions` 1, `decisionTraces` 2)                                                       | yes             | yes                         |

These match the 79A2 audit's counts exactly.

### Repair — action-time authority is current, not cached

`resolveActionAuthority` (in `legislative-bargaining-actions.ts`) replaces
`assertSeatStillHeld` and runs before either action writes anything. It adds no
capability system, transaction store, session token or chamber-transition
engine; it reuses the accepted read-only seat resolver and the canonical
measure machinery, and it treats the retained context as identity only, never
as authority.

Reconciliation path, in order, all before the first write:

1. Membership is re-resolved with `resolveActiveMemberSeat` against the World
   actually passed in. Not seated → refuse. Ambiguous → refuse rather than
   choosing.
2. The re-resolved seat's `relationshipStableKey` must equal the retained
   `memberSeatStableKey`.
3. The measure is re-read from `world.history.legislativeMeasures` by the
   retained `measureId`. Missing → refuse. Its `stableKey` must still equal the
   retained `measureStableKey`.
4. `measure.jurisdictionId` must equal the re-resolved seat's
   `governingJurisdictionId`; `measure.rulePackId` and the retained
   `scenario.pack.packId` must both equal the seat's `legislativeRulePackId`.
5. `measurePosition` must report `on-floor`, must name a chamber (the
   `?? "house"` default is gone on this path), and that chamber must equal the
   re-resolved seat's `chamberKey`.
6. The retained `openedChamberKey` — a new field recorded at entry — must still
   equal the chamber the bill is on.

Both actions then use the reconciled `chamberKey`, never a defaulted one.
Refusal is a throw through the existing refusal contract, before any write.

The developer fixture path (no `memberSeatStableKey`) keeps its banked
behaviour exactly; the import-graph firewall is untouched.

### Regressions — `src/presentation/legislative-action-authority.test.ts`

Eight cases, all built from integrity-valid Worlds through production writers.
Failing at `6d4e7f4`, passing after:

| case                                                                      | before          | after                                       |
| ------------------------------------------------------------------------- | --------------- | ------------------------------------------- |
| stale House context → `offerNegotiatedAmendment` after transmittal        | wrote 8 records | refuses, serialized World byte-identical    |
| stale House context → `takeNegotiatedFloorVote` after transmittal         | wrote 5 records | refuses, serialized World byte-identical    |
| fresh entry on the Senate floor                                           | already refused | still refused                               |
| same-chamber positive control (context retained, bill still in the House) | worked          | still works; amendment and vote both record |
| membership ended after context capture                                    | refused         | refuses, zero mutation                      |
| workplace/governing-state contradiction after capture                     | —               | refuses, zero mutation                      |
| second canonical win makes the seat ambiguous                             | —               | refuses rather than selecting one           |
| retained context names a measure this World does not hold                 | —               | refuses, zero mutation                      |

Every refusal is asserted by comparing `serializeWorld` before and after.

## Finding B — social acquaintance was reported as shared work

`havePriorInteraction` accepted any interaction naming both people. A
`contact:met-socially` record whose own summary said no work had been shared
rendered as "You have worked together before".

### Repair — claim only the kind of history actually recorded

`src/presentation/prior-work-evidence.ts` classifies the record into three
evidence classes by the contract of the records themselves, querying more than
one canonical family so a missing `relationshipInteraction` cannot erase shared
work another accepted record holds:

- `shared-work` — a `work:` or `mentorship:` relationship interaction, **or** a
  recorded `legislativeNegotiation` between the two, which is by its own
  contract the two of them dealing with each other over a measure;
- `acquaintance` — an interaction exists, but nothing in it entails shared work;
- `none` — no record in either family puts them together.

Wording by class (grounding-reviewed against exact fact packets, PASS on all
three; the acquaintance and none classes deliberately assert no exhaustive
work-history negative):

| evidence       | rendered read                                 |
| -------------- | --------------------------------------------- |
| `shared-work`  | "You have worked together before" (unchanged) |
| `acquaintance` | "Someone you have met before"                 |
| `none`         | "A colleague you do not know"                 |

The same widening existed at a second site: the bargaining consideration
`bargaining:working-history` explained any interaction as "These two have
worked together before and it went somewhere." That claim is now reserved for
`shared-work` evidence; an acquaintance record reads "These two have met
before, and it was cordial enough." A strained exchange keeps its existing
wording, which makes no work claim.

### Truth table — `src/presentation/prior-work-evidence.test.ts`

| recorded evidence                       | classification | read                              | work claim                                 |
| --------------------------------------- | -------------- | --------------------------------- | ------------------------------------------ |
| nothing                                 | `none`         | "A colleague you do not know"     | none                                       |
| `contact:met-socially` only             | `acquaintance` | "Someone you have met before"     | none                                       |
| `work:collaboration`                    | `shared-work`  | "You have worked together before" | yes                                        |
| both social and work                    | `shared-work`  | "You have worked together before" | yes, on the work record                    |
| negotiation only, no interaction record | `shared-work`  | —                                 | yes, not erased by the missing interaction |
| entry, re-entry, reload                 | unchanged      | unchanged                         | writes zero relationship records           |

Entry still writes no relationship history: re-entry leaves `serializeWorld`
byte-identical and the interaction count unmoved.

## Preserved from 79R1 / banked acceptance

Re-run unchanged and green: never-elected `legislative-staff` refused;
`legislative-janitor` refused; member label without election provenance
refused; loss / missing / other-person provenance fail closed; missing
governing workplace does not borrow residence; multiple active seats remain
ambiguity; developer fixture isolated behind the import-graph firewall; the
canonical Kentucky winner still enters House bargaining, bargains, amends and
votes; append-only provisions, amendment authorization, commitment standing,
conversation-never-legislates, exact-question matching, knowledge/audience
boundaries and save/reload identity all stand.

## Verification

- `npm run validate` — green end to end, exit 0: format, lint, typecheck,
  **2,814 unit tests across 162 files**, source validation and replay,
  production build, deterministic demo, art validation.
- Browser, against this container's Chromium: the production-floor proof
  (`pr79f-production-floor.spec.ts`) and the banked floor specs
  (`pr79-integration`, `legislative-bargaining`, `legislation`, `run-b`) —
  21/21 focused specs pass.
- `npm run prose:eval -- hygiene` OK (33 files, no holdout material);
  `-- probes` 21/21 behaved as specified.
- Grounding reviewer: PASS on all three wording classes against their exact
  fact packets.
- `git diff --check` clean.

### Corpus measurement

`npm run corpus:prose` on this branch was measured, not guessed. The generated
`docs/prose-inventory/` output is **deliberately not committed here**: running
it at the untouched `6d4e7f4` already produces 8,186 insertions of pre-existing
drift, and #129 owns the generated corpus on its own branch. Per the 79R2
packet, the actual branch measurement is recorded instead and final combined
regeneration is left to landing.

The live corpus pin in `scripts/prose-corpus/corpus.test.ts` is re-pinned to
the live measurement, the same way 79R1 re-pinned it for its resolver and
regression file:

| pin                  | at `6d4e7f4` | at this head | why                                                                                     |
| -------------------- | ------------ | ------------ | --------------------------------------------------------------------------------------- |
| `totalLiterals`      | 50,330       | 50,517       | three added files enter the scanned tree                                                |
| `counts.INVENTORIED` | 1,914        | 1,914        | unchanged — the wording change replaces the read in place, it does not add a prose bank |
| `scannedFiles`       | 332          | 335          | the classifier and the two regression files                                             |

## Changed paths against `6d4e7f4`

Modified:

- `src/presentation/legislative-bargaining-actions.ts` — action-time authority
- `src/presentation/legislative-bargaining-brief.ts` — `openedChamberKey`, evidence-class read
- `src/presentation/legislative-bargaining-world.ts` — records the opened chamber, uses the classifier
- `src/presentation/legislative-bargaining.ts` — narrows the working-history consideration
- `src/presentation/legislative-bargaining-fixture.ts` — fixture declares its own shared work
- `scripts/prose-corpus/corpus.test.ts` — live corpus pin

Added:

- `src/presentation/prior-work-evidence.ts`
- `src/presentation/legislative-action-authority.test.ts`
- `src/presentation/prior-work-evidence.test.ts`

## Remaining, and not done here

- **Current-main landing is deliberately not performed.** Main has advanced past
  the packet's recorded `1b0603c` while the FINAL-LANDING-Q4 train moves #101 /
  #127. PR #79 is still nonmergeable against main; that is a mechanical landing
  conflict, to be resolved at the separate narrow landing gate together with the
  real combined corpus regeneration. It is not smuggled into this semantic
  repair.
- Legacy saves written at the rejected head may carry records the stale-context
  paths wrote. Repairing stored history needs separately authorized
  evidence-aware handling.

STATUS: READY FOR NARROW 79R2 SEMANTIC RECHECK
