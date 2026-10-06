# Session 110

Board: #2424. Current task: b01-p1-s2.

Branch: `session-110/b01-p1-s2`; base `ae27b4da00da3d9391a9d4c34776f1ef28f436cc`.

Implemented the independent producer repair: unread executive ages use the existing same-office qualification estimate at candidacyEligibility; sourced and enacted refusals retain priority. Federal deadlines use nominationPlan and its researched filing row. Four filing guidance topics use composeGroundedLine and the gate's terms; a zero-signature row says no petition is required. No source/data files or other campaign writers changed. Main already has no fee/signature constants in fileCampaign and no NOT_ESTABLISHED filing guidance.

Executed: candidacy.test.ts plus candidacy-enacted-qualifications.test.ts, 6/6 passed; changed-file ESLint, Prettier, zero-dice and release:check passed. App typecheck has four time-command.ts errors, reproduced identically on clean main. Office-age regression has four failures, reproduced identically on clean main (three birth-cutoff errors and one municipal-office terms gap). The campaign-filings consumer gets beyond the original filing-gate refusal and finds compliance-document linkage failures plus two timing failures; route these to existing holders #2612 and #2622 rather than edit their files.

Data seam: #2720's source/schema differs from main's canonical reader. Session 26 owns reconciliation. Current candidateFilingTerms validation rejects zero signatures; the fee-only test supplies the canonical row via a reader spy to verify this consumer preserves no-petition semantics. Production fee-only rows still require the source owner's reader/data reconciliation. Questions are on #2424.

Three-year exclusive speed baseline running from clean main in `/tmp/session-110-main-check` (shared unchanged art/node_modules, sparse source checkout). Retirement condition: keep until main comparison and baseline diagnostics are complete, then use repository storage retirement procedure; no automatic cleanup.

Next exact command:

```bash
tail -30 /tmp/session-110-main-speed.log
```

Then run candidate speed with the same seed/place and `--baseline /tmp/session-110-main-speed.json`, publish the exact checked producer head and receipts to #2424 and the downstream PRs. Next queue item is b04-p3-s2; check for an existing open cloud-task PR before taking it. Continue the user's remaining queue in order, one PR per item.
