# OLD-WORK-RECOVERY1 preservation and disposition packet

Status: recovery packet for an unmerged housekeeping branch. This is historical evidence, not gameplay acceptance, current product authority, or a source of verified legal facts.

## Exact recovery baseline

- Recovery branch: `codex/old-work-recovery1`
- Starting `origin/main`: `1eb0b0d09be40e3e10bedd2a1d9fa301eae47f4b`
- Packet authority: Drive document `1xYxC8mtxv6ciih0Qg77EpVL1E1cmcOCebw04n2OyhXI`, revision `ANLCKQnwNX1thAMBzC68GCukVV1a2GYRtXWw9nia-03awnHYjFp5z3Af0yX1EquPDFnRIZtK40YOrdLYd4NpPLf4IbqyT2gpWezioMd2BLA`
- Staging ownership read: Drive document `1LqfWO3Bv8gldXOJEDM_ZlAMRh-5Okrn14CLAge75du8`, revision `ANLCKQmeaQh-ek0LQOh6GOSg0FEc1nPGg0CDWwkHqF_eaPSxkcWNUtD1e2iVWg5LUSbei81JL9rz1XlQcYT9jSwIW1pPPuHuyWIUbjT4wWY`
- User checkout was detached and dirty at `d241d543e1ec878880b621f75d41c475480c978c`; its two modified evidence images were left untouched.
- Required `npm run agent:preflight` passed in `/private/tmp/pg-old-work-recovery1`.

Exact original heads were fetched into read-only recovery refs. No original branch was rebased, merged, pushed, or deleted.

| PR   | State at recovery | Branch                                           | Exact head                                 | Disposition basis                                                                                                                                     |
| ---- | ----------------- | ------------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| #92  | OPEN draft        | `claude/overnight-narrative-audit-harness`       | `65ea8fb4aa9f74d5090f3e1c29239696d88b9cd7` | Historical reports/corpus scope preserved below; current tools supersede the old runtime/config package; live findings transferred to current owners. |
| #98  | OPEN draft        | `claude/municipal-governance-source-80fo19`      | `e3a13d2dc31ed576ba8c649cc1476f590a49307b` | Per-file comparison against merged #120 / merge `2c6723904556a722f3ea17ea0bf7865272bcca14`.                                                           |
| #100 | OPEN draft        | `claude/judicial-office-selection-domain-haboml` | `5005f912c81104b3267a0346bcf58b5de712f56d` | Per-file comparison against merged #116 / merge `9c36b2fb9f559db8c1cdc45ce98f7305c949f0ad`.                                                           |
| #106 | OPEN              | `triage-prs-98-100-101-3173115192154108533`      | `7296094673ba3f0f046f18b54c5227d32ca46087` | PR file list remains empty; commit tree delta is empty; external-report recovery is recorded separately below.                                        |

## #98 compared with merged #120

The eight old changed paths were compared by path, type surface, validation behavior, and test intent—not just by filename. Current main contains a materially expanded version of the same bounded municipal source domain. Every one of #98's 25 named checks has a current equivalent; the current suite has 33 checks, including stricter arithmetic, evidence-edge, dated-transition, presiding-role, budget, and term-limit coverage. Current types retain the old concepts and add explicit rules rather than collapsing them. The old fixture and manifest must not replace the accepted successor.

There is no genuinely unique, valid #98 remainder to port. MUNI-PLAY1 is the current owner and was sent the exact disposition before closure; closing the carrier does not alter merged #120, MUNI-PLAY1, or the original branch.

| Old path                                                   | Old blob                                   | Current disposition and destination                                                                  |
| ---------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `data/source/MANIFEST.json`                                | `729f7c1b266a510839eb141f7a17a39b90c642ad` | Reject old generated manifest; current manifest blob `08021f44222502228794fe965f5bf178045137fe`.     |
| `fixtures/source/municipal-governance/kentucky-pilot.json` | `e3a9e6bdabaec5ebeb47e3d292b053f564276f5d` | Superseded by corrected/expanded current fixture blob `28583c782a44bf8ddd8db7110a81e5d9b948ca1b`.    |
| `src/source/domains/municipal-governance/index.ts`         | `b249294191c4494f5a87577985ec65e5c3263ac7` | Superseded by #120/current blob `821e3dfd727dbc890ec7f87342248f7b5a7db544`.                          |
| `src/source/domains/municipal-governance/normalize.ts`     | `70d8a5c98cd7885d535db755642cbc7c92ce0d19` | Superseded by #120/current blob `a7a73826c99b941c07b29805249d95ea2d1f31ed`.                          |
| `src/source/domains/municipal-governance/parse.ts`         | `b77e738bd14f0216678007d387f019ac28c57474` | Superseded by #120/current blob `b541debf3fec783fe8f9ac412e22ff215a1853fb`.                          |
| `src/source/domains/municipal-governance/types.ts`         | `7c406cfda1532ed25b6e5e61c84fabb060a334a6` | Superseded by the strict superset at current blob `8a12dd91c4a2cb78c88232f0ed96c721725615af`.        |
| `src/source/domains/municipal-governance/validate.ts`      | `5e4be03e8d3163f4ed936b8382d5553f51d9fd86` | Superseded by #120/current blob `56acf6678935ca3b4dd0262234a9c1735f9987b7`.                          |
| `tests/source/municipal-governance.test.ts`                | `704d344be06983b6c243fab32c62f03c8101e4e6` | All 25 old intents retained; current expanded suite blob `e0994fbc9cf902f6be94bc0db6f6fdb98c137081`. |

## #100 compared with merged #116

The eight old paths and 21 old test intents were compared with the accepted 92L-derived national source domain. #116 replaces the five-row, not-retrieved fixture/parser with a locked research packet, 51-jurisdiction transcription, 156 office-family slots, explicit evidence classification, atomic ordered/alternative pipelines, and current validation. Old delimiter/column tests are specific to the discarded tabular transport and should not be revived. The remaining useful invariants—ordered mechanisms, deterministic compile, uncertainty distinctions, good-behavior/renewal compatibility, explicit unresolved fields, and non-promotion of reported citations—exist in the current normalizer, validator, and tests.

There is no genuinely unique, valid #100 remainder to port. JUD-WORK2 is the current owner and was sent the exact disposition before closure; closing the carrier does not alter merged #116, JUD-WORK2, or the original branch.

| Old path                                                        | Old blob                                   | Current disposition and destination                                                                                                                                                                                                           |
| --------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/source/MANIFEST.json`                                     | `7fb86e730b34e908e7df7370e2c5def40e03dbef` | Reject old generated manifest; current manifest blob `08021f44222502228794fe965f5bf178045137fe`.                                                                                                                                              |
| `fixtures/source/judicial-office-selection/model-families.json` | `ccaf8ff5e8bacd54b90c3284a64c59f451f30057` | Reject obsolete five-row fixture as current authority; historical blob remains on #100. Current transcription is `src/source/domains/judicial-office-selection/research-transcription.json`, blob `a29e23888486d0f5fdb34834b16016a604feb4d9`. |
| `src/source/domains/judicial-office-selection/index.ts`         | `009b81bd18a7c197aa0afb5d5e13be9237623e90` | Superseded by #116/current blob `57882c8c2a00bd578691ad1ad2d501f07991745a`.                                                                                                                                                                   |
| `src/source/domains/judicial-office-selection/normalize.ts`     | `ceb518a62755e4ad17fdd076c800fdf50ede9835` | Superseded by #116/current blob `1df41ed7caeb51b45acd6ac83a31f8447b624efc`.                                                                                                                                                                   |
| `src/source/domains/judicial-office-selection/parse.ts`         | `b5f95d112fb177c3f65efa4387693d13aafde6ce` | Obsolete transport parser rejected; current packet parser blob `6268561d45b9cfc43cba31e167e0761ede50105a`.                                                                                                                                    |
| `src/source/domains/judicial-office-selection/types.ts`         | `2c033b960da2379cad2ea1074d0ec26549065be9` | Superseded by #116/current typed domain blob `6a2ea1f009f6bbae6e9ff72a2bb14066c104f27f`.                                                                                                                                                      |
| `src/source/domains/judicial-office-selection/validate.ts`      | `4a3c4d5d6602c44ce7beed232ea2cc35a1cc80fc` | Useful invariants preserved in #116/current validator blob `2e657c39e8845bd93017f2cb1dc90635435dea4f`.                                                                                                                                        |
| `tests/source/judicial-office-selection.test.ts`                | `6257845229bd9235eb536c4cd6525f55d1e16001` | Transport-specific tests rejected; semantic checks preserved by current suite blob `b0c91889d9b3add7a8622981eb4ad9b1f9d35a1f`.                                                                                                                |

## #92 historical evidence and current disposition

The original exact head and every old file remain available on the retained branch. The table below is the durable corpus/report scope manifest required before closing #92. Historical reports are retained as dated evidence by exact Git blob; none is promoted into current authority. Generated prose stays outside the production authored bank. The proposed executor/configuration files are explicitly rejected as current configuration.

| Old path                                                     | Blob                                       |   Bytes | Disposition                                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------ | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.gitignore`                                                 | `a5e48357273076bf753e91e84b9876520e2ee87b` |     233 | Obsolete configuration delta rejected; retained only on original ref.                                                                                  |
| `.prettierignore`                                            | `0dc68b1fcce372a24817dc883586760d9bf58af9` |     285 | Obsolete configuration delta rejected; retained only on original ref.                                                                                  |
| `docs/overnight-audit/00-OWNER-MORNING-BRIEF.md`             | `2c8a10fa4a99008e6b1b3ad5c5b43847f9750ee6` |  10,190 | Historical report preserved by exact blob; not current truth.                                                                                          |
| `docs/overnight-audit/00-PROGRESS-AND-STATE.md`              | `4f86b4dc6df61dbc09b23552dee04d0ecc0c29dd` |   6,109 | Historical report preserved by exact blob; not current status.                                                                                         |
| `docs/overnight-audit/10-NARRATIVE-STYLE-AUTHORITY.md`       | `5d764b4966212caca2b28b50b2f36bcfa68ad0b7` |  13,081 | Historical report preserved by exact blob; current prose systems are authoritative.                                                                    |
| `docs/overnight-audit/20-FUTURE-SYSTEM-COVERAGE-MAP.md`      | `8412f03f99dd4d14417d3f993e746cbc01565ab5` |  18,929 | Historical report preserved by exact blob; classifications are stale.                                                                                  |
| `docs/overnight-audit/30-GRAPHICS-AND-MENU-READINESS.md`     | `0d614e80c05fa202428603a724cac7f3f628e19b` |  10,566 | Historical report preserved by exact blob; findings rechecked below.                                                                                   |
| `docs/overnight-audit/40-OPERATING-MODE-AUDIT.md`            | `81d64f964894f916605a8f2c9fdc6839f4bf8409` |  18,588 | Historical report preserved by exact blob; old executor guidance is not authority.                                                                     |
| `docs/overnight-audit/50-ACTION-BOARD.md`                    | `fc2bad8ea8e67189dc1e1f1f76507ed16f3f8363` |  13,299 | Historical board preserved and rechecked; never used as current queue state.                                                                           |
| `docs/overnight-audit/60-FUTURE-SYSTEM-CONTENT-CONTRACTS.md` | `dfbc7c4226a9399b542bdda77b863248e8199b24` |   9,643 | Unique future-contract archive preserved by exact blob; extracted contract text remains historical, not implemented behavior.                          |
| `docs/overnight-audit/CLAUDE.md.proposed`                    | `69ab270a71a9e9c2376da47998e122c4d6357da4` |   2,426 | Explicitly rejected as current configuration/prose authority; retained only as historical proposal.                                                    |
| `docs/overnight-audit/corpus/lint-summary.md`                | `4570822a0cb07fa01e6a54181fe873a7660f84fd` |  20,182 | Historical corpus scope preserved; stale classifications not imported.                                                                                 |
| `docs/overnight-audit/corpus/prose-inventory.json`           | `c93e3b84df384910e5337e0504a929c13dd32beb` | 737,077 | Historical corpus scope preserved by blob/size; not copied into the current authored bank.                                                             |
| `docs/overnight-audit/corpus/transcripts.md`                 | `f60740943164d695ddf14c8551cb00f74336d567` | 233,382 | Historical generated transcript preserved by blob/size only.                                                                                           |
| `docs/overnight-audit/prose-inventory.csv`                   | `0bfe2542e426516d65158b47a31875928099ec44` | 175,021 | Historical review master preserved by blob/size only.                                                                                                  |
| `docs/overnight-audit/prose-review-packet.html`              | `42b577d48b3337b8e821c2f66c956de32f6e5c7e` | 358,767 | Historical packet preserved by blob/size; current server-rendered review packet replaces it.                                                           |
| `package.json`                                               | `a1aa1cb16e3feadcf5cfcf10133e393b20506a2d` |   4,401 | Whole-file/package script delta rejected; current commands remain authoritative.                                                                       |
| `scripts/narrative-corpus.ts`                                | `26106b12bf676f34bf95b7e22892cf9e565f8b18` |  23,029 | Concepts already salvaged and superseded by `scripts/prose-corpus/**`; no duplicate engine ported.                                                     |
| `scripts/prose-review-packet.ts`                             | `bdf078dc4261528c116a577ba49fc9e4cf74bc63` |  22,947 | Superseded by `scripts/prose-corpus/review-packet.ts` blob `30c03117bd54e02172eba80f5d1949ef75ec38f4`.                                                 |
| `src/presentation/life-opacity.test.ts`                      | `51bd7ce0f36510154b8486f5dfc0e7353b0b4092` |  11,361 | Old import-ban delta superseded by the current one-way corpus boundary and its tests.                                                                  |
| `src/presentation/playthrough-transcript.test.ts`            | `0170ac9552431427284be2dc8a477523b79c04cb` |   4,378 | Superseded by current prose-corpus transcript/identity/coverage tests.                                                                                 |
| `src/presentation/playthrough-transcript.ts`                 | `95bf73b6c1d555307cb5a43bd71a389e1ead64b7` |  24,212 | Old production-tree diagnostic rejected; current diagnostic is `scripts/prose-corpus/transcripts.ts`, blob `6dc70be74b03d4cb529181a463ad2bfe17d10cd0`. |

Current `docs/systems/prose-corpus.md` (blob `acdffaacca2537555b8b4c045540d5db111d2a55`) already records #92 as a diagnostic donor, the replacement of positional IDs, the runtime/import boundary, transcript grounding, and packet rendering. This packet adds exact-head/file preservation and does not rewrite that system.

### Rechecked #92 findings

| Finding                                                   | Current disposition                                                                                                                                                                                                                                                                                                                                 | Evidence / owner |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `episodeFacts` / `episodeCapabilities` historical cutoff  | Still reproducible on recovery base for `episodeCapabilities`; `episodeFacts` was independently repaired on the existing OPENING-LIFE1 branch. Exact evidence was transferred to task `01a0837d-93b0-73d2-b6a2-f3d6b42ff77e`, which acknowledged ownership and repaired the remaining capability cutoff with focused proof. No duplicate edit here. |
| Silent exclusion when a required episode role cannot bind | Still reproducible on recovery base at the stage-binding length guard. OPENING-LIFE1 acknowledged ownership and repaired it in its existing worktree with a focused missing-role diagnostic test. No duplicate edit here.                                                                                                                           |
| Placeholder-state consumption                             | Still reproducible on recovery base: `ComposedCharacterVisual.isPlaceholder` is produced and tested, but no normal player/UI consumer reads it. Exact evidence transferred to the existing UI production-integration task `01a083ce-50dc-7773-95b6-63d6bed75af8`; no edit here.                                                                     |
| Raster image-error visibility                             | Still reproducible on recovery base: `src/player/useRasterTier.ts` installs an empty `image.onerror` handler. Exact evidence transferred to the same existing UI integration owner; no edit here.                                                                                                                                                   |
| Formative-bank enumeration                                | No longer reproducible. `lifeSituationCatalog()` exposes the current bank and `scripts/prose-corpus/sources/banks.ts` consumes it into the current inventory.                                                                                                                                                                                       |

The OPENING-LIFE1 acknowledgement reported its changes as uncommitted on its own branch and its focused test as 5/5 passing. Those changes are not part of this recovery branch and are not claimed as delivered here.

## Finite orphaned-artifact recovery

### Jules task `3173115192154108533`

The authenticated Jules session was accessible at the exact task URL. It exposed the original read-only assignment, the six-step plan, a completion summary claiming audits of #98/#100/#101 and `npm run validate`, and a review state that says no patch was found. It did not expose the promised final table, detailed per-PR report, or repair prompts in the accessible conversation/DOM, and PR #106 remains an empty commit carrier. Therefore the report itself is **not recovered**; the accessible task state is preserved here as a truthful recovery result, separate from #106 closure. No hidden result is inferred.

### Requested 49R1 output

Exact Drive searches for `49R1` and the full requested report title returned only assignment `49R_GEMINI_LEGISLATIVE_BARGAINING_EARMARK_LOGROLLING_REALISM_RESEARCH_SUPPLEMENT` (Drive `19IYnjCmgn7jLxGxefPc24UBoLZ4IcsTY0R87HPJwojE`) and later references that call the completion unlocated. The known nested handoff folder and current controls folder contained no matching completion. Result: **49R1 completion not recovered**; the assignment remains the only accessible artifact and is not relabeled as completion.

### `political_game_research_handoff_v1.zip`

The exact archive-name search, one alternate name search without the extension, the known nested handoff folder `1zHIsZcJ7pWDbcpZTdPtsUzRJepFyokGz`, the current controls folder `1HwXK20k0-i4vmO3eHUFnlxM98rUhQEEH`, and the repository were checked. Neither the archive nor a file explicitly identifiable as its extracted unique registry/contracts was found. Result: **missing artifact after the packet's finite search boundary**. No unrelated DriveFS/home/browser data was searched and no old ZIP was replayed.

## Closure rule

This packet is sufficient preservation for #92 and per-file disposition for #98/#100 while retaining original refs/files. It does not make any old report current, claim that gameplay shipped, or accept external research as verified fact. After this packet is committed and published in one draft recovery PR, the authorized sequence is:

1. comment and close unchanged empty carrier #106;
2. comment and close #98 and #100 once current owners confirm they do not need the carriers;
3. comment and close #92 after this preservation commit/PR is remotely accessible;
4. re-read each PR state and exact head after closure.
