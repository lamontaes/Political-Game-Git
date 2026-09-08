# CX-PROSE3 — exact instruction-body parity repair

Status: repair implemented; final validation and independent acceptance tracked
in PR #121. Leave draft and unmerged.
Authority: Drive packet `1baOVAT_4A4iCnIsJBlLZEQoa3pGNdA_Z8CKR2XP8Su4`.
Audited base: `702282da28d9ef090370f814d5d5119ca9d25e22`.
Workspace: `/private/tmp/pg-cx-prose3`, same branch `codex/cx-prose1-portability`.
Source workspaces remain read-only. Preflight verifies local and upstream base.

1. Merge current main ordinarily, preserving accepted provider files.
2. Replace substring parity with complete captured-body equality against exact,
   role-specific provider prefixes plus the path-adapted Claude body.
3. Exercise in-memory appended, prepended, inserted, path-drift, and altered-line
   mutations for both roles; preserve envelope, skill bytes, and hygiene checks.
4. Run focused prose tests, hygiene/probes, full validation, art inventory/QA,
   diff checks, and exact-head CI including browser proofs. Push only to PR #121.

Architecture audit: confirmed compatible with D-002/D-010; test tooling only,
no simulation, domain, runtime AI, editorial authority, or stage changes.
The provider prefix is intentionally a closed set; editorial content continues
to derive from Claude authority. No holdout material is accessed.

## Repair and LEARN

The captured developer-instruction body is compared without trimming against
an independently declared exact role prefix plus the adapted accepted body.
The existing provider files pass unchanged. Ten in-memory adversarial cases
cover five mutations for both roles; each asserts that the mutation changed
its input before asserting rejection. The reviewer has no editorial skill path,
so its path-drift case changes the authority wrapper's path.

LEARN: substring presence cannot prove instruction parity. Encode complete-body
comparison and negative mutations in the existing regression, rather than adding
more agent instructions. Architecture disposition: the former substring check
is corrected now; all provider authority and headless boundaries are compatible.

Focused verification: 77/77 prose tests (including 14 portability tests), hygiene
across 43 files, and 21/21 deterministic probes pass. The focused suite includes
the grounding and fail-closed reviewer-verdict checks. Full validation was
restarted during formatting with two workers because other local tasks are
running suites; timeout thresholds remain unchanged.

Main was merged ordinarily at `25b7e7a291e22374566c30d31552dcc4d8314d51`
(merge commit `e8771ab803f12a9725c430c897106113c92c1266`). No conflicts or
reconciliation edits were needed. Claude, Codex skills, and Codex agent files
remain identical to the audited base. Art inventory reports 322 unchanged items.
Full validation, art QA, and exact-head CI/browser results are reported with the
published head in the completion report; independent CX-PROSE4 acceptance remains
pending. No production prose or visual acceptance is claimed.
