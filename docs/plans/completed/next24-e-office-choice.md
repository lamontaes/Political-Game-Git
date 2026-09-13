# NEXT24 E — Deliberate supported office choice

Banked MORNING23 E at `8426fe57465554af82a353fd23857d688a38d312`, PR #218.

## Scope and sequence

- Project only established office alternatives, grouped by their provider's
  government level, with current canonical eligibility and recorded timing.
- Require a deliberate office key at filing; selection alone is read-only.
- Preserve an existing campaign's office, money, opponents, contest and history.
- Remove implicit first-office selection from district discovery as well.
- Reuse the current candidacy writer; no new calendar, eligibility or campaign
  engine. Unknown dates and connections remain explicitly unestablished.
- Update fixtures to name their intended office and browser drivers to select
  it through actual controls; test read/commit, stale/invalid selection and reload.

## Verification

Focused tests during iteration, ordinary-route pointer/keyboard proof, then
repository validation, art gates, prose regeneration and exact-head publication.
Human visual acceptance remains distinct from automated proof.

## Completed verification and handoff

- Full serial Vitest run: 310 files passed, 4,495 tests passed, two skipped;
  six localhost-listen permission failures in two development-server files.
- Permission-enabled rerun of those two files and four affected campaign files:
  six files / 42 tests passed. No unresolved automated test defect remains.
- Final frozen-source campaign browser suite: 11 passed, actual keyboard and
  pointer activation, explicit Senate selection, read-only browsing and reload.
  Used a 120-second per-test budget on the contended host; assertions unchanged.
- Format, lint, typecheck, release check, source validation/fiscal disposition/
  replay, education, municipal generated checks, build, deterministic demo,
  art validation/inventory/QA, Wave A admission and wardrobe checks passed.
- Prose anchors and inventory regenerated: zero hard errors; existing corpus
  warnings remain. No generated art or shared root UI changes.
- A mounts the existing CampaignWorkspace; its callback and canonical writer
  remain unchanged. DistrictResidencePanel also requires explicit office and
  district choices if mounted. A retains root/main integration authority.
- Human visual acceptance pending; no claim of public release or main merge.

## LEARN

Keep deliberate scenario selection in `tests/fixtures/`, not the source-domain
test tree: the source-boundary guard correctly rejects paths containing
`source/` even from presentation tests. Production filing always requires an
office key; fixture defaults must never become player policy. Regenerate prose
anchors and update semantic browser selectors together when copy changes.
