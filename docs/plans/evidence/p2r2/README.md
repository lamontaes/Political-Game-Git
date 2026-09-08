# P2R2 evidence

Start / P2R1 head: `2660796ca67e96494158d7f6835aa4572e0268fb`.
Accepted main: `89b2f7649f4db6225f8b16fdc1d2e762013ad62f`, already an ancestor
of this branch at activation and at return.

- [Owner review](../../active/p2r2-owner-review.md) — what was built, what is playable, and the acceptance limits.
- [Restored and withheld families](restored-families.md) — the nine offered families with the record that grounds each, and the 26 exclusions with the exact record each still needs.
- [The 133 rows, read again](editorial-rows.md) — 97 non-callback rows, 30 changed and 67 kept, each with its own reason.
- [The callback surface](callback-surface.md) — all 41 rows, with the two measured register failures and the third that the repair introduced and then removed.
- [Owner transcript](owner-transcript.md) — twelve distinct scenes read off the browser over thirty beats.
- `screenshots/` — the first beat and the thirty-first, at a normal viewport.
- `logs/full-validate.log` — the whole green run. `logs/start-head-unit-failures.log` — the eleven failures reproduced at the start head before anything was changed. `logs/browser-p2r2.log` — the four browser proofs.

## The start-head reproduction

Reproduced in this worktree at `2660796` before any edit:
**3,160 pass / 11 fail / 2 skipped of 3,173.**

That matches the P2R1 writer's own count and not the P2A2 auditor's 3,155/12/2
of 3,169. The difference is accounted for and neither number is wrong:

- The auditor's twelfth failure is the donor-history test, which fails in a
  shallow clone and also fails on accepted main. This worktree was created from
  the full repository, `git rev-parse --is-shallow-repository` returns `false`,
  and the test passes. Nothing was deleted or skipped to make it pass; the
  history was simply present.
- The four-test difference in the totals is a different tree, not a different
  result. The exact command and count for this tree are recorded above.

All eleven are green at the return head, and the two the packet identified as
stale authored-key choices needed no waiver: `adult.local-issue-position` and
`adult.household-quiet-evening` are genuinely available again, so Acceptance 7
and Acceptance 12 pass with their original keys, options and assertions.

| Start-head failure                                                        | Disposition                                                                                                                                                                                                        |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pennywise-adaptive-life:857` populated world offers > 4                  | Passes. The fixture premise was repaired — the demo world now has its ordinary life opened, which is the state every played route reaches — and the assertions (`> 4`, `> 0`, sparse `<` populated) are untouched. |
| `adaptive-life:347` different calibration, different sequence             | Passes.                                                                                                                                                                                                            |
| `adaptive-life:398` played choices outrun the questionnaire               | Passes.                                                                                                                                                                                                            |
| `adaptive-life:425` Acceptance 7, `adult.local-issue-position`            | Passes with its original key and option. The family is offered again.                                                                                                                                              |
| `adaptive-life:460` canonical replayable callbacks over 16 beats          | Passes.                                                                                                                                                                                                            |
| `adaptive-life:508` Acceptance 12, `adult.household-quiet-evening`        | Passes with its original key and option.                                                                                                                                                                           |
| `adaptive-life:557` ordinary life is still there                          | Passes.                                                                                                                                                                                                            |
| `campaign-integration:86` pending election through the story-choice route | Passes. Repaired at the shared clock, not by adding a resolver.                                                                                                                                                    |
| `life-narration:143` thread movement is narrated                          | Passes.                                                                                                                                                                                                            |
| `narrative-life:1114` a selected beat has an explainable `chosenKey`      | Passes.                                                                                                                                                                                                            |
| `corpus.test:418` the matrix reaches `election-won`                       | Passes with `corpus-campaign-b` restored.                                                                                                                                                                          |

## Validation at the return head

`npm run validate` — **green, exit 0**, all nine stages: format, lint,
typecheck, test, `source:validate`, `source:replay`, build, demo, `validate:art`.

- Unit: **3,197 pass / 0 fail / 2 pre-existing skips of 3,199** across 169 files.
- Browser: **281 pass / 0 fail** (`npm run test:e2e`, Chromium 1234 — the pinned
  build, correctly installed here; the 1194 mismatch the P2A2 browser auditor
  disclosed was their environment and does not apply).
- `npm run inventory:art` — 329 items, up to date. `npm run qa:art` — report
  generated. `npm run prose:eval -- probes` — 21/21. `npm run prose:eval --
hygiene` — 43 skill/agent files clean, no holdout material.

Nothing was weakened to reach this. No assertion was relaxed, no seed
substituted, no skip added, no browser timeout raised, and no committed
overlay. Two fixtures changed their _setup_ and neither changed its claim; both
are described where they changed.

A qualification on how the suite behaves rather than on the result: several unit
files carry a 5-second per-test timeout, and while other agent sessions were
running on this machine (load average above 100) four to ten of them timed out
per run, in files unrelated to this change — `substrate.test.ts`,
`character-components-validation.test.ts`, `executive-governing-kernels.test.ts`.
The green run above was taken at load 4. The timeouts were not raised, and the
hot read path the repair adds was profiled and reduced to a single pass over the
event log after the first slow run.

## Reproduction

From this checkout, with its normal dependencies:

```sh
npm run test
npm run test -- src/simulation/life-opportunities.test.ts src/presentation/p2r2-sustained-play.test.ts
npm run test -- src/simulation/p2r1-callbacks.test.ts src/presentation/p2r1-grounding.test.ts src/presentation/p2r1-action-memory.test.ts
npm run corpus:prose -- check
npm run corpus:prose -- anchors      # reports 405 anchors, 0 minted, 0 reworded, 0 retired
npm run prose:eval -- probes
npm run prose:eval -- hygiene
PLAYWRIGHT_PORT=4231 npm run test:e2e
npm run validate
```

Binding a localhost port needs permission in this environment; the browser runs
above used ports 4211–4233.

## Identity and boundaries

- **405 anchors**, zero added, zero retired, zero moved; 40 revised `textRevision`
  through 65 one-at-a-time accepted rebinds. The mint never reported a refusal
  and no id was hand-numbered. No PR128 allocator code was imported.
- **35 family keys and 102 option keys unchanged.** No family was added,
  removed or renamed. Nine are offered where two were; the other 26 keep their
  withheld reasons verbatim.
- **Non-prose option effects unchanged.** Every nudge, hypothesis, aftermath
  kind, option write and stance is byte-identical across all 102 options;
  [boundaries.json](boundaries.json) carries the machine comparison. Four
  declarations did change, and all four are consequences of a scene gaining a
  person it did not have:
  - `adult.weekend-invitation`'s companion role goes from none to
    `other-household`, and both its options gain a `witnessed` line, a
    `relationalChange` and an `interactionKind`. The invitation now comes from a
    recorded person, so goodwill has somebody to be owed to — without this the
    aftermath was decided in advance to be nothing — and the engine requires an
    option in a scene with somebody else to say what they saw.
  - `adult.friend-favour` and `adult.friend-in-difficulty` move from
    `community-member` to `other-household`. Both were gated on prior
    interaction while declaring a role read from organization membership, which
    is why neither could ever resolve a companion. In practice the counterpart
    now comes from the request record itself, so the person in the prose and the
    person in the record are the same person by construction; the declared role
    is the fallback and now matches the pool the writer actually draws from.
- **`createDemoWorld` and `createScenarioWorld` are unchanged.** An earlier
  draft wrote the ordinary week into the scenario builder and broke 50 accepted
  byte-level world fixtures. Those are an accepted contract; the draft was
  reverted rather than the fixtures regenerated.
- **No changes** to art, source substrate, save schema, PlayerGame navigation,
  shared shell CSS, the raster loader or the legislative surfaces.
