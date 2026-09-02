# National Community / Demographic Baseline Compiler (ACS 5-Year)

## Authorization and workspace

- Repository: `lamontaes/Political-Game-Git`
- Workspace: `/Users/lamontae/Documents/Political-Game-ACS-Community-Baselines`
- Branch: `antigravity/acs-community-baselines`
- Base Commit: `d5c488a89c33ab425a276eec2112f78083ba6d7e`
- Concurrency & Ownership: Isolated worktree. Touched only `src/community_baselines/**`, `scripts/community-baselines/**`, `data/community_baselines/**`, `tests/community_baselines.test.ts`, `docs/systems/community-baselines.md`, and non-simulation build scripts. No modifications to `src/simulation/**`, `src/player/**`, `src/presentation/**`, or `src/ui/**`.

## Scope and Architecture

1. **Domain Models & Variable Registry**:
   - Implemented `AcsVintage`, `GeographyLevel`, `GeographyId`, `GeographyRef`, `AcsUniverseId`, `UniverseDefinition`, `AcsVariableDefinition`, `SuppressionReason`, `SourceMetadata`, `AcsEstimateRecord`, `CommunityBaselineDataset`, `DerivedStatistic`, and `SignificanceTestResult`.
   - Built a bounded variable registry covering 82 variables across all 16 required categories: Total Population, Voting-Age & CVAP, Age Structure, Sex, Educational Attainment, Household Income, Poverty, Employment Status, Occupation & Industry, Housing Tenure, Rent & Home Value, Commuting, Household Structure, Disability, Nativity & Citizenship, and Race & Hispanic Origin.

2. **Geography-Safe IDs & Census Hierarchy**:
   - Implemented deterministic, unambiguous prefixed IDs (`geo:us`, `geo:state:XX`, `geo:county:XXYYY`, `geo:place:XXYYYYY`, `geo:cd:XXYY`, `geo:cbsa:XXXXX`, `geo:zcta:XXXXX`, `geo:tract:XXYYYZZZZZZ`, `geo:bg:XXYYYZZZZZZW`).
   - Integrated full FIPS parsing, validation, parent-child resolution, and translation to Census Bureau API parameters (`for` / `in`).

3. **Compiler & Integrity System**:
   - Built `compileAcsCommunityBaselines` supporting raw Census API table responses and pre-downloaded source fixtures.
   - Preserves estimate and Margin of Error (MOE) strictly paired on every record; handles Census suppression codes (`-666666666`, `-888888888`, `-999999999`, `-555555555`, `-222222222`, `null`, `"*****"`, `"N"`, `"(X)"`).
   - Generates deterministic JSON datasets with self-verifying SHA-256 checksums and machine-readable provenance manifests (`data/community_baselines/manifest.json`).

4. **Statistical Operations & Universe Safety**:
   - Implemented `isUniverseCompatible` and `assertUniverseCompatible` to prevent illegal cross-universe operations.
   - Built Census standard MOE propagation for sums, differences, proportions, ratios, coefficients of variation, and two-sample hypothesis testing ($Z$-scores).
   - Enforced a strict anti-stereotyping barrier ensuring zero APIs exist for inferring individual beliefs, opinions, or voting preferences from demographics.

5. **Regression & Portability Coverage**:
   - Included Lexington/Fayette, KY (`geo:place:2146027`, `geo:county:21067`, `geo:state:21`, `geo:tract:21067000100`) as a regression fixture.
   - Included Austin / Travis County, TX (`geo:place:4805000`, `geo:county:48453`, `geo:state:48`, `geo:tract:48453000101`) as a portability fixture.

## Validation Status

- `npm run typecheck`: Passed with 0 errors (`tsc -b`).
- `npm run lint`: Passed with 0 errors (`eslint .`).
- `npm run format`: Prettier formatted and verified.
- `npm run test:community`: All 11 tests passed cleanly.
- `npm run validate:community`: All datasets and manifest hashes verified.
- `npm run compile:community`: Deterministic byte-for-byte rebuild verified.
