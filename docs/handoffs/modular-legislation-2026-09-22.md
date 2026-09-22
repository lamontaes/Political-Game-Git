# Modular legislation lane — night of 2026-09-22

What this lane landed, what it found, and what is still owed. Written for the
morning report; the merge messages and PR comments named here carry the
evidence.

## What landed on main

| PR   | merge commit | what a player gets                                                                                                                                                                                                                    |
| ---- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #282 | `ff50e872`   | One bill can carry several parts — different families, different subjects, each saying whether it inserts, amends or repeals existing law. Two appropriating parts become two separate spending authorities, never one summed figure. |
| #300 | `93ed2fa5`   | Policy content arrives as provenance-declaring packs, so a catalogue can be loaded rather than spliced. Nothing ships in the packs yet.                                                                                               |
| #306 | `5448ddf5`   | A bill can name the policy question it is about, directly, instead of only through a quantitative alternative.                                                                                                                        |

All three merged on local gates with CI unreported — the reason is in each
merge message and in a comment on each PR, with the exact checks run at the
exact commit. The browser shards were not run and are not claimed.

## The largest gap this lane exposed

**A new world ships with an empty policy catalogue.** No domains, issues,
propositions, subjects or principles, enforced by
`assertProductionCatalogBoundary`. The 2704-line bill lifecycle is finished
and has nothing to be about. #300 and #306 together build the two halves of
the join that a loaded catalogue will attach to — packs to carry content in,
and a measure that can name a proposition once it is there — but neither
ships content, because content is a product decision, not an engineering one.

That decision is what is owed: somebody has to author the first domains,
issues and propositions, or decide they are generated. Until then a bill's
subject is still its title text.

## Defects found and fixed at their source

**The research-request writer ended every record with a blank line.**
`scripts/research/request-store.ts` appended `\n` to output from
`toCanonicalJson`, which already ends in `\n`. Every lane filing a question
was writing `}\n\n`. Measured by filing a throwaway record through the real
CLI and reading the bytes, rather than by reading the code and assuming.
Fixed in the writer, not in the one file that showed it, with a regression
test that was confirmed to fail against the old writer.

**The committed prose inventory was stale on main.** Four modules now on main
post-date it. Regenerated with the corpus CLI on both branches. It conflicted
on both merges and was resolved both times by taking main's copy and
regenerating on top — never by picking lines out of a generated file.

## A red check against merged work, which is not a failure

The one `validate` conclusion any of these branches got reads
`repository=cancelled, unit=cancelled, browser=cancelled` — the aggregate job
reporting that its three mandatory jobs were cancelled, not that a test failed.
It landed on a head three commits behind what merged. The repository runs two
concurrent jobs and the queue has been hours deep, so each new head cancels its
predecessor's queued run before that run reports. Anyone reading the merged
work later will see a red check beside it; that check is a cancellation, and
the log says so in four lines.

## Three rounds of keeping branches mergeable

Main moved eight times under this lane's branches overnight, and this lane
merged main into its own work **eight times**: three on the proposition-join
branch, four on the multi-subject bundle branch, one on the policy-packs
branch, plus two cross-lane merges of `people-and-life`. Twice main moved
again between the local validation finishing and the merge call.

None of that is visible in the diff, and at nine it would otherwise read as
three rounds of nothing. It is what a fast-moving main costs a branch that is
ninety files wide, and it is the argument for the merge mechanics the art
bench lane proved out: fetch, confirm main is an ancestor, push and merge
inside the same minute, with `expectedHeadSha`. A conflict check more than a
minute old is stale.

## Still owed

- **The Minnesota HF/SF correction**, blocked on PR #283.
- **Contract step 6's non-fiscal side** — an admitted component's role duties,
  reporting duties and unfunded effects create nothing yet, and NPC proposal
  through the same permissions is not implemented. Disclosed in #282.
- **`recordAdoptedAppropriation` denominates in USD unconditionally.** The
  bundle carries currency explicitly and the view reports it, so a non-USD
  component would be recorded against a USD account. No configuration in the
  bank states another currency today, so nothing is wrong in play; it is a
  seam worth closing before one does.
- **`readDocket` fills a `DocketBill`'s family, variant, authority and
  parameter fields from a bundle's first component.** `componentKeys` says
  when that is happening, but a surface that ignores it would show a part as
  the whole. No shipped surface consumes bundles yet.
- **A DECISION-LOG entry** for the three merges, held deliberately: the
  coordinator is writing one consolidated entry once the train has landed.

## Route 2, deliberately not started

`docs/systems/legislation-policy-join.md` records what route 2 would be — a
measure's parts reading back as policy effects — and why it was not begun.
The order was the route-1 join, built small and truthful, then stop adding
scope.
