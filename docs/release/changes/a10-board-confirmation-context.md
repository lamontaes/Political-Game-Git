---
id: a10-board-confirmation-context
impact: patch
section: Changed
title: Recorded board nominees reach the existing chamber vote path
---

# Recorded board appointees begin service pending confirmation

Before: the shared chamber nomination evaluator accepted only Supreme Court nomination events. A real saved board nomination could not reach it, and the nominee never entered the board's membership records.

After: the board context accepts the actual saved nomination and refuses mismatched people, places or seats. Recorded appointees now receive dated active membership while confirmation is unwired, labeled serving pending confirmation. Missing member reasons still produce no yes vote. The judicial branch and existing generic institution roster and party cues are preserved.

## Source and remaining work

Replaces: the judicial-only nomination context restriction for actual board nominations. No second vote engine, weight or fabricated judicial event is added. Team2's exact `decideMemberVote` leaf is preserved from its published donor at f0a16f2623125be65e37fe7b6829a8e485c33c89; its separate bargaining caller remains in that donor dependency.

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
