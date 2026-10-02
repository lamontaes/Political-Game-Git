# Your Money — owner playtest item 8: occupation description

## MERGED

This item is not merged. Production/test checkpoint 61e401b162457d94ef539a7e3ff69c319d2b8c94 is based on main 5171b49820a1436360e3ecb4240627ddc21178c7. Final publication adds this receipt only. Jobs removal #1825 is already merged. Paycheck #1840 remains a separate preserved PR.

## WHAT EMERGED

HARDWIRED: a town opening with the existing occupation mapping now displays the corresponding O*NET occupation description, independent of the source's wage observation. HARDWIRED: absent or blank source descriptions are omitted. The actual employer's posted terms, applications, work and saved world remain unchanged. No new occupation mapping, data, employer duties or simulation writer.

## VITAL STATISTICS

Complete NEW job-occupation-description.test.ts: 3/3 PASS, 27.64 seconds at 61e401b162457d94ef539a7e3ff69c319d2b8c94; test blob 7f8662f365135e6c59d06eecd09c6d5a65f7b8f8. Three changed TypeScript roots load 1,201 dependencies with zero diagnostics; changed-file lint and format pass. Earlier three-case pass at 5836c0c7f and its two test type-import lint errors remain recorded; the test repair uses a type-only namespace and strengthens posted-terms checks. No assertion, timeout or filter was removed. These are builder checks, not Claude GATE RESULTs.

Browser/screenshot and official Claude gate are NOT RUN. Audit alone owns the newer bare-JSON collection repair; no blocked browser retry or cross-cutting import edit. Stock native logging suppressed the fixture's console trace, so no named player/owner-save observation is inferred from its three passing tests.

## 1. Why-chain to bedrock

Why was the listing missing a useful description? The old projection exposed national median wage prose. Why did that fail to describe the job? A wage statistic says nothing about its duties. Why not author duties from the employer name? No saved vacancy-duty evidence establishes those facts. Why use an occupation description? The opening already records an occupation with an existing source mapping. Why retain missing descriptions? An unmapped or absent source cannot establish duties. Bedrock: the existing recorded occupation selects an existing researched definition; it does not create employer-specific tasks.

## 2. Research

Reuse O*NET 31.0, O*NET-SOC 2019 / SOC 2018, CC BY 4.0, already stored in generated/career-occupations.json and exposed by CAREER_SOURCE_CONTEXT. The existing office-clerk mapping selects 43-9061.00, Office Clerks, General. No wage estimate or new source table is added. O1's reuse inventory, portable producer delta and test draft were explicitly received in #1615 comments 5944735819, 5944822542 and 5944844795.

## 3. Revisions

Keep the existing occupation mapping unchanged. Read description directly rather than requiring a wage record. Render a plain paragraph in the existing listing with no About heading, median narration, legal-pay sentence or restyling.

## 4. What gets built

1. Replace JobListingView.nationalMedian and its wage-sentence helper with occupationDescription from the existing source.
2. Render that field only when present; preserve actual employer, offered pay, hours and application controls.
3. Check source absence, wage absence, unchanged posted terms and Save/Continue through existing projection and panel.

New exports: none; the existing exported listing interface changes its prose field. No creator, financial record or unrelated source path is removed.

## 5. Simulated, records, world pieces, checks

SIMULATED: no new decision. RECORDS: unchanged actual town opening and occupation. WORLD PIECES: existing employer/job-market pipeline and source provider. CHECKS: the canonical opening is rendered read-only; source absence does not create prose; wage absence does not erase a known description; saved world and posted terms are unchanged after reading and reopening.

## 6. Proof run

The controlled canonical-opening fixture draws a locality from all 56 jurisdictions using seed overflow1-job-description-recorded-occupation. It opens an actual life and uses the existing opening writer/projection, then tests the mapped occupation plus missing-source and missing-wage controls. This is focused UI/source integration, not natural all-56 hiring, the unavailable owner save or browser visual acceptance.

## 7. Worked example

The sourced Office Clerks, General definition describes varied office duties, including telephone work, bookkeeping, typing, office machines and filing. A listing already classified as office-clerk displays that existing definition beside its actual offer. The three cases preserve that offer's terms; the controlled source-absence case omits the paragraph. No specific employer's vacancy duties are inferred from this general definition.
