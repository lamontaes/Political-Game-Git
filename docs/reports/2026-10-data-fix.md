# Calibration identities stay outside the game, and salaries use government records

The game now receives an anonymous electoral calibration projection and independently sourced government salary facts. Research originals remain available for verification outside the shipped data. Election and payroll rules keep their existing logic. Some annual salary inputs change, and unverified rows use the existing labeled estimate. The all-place salary checks pass. The production build passes, and its full output contains none of the flagged names or research artifacts. An ordinary generated opening also passes the salary-initialization check.

## The two corrections

**Measured:** The projection retains all 636 structured electoral observations and presidential vote totals while excluding governor names, personal source URLs, portraits, biographies and election notes. The source-integrity test reconciles the projection against the preserved corpus in `src/simulation/world-setup/electoral-calibration-source.test.ts:81`.

**Measured:** All 62 research files, captures and locks checked against the baseline remain byte-identical. Their hashes and paths are recorded in `docs/reports/2026-10-data-fix-preserved-research.json:4`.

**Measured:** The salary exporter reads 122 official facts with URLs, locators and reference periods. It reads no CSG salary capture or derivative. The generation entry point is `scripts/source/regional-money/export-office-pay.ts:70`.

**Measured:** The replacement contains 51 governor, 29 legislator and 42 trial-court judge salaries. Historical reference periods vary; this is calibration data, not a complete current-pay register. The fact journal explains that scope in `data/source/official-office-pay/facts.json:4`.

**Measured:** Of the 146 former direct salary rows, 99 amounts remain unchanged. Twenty rows now use a different official amount, 27 use the existing estimate, and three previously absent governor rows now have official facts. Every changed or omitted row appears in `docs/reports/2026-10-data-fix-salary-diff.json:4`.

**Measured:** All 168 office/place combinations produce positive annual pay: 122 sourced values and 46 estimates across 56 jurisdictions. The receipt records each place and the estimate's references in `docs/reports/2026-10-data-fix-all-56.json:4`.

**Measured:** The salary reader and payment calculation retain their logic. The recorded baseline-to-head diff covers both components and contains only source documentation and attribution changes in [the validation receipt](2026-10-data-fix-checks.json).

**Inferred:** The new estimates and changed facts can change pay amounts and subsequent simulation records. That follows the existing estimate reader, which ranks official same-office salaries by Census region and income distance in `src/simulation/office-pay.ts:141`.

## Checks and remaining work

**Measured:** A place drawn from all 56 opens an ordinary game in Lahaina, Hawaii, on January 5, 2026. All 7,386 generated paid state legislators have positive weekly salary flows matching the existing salary reader. Reinitialization creates no duplicate flows. [The opening receipt](2026-10-data-fix-opening.json) records the player, seed, officeholder work IDs and flow IDs.

**Measured:** The production build and its embedded typecheck passed. The scan inspected 3,821 files totaling 1,249,248,058 bytes against 53 flagged names and 60 research digests, with zero violations. File hashes and results appear in [the bundle scan receipt](2026-10-data-fix-bundle-scan.json).

**Measured:** The calibration and world-setup tests passed 24 tests. Salary and shipping-integrity tests passed 14 tests, followed by six passing integrity tests after the type repairs and three passing scanner regression tests. The bounded generated-opening test also passed. [The validation receipt](2026-10-data-fix-checks.json) preserves those test outputs and commands.

**Measured:** The baseline observer salary-initialization test failed before this correction and when reproduced with the clean baseline files. It expected history sequence 86,385 and received 86,387. [The clean-baseline control receipt](2026-10-data-fix-checks.json) records the failure at `tests/nationwide/office-salary-initialization.test.ts:144`.

**Measured:** The production scanner rejects the 50 corpus governor names, the flagged election-note names and a predecessor name. It also checks identifying source URLs, salary capture tokens and research artifact digests. The policy is in `scripts/world/check-data-shipping.mjs:22`.

**Measured:** The independent finisher must play the bench before marking golden-path progress. The repository assigns that review in `AGENTS.md:15`.

Scope: this data correction claims no new golden-path step.

## Method and handoff

Baseline: `20118081ecd7628aaa9b61ac7151477aae58d689`. Implementation head: `213fae4ddee0e5800071fc4647e242841a5cc075`. Branch: `pool/data-fix`. One draft pull request: https://github.com/lamontaes/Political-Game-Git/pull/3954.

Official records were read through the connected web tool on October 11, 2026. Direct network access to government domains was unavailable. Whole annual dollars are rounded from the cited amounts; allowances, chamber-dependent pay and unverified annual totals are omitted. Build and test commands ran in the registered cloud workspace through the storage guard.

Model: Codex, GPT-6 family. Repository default effort: medium, because this is a bounded data and packaging correction. Exact deployment ID, actual provider effort and usage are not exposed. No model escalation. No implementation helpers. One read-only civic-report reviewer is required by the reporting skill. Finisher send-backs: zero so far; finishing has not started.

Started October 11, 2026, at 01:32:44 UTC. Validation was recorded at 02:30:14 UTC, after 57 minutes and 30 seconds. Elapsed at this handoff: about one hour, including an additional full-world payroll-law fixture stopped after 18 minutes and 42 seconds without a result. Its operator-stop receipt is recorded in the validation file. The full law playthrough remains unverified. Report review is required before publication.
