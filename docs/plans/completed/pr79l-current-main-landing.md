# 79L — landing the accepted bargaining work on current main

Same PR #79, same branch `claude/legislative-bargaining-dialogue-realism`.
No rebase, no force-push, no merge to main. The PR stays OPEN and UNMERGED.

- Source head (79A3 semantic acceptance banked here): `1003095c629785ab8941564bc35702d42b482047`
- `origin/main` merged in: `da939329fcc3ae0a2eb9db8016665738b40733d4` — the actual #128 merge,
  first parent `c4ffc2cdeed4b36c4221bf9829c433661a2011e8` (#127)
- Merge base: `b61abf26118e50be351c09db5b3d0823333fc9ec`

This is the mechanical landing the 79R2 note deferred. It adds no feature, no bill
family, and no semantic change. The 79A3 audit is not repeated.

## What the merge actually touched

Main moved 141 files. Exactly **four** were touched on both sides:

| file                                   | disposition                                                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/simulation/index.ts`              | auto-merged. Pure addition of main's `executive-authority-rules` / `executive-authority-rule-packs` exports; every #79 export survives. |
| `docs/ARCHITECTURE-INTEGRITY-AUDIT.md` | auto-merged. Pure addition of main's 92I municipal audit section; zero lines removed from the #79 side.                                 |
| `docs/decisions/DECISION-LOG.md`       | **conflict**, resolved mechanically (below).                                                                                            |
| `scripts/prose-corpus/corpus.test.ts`  | **conflict**, resolved by measuring the combined tree (below).                                                                          |

### Decision log — numeric union, no renumbering

The two sides held **disjoint** ids: main D-079, D-080, D-083; #79 D-081, D-082. The
resolution interleaves them in numeric order — D-079, D-080 (main), D-081, D-082 (#79),
D-083 (main) — and changes not one word of any decision. 83 decisions total.
**D-084 remains unused and reserved for #90.** No policy was redesigned.

### Corpus pin — measured, not chosen

Neither side's pin was taken. The combined tree was regenerated and scanned:

| pin                  | #79 head | main   | **this landing (measured)** |
| -------------------- | -------- | ------ | --------------------------- |
| `totalLiterals`      | 50,517   | 49,332 | **51,732**                  |
| `counts.INVENTORIED` | 1,914    | 1,899  | **1,914**                   |
| `scannedFiles`       | 335      | 319    | **340**                     |

The numbers are additive in the way they should be: `scannedFiles` 319 + 21 new #79
`src` modules = 340, and `INVENTORIED` 1,899 + the 15 anchors #79 adds = 1,914.
Cross-checked against the trees themselves: `src/**/*.ts{,x}` is 510 at the merge base,
526 on main, 531 at the #79 head and 547 combined.

## Anchor identity — absorbed through #128, not around it

The merge brought the sidecar to 409 live bindings against a ledger attesting 419
issued. Before running anything I inspected the incoming identities:

- **15** live ids absent from the ledger: `COMMIT_CONTRACTS-0077` … `-0091`, all in
  `src/presentation/conversation-subjects.ts`. Every one is **above** main's recorded
  high-water for that symbol (76), so #79 allocated above the floor.
- **0** ids rebound to a different site than the ledger records.
- **0** retired/burned ids brought back to life.

`npm run corpus:prose -- check` named exactly those 15 and prescribed
`-- ledger`. That is #128's validated forward-absorption path, and it is what was run:

```
computed-anchor-ledger.json: 434 ids ever issued (+15 absorbed from computed-anchors.json).
```

Resulting state: **434 issued / 409 live-bound / 25 retired-and-unknown**, checkpoint
digest `be91117632c2a66f`, `COMMIT_CONTRACTS` high-water 76 → 91 with indexes `1-91`.
The 25 ids retired before provenance was kept stay recorded `unknown`; nothing was
reconstructed. `computed-anchors.json` is unchanged by this step — a following
`-- anchors` run reports **0 minted, 0 reworded, 0 retired**, so the combined tree's
computed sites and the sidecar already agree.

No `bootstrap`, no `recover`, no hand-renumbering, no unioning, no transfer of review
status, and no ledger or checkpoint was removed. PR129's unmerged prose bank was not
absorbed.

## Preservation map

Of the 55 files #79 changed against the merge base, **51 are byte-identical to the
accepted head `1003095c`** in this merge — every accepted semantic module among them:

`legislative-bargaining-actions.ts` (action-time authority, current-chamber guards),
`legislative-bargaining-brief.ts`, `legislative-bargaining-world.ts`,
`legislative-bargaining.ts`, `legislative-member-seat.ts`, `prior-work-evidence.ts`,
`legislative-bargaining-fixture.ts`, `legislative-politics.ts`,
`legislative-politics-integrity.ts`, `legislative-member-decisions.ts`, the floor
surfaces and player route, and all eight #79 test files including
`legislative-action-authority.test.ts`, `prior-work-evidence.test.ts` and the
`legislative-bargaining-no-fixture.ts` fixture firewall.

The remaining four are the both-sides files above. Nothing in the append-only
provision / amendment / commitment machinery, the member resolver, the evidence
classification or the normal player route was reopened.

## Verification

Run in an isolated detached worktree at this head; the user's own checkouts were not
touched.

- `npm run validate` — **exit 0** end to end: format, lint, typecheck,
  **175 test files / 3,193 passed / 2 skipped (3,195)**, source validate and replay,
  production build, deterministic demo (`world_57ea127c581f9ec2`,
  `snapshot_3450ed053bd831ba`), art validation.
  The 2 skips are `tests/census-cap2-production.test.ts`, main cargo — that file does
  not exist at the #79 head.
- Focused #79 + anchor suites — **13 files / 243 tests, all passing**: action authority,
  prior-work evidence, member seat, bargaining, bargaining world, commitment standing,
  fixture firewall, plus `corpus`, `identity`, `anchor-cli`, `anchor-history`,
  `anchor-ledger` and the real-Git `anchor-crossbranch` proof.
- `npm run corpus:prose -- check` — **OK**, 1,884 templates, 7 artifacts byte-identical.
  Determinism verified: a second full regeneration is byte-identical across every
  generated file and both authority files.
- Browser — full Playwright suite on **port 4823**, verified free before the run so
  `reuseExistingServer` could not attach to another worktree. **282 / 283.**
  Normal-route proof green on its own: `pr79f-production-floor`, `pr79-integration`,
  `legislative-bargaining`, `legislation` = **13/13**. Those specs exist only on this
  branch (`git ls-tree origin/main tests/e2e` matches none of them), which is what
  establishes the server was serving this checkout.

### The one browser failure is inherited, and it moves

Reproduced on the actual comparison tree rather than asserted:

| run | tree                               | result      | failing spec                                                              |
| --- | ---------------------------------- | ----------- | ------------------------------------------------------------------------- |
| 1   | this landing                       | 282/283     | `packet77-presentation.spec.ts:148` crossfade, `decodedPlates >= 2` got 1 |
| 2   | this landing                       | 282/283     | `fifth-play-repair.spec.ts:45` viewport, `727.78 <= 720`                  |
| —   | **accepted main `da939329` alone** | **276/277** | `fifth-play-repair.spec.ts:45`, the same assertion                        |

The failure is not stable, it changes spec between runs, and accepted main on its own
is already 276/277 with one of them. `packet77` passes 36/36 when repeated in
isolation, and it is the separately tracked `useRasterTier` paint-identity residual,
which this landing neither introduced nor worsened. No assertion, seed, timeout, skip
list or layout code was touched, and no repair was smuggled in.

Disclosure: `tests/e2e/pose-proof.spec.ts` rewrites
`docs/agent/evidence/pose-proof-{coverage,person}.png` as a side effect of running it.
Both parents hold identical bytes for those files, so both were restored by explicit
path and are **not** part of this merge. That side effect is pre-existing behaviour of
that spec on this host, not a landing change.

## Not done here

- No merge to main, no rebase, no force-push, no self-approval.
- The raster paint-identity residual stays where it is tracked.
- No new bill family, surface or feature.

STATUS: READY FOR NARROW PR79 LANDING ACCEPTANCE.
