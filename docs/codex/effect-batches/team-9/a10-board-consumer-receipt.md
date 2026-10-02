# A10 board consumer dependency receipts

The original published checkpoints remain unchanged. Their technical declarations are retained below while the child release notes use player-facing prose.

## Original a10-board-appointments.md at 71d9bf44

```markdown
---
id: a10-board-appointments
impact: feature
---

A10 / R16 first appointment stage: the opening calls the existing governor appointer decision over people the governor actually knows. A selected qualified person gets a saved public nomination pointing to the actual durable decision. A nomination does not seat anyone or supply a board vote. The shared Senate-confirmation binding is not yet available; all Senate-required nominations remain pending.

Louisiana's official R.S. 15:572.1 was recovered at the correct legislative URL (d=79203), independently retrieved on October 2, and cited by field/subsection. A(1)(a) establishes five governor appointees, terms concurrent with the appointing governor and holdover until successors take office. A(1)(b) requires at least one member from a qualifying victim-advocacy organization's three-name list, excludes prior Senate-confirmed board members from that nomination route, and states its appointment cutoff. A(1)(c) requires an accredited bachelor plus five years or seven years without that degree, and preserves the stated 2012 grandfather condition. A(1)(d) requires Senate confirmation. E requires four members for quorum and at least four favorable votes, not an ordinary three-of-five majority. F's full-time/public-office and conflicting-work restrictions and G's nonvoting warden/deputy exclusion are also preserved. No fixed month term or backdated retrieval date is invented.

The nomination consumer reserves capacity for the still-unbound advocacy-list route. Without actual accredited-degree or grandfather membership evidence it uses the sufficient seven-year experience alternative; six years does not acquire a degree by inference. Only an explicit `profession:<statutory-field>` classification and one fully recorded continuous interval count. Prior qualification text before the sourced appointment cutoff, combined intervals and generated opening-person qualifications remain pending. The existing actual-degree and grandfather evidence joins, legally qualified advocacy organization/list, shared Senate confirmation, post-confirmation employment conflicts and chair designation remain unwired. Connecticut/Texas official sources were recovered; failed legacy responses are not evidence. Their sourced appointment profiles are preserved, while actual eligibility and confirmation bindings remain pending.

Replaces: the absent saved board nomination producer; reuses `chooseAppointee`, `appointmentCircle`, dated work readers, `createOrganization` and `recordWorldEvent`. No second choice engine. New exports: `CLEMENCY_BOARD_NOMINATED`, `clemencyBoardAppointmentProfiles`, `ensureOpeningClemencyBoardAppointments`.

Dependency: complete #1820 source03ee6f9a7499e310e950c3ab99ff2ee87dfc23dc, including dynamic district loader/shards and post-load abort. The opening adds only the nominee call after actual officeholders are established. Existing positive LA/TX/CT clemency assertions remain unchanged. Seating via `createOrganizationParticipation` and positive grant proof remain TODO until lawful confirmation and the required actual-person/list/qualification bindings are available. No active participation, confirmation ballot or board decision is fabricated.

Earlier nomination checkpoint validation: only the new changed test file, 8 PASS / 1 TODO, 21.57 seconds; scoped three roots / 1,118 dependencies / zero diagnostics; changed lint, formatting and whitespace pass. Earlier attempts (5 PASS / 3 FAIL / 1 TODO, missing fixture employer; then 7 PASS / 1 FAIL / 1 TODO, later-acquired source provenance) are retained. The fixture now writes its actual employer; the opening organization uses canonical generated construction provenance without falsely backdating the acquired source.

AUDIT: A10 5/5 → 5/5, checks flipped: none. Executed main7eec00b799b1e35ba3024acbaaf2c2dda5fd51b5 and branch scans. This prerequisite unblocks durable real-person board nominations; static counts do not prove completed seating or clemency grants. No full suite, unchanged LOAD, app-wide type check or official GATE. This is DRAFT, not READY or completed board seating.

Recovered-statute successor validation: complete changed board test 8 PASS / 1 TODO, 24.26 seconds; original positive nomination/reload assertions retained and six-year/no-degree refusal added. Renewed scoped three roots/1,118 dependencies/zero diagnostics, changed lint/format/whitespace pass. Renewed branch A10 scan5/5; newly fetched main6ad1064aa280441713da222ea4054410e0360343 renewed5/5; earlier7eec receipt retained separately. No static flips or READY claim. The underlying positive clemency test files remain untouched and their older failures are retained.

CT/TX recovery: current official alternate URLs were independently retrieved on October2, without a claimed raw hash. CT2025 section54-124a supplies10full-time plusUPTO5part-time, both-house advice/consent and judiciary referral, coterminous/holdover/unexpired-vacancy terms, three-member pardon panels and death-commutation chair condition, majority-present decisions. Quorum remains unknown;2026supplement lacks that section entry and is not independent proof unchanged. TX508.031–.038 andConstIV11–12 supply7members, conditional residency/prior-employment/disqualification rules, training before voting/deliberation/attendance-counting, six-year staggered terms/unexpired vacancies, and exact confirmation/recess/rejection source. Ordinary clemency recommendation majority is NOT the Senate2/3-present confirmation threshold. No initial staggered expiry dates, actual qualifications or automatic seats fabricated. Existing consumer refuses unsupported CT/TX eligibility readers.

Final combined acquired-profile receipt: complete changed board test8PASS/1TODO25.34s, three scopedroots1,118files0diagnostics, changedlint/format/whitespacePASS; main6ad1064aa andcombinedbranch A10scan5/5→5/5, noflips. LA-only8PASS/1TODO24.26s remains earliernamedreceipt. No unchanged test/LOAD/fullsuite reruns. Actual Senate/BOTH-house confirmation and original positive clemency grant proof remain TODO; this successor remains DRAFT.

```

## Original a10-board-confirmation-context.md at 71d9bf44

```markdown
---
id: a10-board-confirmation-context
kind: fix
summary: Bind board nominations to the existing chamber vote path.
---

# Recorded board appointees begin service pending confirmation

Before: the shared chamber nomination evaluator accepted only Supreme Court nomination events. A real saved board nomination could not reach it, and the nominee never entered the board's membership records.

After: the board context accepts the actual saved nomination and refuses mismatched people, places or seats. Recorded appointees now receive dated active membership while confirmation is unwired, labeled serving pending confirmation. Missing member reasons still produce no yes vote. The judicial branch and existing generic institution roster and party cues are preserved.

## Source and remaining work

Replaces: the judicial-only nomination context restriction for actual board nominations. No second vote engine, weight or fabricated judicial event is added. Team2's exact `decideMemberVote` leaf is preserved from #1897 at f0a16f2623125be65e37fe7b6829a8e485c33c89; its separate bargaining caller remains in that donor dependency.

Measured in the changed test: the actual saved nomination reaches the shared path, altered bindings throw, and supplied member reasons use the existing chooser (`src/simulation/governing/chamber-votes.ts:550`, `src/simulation/governing/chamber-votes.ts:956`). Repeat and canonical reload preserve the result. These are context tests with a supplied member, not proof of a compiled state chamber or a saved confirmation.

The superseding October 2, 2026, 08:06 ruling allows actual appointees to serve pending unwired confirmation. Measured in the changed test, the writer preserves the nomination and appointer decision, appends an appointment event, and creates active participation through the existing life writer (`src/simulation/justice/clemency-board-seating.ts:220`). Its provenance points to that actual appointment. It rejects dead nominees and invalid or later appointer traces. It does not save a confirmation or close the complete board/candidate and positive clemency fixture gaps. Connecticut's both-house requirement remains in the profile. CT's confirmation threshold is awaiting the designated legal packet; no legal mode is invented. Core/shared review remains required.

## Louisiana source correction

Measured source: [R.S.24:14(A), (F)](https://www.legis.la.gov/Legis/LawPrint.aspx?d=84056) expressly covers governor appointments, including boards, and requires a strict majority of elected Senate members voting in open regular session. B separately covers other appointing officials. The earlier restriction based on the B snippet is withdrawn. The proposed LA threshold records greater than one-half of elected members, not a majority of attendees.

C–K submission, interim/special-meeting, expiry, exception, applicable tax-return and reconfirmation conditions are preserved. Their presence in source does not establish actual submission, session, roll, compliance or vote records. Source review remains required. The later interim-service ruling changes the membership writer, while actual confirmation stays distinct. Archived LA rules and differently scoped CT department-head provisions are not substitutes.

CTO08:28 assigns all missing legal-rule research to the designated Claude session. No modal legal fallback was implemented. Full board size/term/quorum/procedure, unsourced sentencing and juvenile rows will consume its published packet. Existing actual-person candidate generation remains an explicit dependency; an empty governor circle is not presented as complete board coverage.

## Method

AUDIT: A10 5/5 → 5/5, checks flipped: none. The five static checks cover removal of newspaper prosecution/clemency advancement, the two saved-due consumers and their two production registry registrations. Main6ad1064aa280441713da222ea4054410e0360343 and receiving branch scans executed. This unblocks the actual board nomination context for the existing shared chamber decision path, not the complete confirmed seating consumer.

The complete changed board test passed eight cases with one TODO in 22.05 seconds. Scoped three-root types found zero diagnostics in 1,119 dependency files. Changed lint, formatting and whitespace checks passed. No full suite, unchanged LOAD or official GATE was run.

The full official R.S.24:14 page was independently captured on October 2, 2026. The raw page and exact A–K quotations are retained with the captured bytes' actual SHA-256 in the board profile. The source-only correction passed quote/hash/scope/strict-majority and CT/TX preservation checks, scoped three-root types with zero diagnostics, formatting, whitespace and the branch A10 scan. No behavioral test file changed in that increment, so behavior tests were not rerun; the earlier eight-pass/one-TODO result remains bound to its original head.

Interim membership successor: the complete changed board file passed eight cases with one TODO in 22.05 seconds. It proves the actual nominee's appointment-to-active-participation join, preserved nomination, pending-confirmation label, repeat and canonical reload. Scoped three-root types found zero diagnostics after fixing one test callback narrowing error; lint, formatting, whitespace and branch A10 5/5 passed. The earlier run passed eight cases with one TODO in 31.60 seconds; its type error was retained and repaired. No full suite or unrelated LOAD ran.

```
