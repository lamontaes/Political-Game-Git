# LIFE earned-pay account repair

Requested by UI owner after actual normal Shop assistant pay could not fund study.
Isolated branch codex/life-pay-return7, base 1f1f6949a7763111713448ab5ac23189d9008091;
original LIFE checkout remains untouched. Preflight run; upstream LIFE matches
base, observed main ec437edacb3ff44e286f2a4adaa696880b356a74.

Reproduce missing-position earned-pay visibility. Add a feature-local position
lifecycle helper before actual LIFE settlements and study payment checks. Zero
invented initial wealth; any carried balance must come only from existing signed
transfer outcomes with preserved provenance/history. Existing positions and
resource query semantics remain unchanged. Prove actual work/pay/study, old
untracked transfer recovery, refusal purity, account separation and reload.
Supply a bounded frozen commit/patch to UI and current repair owner; no new PR,
root edits, allocator changes or competing browser run.

## Verified correction

A feature-local helper opens a canonical personal position before new wage or
recipient settlements. With no prior transfers its opening balance is zero.
For already-untracked saved transfers, its opening checkpoint is only the signed
net of actual prior transfer outcomes in that currency, with outcome IDs recorded
in provenance. Original transfers stay unchanged; the existing query's sequence
boundary prevents counting them twice. Existing positions return unchanged.
Study builds this candidate account only after validity checks and discards it
on affordability or calendar refusal, retaining refusal purity. Campaign and
other organization accounts are never inferred or substituted with personal
money. No shared World schema or resource projection rule changed.

Baseline control fails on the normal constructor's earned $72 balance and on
old-save study after real net transfers. Corrected two-file suite: 18/18 passed
in 20.66 seconds with unchanged limits. App TypeScript, focused lint/format and
diff checks passed. All three required art checks passed: validation, unchanged 329-item inventory,
and contact-sheet/report QA.
Normal browser rerun belongs to UI; none started here. Combined UI corpus/count
regeneration remains its owner’s responsibility after accepting the new module.

LEARN: successful transfer records do not imply a tracked spendable account.
Normal-constructor tests must not inject fixture cash or pre-open accounts when
proving earned-pay-to-study behavior. The regression enforces this distinction.
