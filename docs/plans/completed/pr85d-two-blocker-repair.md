# P85D — two-blocker integration repair

Authority: owner P85D run packet; rejected head `bac61c93f63799c99c6d8f64874b01cc2c10ee28`.
Publish target: existing PR #85 branch `claude/campaign-first-election-rehome`.
Isolated takeover checkout: `/private/tmp/pg-p85d-repair`; prior workspace remains read-only.

- [x] Preflight and exact local/remote verification.
- [x] Ordinary merge of current main `a93b8f9da2b76d69123abc6b37b4b196f9d0d5db`; preserve its entire M1 ownership test.
- [x] Use the existing composed registry for adult choices, quiet time and episode advancement.
- [x] Seat a locality resident in the accepted office's governing jurisdiction without changing residence or municipal capabilities.
- [x] Regress story/quiet/episode crossing and Lexington win, reload and actual Work activation.
- [x] Reconcile directly stale elections documentation; perform architecture and LEARN checks.
- [x] Focused and full validation, browser proofs, art validation/inventory/QA, clean diff.
      Publication gate: normal push to the same PR branch, then require successful exact-head GitHub validation/browser proofs. The final task report records the immutable SHA and run URL after this commit is published.

No campaign arithmetic, new systems, bargaining, UI redesign or unrelated source/art changes. The owner loop/taste gate is already accepted per P85D; this repair awaits the separate P85E technical recheck.

Local validation: `npm run validate` passed (141 files, 2,435 tests), focused regressions passed (106 tests), campaign browser proofs passed (19 tests), and art inventory/QA passed. The canonical M1 ownership-test file matches main exactly.

Main advanced during the first successful CI run (34075617723). A second ordinary merge reconciles `1a91101ab4f5369aeec21c6e9f32c21114794c81`; its municipal-source documentation is retained alongside the repaired runtime description, and its source systems are unchanged. Validation is repeated for this integrated head.
