# DIRECTOR42 ROLE B — increment 4: residual 3, as far as it can go without LAND's artifacts

Status: **READY FOR RECEIVING REVIEW — VALIDATION PENDING.**

## Source identity

|                          |                                                                    |
| ------------------------ | ------------------------------------------------------------------ |
| Role / session           | ROLE B — DEHARDWIRE, `session_01WZB6HoCjRiQHuG7TA46wKV`            |
| Program / model / effort | Claude Code, Opus 5, xhigh, implementation                         |
| Branch                   | `claude/director42-role-b-dehardwire-c3bgvv`                       |
| Base of this increment   | `c1521a18d86d75c7ec393c7d3fec776d1eda4a42` (increment 3, RECEIVED) |
| **New head**             | `09c7ba7609ca56d45c9cdca340cab3736b1e058f`                         |
| Underlying composition   | #255 `5ed9bbd0` — **unchanged, not restarted, not rebased**        |

LAND's post-#257 facts were verified against the remote, not taken on trust:
`origin/main` is `39a1d0208c17e964df44067fb30220cb9f1638de` with parents
`ea33c76e` and `2959ee01`; #257's head is an ancestor of main; and
`merge-tree c1521a18` onto main is conflict-free, matching LAND's own result.
**No source or ownership fact conflicts**, which is why no reply was sent.

## What this increment does

The authored sitting asks a member to write a local match for a named transit
authority in a named city. Both were free-standing text: nothing connected
"Ashland" in a player-visible clause to the game's location corpus, so the
clause could have been about a place the game has no record of, and nothing
would have said so.

It turns out the prose was true — **Ashland, Kentucky is in the corpus**, GEOID
`2102368`, one of 555 Kentucky places. It simply was not checked. The GEOID is
now recorded beside the labels, and `legislative-bargaining-place.test.ts`
holds them to it:

- the record exists in the location corpus and is a locality;
- it is the city the authored clauses actually name
  (`displayName === "${PLACE_LABEL}, ${withinName}"`, and the beneficiary label
  contains it);
- it sits in the legislature this sitting belongs to — the place's
  `stateJurisdictionKey` equals the sitting blueprint's pack `jurisdictionKey`.

If the record moves, or the sitting is ever pointed at another legislature
while its clauses stay put, that fails rather than the prose quietly becoming
untrue.

## Why this is the whole of what was possible

LAND reserved shared prose artifacts for this run. The prose corpus scans all
of `src` and already tracks this module's strings —
`docs/prose-inventory/coverage-candidates.json` contains the fiscal-note
sentence — so changing **any** authored string here would drift an artifact
that is not mine to regenerate.

The diff is therefore **pure insertion: 17 lines added, nothing removed, no
prose string altered**, verified on the diff itself. The corpus cannot drift
from this commit.

## What remains, stated plainly

Residual 3 is **not closed**. The cast and the place are still written for one
Kentucky measure. Grounding the claim is not the same as generalising it, and
this increment does not pretend otherwise.

Closing it needs two things this role does not hold:

1. **Authoring a second sitting** — new player-visible prose, which drifts the
   computed anchors and needs the corpus regeneration LAND reserved.
2. **ROLE C on emitted text**, per the shared contract.

That is a scope/authority boundary rather than a difficulty, so it is reported
rather than worked around. A deletion would be the wrong alternative: it would
remove working authored play to make a rule look satisfied.

## Checks actually run

| Check                                                    | Result                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| `npm run typecheck`                                      | pass                                                             |
| `npm run lint`                                           | pass                                                             |
| `npm run format`                                         | pass                                                             |
| `vitest run src/presentation src/content src/simulation` | **261 files, 3289 tests pass**, 6 files / 19 skipped             |
| `legislative-bargaining-place.test.ts` (new)             | 3 pass                                                           |
| `node scripts/dehardwire-census.mjs`                     | exit 0 — 13 cases, 13 data/label, **0 hardcode, 0 unclassified** |

**NOT RUN by this owner:** the repository gate as the project runs it, the
Playwright lane, `test:run-a/b/c`, and the prose-corpus reconciliation (LAND's
artifact, deliberately untouched). Per LAND, the classified pr79 failure was
not re-run.

## Residuals

1. **Residual 3 remains open**, as above — needs authored prose plus LAND's
   corpus regeneration and ROLE C on emitted text. _Owner: ROLE B, blocked on
   those two._
2. Pre-existing unit and browser failures from increments 1–2, present at their
   respective bases. _Owner: LAND to assign._
3. `demo-jurisdiction-context.ts` and `demo.ts` carry fixture-sounding names for
   contents that are not fixtures. Cosmetic; recorded, not acted on.

No people, art or renderer scope. No `.tsx` player surface edited in any
increment. No shared or generated prose artifact written in any increment.

## Receiver action

**LAND: take `09c7ba76` as the successor-only delta; compose onto `39a1d020`.**
