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

## Dependency route

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
docket key; without one the legacy authored path is byte-identical, gate
included.

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
