# Medicaid starting terms — October 2, 2026

This batch fills 46 of the 49 existing numeric bindings assigned by Team 6
([exact row split](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-5963030735)).
It changes only the claimed initial answer rows: 41 expansion income limits and
five community-engagement hours terms. Existing answers, operative dates,
before rows and phases are preserved. The reader's default January 1, 2000 is
not evidence of enactment. This is source/data work, not proof of live coverage.

## Financial scope

For the 40 adopted states, the term represents the ACA adult group's 133% FPL
ceiling plus the five-percentage-point MAGI disregard, or 1.38 in canonical
ratio units. It does not represent every Medicaid category or higher state
coverage. Primary federal regulations were retrieved as of January 1, 2026:
[42 CFR 435.119](https://www.ecfr.gov/on/2026-01-01/title-42/chapter-IV/subchapter-C/part-435/subpart-B/section-435.119)
and [42 CFR 435.603](https://www.ecfr.gov/on/2026-01-01/title-42/chapter-IV/subchapter-C/part-435/subpart-G/section-435.603).

D.C.'s separate [DHCF October 2025 FAQ](https://dhcf.dc.gov/sites/default/files/dc/sites/dhcf/page_content/attachments/Medicaid%20Changes%202025%20Fact%20Sheet%20FAQ%2010.2025.pdf)
states that the childless-adult ceiling falls from 215% to 138% on January 1, 2026. Its heading, question 1 and dated table agree; question 4's prose says
2025 in error. The term uses the dated table and does not change the saved
initial row's date or invent a historical phase.

**Remaining income rows: US-GU, US-PR, US-VI.** The official
[MACPAC territory fact sheet](https://www.macpac.gov/wp-content/uploads/2019/07/Medicaid-and-CHIP-in-the-Territories.pdf)
(February 2021, pages 1–2) reports local poverty denominators and expansion to
133% of local poverty. That does not establish a January 2026 ratio of federal
poverty. These rows remain unmodified: a dated local ceiling and a compatible
federal-denominator conversion are still needed. No universal 1.38 is assigned
to territories.

### Follow-up on the three territory rows

Measured on October 2, 2026: the primary [HHS poverty-guidelines page](https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines)
states that poverty guidelines are not defined for Puerto Rico, USVI or Guam.
For a federal program serving those jurisdictions, the administering federal
office decides whether to use the contiguous-state guidelines or another
procedure. Its 2026 table was published on January 15, 2026; it does not
establish the guideline applicable at a January 1 opening.

The bounded official-site pass returned HTTP 403 from
`https://dphss.guam.gov/medicaid/` and HTTP 503 from
`https://medicaid.pr.gov/` and
`https://dhs.gov.vi/financial-programs/medical-assistance/`.
These responses establish an acquisition gap, not the programs' legal limits.
No proxy settings were changed and no refusal was bypassed.

Measured: `src/simulation/policy-pack-us-policy-positions.ts:972` names the
field `income-limit` with `share-of-federal-poverty-level`; Team 6's linked
row split identifies its admitted canonical `ratio` unit.
Inferred: a household-size dollar table against a local
poverty measure does not supply that scalar by itself. An exact conversion
would need the dated applicable numerator and denominator for each household
size. A single ratio is usable only if those ratios agree and the program's
definition permits that representation.

The present sources establish a basis mismatch in the available evidence,
not that every current territory rule is mathematically unrepresentable.
The exact January 2026 limits and program-selected guideline remain missing
for US-GU, US-PR and US-VI. CTO decision requested: if the dated program
packet uses local poverty or household-size ceilings, admit that basis/table
through Audit's existing schema rather than substituting mainland FPL.
Keep the three scalar rows untouched until the source and representation are
established. No new schema or numeric term is implemented here.

## Community engagement scope

- Federal US, January 1, 2027: [Public Law 119-21 section 71119](https://www.congress.gov/119/plaws/publ21/PLAW-119publ21.htm),
  adding Social Security Act section 1902(xx), provides an 80-hour route,
  education/income alternatives and exclusions/exceptions.
- Georgia, saved July 1, 2023: [Pathways eligibility](https://pathways.georgia.gov/eligibility)
  and [FAQ](https://pathways.georgia.gov/about-pathways/faqs) specify 80 hours
  and reasonable modifications. The [January 15, 2025 Governor release](https://gov.georgia.gov/press-releases/2025-01-15/gov-kemp-announces-proposed-change-georgia-pathways)
  records the July 2023 launch; the [September 25, 2025 release](https://gov.georgia.gov/press-releases/2025-09-25/cms-approves-georgia-pathways-coveragetm-extension-further-validates)
  records the extension through December 2026. Current categories and
  verification timing are not assumed unchanged since launch.
- Nebraska, May 1, 2026: [DHHS work requirements](https://dhhs.ne.gov/Pages/WorkRequirements.aspx)
  specifies 80 hours in an applicable calendar month and alternative routes.
- Montana, July 1, 2026: [DPHHS June announcement](https://dphhs.mt.gov/News/2026/June/MT-Medicaid-Community-Engagement-July-1)
  specifies 80 hours and redetermination review for nonexcluded adults.
- Iowa, December 1, 2026: [HHS community-engagement requirements](https://hhs.iowa.gov/medicaid/plans-programs/iowa-health-wellness-plan/ihawp-community-engagement-requirements)
  specifies 80 hours, alternatives and the start date. This remains future at
  the ordinary January 2026 opening.

An hours scalar alone does not authorize automatic monthly disenrollment or
replace qualifying categories, exceptions, notices or verification periods.
General assistance and other owners' questions are excluded.
