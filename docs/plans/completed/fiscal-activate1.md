# FISCAL-ACTIVATE1 production activation

Status: complete
Owner: Codex `codex/fiscal-activate1`
Base: `1eb0b0d09be40e3e10bedd2a1d9fa301eae47f4b`

## Outcome

Activate the merged state/local fiscal-authority substrate with first-party
legal artifacts, a deterministic production corpus, a browser-safe dated query,
and one real Work consumer. Preserve the N1C fail-closed controls and keep legal
authority separate from observed finances, forecasts, and proposed changes.

## Ownership and seams

- FISCAL owns `src/source/domains/state-local-fiscal-authority/**`, its data,
  feature-local query/adapter/consumer files, focused tests, and this plan.
- MUNI exposes canonical municipal identity and `openMunicipalWork`; it asked
  for an integration patch rather than shared-file edits. Fiscal will not edit
  its in-flight files.
- LEG exposes drafting references but not current levy authority. Fiscal keeps
  current exercise and proposed authority change as separate action kinds and
  will hand off a feature-local patch.
- EXEC exposes `receiveExecutiveWork`; fiscal will not edit its in-flight files
  or infer authority from executive role.
- ECON provides observations only. Fiscal will not import its read model,
  create a treasury, or produce a forecast.
- QUAL shares acquisition tooling, package metadata, and the global generated
  manifest. Fiscal will not edit acquisition tooling or dependencies and will
  treat any global-manifest reconciliation as mechanical.

## Evidence plan

1. Preserve the recovered 92N JSON, byte-identical mirror, and completion report
   as declared research inputs. Inventory every state/group/path and disposition
   every candidate claim; no secondary claim enters production by itself.
2. Acquire only official legal instruments needed by the declarations in this
   wave. Pin raw hashes and enacted-text boundaries. Literal excerpts must be
   present in the opened legal text.
3. Walk the complete 50-state × 6-level × (8 instruments + declared rule
   fields) research universe without a state/row ceiling. Supported
   declarations compile to `KNOWN`; every other claim retains its exact blank,
   malformed-locator, conflict, or matrix-only disposition.

## Consumer plan

The source adapter maps production records into a portable read model. A pure,
browser-safe query answers a date + state + level + instrument/field request and
returns the exact constraints, source identity, and uncertainty. A presentation
consumer requires a canonical legislative organization/office before opening
Work for a proposed authority change. It never represents that proposal as a
current levy. Unknown current authority remains `UNESTABLISHED` but does not
prevent a seated legislature from opening proposal-analysis Work.
Current-authority exercise refuses at this legislative boundary.

## Proof gates

- Positive production acquisition, compile, validate, manifest, and replay.
- Tampered raw hash, moved enacted-text boundary/excerpt, matrix-only claim,
  invalid date, invalid unit, wrong level, dependency, and anti-universal
  refusals.
- Before/on/after effective-date queries, current-versus-proposed action,
  materially different supported instruments/rules at county and municipal
  levels, pure repeated reads, canonical office requirement, and Work
  persistence.
- Focused tests, source validation/replay, typecheck/lint/build/full validation,
  required art validation/inventory/QA, clean diff, and a small LEARN note.
- One draft PR, unmerged. Observe exact-head CI once; no activation release or
  monitoring.

## Recovered FINISH4 checkpoint — 2026-09-09

- Continued the existing exclusive worktree `/private/tmp/pg-fiscal-activate1`
  and branch `codex/fiscal-activate1` from local checkpoint
  `1eb0b0d09be40e3e10bedd2a1d9fa301eae47f4b`; the paused source checkout was not
  edited, reset, cleaned, or stashed. Fresh `origin/main` was
  `6b95f3713590f18973e5e54a3da86e6cd66aa734` before final reconciliation.
- Reverified the recovered 92N transport at 514,782 bytes and SHA-256
  `126ee64509d187f648ca6d67b9db815109868133cda7f02b6fa63621787525a8`;
  the mirror is byte-identical. This is research transport identity, not legal
  certification.
- Scoped primary-source verification to Alaska Statutes §§ 29.45.010-.100,
  §§ 29.45.650-.710, §§ 29.47.180-.200, and the already cited enrolled
  `ch. 74 SLA 1985`. No new national research commission was started.
- Production now compiles 12 records across sales tax, property tax, the
  ordinary 30-mill ceiling and its bond exception, and the general-obligation
  bond voter hurdle. The disposition inventory remains complete at 50 states,
  750 groups, and 2,650 claim leaves; it records the matrix's incorrect
  § 29.45.080 millage locator as a corrected-locator status rather than silently
  accepting it.
- LEG/MUNI/EXEC/ECON/UI owners were contacted at their existing tasks. Fiscal
  keeps its adapter/query/Work consumer feature-local, defers local exercising
  authority to MUNI's canonical office seam, reuses LEG's canonical seated
  member, creates no executive authority by role inference, and imports no
  ECON balance, forecast, treasury, or UI root.

## LEARN

- A secondary matrix can identify the correct legal proposition while naming
  the wrong section. `PRIMARY_ARTIFACT_VERIFIED_CORRECTED_LOCATOR` is now a
  durable disposition instead of silently treating such a row as either fully
  verified or wholly unsupported.
- `Date.parse` accepting a string is not proof that `YYYY-MM-DD` names a real
  calendar day. Dated legal queries now round-trip the exact UTC date and reject
  inverted source intervals before comparison.
- Proposal authority and current taxing authority are different predicates. A
  seated legislature may open Work to analyze a proposed change while the
  current-law result remains `UNESTABLISHED`; no proposal action converts it to
  `PERMITTED` or creates a fiscal forecast.

## Final verification — 2026-09-09

- First full validation on the recovered pre-reconciliation tree recorded its
  exact non-green result: 3,208 tests passed, 15 failed, 6 skipped, plus one
  failed suite. The actionable fiscal defects were an edict-domain allowlist
  assertion and stale deterministic prose counts/artifacts; other failures were
  five-second timeouts during an overlapping heavy-run window. The allowlist
  was extended only for this rights-scoped legal-source domain, the canonical
  prose generator was rerun, and the exact failed corpus/legal-source controls
  then passed 70/70 serially.
- After the shared validation queue released FISCAL, fresh `origin/main`
  `fc8a4c8d7beec1d82ba049b4d091c260e7de4d7e` was merged. The only conflicts were
  five deterministically generated prose files/counts; they were regenerated
  on the combined tree rather than choosing either side's stale output.
- Full `npm run validate` passed on clean reconciled head
  `a715bd28de62f34d4eb76f564e7ae567783f5386`: 181 test files passed, 3,272 tests
  passed, 2 skipped; source validation reported 12 fiscal records and no fiscal
  errors; source replay was byte-identical; build, deterministic demo, and art
  validation passed. The build retained the repository's existing chunk-size
  warning and source validation retained its declared non-fiscal gates/warnings.
- `npm run inventory:art` passed with 329 items and `npm run qa:art` generated
  the existing contact sheet/report. Focused fiscal verification passed 84/84;
  all three fiscal artifacts rehashed exactly and the corpus replayed cleanly.
- No player UI root, treasury, balance store, forecast, release activation,
  deployment, merge, or background monitor was added or started. The delivery
  is one draft, unmerged implementation PR.
