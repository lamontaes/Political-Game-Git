# Public account ownership can be read at its saved cutoff

Before: Account queries selected the latest appended profile visible by the
world's current date. They had no activity-date or same-day sequence cutoff.
A later profile could therefore displace evidence visible to an earlier
activity.

After: The owned reader accepts an explicit historical cutoff and uses the
canonical organization and profile queries. Existing callers keep their
current-query return shape. A companion evidence result identifies the
actual saved records. Municipal identity validation reads the same cutoff,
so a later municipal profile cannot block an earlier valid account read.

## 1. Why-chain

An activity's public account must be justified by the ownership evidence
visible to that activity. Why must visibility include sequence? Two records
can share a date while one was saved later. Why must it include effective
date? An appended profile can become effective after the activity. The
canonical life queries check both. Bedrock: the saved organization and
profile records. Geographic proximity or a current profile does not prove
earlier ownership or permission to redirect a frozen recipient.

## 2. Research

No rate, amount, tax power or migration is introduced. This change consumes
the existing HistoricalCutoff contract: asOfDate and
historySequenceExclusive. organizationsAt filters actual organization
formation and sequence. organizationProfileAt selects the actual profile
visible by effective date and sequence. The reader's classification and
jurisdiction checks remain ownership checks, not tax authority.

## 3. Revisions

The existing identity and jurisdiction getters accept an optional cutoff.
Their default is currentLifeCutoff, and their result remains
organizationId or null. Both use a single ownership-evidence reader. That
reader exposes the actual organization ID, profile ID and source IDs. It
never creates an account or rewrites a saved recipient. Settlement,
completed liabilities and historical payment records are untouched.

## 4. What gets built

1. Add the optional cutoff to the two owned public-account getters.
2. Use the canonical organization and profile readers once.
3. Expose saved evidence without changing existing callers' return shape.
4. Prove current-query compatibility, dated reads and canonical reload for
   all 56 jurisdictions.
5. Use the same cutoff for saved municipal identity validation. Account
   creation keeps current validation and does not acquire a historical cutoff.

## 5. Simulated, records, world pieces, checks

Simulated: no new person decision, tax assessment or government payment.
Records: queries return actual saved ownership evidence without mutation.
World pieces: a visible organization and a qualifying profile must exist.
Missing accounts remain unsupported. An explicit local key stays local;
there is no local-to-state alias.
Checks: later same-day and later-date profiles do not replace earlier
evidence. Default current reads preserve the old API. Frozen recipients and
saved bytes remain unchanged. Both municipal identity and public-account
ownership read the activity's cutoff.

## 6. Proof run

The focused file covers all 56 jurisdiction accounts, plus date visibility,
missing-account rejection, an actual compiled local key and a saved municipal
profile boundary. All 60 tests passed after the released seam and composition
with main e4577f32762a496cd44717c819721be962c0eae6. The municipal case now proves
historical success, current refusal and canonical reload without changing
saved bytes. This is authored query proof, not nationwide settlement proof.
The executed source is 235839379399d1a4df2e51dfca600144919dae8f.
Scoped TypeScript checked three roots and loaded 732 source files with zero
owned diagnostics. Lint, formatting and diff checks passed. The earlier dice
gate reported zero new findings and five stale inherited allowlist entries;
that gate was not rerun for the released seam. No full suite, browser,
campaign, account migration or tax-family admission was run.

## 7. Worked example

A controlled Connecticut public account is saved on January 5, 2026. Its
classification changes through the canonical profile writer on January 6.
A January 5 cutoff still returns the original account and profile evidence.
A current query returns unsupported because the later profile no longer
classifies it as government. Neither query changes the organization ID or
any saved recipient. The same-day cases also exclude a profile appended
after the activity's exclusive sequence cutoff and survive canonical reload.

## Applied shared seam and remaining endpoints

CTO CHECK-IN18 released the corrected proposal at
1e089b47d54a498ed2d1e821815bd4d07d253d1f. The applied seam adds the optional
HistoricalCutoff argument and uses organizationsAt and organizationProfileAt
only for saved municipal identity evidence. The historical account reader
forwards its cutoff. The account writer keeps current validation. Compiled
government checks and actual government keys are unchanged. The checked-in
patch records the approved proposal; it has already been applied to source.
M7 annual tax-family mapping remains held. This endpoint does not complete
M5 settlement or establish spending authority.
