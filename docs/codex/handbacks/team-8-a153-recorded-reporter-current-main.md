# A153: looking for recorded reporters

MERGED: no. Current-main candidate, base d9694fcd6a1967c62d391e6231e357043fedf9b8.

## 1. Why-chain

Asking for a contact cannot hire a journalist. The source reads currentJournalists, which requires a living, available person and an active saved journalism role. An absent role now returns null IDs and the same world instead of entering population, organization and employment writers.

## 2. Research

A153 authorizes removal of that fallback. No staffing rate, identity, consent, assignment or newsroom is inferred. Recorded staff are authored test fixtures; they do not describe real employment rates.

## 3. Revisions

Reuses the unmerged #1471 lookup and test-only staff fixture. Current role order and availability checks remain. Missing, dead, incapacitated and ended-role staff remain unavailable. Geographic reach and actual assignment capacity are separate A154 work.

## 4. What gets built

The existing seekCivicPressContact survivor reads existing staff, with nullable IDs when unavailable. Tests save staff explicitly through canonical writers before interviews. Creation-only helpers and imports are deleted. No new production export or engine.

## 5. Simulated records and world pieces

The lookup saves no record and spends no time. Source people, roles, organizations and histories remain identical; reload and repeat retain those records. Test fixture writing is confined to tests/support. The player caller and two shared presentation fixture transfers are separately tracked until released.

## 6. Proof run

Both complete changed native files passed 12/12 in 18.12 seconds on the named current-main base. Four actual-source strict roots (1,042 dependency files, no overlays) produced zero diagnostics, with native ES2023 array declarations for test dependencies. Four changed TypeScript files passed ESLint and formatting. The five-place saved-role sample draws from all 56: DC, Delaware, Georgia, Guam and Florida; seed and exact IDs/hashes are in a153-current-main-proof.json. Each before/after/reload hash matches within its case. Historical baseline results are not current-main proof. Browser and official Claude acceptance are NOT RUN.

## 7. Worked example

Rebekah Nelson, person_013058c19d4002ae, has saved work-role_a8ecc0af39724dfd in the controlled DC fixture. The lookup returns that role and the same world. It creates no consent or interview booking. No staff in the no-role case yields null IDs without creating a person or organization.

WHAT EMERGED: HARDWIRED record lookup and unavailable result; no person decision is claimed. The existing request/response/interview/publication loop runs only with an explicitly recorded fixture reporter. Wider missing links include real production hiring, assignment capacity and current player/browser acceptance. VITAL STATISTICS: 12 native passes; no official or nationwide result.
