# DATA-FIX: separate research from shipped calibration and salary data

The owner authorized two engineering corrections from the legal review in PR #3947. Officeholders remain fictional. Salary inputs must come from official government records rather than the Council of State Governments salary tables.

Builder: Codex, GPT-6 family, repository default medium. The exact deployment ID and provider effort are not exposed. This is a bounded data and packaging correction; no engine design or model escalation is planned.

## Contract

- Branch `pool/data-fix`, one draft PR against current `main`.
- Keep electoral research originals, captured artifacts, and their SHA-256 lineage. Write an explicit runtime projection containing only the fields production readers need. Names, portraits, biographies, free-form election notes, and person-specific source URLs stay outside the game bundle.
- Replace the governor, legislator, and general trial-court salary inputs with independently read official statutes, compensation schedules, legislature records, and government publications. Record URLs, precise locators, dates, and transformations. Preserve the existing salary reader, payroll, and estimate behavior; only the data and its attribution change.
- Remove CSG salary captures and derivatives from the shipped dependency graph. Preserve historical captures as unshipped research evidence rather than permanently deleting them.
- Own the electoral compiler/projection, its generated data and source documentation, the office-pay exporter/input/output and attribution, bounded integrity tests, a build-artifact check, and required release/progress/evidence records.

## Verification

Run baseline electoral integrity and opening-game/salary tests before implementation. Reconcile every projected simulation field against the preserved corpus. Run the affected tests, office-pay regeneration check, existing nationwide coverage checks, and all-56 salary/data checks. Open an ordinary generated life in a place drawn from all 56 and record its seed and place. Build the game and scan all emitted files for the real governor names and election-note names flagged by the review, identifying fields, research captures, and CSG salary content. Record artifact hashes and exact commands.

Run changed-file typechecking, ESLint, Prettier, the PR release check, and zero-dice. The independent finisher plays the bench before marking golden-path progress; this correction makes no new golden-path claim. Record model/effort visibility, elapsed time, usage if visible, and send-backs.
