# Public account ownership can be read at its saved cutoff

Before: Account queries selected the latest appended profile visible by the
world's current date. They had no activity-date or same-day sequence cutoff.
A later profile could therefore displace evidence visible to an earlier
activity.

After: The owned reader accepts an explicit historical cutoff and uses the
canonical organization and profile queries. Existing callers keep their
current-query return shape. A companion evidence result identifies the
actual saved records. The shared municipal identity validator remains
unchanged and is an explicit incomplete boundary.

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
5. Preserve the shared-validator refusal until its exact seam is released.

## 5. Simulated, records, world pieces, checks

Simulated: no new person decision, tax assessment or government payment.
Records: queries return actual saved ownership evidence without mutation.
World pieces: a visible organization and a qualifying profile must exist.
Missing accounts remain unsupported. An explicit local key stays local;
there is no local-to-state alias.
Checks: later same-day and later-date profiles do not replace earlier
evidence. Default current reads preserve the old API. Frozen recipients and
saved bytes remain unchanged. The shared validator's current-only local
profile check can still block a historical municipal read.

## 6. Proof run

The focused file covers all 56 jurisdiction accounts, plus date visibility,
missing-account rejection, an actual compiled municipal key and an executed
shared-validator boundary. The first run passed all 60 tests. The boundary
test correctly records unsupported; it is not proof of full municipal
historical parity. Current-query compatibility assertions and all 60 tests
passed again after composition with main b0affa0328df4a5cdf5e64270a2a62c88dfa58a3.
The executed source is 5886c5a4a352b99ccef1a28a0f6391d1754a90cf.
Scoped TypeScript checked two roots and loaded 730 source files with zero
owned diagnostics. Lint, formatting, report, release and diff checks passed.
The dice gate reports zero new findings and five stale inherited allowlist
entries. No full suite, browser, campaign, money
draw, account migration or tax-family admission is claimed.

## 7. Worked example

A controlled Connecticut public account is saved on January 5, 2026. Its
classification changes through the canonical profile writer on January 6.
A January 5 cutoff still returns the original account and profile evidence.
A current query returns unsupported because the later profile no longer
classifies it as government. Neither query changes the organization ID or
any saved recipient. The same-day cases also exclude a profile appended
after the activity's exclusive sequence cutoff and survive canonical reload.

## Exact shared seam still needed

On the verified source, public-government-identity.ts lines 93 through 103
find the municipal-government organization and select its profile using the
current world date. Proposed signature: assertPublicGovernmentIdentity(world,
identity, cutoff?: HistoricalCutoff). Only that profile query and its cutoff
argument/import need release. Keep the compiled government checks and actual
government key unchanged. Use organizationsAt and organizationProfileAt at
the supplied cutoff.
The owned candidate preserves the existing assertion and its refusal; it
does not manufacture a historical World or bypass validation.
M7 annual tax-family mapping remains held. This draft does not complete M5.
