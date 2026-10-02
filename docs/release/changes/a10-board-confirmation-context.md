---
id: a10-board-confirmation-context
kind: fix
summary: Bind board nominations to the existing chamber vote path.
---

# Real board nominations reach the existing chamber chooser

Before: the shared chamber nomination evaluator accepted only Supreme Court nomination events. A real saved board nomination could not reach it.

After: the board context accepts the actual saved nomination and refuses mismatched people, places or seats. Missing member reasons still produce no yes vote. The judicial nomination branch and existing generic institution roster and party cues are preserved.

## Source and remaining work

Replaces: the judicial-only nomination context restriction for actual board nominations. No second vote engine, weight or fabricated judicial event is added. Team2's exact `decideMemberVote` leaf is preserved from #1897 at f0a16f2623125be65e37fe7b6829a8e485c33c89; its separate bargaining caller remains in that donor dependency.

Measured in the changed test: the actual saved nomination reaches the shared path, altered bindings throw, and supplied member reasons use the existing chooser (`src/simulation/governing/chamber-votes.ts:550`, `src/simulation/governing/chamber-votes.ts:956`). Repeat and canonical reload preserve the result. These are context tests with a supplied member, not proof of a compiled state chamber or a saved confirmation.

This is a prerequisite for the R23 saved state confirmation adapter. It does not save a confirmation, create active membership or close the positive board fixture gap. Connecticut's both-house requirement is cited to official 2025 chapter961, §54-124a(a), in `data/research/clemency/board-appointments-2026.json:164`. The recovered LA and CT board sections do not establish the confirmation threshold or denominator; those separate evidence gaps remain unsupported. TX's sourced two-thirds-present threshold does not establish actual session, attendance, eligibility or training records. Core/shared review remains required.

## Method

AUDIT: A10 5/5 → 5/5, checks flipped: none. The five static checks cover removal of newspaper prosecution/clemency advancement, the two saved-due consumers and their two production registry registrations. Main6ad1064aa280441713da222ea4054410e0360343 and receiving branch scans executed. This unblocks the actual board nomination context for the existing shared chamber decision path, not the complete confirmed seating consumer.

The complete changed board test passed eight cases with one TODO in 22.05 seconds. Scoped three-root types found zero diagnostics in 1,119 dependency files. Changed lint, formatting and whitespace checks passed. No full suite, unchanged LOAD or official GATE was run.
