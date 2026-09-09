# UI-SAVE5 return

Same owner and draft PR #144. Final tested source:
`5e34a267f35c679e3851a5d0104c4646da0052d8`.
Evidence publication commits do not relabel the tested source.

The initial Keep action now becomes repeatable Save on the same slot. The
original Keep-absence assertion remains; Save stays available. Actual World
identity, repeated saves after change, reload, deletion and stale writes across
two normal browser tabs are verified. No prototype World, fixed normal clock,
fabricated person, new root writer or staff authority was added.

## Player route and review

Run `npm run dev` from the PR branch and open `/`: New life → Begin → enter the
life → corner menu → Keep this life → Save this life. Reload → Continue.
The same menu exposes Journal, Personal/economic context, Municipal, Work and
News. Person selection opens the actual record; Back restores the prior view.

Current runtime images, captured on clean `3bddebd` (later commits change only
tests/generated coverage/evidence):

- [Normal scene](normal-scene.png)
- [Normal dossier and wardrobe availability](normal-dossier-wardrobe.png)
- [Unapproved wardrobe candidate, portrait and registered scene](selected-person-wardrobe-reload.png)

Normal play correctly reports no approved compatible choices for the captured
person. The separate candidate image is engineering review evidence, not a
production art approval or a normal-player identity. Owner visual review remains
pending, including scene layout, dossier/wardrobe presentation and candidate fit.

## Exact proof

| Scope                                                                                                                                   | Source                            | Result                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| Current before: production + cross-tab                                                                                                  | d24c44e                           | 7 pass / 11 fail: ten Keep preconditions; one obsolete DB v1 inspection |
| Initial repair: repeat-save and store cross-tab                                                                                         | 49bbb7b                           | 3 pass                                                                  |
| Full affected 13-spec browser matrix                                                                                                    | 3202bad                           | 66 pass / 9 fail                                                        |
| Corrected affected 13-spec browser matrix                                                                                               | 3bddebd                           | 72 pass / 4 fail                                                        |
| All production-play + persistence-cross-tab, including real two-page test                                                               | ced30b2                           | 20 pass                                                                 |
| Donor + OPENING focused controls                                                                                                        | working tree committed as 3bddebd | 68 pass                                                                 |
| Explicit projection/initialization corrections                                                                                          | working tree committed as a1bb6ed | 69 pass / 1 preserved household failure                                 |
| Final full unit suite                                                                                                                   | 5e34a26                           | 4033 pass / 3 fail / 2 skipped, 248 files                               |
| Format, lint, typecheck, source validation/replays, both municipal projections, build, demo, art trio, candidate checks, public privacy | a1bb6ed                           | all pass; 1849 public files checked                                     |

The 3bddebd browser failures were two rendered-text comparison mismatches
(corrected only in the test; the ced30b2 full persistence rerun passes) and two
normal filing-path failures that remain. All four ui-core files were included;
one feature-adapter test and the News test fail as described below. MUNI,
economic context, Journal, people, raster, LIFE, press fixture, creator,
selection, pins, keyboard/Back and review images passed. No failed test was
skipped, removed or relabeled. Raw provenance values are retained.

OPENING's original accepted-main identity and wording digests and original seed
remain unchanged. `tests/fixtures/opening-conversation-delta.json` records 69
readable leaf changes against main04c735c; its adapter checks every candidate
value before restoring only those inspected leaves for comparison. Actual
initialization is separately checked (10 tendencies, 15 values, 5 goals for that
control). Corrupt IDs, references and wording still fail. Questionnaire tests
also compare initialized player preferences with skipped calibration and check
that answer identities do not enter canonical history. Independent acceptance
of this explicit reconciliation remains outstanding.

Consumed exact ECON926b036 endpoint-release delta and MUNIc9f0a44 source/panel/
replay/scanner delta; combined anchors and reports were generated with accepted
tooling. Existing staff/anchor correction, prior News integration, accepted main
and donor proofs remain intact.

## Remaining engineering and acceptance gates

1. OPENING: `adaptive-life.test.ts:200` still finds different household membership
   counts across opposite calibration answers. The declared generation seam
   assertion is preserved, not replaced by a new count.
2. OPENING: `dialogue-reachability.test.ts:601` finds no answer-dependent branch
   in `opening.early.school.lunchbox-swap`; `:698` finds six duplicate option
   labels. Both original invariants remain enabled.
3. LEG normal entry: custom Legislative staff has no supported member seat.
   Correctly refused filing blocks `ui-core-feature-adapters.spec.ts:269` and
   `ui-core-news.spec.ts:49`. The prior event → publication → News → linked
   person → Back/save/reload proof is preserved historically but is not green
   on this combined head. An actual supported normal entry/interface is needed;
   staff authority must not be fabricated.
4. NEWS full press329bc2b is mounted once for saved arranged interviews. Normal
   request/negotiated-pitch eligibility and adviser preparation/feedback
   producers are not supplied by that donor. Full normal request-to-publication
   remains incomplete; the UI does not invent reporters, claims or adviser text.
5. Independent review of repairs and owner visual/art review remain pending.
   Automated checks are not human acceptance. No self-approval, merge, release
   activation, deployment or monitoring was performed.

Actual coordination: [OPENING residuals](https://github.com/lamontaes/Political-Game-Git/pull/150#issuecomment-5603655105),
[LEG entry](https://github.com/lamontaes/Political-Game-Git/pull/137#issuecomment-5603416658),
[NEWS producers](https://github.com/lamontaes/Political-Game-Git/pull/143#issuecomment-5603170047),
[MUNI current normal proof](https://github.com/lamontaes/Political-Game-Git/pull/149#issuecomment-5603520205),
[ECON applied identity](https://github.com/lamontaes/Political-Game-Git/pull/148#issuecomment-5603406408).
No correction to the remaining interfaces had arrived at final evidence read.

LEARN: DB inspection opens the current version and propagates failures; rendered
identity comparisons use consistent text semantics and complete World equality;
regenerate coverage after test literals change because the scanner includes
source tests. Do not normalize a real authority refusal into a passing route.
