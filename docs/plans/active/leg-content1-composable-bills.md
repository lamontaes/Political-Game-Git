# LEG-CONTENT1 — composable bill content and continuing legislative work

Authority: Drive packet `1EhCXF3qCuQIyixSy_0Z_3oUct9Q5KafCZJkbhHEwXwU`
("Our Civic Duty — Legislation Depth 01"), TASK B. Executor: new Claude
implementation session, High. New feature branch and draft PR; not PR79 and
not PR129.

Preflight: workspace `/home/user/Political-Game-Git`, branch
`claude/legislation-expansion-task-b-h8tai4`, clean, no upstream at start.
Live main verified at `da939329fcc3ae0a2eb9db8016665738b40733d4` — the actual
#128 merge named by the packet. PR79 verified open and unmerged at
`1003095c629785ab8941564bc35702d42b482047`, unchanged from the packet's pinned
semantically accepted head, so no delta check against a moved head was needed.

## Historical initial dependency route (superseded below)

PR79 is not merged, so the packet's explicitly declared stacked development
route applies: branch from fresh main, merge the pinned accepted PR79 head into
**this** branch as a declared dependency. PR79's branch is not touched, not
pushed and not merged. This feature is not main-ready while its base is not.

Three mechanical reconciliations, no policy redesign:

- **Decision log.** Main owns D-079/D-080/D-083, PR79 owns D-081/D-082; the
  sets are disjoint and were restored as an ordered union. Main's own D-083
  note already records that split, so the union is the numbering both sides
  intended. D-084 left free for #90.
- **Anchor ledger.** PR79 carries `COMMIT_CONTRACTS-0077..0091`, which main's
  ledger never saw. They do not collide with the ledger's existing
  `0001..0076`, so they were absorbed through #128's sanctioned workflow
  (`corpus:prose -- ledger`), not unioned or hand-renumbered. Ledger 419 → 434
  ids; no identity reused, retired or rewritten.
- **Corpus pin.** Neither side's pinned counts describe the combined tree, so
  both were discarded and the counts re-measured live at each stage.

Two inherited failures were reproduced on the actual comparison tree before
being attributed:

- `tests/donor-containment.test.ts` fails on clean main in this container too —
  a container artifact (donor branch history not fetched), fixed by fetching
  the donor commits, after which the check genuinely evaluates and passes. Not
  a defect in either side's code.
- Three `anchor-cli` / `anchor-crossbranch` checks pass on main and failed on
  the merge, because main's committed `docs/prose-inventory` matches a fresh
  regeneration and PR79's does not. Regenerating on the combined tree is
  attributable in full: all 314 new unclassified candidates come from PR79
  source files, and the 15 new inventory rows are exactly the absorbed
  `COMMIT_CONTRACTS` anchors. Committed on that basis. None of PR129's
  unmerged prose bank is absorbed.

## What was built

**Content bank** — `src/simulation/legislation-program-families.ts`. Four
families with genuinely different mechanisms and two configurations each:

| Family                         | Mechanism                                                                              | Configurations                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Transit access                 | Reduces what riders pay, or extends an assistance formula by the absence of a provider | Fare relief for assistance enrollees; formula access for unserved counties       |
| Bridge and culvert maintenance | An inspection condition rating is the operative eligibility test                       | Worst-first repair; preventive treatment cycle (the test inverted)               |
| Broadband access               | A service standard binds whoever takes the money                                       | Unserved-area buildout; household adoption support                               |
| Water service lines            | A dated compliance duty, with or without money attached                                | Inventory and replacement plan (**no appropriation at all**); funded replacement |

Clause dimensions across the tranche: funding cap, eligibility scope, timing,
and non-money oversight. The oversight clause is not decoration — it carries
the same canonical beneficiary contract a funded section does, and moves with
its own parameter. Clause shapes are read from the packet's declared source
material (the IIJA hearing record, the CBO estimate's
authorization-versus-appropriation treatment, and SAmdt 2638 as the proof that
proposed text and adopted text are different records) as **structure only**: no
outcome is replayed, no amount adopted, no federal procedure transplanted, and
no historical speech placed in a fictional member's mouth.

Every record carries its evidence class — source example with a precise
reference, authored fiction, or a forecast that is not available. Every
parameter a player can move is authored fiction and says so.

**Compiler** — `legislation-drafting.ts`. Pure, and mostly refusal:
out-of-bounds amounts (refused, never clamped), wrong currency, unoffered scope
values, wrong-typed values, a missing term, a parameter belonging to another
configuration, an unsupported legislature, and money on a configuration that
appropriates nothing. The transit configuration reproduces the accepted HB 214
sections byte-for-byte, asserted in a test, so the existing bargaining sitting
is unchanged by this bank describing it.

**Canonical shape** — `legislation-draft-lineage.ts` plus one optional
`HistoryStore` family. See D-085 for why nothing existing could express it.

**Docket** — `src/presentation/legislation-docket.ts`. Bills keyed per
legislature and sequence instead of one measure forever. Filing is one explicit
action reusing `introduceMeasure` and the accepted append-only provision
writer; previewing takes no World at all, so a preview cannot write legislative
history even by mistake.

**Missing binding repaired** — `time-work.ts`. `WorkFocusTarget` already had a
`legislative-material` kind, but no legislation entity satisfied
`canonicalSourceExists` or `canonicalSourceAvailable`, so a bill could not
appear in Work at all.

**Bargaining binding** — `offerNegotiatedAmendment` reached past its own facts
to module constants naming a transit authority in Ashland. It now reads the
facts it was already given. `openLegislativeBargaining` takes an optional
docket key; without one the legacy authored gate and adopted-provision identity are
preserved. The identity and exact persisted-string regressions cover those
specific contracts; they are not a whole-path byte-equality proof.

**Analysis** — `legislation-analysis.ts`. What a bill commits is arithmetic on
its current provisions and is always available; what a programme would achieve
is a forecast, and the module names the missing series rather than inventing a
budget, an analyst or an impact.

**Surface** — `DocketWorkspace.tsx` and a feature-local `docket.css`. No
`?view=floor`, no fixture constructor, no restyle of `player.css`, and no
absorption of the #133 prototype design.

## Verification

- `npm run validate` — full gate.
- Focused: drafting, docket, family bargaining, analysis, plus PR79's own
  bargaining, action-authority, commitment-standing, no-fixture and world
  suites re-run unchanged.
- Browser: `tests/e2e/legislation-docket.spec.ts`, three specs, through the
  ordinary game entry — start a life, win a seat, compare proposals, move a
  scope and an amount by keyboard, file, reopen, carry three bills, save and
  reload. Run on a unique port.
- Prose: the accepted civic-prose contract applied, `prose:eval -- hygiene` and
  `-- probes`, and a separate `civic-prose-grounding-reviewer` pass on an exact
  fact packet.

## Not done here, deliberately

This is not a career, calendar, committee-assignment, election, agency,
municipal or national expansion, and it does not claim to repair the separate
March 31 / session-deadline observation, childhood, campaign dates, portraits
or travel. Remaining authored behaviour is identified in the PR body rather
than relabelled autonomous.

---

## Continuation: full-release scope and the ACCEPT-RETURN2 repairs

Authority: the same Drive packet, as revised twice — first superseding four
families and eight configurations as a delivery boundary, then recording the
owner's independent review of the frozen head `0b4d474`.

### Landing route, corrected

PR #79 merged. The stacked dependency this plan originally declared is now
ordinary history. Accepted main `0dceca5` was merged in normally. Six conflicts,
all of them exactly what the reviewer's trial merge predicted: the decision log
and five regenerable corpus artifacts.

- **Decision log** — main ends at D-083, this branch adds D-085. Disjoint, so
  both sides stand and D-084 stays reserved for #90. Nothing renumbered.
- **Corpus artifacts** — both sides carried a pin measured on a different tree.
  Neither was taken on faith; the corpus was regenerated on the merged tree and
  re-measured after the content expansion.

`DEPENDS_ON_PR79` is withdrawn as a prerequisite.

### What the reviewer found, and what was done

1. **The legacy adopted provision's stable key had moved.** Real, and a save
   identity rather than a label: `...:section-4` had become
   `...:local-project-match` because the amendment producer's suffix followed
   its provision key once it started reading its own facts. Fixed by carrying
   the suffix on the facts — the authored sitting pins `section-4`, new content
   uses its own key. A regression drives the actual legacy route and was
   verified to fail without the fix. No migration was needed once the identity
   stopped being derived.

2. **The byte-identical claim was too broad.** Also real. Three of the changed
   strings reach persisted records: the fiscal exposure label, the question the
   chamber votes on, and the amendment's own description. Rather than only
   correcting the sentence, the accepted phrasing is now carried on the facts,
   so the authored sitting writes exactly what it wrote before and a family
   supplies its own. Tests assert those exact persisted strings and the legacy
   adopted-provision stable key. This is bounded identity/string preservation
   evidence, not a proof that the whole route or all generated outputs are
   byte-identical. New-family descriptions intentionally retain their own
   headings.

3. **The D-085 refusal branch was never executed.** Also real: the old test
   overrode the `DocketBill`'s own `familyKey`, but the lineage is looked up by
   measure, so the saved record still resolved and the assertion degraded to
   `expect(answer).toBeDefined()`. Replaced with reproducers that edit the saved
   lineage and reload through the accepted snapshot writer. Three unavailable
   branches now execute. The fourth turned out to be unreachable, which is the
   better fact and is asserted as such: removing a lineage leaves a hole in the
   history sequence and world integrity refuses to seal the save.

4. **CI on the repaired head** — pending publication. The stopped local
   continuation was not published; no new-head CI observation has occurred.

### Recovered beyond the first tranche (before recipient continuation)

Thirteen families, thirty-one configurations, eight legal instruments. The
source-to-content matrix and every excluded row's exact blocker are in
[`leg-content1-coverage-matrix.md`](leg-content1-coverage-matrix.md).

The architectural change is `LegalInstrument`: what kind of legal act a
configuration is, enforced by the compiler rather than described in prose. The
first tranche's real limit was not that it had four subjects; it was that all
eight configurations were the same kind of act, so the bank could not write an
appropriation, an eligibility amendment, a repeal, a charge or a reporting duty
at all.

### Recovered exclusions (reassessed by recipient below)

- **Education, health, environment, procurement, social-service and municipal
  families.** Each row's exact blocker is named in the matrix. None is excluded
  as "out of tranche".
- **Filing performance.** Filing costs ~170ms rising to ~500ms per bill and
  then flat, because every append runs the accepted world-integrity validation
  over the whole history. That is a property of the accepted writers, measured
  here rather than assumed, and changing it would be reopening accepted core
  semantics this feature has no authority to reopen. Reading — the hot path —
  is ~1.6ms for a thirty-one-bill docket.
- **Autonomous vote behaviour.** Still authored outside the modelled members,
  exactly as before this work. Nothing here makes the legislature dynamic.
- **The shared shell.** The root navigation patch is still the same 36 additive
  lines in `PlayerGame.tsx` — one import, one handler, one mount — held for the
  UI-core owner to take or for a serialized final edit.

## Codex transfer recovery — 2026-09-09

Sole recipient: Codex, `codex/leg-content1-transfer`, isolated checkout
`/private/tmp/pg-leg-content1-transfer`. Source remains read-only at
`/Users/lamontae/Documents/Political-Game-LEG-CONTENT1`.

- Recovered source HEAD: `8ff4d67996659d3053619b601c6ab2c75f6652e5`, including
  expanded `ca3d492` and `56a97f5`, plus this plan's stopped dirty continuation.
- Published lane remains #137, `claude/legislation-expansion-task-b-h8tai4`,
  last verified `0b4d474c5ade9b1e5c00e6d8e8df7cb62b938007`.
- Main last verified `1eb0b0d09be40e3e10bedd2a1d9fa301eae47f4b`.
- User confirmed old writers stopped. Process checks found no remaining source
  cwd processes or identified owner/validation PIDs; HEAD and patch hash stayed
  stable. No source reset, stash, cleanup or changes were performed.
- Binary patch, complete commit bundle and SHA-256 manifest preserved under
  `/private/tmp/pg-leg-content1-recovery`; no untracked source files existed.
  Patch SHA-256: `2adf16704440161b754884e132a3d57fff923df87bbbc02640a4b641643b0913`.
- Banked eight-configuration structural and native Chromium 3/3 acceptance
  applies to frozen published `0b4d474`, not the recovered expanded head.
  Interrupted old validation has no completed exit status and is not a pass.

### Remaining recipient work

Verify recovered legacy identity and D-085 regressions, narrow the equality
claims, reconcile current main and generated corpus through accepted tools,
and continue every feasible coverage row. Missing empirical forecasts alone
do not exclude transparently authored drafts. Review instrument/authority and
saved-version boundaries before extending the bank. Add an actual supported
policy-estimate action using existing writers, with scope/period/knowledge
checks and no realization. Preserve the UI owner's shared root and municipal
owner's rule-engine seams; feature-local typed adapters carry integration.
Run focused checks during work, final validation/art/prose/browser gates on
the composed candidate, publish normal fast-forward checkpoints to #137, and
observe exact-head CI once. No merge or monitoring.

### Recipient tested checkpoint

Recovered source and dirty-plan hash were rechecked unchanged. The recipient
continues the bank to 20 families / 42 configurations / 8 instruments; these
counts describe this checkpoint, not a delivery ceiling. The coverage matrix
records each remaining authority, empirical-data or operational-consumer gap.

Legacy stable identity and the actual saved-version refusal are retained and
asserted; the equality claim is limited to the specifically asserted legacy
fields, not the complete expanded World. Pending legal predicates are explicitly
conditional; failed predicates refuse. Annual fiscal metadata is optional and
validated through the existing provision writers and integrity checks. It does
not create another legislative, fiscal or scheduling engine. This is the narrow
architecture-audit result: canonical World/history, existing authority and policy
writers, immutable refusal, private knowledge, and source/fiction distinctions
are preserved. ENV/MUNI/UI seams are in the interface handoff.

Verification of the current candidate: 44/44 focused tests across five files;
4/4 native Chrome docket browser cases through normal life/Work, including actual
keyboard choices, request refusal, selection and save/reload. Normal life worlds
lack production metric/mechanism catalogs: successful recording is separately
covered by the existing catalog-backed fixture, not claimed on the normal route.
Typecheck passed; targeted lint passed after removing one unused import. Full
validation passed formatting and stopped at that import before tests; its rerun
is deferred to the shared-host serial slot (VERSION, then LAND, then LEG).
No full-suite pass is claimed. Prose hygiene and 21/21 grounding probes passed.
Corpus regeneration/check passed: 1,884 templates, 56,419 literals, 362 files,
4,720 unclassified candidates, 311 warnings, zero hard errors. Inventory pins
were remeasured, not guessed; existing anchors were not renumbered.

Art validation, inventory (329 items) and QA generation passed. Current screenshots preserve the existing shell;
the inherited lower-left HUD overlap remains with its UI owner. Human visual,
editorial and expanded playable acceptance remain pending. Banked acceptance
at `0b4d474` remains historical and is not transferred to this expanded head.

LEARN: a native select must be exercised using a keyboard path proven on the
actual browser; on this macOS Chrome run, type-ahead plus Tab changes the value,
while arrow/Enter did not even on an isolated native select. Do not seed fixture
catalogs into the normal route to turn an honest unavailable result into a pass.
