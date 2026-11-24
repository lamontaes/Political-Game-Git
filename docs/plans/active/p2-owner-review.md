# P2R1 — owner grounding and editorial recheck

**READY FOR NARROW P2R1 GROUNDING + EDITORIAL RECHECK.** Full validation is not green, and this is not merge acceptance. The owner approved the pilot's general register; final owner-style review and the independent Q1 recheck remain pending. The old P2 PASS report at rejected `dd9ac1f` is superseded by this report, not erased from history.

Authority: [P2R1 controlling packet, including production authorization and care/candidacy calibration](https://docs.google.com/document/d/1xMFctwHO1JZlN2zlUknPqOjhrCo8sw9LhycyktSiszc/edit). Read in full. This Codex builder is the sole production writer on existing PR #129, `claude/p2-prose-01-wave-yz0ft4`. The separate prose children were read-only; the independent final auditor was not replaced by writer self-review.

## Exact tree and scope

- Source/test commit: `748c4dec08cee8ae8026c51fe4a803d2fb01dfc3`; the enclosing evidence commit adds reports and regenerated corpus only.
- Rejected/start PR head: `dd9ac1f79a301d71c128a03aab6bac555f21fc0c`.
- Live PR head before reconciliation: `f5c102f027aee95dfce129746bbaaa0af44fed88`, a merge-only accepted-main update by another session. It was preserved by normal merge; no reviewed production prose changed.
- Accepted main integrated normally: `89b2f7649f4db6225f8b16fdc1d2e762013ad62f`, including accepted PR124 and PR101. No rebase or force push.
- Skill/role contract: accepted merged #121, `9d14f040c395787819c5971a0fc5985f42a95305`; byte parity retained. Explicitly used `$civic-prose`, its writer and a separate grounding reviewer.
- Production checkout: `/private/tmp/p2r1-production`. Original `/Users/lamontae/Documents/Political Game` remains detached at `d241d543e1ec878880b621f75d41c475480c978c` with its two pre-existing modified pose-proof PNGs untouched.
- Bounded scope is **427 rows**: adult 382, callback 41, ordinary-life work items 4. All rows have separate grounding/editorial dispositions in the [full ledger](../evidence/p2r1/full-scope-ledger.json). No P3, shell, art, new life mechanics or PR128 allocator implementation.

## What changed

The repair replaces inferred requests, occurrences and outcomes with recorded premises or action-level recaps. It revalidates adult availability before any option writes, so stale/direct choices cannot create the premise they needed. The two retained families require an active, accessible errands item focused on and assigned to the player. Asking to share the errands does not record an agreed split or finished work.

**33 of 35 authored families are withheld**, including the five already withheld. Every withholding names a missing record in the [handoff](../evidence/p2r1/missing-records.md). Relationships, employment, obligations and an active incident alone do not establish a care request, extra shift, cost increase, invitation, local impact or recovery. Awkward prose alone did not justify withholding. Existing scene and option keys remain available for historical interpretation.

**133 rows are reworded from the rejected head; none are added or removed.** Already-good rows remain. Compared with actual publication main, the full PR has 148 reworded existing rows and 11 callback rows already added by the rejected PR. [All 133 corrections](../evidence/p2r1/changes.md) show the originating choice, actual context, before/after wording and separate findings, with raw review evidence.

All four owner-flagged memories are corrected:

| Originating choice                         | Rejected wording                                                             | Repaired wording                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `adult.care-request / name-the-limit`      | You said exactly what you could manage before it became assumed.             | You offered to help with the care and said how much you could manage. |
| `adult.candidacy-approach / say-maybe`     | You said you would think about it, and did not close it off.                 | You said you would think about running for office.                    |
| `adult.friend-in-difficulty / keep-it`     | You kept it to yourself, because they had told you rather than anybody else. | You kept the personal matter private.                                 |
| `adult.incident-aftermath / sort-your-own` | You got your own household straight before anything else.                    | You put your own household first.                                     |

These four families remain withheld: natural wording does not supply the missing request, approach, disclosure or personal incident context. The memories express an offer, consideration, privacy and priority respectively; they do not imply completed care, candidacy, a guessed motive or completed recovery.

The shared petition callback is **“Your decision about the petition came up again.”** It applies to signing, helping without signing and refusal. Other shared returns likewise retain only the family topic when historical option detail is absent. Already-good housing returns and the generic fallback remain unchanged. The ordinary-life agenda summary is **“The agenda is posted. Decide whether to attend.”** The other three ordinary-work rows remain unchanged.

## Grounding, readability and identity are separate

There are **133 exact-context independent semantic grounding PASS results**. Earlier rejected drafts, raw writer replies, parent editorial revisions and final exact reviewer inputs are retained in `../evidence/p2r1/rows/`. The deterministic floor has 127 clean results and six recorded surface-drift flags caused by `memo` within `memory`; none were suppressed. This is evidence of claim review, not owner-style acceptance or permission to offer withheld scenes.

Parent editorial review used the accepted contract and owner calibration: draft from facts and the action, retain natural referents, avoid invented motives/outcomes, preserve variation and good wording. It does not substitute for final owner approval. Shared-return wording creates more near-duplicate clusters; that tradeoff is visible rather than presented as a universal style improvement.

All **35 family keys, 102 option keys and non-prose option effects** are preserved. All **405 existing computed-anchor identities** remain; zero new or retired identities. Each rewording used the accepted one-at-a-time rebind. Allocator and CLI source are byte-identical to accepted main. The PR128 allocation hinge was not reached.

| Bounded metric              | Rejected PR | Publication main | Repaired |
| --------------------------- | ----------: | ---------------: | -------: |
| Rows                        |         427 |              416 |      427 |
| Warnings                    |         106 |              128 |       75 |
| Exact duplicate groups      |           1 |                1 |        1 |
| Normalized duplicate groups |           1 |                1 |        1 |
| Near-duplicate clusters     |           2 |                2 |        6 |

The inventory classifies 360 adult rows as withheld and 67 rows as player-reachable: 22 adult, 41 callback and 4 ordinary-work rows. **That classification is not a claim that all 67 were demonstrated.** Fixed original seed sequences and changed reachability are retained in the evidence; no seed replacement was used to conceal loss of breadth.

## Actual validation and unresolved failures

- New P2R1 tests: **162/162 pass** — 11 premise/gate tests, 14 action-memory/persistence tests, 137 callback cases. Eight canonical pre-offer counterexamples have serialized Worlds. Callback provenance contains 102 adult options, 13 conversation intents and 33 missing-detail cases; not every option schedules a callback.
- Compatibility/identity/grounding focused group: **142/142 pass**. Probes **21/21**, Skill/agent hygiene **43 files clean**. Format, lint and typecheck pass. Corpus check passes with **1,880 templates, 257 warnings and 2,981 unclassified candidates**; no hard errors. Scanner counts are measured at **49,522 literals, 1,910 inventoried, 323 files**.
- Final complete unit suite: **3,160 pass, 11 fail, 2 existing skips / 3,173 total**. Full `npm run validate` stopped at these test failures; its remaining commands were run separately. No breadth assertions, skips or timeouts were relaxed.
- Source validation, byte-identical source replay, production build, deterministic demo, art validation, art inventory and art QA pass. Build retains its existing bundle-size warning.
- Existing focused browser run: **24 pass, 1 fail / 25**. The failing old save/reload fixture expects a story after four choices, but the grounded bank has reached quiet time. Its original timeout remains. The additional two P2R1 browser proofs both pass: real pointer and keyboard choice activation, plus exact story/journal save/reload and keyboard quiet-time advancement using that same four-choice fixture. Screenshots are retained.

The eleven unit failures are preserved in [the final log](../evidence/p2r1/logs/reconciled-full-tests.log): six in `adaptive-life.test.ts` (calibrated divergence, gameplay-axis movement, direct local-issue choice, scheduled callback, direct quiet-evening choice, and hard/ordinary balance); one each in `campaign-integration.test.ts`, `life-narration.test.ts`, `narrative-life.test.ts`, `scripts/prose-corpus/corpus.test.ts`, and `pennywise-adaptive-life.test.ts`. They expose the narrower eligible bank or directly select a now-withheld scene. They are real regressions in breadth/route expectations, not dismissed as passing compatibility.

Missing opportunity records and the existing repeat-gap rule leave the adult-only route quiet after the retained families have been used. Restoring the prior breadth requires separately authorized canonical content/mechanics; this repair does not fabricate premises, reseed coverage or alter repeat timing to achieve a green count.

A further visible grounding defect remains outside P2: `PlayerGame.tsx` renders a household companion as “is/are here” from `life-story.ts`'s companion-derived `presentPeople`, without a presence record. It is visible in the screenshots and needs a separate shared-surface repair. Existing viewport/control overlap is also not claimed visually accepted. Automated pointer/keyboard success is not owner visual acceptance.

## Review handoff

[Evidence index](../evidence/p2r1/README.md) links the complete ledger, both diffs, raw independent role outputs, missing-record list, callback matrix, canonical snapshots, fixed-seed transcripts, metrics, logs and screenshots. PR #129 is to remain open and unmerged. No CI monitoring subscription is created. Independent Q1 grounding recheck and owner editorial approval remain pending; full validation remains red as described above.
