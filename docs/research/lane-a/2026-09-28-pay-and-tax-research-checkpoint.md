# Research checkpoint: pay (spec 1) and taxes (spec 2), from research already in the repository

Compiled September 28, 2026 (EDT) for Lane A. Every repository file was read from origin/main without changing anything, and no web page was opened.

## Summary

The repository answers the tax side far better than the pay side. For **taxes**, the September 22, 2026 nationwide intake (`docs/research/chatgpt-answers/2026-09-23-cto-handoff-2230/RESEARCH-taxes-nationwide-56-jurisdictions-and-federal-2026-09-22.md`, "the 56-place intake") cites an official source for the 2026 federal brackets (single only), all three standard deductions, Social Security and Medicare, and FUTA's base rule. It also says, from official sources, whether each of the 50 states and D.C. taxes wages: 9 states do not, 40 states plus D.C. do, and Montana is UNKNOWN. It gives an official rate or schedule for 35 of the 41 that tax wages (40 states plus D.C.; Mississippi's is in conflict), with 2026 as the stated tax year for 15. It gives the general state sales rate, or an official statement that there is none, for 44 of 51, plus Puerto Rico's IVU and Guam's business privilege tax. It does not cover the child tax credit, the earned income credit, Publication 15-T, grocery treatment for most states, any county property-tax effective rate, the split among levying bodies, homestead exemption amounts, or unemployment-tax wage bases. Only Michigan has a new-employer rate. The 92N fiscal-authority matrix covers the 50 states (not D.C. or the territories): property-tax limits, local sales authority and local income-tax authority. Its citations name statutes, but the repository's own disposition file marks 2,110 of its 2,650 claims as matrix-only, with no acquired first-party text; only 5 Alaska claims are verified. For **pay**, the repository has the OEWS May 2025 wage corpus (236,120 records; 54 state-level jurisdictions, 530 areas). The compiled corpus carries only the annual median and mean. The percentiles are in the raw BLS files but are not compiled, which contradicts spec 1's "with percentiles." The repository also has the ASPEP public payroll file and the work-hours intake. It has **no** official source for pay frequency, payday laws, minimum wages, the Employment Cost Index, health-premium shares, retirement rates, public pensions, or unemployment benefit formulas. Every value for those comes only from the two web-search lead files, which opened no page. Coverage by item: Pay 1 frequency 0/56 official; Pay 2 minimum wage 0/56 official; Pay 3 raises 0 official; Pay 4 health and retirement 0 official; Pay 5 unemployment benefits 0/56 official. Tax 1 federal: partly official (brackets for single filers, the standard deduction, payroll taxes, FUTA); the child tax credit, earned income credit and 15-T are LEAD or UNKNOWN. Tax 2 state income: wage tax yes or no for 55/56, structure for 49/51, a rate for 35/41, 2026-dated for 15. Tax 3 sales: state rate or official none for 44/51, grocery treatment for 2/51 official (plus PR). Tax 4 property: legal limits 50/56 matrix-only, effective rates 0/56. Tax 5 local income: authority 50/56 matrix-only plus two official examples. Tax 6 unemployment tax: 1/56 (Michigan, new-employer rate only).

**Status labels.** REPO-SOURCED: a repository research file cites an official source for the value. REPO-SOURCED (92N): from the 92N matrix, which names a statute or constitutional section, but `data/source/state-local-fiscal-authority/research-disposition.json` marks the claim `UNSUPPORTED_MATRIX_ONLY` (no acquired first-party text), so it must be verified before it becomes opening law. LEAD: only in the web-search lead files (`scratchpad/research-pay.md`, `scratchpad/research-tax.md`); a search summary, no page opened. CONFLICT: sources disagree; both are given. UNKNOWN: nothing in the repository or the leads.

**Short source keys used below.**
- **TAX56**: the 56-place intake named above, checked September 22, 2026. Each value carries the official URL printed in that file's section for the state.
- **92N**: `data/source/state-local-fiscal-authority/research-input/92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY.json`, as of September 5, 2026. It covers 50 states, not D.C. or the territories.
- **ROUTE**: `docs/research/chatgpt-answers/2026-09-22-depth2/clock-and-tax/local-income-tax-routing.json` and `CLOCK-AND-TAX-RECEIVING.md`, read September 22, 2026.
- **OEWS**: `data/source/career-occupations/regional-corpus-manifest.json` and `regional-corpus.json.gz`, from BLS OEWS May 2025 (`oesm25st.zip`, `oesm25ma.zip`), as of September 26, 2026.
- **LEAD-PAY** and **LEAD-TAX**: the two scratchpad lead files, compiled September 28, 2026.

---

# PAY (spec 1)

## Pay 0. Pay rate source: OEWS (what the repository already has)

Coverage: REPO-SOURCED for 54 of 56 jurisdictions. American Samoa and the Northern Mariana Islands are not in OEWS.

| Fact | Value | Source | As of | Status |
|---|---|---|---|---|
| Records | 236,120 (37,408 state rows, 198,712 area rows) | OEWS manifest `recordCount`; counted from the corpus | May 2025 survey; compiled 9/26/2026 | REPO-SOURCED |
| State-level jurisdictions | 54: 50 states, D.C., GU, PR, VI | corpus `primaryState`; the OEWS access-status note cites the BLS May 15, 2026 technical note | May 2025 | REPO-SOURCED |
| Areas | 530 metro and nonmetro areas | manifest `coverage.areaCount` | May 2025 | REPO-SOURCED |
| Fields compiled | annual mean, annual median, employment, occupation code (SOC), area | corpus row keys | May 2025 | REPO-SOURCED |
| Percentiles | **Not compiled.** The raw BLS workbooks in the repo (`raw/oews-state-2025.zip`, `state_M2025_dl.xlsx`) contain A_PCT10, A_PCT25, A_PCT75, A_PCT90 and H_PCT10 through H_PCT90. The compiler (`scripts/source/regional-money/compile.ts`) reads only A_MEDIAN and A_MEAN. | inspected on origin/main | May 2025 | CONFLICT with spec 1, which says the corpus has percentiles |
| Missing-wage markers | "#" 677 rows (BLS top-code marker); "*" 5,548 rows (estimate not available) | manifest `missingWageTokens` | May 2025 | REPO-SOURCED; must stay UNKNOWN, never 0 |
| AS, MP | not in OEWS | `Our Civic Duty - OEWS 2025 wage extract access status - 2026-09-22.md`, citing the BLS technical note | 5/15/2026 | REPO-SOURCED (the absence is sourced) |
| Hourly vs. salaried; weekly hours | Hourly work is quoted by the hour, salaried work by the year. CPS "full time" is 35 or more usual hours, a statistical definition, not a legal one. CPS excludes all territories. | `…jobs-and-units-0311/Our Civic Duty - Jobs owner decisions…md` (owner decision); `…work hours and job schedules source intake…md` citing BLS CPS tables 21 and 23 and the definitions page | 2025 annual averages (11 months; October missing) | REPO-SOURCED |

Public payroll (spec 1, "who pays"): the Census 2025 ASPEP individual-unit file is described in `…statehood-and-dialogue-0353/Our Civic Duty - public payroll and government-unit matchability - 2026-09-22.md`. It has 82,589 function rows for 11,421 sampled units; its pay period includes March 12, 2025; payroll is a 31-day March equivalent. 11,185 of the 11,421 IDs match a GUS PID6, and 8 of those point to a different state. It has no PR or Island Areas records. Status: REPO-SOURCED (official Census page and archive). Limit: it is not per-job pay and not an annual salary.

## Pay 1. Pay frequency and state payday laws

Coverage: **0 of 56 REPO-SOURCED.** Nothing in the repository covers pay frequency or payday law; `git grep` finds no research on it. Establishment shares and 10 state payday rules are LEAD.

| Group (BLS CES, Feb. 2023, share of private *establishments*) | Weekly | Biweekly | Semimonthly | Monthly | Status |
|---|---|---|---|---|---|
| All private | 27.0% | 43.0% | 19.8% | 10.3% | LEAD (LEAD-PAY; bls.gov/ces/publications/length-pay-period.htm) |
| 1 to 9 employees | 24.1% | 39.0% | 22.5% | 14.5% | LEAD |
| 1,000 or more employees | 26.3% | 66.6% | 5.6% | 1.5% | LEAD |
| By industry; worker-weighted | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

State payday rules are all LEAD (LEAD-PAY; DOL WHD "State Payday Requirements").

| State | Payday rule (LEAD) |
|---|---|
| AL, FL, NC, SC | none specified |
| CT | weekly |
| IA | biweekly, semimonthly or monthly |
| MN | at least every 31 days |
| NH | weekly or biweekly; semimonthly or monthly with written permission |
| NY | weekly for manual workers; otherwise semimonthly |
| RI | weekly for most employers |

The other 41 states, D.C. and all 5 territories: UNKNOWN.

## Pay 2. Minimum wages for 2026, including tipped

Coverage: **0 of 56 REPO-SOURCED.** The repository request `docs/research/requests/minimum-wages-by-place.json` is still open. Its text says job offers are floored at the federal $7.25, but it cites no source. Everything below is LEAD from LEAD-PAY (DOL WHD state, consolidated and tipped tables; city sites).

| Level | Value | Status |
|---|---|---|
| Federal | $7.25; tipped cash wage $2.13; maximum tip credit $5.12 | LEAD |
| States at the federal $7.25 (lead list) | AL, GA, ID, IN, IA, KS, KY, LA, MS, NH, NC, ND, OK, PA, SC, TN, TX, UT, WI, WY (lead says 20 states) | LEAD |
| AK | $14.00 from 7/1/2026; no tip credit | LEAD |
| CA | $16.90; no tip credit | LEAD |
| CT | $16.94 | LEAD |
| FL | $15.00 and tipped $11.98, from 9/30/2026 | LEAD |
| HI | $16.00 from 1/1/2026 (was $14.00) | LEAD |
| NY | $17.00 NYC, Long Island and Westchester; $16.00 elsewhere; NYC tipped service $14.15, food service $11.35 | LEAD |
| WA | $17.13; no tip credit | LEAD |
| MN, MT, NV, OR | no tip credit; the rate itself is UNKNOWN (OR adjusts 7/1/2026, amount UNKNOWN) | LEAD |
| Cities | Seattle $21.30; San Francisco $19.61; D.C. $18.40; NYC $17.00; Denver $18.29 and Chicago $16.20 are probably stale | LEAD (Denver and Chicago likely out of date) |
| All other states, D.C.'s state-level row, PR, GU, VI, AS, MP | — | UNKNOWN |

## Pay 3. Typical yearly raise by sector (Employment Cost Index)

Coverage: **0 REPO-SOURCED.** The repository has no ECI series; the `git grep` hits for "ECI" are unrelated.

| Sector, wages and salaries, 12 months to June 2026, not seasonally adjusted | Value | Status |
|---|---|---|
| Private industry | 3.1% (−0.4% after inflation) | LEAD (LEAD-PAY; bls.gov/news.release/eci.nr0.htm, Q2 2026) |
| State and local government | 3.4% (−0.1% after inflation) | LEAD |
| All civilian workers; industry detail; raise by tenure | — | UNKNOWN |

## Pay 4. Employee share of health premiums, retirement contributions, public pensions

Coverage: **0 REPO-SOURCED.** All LEAD from LEAD-PAY.

| Measure | Value | Source named | Status |
|---|---|---|---|
| Worker contribution, single coverage | $1,440 a year, 16% of a $9,325 premium | KFF 2025 Employer Health Benefits Survey | LEAD |
| Worker contribution, family coverage | $6,850 a year, 26% of a $26,993 premium | same | LEAD |
| Private access to any retirement plan | 72% (DC plan 70%, DB plan 14%); by firm size under 100 / 100 to 499 / 500+: 59% / 86% / 90% | BLS NCS, "Employee Benefits in the U.S., March 2025," Table 1 | LEAD |
| DC participation, take-up, typical employee deferral rate | — | NCS does not publish a deferral rate; needs a plan-sponsor survey decision | UNKNOWN |
| Public pension, median employee rate, workers covered by Social Security | 6.2% of pay (about 6.25% since FY2022) | NASRA issue brief | LEAD |
| Public pension, median, workers not covered by Social Security | 9.0% | NASRA | LEAD |
| Teachers (most) | 7.0% | NASRA | LEAD |
| Public safety range | 8.8% to 23.32% | NASRA | LEAD |
| States where most state and local workers are outside Social Security | AK, CO, LA, ME, MA, NV, OH | NASRA | LEAD |

## Pay 5. State unemployment benefit formula, weekly maximum, maximum weeks

Coverage: **0 of 56 REPO-SOURCED.** Nothing in the repository. The replacement share or formula is UNKNOWN in all 56. Maximums are LEAD for 11 states; weeks are LEAD for 6.

| State | Max weekly benefit (LEAD) | Max weeks (LEAD) |
|---|---|---|
| CO | $781 | UNKNOWN |
| CT | $721 | UNKNOWN |
| FL | UNKNOWN | 12 |
| HI | $765 | UNKNOWN |
| IL | $669 | UNKNOWN |
| ME | $650 | UNKNOWN |
| MA | $1,105 plus $25 per dependent | 30 |
| MI | UNKNOWN | 20 |
| MN | $857 | UNKNOWN |
| MS | $235 | UNKNOWN |
| MO | UNKNOWN | 20 |
| NJ | $830 | UNKNOWN |
| NC | UNKNOWN | 12 |
| ND | $673 | UNKNOWN |
| SC | UNKNOWN | 20 |
| WA | $1,208 (claims filed on or after 7/5/2026) | UNKNOWN |
| All others, D.C. and 5 territories | UNKNOWN | UNKNOWN ("most states 26" is a lead generalization, not a per-state value) |

Territories: the lead says PR and VI run regular UI programs and GU, AS and MP may have none. That is general knowledge, not verified, so the entries stay UNKNOWN rather than "no program."

---

# TAXES (spec 2)

## Tax 1. Federal, tax year 2026

Coverage: brackets for single filers, the three standard deductions, Social Security and Medicare, the Additional Medicare withholding and FUTA's base rule are REPO-SOURCED (TAX56). The first three bracket starts for joint and head-of-household filers, the child tax credit and the earned income credit are LEAD. The 15-T tables are UNKNOWN. The code already prices Social Security and Medicare (`src/simulation/statutory-tax-rules.ts`).

| Item | Value | Source | As of | Status |
|---|---|---|---|---|
| Rates | 10, 12, 22, 24, 32, 35, 37% | TAX56: IRS 2026 inflation-adjustment release; Rev. Proc. 2025-32 (IRB 2025-45) | TY2026 | REPO-SOURCED |
| Single bracket starts | $12,400; $50,400; $105,700; $201,775; $256,225; $640,600 | same | TY2026 | REPO-SOURCED (the lead agrees) |
| Married filing jointly bracket starts | 12% over $24,800; 22% over $100,800; 24% and up UNKNOWN | LEAD-TAX (IRS release) | TY2026 | LEAD / UNKNOWN |
| Head of household bracket starts | 12% over $17,700; 22% over $67,450; 24% and up UNKNOWN | LEAD-TAX | TY2026 | LEAD / UNKNOWN |
| Standard deduction | $16,100 single or MFS; $32,200 joint; $24,150 head of household | TAX56: IRS release; Rev. Proc. 2025-32 | TY2026 | REPO-SOURCED |
| Child tax credit | $2,200 per child; refundable up to $1,700; phase-out thresholds UNKNOWN | LEAD-TAX (Rev. Proc. 2025-32) | TY2026 | LEAD |
| Earned income credit, maximums | 0 children $664; 1 child $4,427; 2 children $7,316; 3 or more $8,231 | LEAD-TAX (Rev. Proc. 2025-32) | TY2026 | LEAD |
| EITC phase-in and phase-out amounts | UNKNOWN (investment-income limit $12,200 and a $7,270 joint phase-out offset come from secondary summaries) | LEAD-TAX | TY2026 | UNKNOWN / LEAD |
| Pub. 15-T percentage method (annual tables, Standard and Checkbox) | UNKNOWN; supplemental wage rate 22% and backup withholding 24% are leads | open request `docs/research/requests/federal-income-tax-withholding-method-2026.json`; LEAD-TAX | 2026 | UNKNOWN |
| No-W-4 default, filing threshold, April due date, failure-to-pay penalty and interest | UNKNOWN | the same open request | 2026 | UNKNOWN |
| Social Security | 6.2% employee plus 6.2% employer, wages up to $184,500 | TAX56: IRS Pub. 15 (2026); coded in `statutory-tax-rules.ts` | 2026 | REPO-SOURCED |
| Medicare | 1.45% plus 1.45%, no cap; Additional Medicare 0.9% withheld once one employer pays one employee more than $200,000 | TAX56: IRS Pub. 15 (2026); coded | 2026 | REPO-SOURCED |
| FUTA | 6% of the first $7,000 per employee; a credit of up to 5.4% subject to credit reduction; "do not state a universal 0.6%" | TAX56: IRS Pub. 15 (2026) | 2026 | REPO-SOURCED (rule); the net rate stays rule-unknown in code |
| FUTA credit-reduction states | 2025 wages: CA 1.2%, VI 4.5%. 2026 wages: CA 1.8% and VI 5.1% projected; the IRS final list comes in November 2026 | LEAD-TAX (IRS FUTA credit-reduction page) | 2025 / 2026 | LEAD / UNKNOWN |
| Deposit schedule (monthly vs. semiweekly), late-deposit penalty | UNKNOWN | open request `employer-payroll-tax-deposits-and-unemployment.json` | — | UNKNOWN |
| Coverage exceptions (public employees, Section 218, household employers, territories, wage-base indexing) | UNKNOWN | open request `employment-tax-coverage-exceptions.json` | — | UNKNOWN |
| Territories | Federal tax on territory residents follows IRS Pub. 570 and each territory's code; do not apply mainland liability | TAX56 | 9/22/2026 | REPO-SOURCED (the rule); amounts UNKNOWN |

## Tax 2. State individual income tax, 2026

Coverage: whether wages are taxed, REPO-SOURCED for 55 of 56 (Montana UNKNOWN). Structure (none, flat or graduated) is known for 49 of 50 states plus D.C. (AR and MT UNKNOWN); the territories' systems are described but no brackets are given. A rate or schedule is REPO-SOURCED for 35 of the 41 that tax wages (40 states plus D.C.; MS is in conflict), with 2026 as the stated tax year for 15. The standard deduction or exemption is REPO-SOURCED for 2 states (GA, IL). Nonresident taxation is stated for 12. Credits are UNKNOWN in all 56. Local income tax "allowed" comes from 92N (see Tax 5). Code today: `placeWageIncomeTax` returns not-imposed for 9, imposed and unpriced for 41 plus D.C. and the 5 territories, and unknown for MT.

"Nonres." = the source says nonresidents are taxed on income from that state. "Local" = whether 92N says local income or payroll tax is allowed (P = permitted in some form; N = prohibited).

| Place | Structure | Rate or brackets (single unless noted) | Tax year | Deduction or exemption | Nonres. | Local | Status |
|---|---|---|---|---|---|---|---|
| AL | graduated | 2%, 4%, 5% | TY2025 (2026 not located) | UNKNOWN | yes | P (occupational) | REPO-SOURCED (TAX56, ADOR) |
| AK | none | — | current | — | — | N | REPO-SOURCED (AK DOR 2025 debt statement p. 14) |
| AZ | flat | 2.5% | TY2025 | the page lists standard deductions; values not transcribed | UNKNOWN | N | REPO-SOURCED (ADOR 2025 highlights) |
| AR | taxed | UNKNOWN (2026 withholding tables exist) | 2026 | UNKNOWN | UNKNOWN | N (CONFLICT: the lead lists AR as allowing local income tax) | UNKNOWN |
| CA | graduated | 1% to 12.3%, plus 1% over $1 million | TY2025 | UNKNOWN | UNKNOWN | N | REPO-SOURCED (FTB 2025 Form 540 booklet) |
| CO | flat | 4.4% | 2025 | UNKNOWN | UNKNOWN | P (head tax: Denver, Aurora, Greenwood Village) | REPO-SOURCED (DOR guide, Jan. 2026); the lead notes a possible temporary TABOR rate |
| CT | graduated | UNKNOWN | TY2025 materials | UNKNOWN | yes | N | REPO-SOURCED (the structure only) |
| DE | graduated | 2.2% to 5.55% under $60,000; 6.6% at $60,000 or more | undated FAQ | UNKNOWN | UNKNOWN | P (Wilmington 1.25%) | REPO-SOURCED |
| FL | none | — | current | — | — | N | REPO-SOURCED (FL DOR FAQ) |
| GA | flat | 4.99% | TY2026 | $15,000 single, HOH or MFS; $30,000 joint | UNKNOWN | N | REPO-SOURCED (DOR 2026 updates; 2026 employer guide). The lead doubted 4.99%; the repo's DOR citation settles it |
| HI | graduated | 1.4% to 11% | TY2025 | UNKNOWN | UNKNOWN | N | REPO-SOURCED |
| ID | flat | 5.3% | TY2025 (effective 1/1/2025) | UNKNOWN | UNKNOWN | N | REPO-SOURCED |
| IL | flat | 4.95% | TY2025 | $2,850 personal exemption | UNKNOWN | N | REPO-SOURCED (IDOR) |
| IN | flat | 2.95%, plus county income tax | 2026 | UNKNOWN | UNKNOWN | P (county LIT) | REPO-SOURCED (IN DOR rate page); CONFLICT with one lead title saying 3.05% |
| IA | flat | 3.8% | TY2026 | UNKNOWN | yes | N (92N contradicts itself: it also mentions a school surtax; the lead lists the IA school surtax) | REPO-SOURCED (IDR) |
| KS | graduated | 5.2% up to $23,000 ($46,000 joint); 5.58% above | TY2025 | UNKNOWN | yes | N | REPO-SOURCED (KDOR 2025 booklet) |
| KY | flat | 3.5% | TY2026 | UNKNOWN | yes | P (occupational license tax) | REPO-SOURCED (KY DOR FY2025 annual report) |
| LA | flat | 3% | TY2025 onward | UNKNOWN | UNKNOWN | N | REPO-SOURCED (LDR) |
| ME | graduated | 5.8% to $27,400; 6.75% to $64,850; 7.15% above (joint $54,850 / $129,750); plus 2% over $1 million single ($1.5 million joint) | TY2026 | UNKNOWN | UNKNOWN | N | REPO-SOURCED (MRS TY2026 schedule) |
| MD | graduated | 2% to 6.5%, plus county tax | TY2026 | UNKNOWN | UNKNOWN | P (county piggyback) | REPO-SOURCED (Comptroller 2026 Withholding Tax Facts) |
| MA | flat plus surtax | 5%; plus 4% over $1,107,750 | TY2026 | UNKNOWN | UNKNOWN | N | REPO-SOURCED (MA DOR) |
| MI | flat | 4.25% | TY2026 | UNKNOWN | UNKNOWN | P (24 cities) | REPO-SOURCED (Treasury notice) |
| MN | graduated | 5.35%, 6.8%, 7.85%, 9.85%; thresholds UNKNOWN | TY2026 | UNKNOWN | UNKNOWN | N | REPO-SOURCED (MN DOR) |
| MS | graduated vs. flat | TAX56: 0% on the first $5,000, 4% on the next $5,000, 5% over $10,000 (effective date UNKNOWN). Lead: flat 4.0% in 2026 | — | UNKNOWN | UNKNOWN | N | CONFLICT |
| MO | graduated | 0% to $1,313, rising to 4.7% above $9,191 | TY2025 | UNKNOWN | UNKNOWN | P (Kansas City and St. Louis) | REPO-SOURCED (MO DOR) |
| MT | UNKNOWN | UNKNOWN. 92N says graduated; the lead says a 5.65% top rate in 2026, falling to 5.4% in 2027 | — | UNKNOWN | UNKNOWN | N | UNKNOWN (TAX56); LEAD |
| NE | graduated | 4 brackets; the 3rd and 4th are both 4.55%; thresholds UNKNOWN | TY2026 | UNKNOWN | UNKNOWN (residents stated) | N | REPO-SOURCED (DOR 2026 estimated-tax form) |
| NV | none | — | current | — | — | N | REPO-SOURCED (NV Taxation) |
| NH | none on wages | the interest and dividends tax was repealed for periods after 12/31/2024 | 2025 on | — | — | N | REPO-SOURCED (NHDRA). CONFLICT: 92N lists NH as GRADUATED (stale) |
| NJ | graduated | UNKNOWN | — | UNKNOWN | UNKNOWN | P (Newark employer payroll tax) | REPO-SOURCED (the structure only) |
| NM | graduated | UNKNOWN | — | UNKNOWN | yes | N | REPO-SOURCED (the structure only) |
| NY | graduated (per 92N) | 2026 schedule exists; amounts not extracted | 2026 | UNKNOWN | yes | P (NYC; Yonkers surcharge) | REPO-SOURCED (the structure only; NYS withholding notice) |
| NC | flat | 3.99% | TY2026 | UNKNOWN | UNKNOWN | N | REPO-SOURCED (NCDOR) |
| ND | graduated | 0% to $48,475; 1.95% to $244,825; 2.5% above | TY2025 (2026 UNKNOWN) | UNKNOWN | yes | N | REPO-SOURCED (ND Tax Commissioner) |
| OH | effectively flat | $0 through $26,050; then $332 plus 2.75% of the excess | TY2026 | UNKNOWN | UNKNOWN | P (municipal; school district per the lead) | REPO-SOURCED (Ohio LSC Greenbook, HB 96) |
| OK | graduated | top rate 4.75% | TY2024 (2026 UNKNOWN) | UNKNOWN | yes | N | REPO-SOURCED (OTC) |
| OR | graduated | 4.75%, 6.75%, 8.75%, 9.9%; thresholds UNKNOWN | TY2025 | UNKNOWN | yes | P (TriMet and Lane transit payroll taxes) | REPO-SOURCED (OR DOR) |
| PA | flat | 3.07% (the lead adds: no standard deduction) | current | UNKNOWN | yes | P (Act 511 EIT; Philadelphia) | REPO-SOURCED (PA DOR) |
| RI | graduated | 3.75% to $82,050; 4.75% to $186,450; 5.99% above | TY2026 | UNKNOWN | yes | N | REPO-SOURCED (RI Division 2026 schedule) |
| SC | graduated | 1.99% below $30,000; 5.21% from $30,000, less $966 | TY2026 | UNKNOWN | UNKNOWN | N | REPO-SOURCED (SCDOR H.4216 notice) |
| SD | none | — | current | — | — | N | REPO-SOURCED (SD DOR) |
| TN | none on wages | the Hall tax was repealed 1/1/2021 | current | — | — | N | REPO-SOURCED (TN DOR) |
| TX | none | constitutional ban (Art. VIII §24-a) | current | — | — | N | REPO-SOURCED |
| UT | flat | 4.5% | TY2025 onward | UNKNOWN | UNKNOWN | N | REPO-SOURCED (Tax Commission FY2025 report) |
| VT | graduated | UNKNOWN | TY2025 forms | UNKNOWN | UNKNOWN | N | REPO-SOURCED (the structure only) |
| VA | graduated | 2% on the first $3,000, rising to 5.75% above $17,000 | current page | UNKNOWN | UNKNOWN | N | REPO-SOURCED (Virginia Tax) |
| WA | none on wages | capital gains excise 7%, and 9.9% over $1 million; a broad 9.9% income tax is enacted effective 1/1/2028 | TY2025 / 2028 | — | — | N | REPO-SOURCED (WA DOR) |
| WV | graduated | 2.11%, 2.81%, 3.16%, 4.22%, 4.58%; thresholds UNKNOWN | 2026 | UNKNOWN | UNKNOWN | N | REPO-SOURCED (WV Tax Division) |
| WI | graduated | 3.5% to 7.65% | TY2025 | UNKNOWN | UNKNOWN | N | REPO-SOURCED (WI DOR) |
| WY | none | — | current | — | — | N | REPO-SOURCED (WY 2025 ACFR p. 228) |
| DC | graduated | 4% to 10.75% | tax years after 2021 | UNKNOWN | UNKNOWN | not applicable (one jurisdiction) | REPO-SOURCED (OTR) |
| PR | own code | brackets UNKNOWN (Form 482, TY2025) | TY2025 | UNKNOWN | UNKNOWN | not in 92N | REPO-SOURCED (the structure only; Hacienda) |
| GU | mirror of the Internal Revenue Code | UNKNOWN | — | UNKNOWN | UNKNOWN | not in 92N | REPO-SOURCED (the structure only; Guam DRT) |
| VI | taxed; mirror conditions UNKNOWN | UNKNOWN | — | UNKNOWN | UNKNOWN | not in 92N | REPO-SOURCED (the structure only; BIR) |
| AS | taxed (Form 390) | UNKNOWN; do not use the old IRS 2000 table the page links | TY2025 | UNKNOWN | UNKNOWN | not in 92N | REPO-SOURCED (the structure only) |
| MP | mirror tax (Chapter 7) plus a separate wage and salary tax (Chapter 2) | wage tax: $0 through $1,000, then 2% to 7% over successive bands through $40,000; higher bands UNKNOWN | TY2024 | TY2025 deductions apply to Chapter 7 only | UNKNOWN | not in 92N | REPO-SOURCED (Form 1040NMI; CNMI announcement) |

Reciprocity (for example, PA with NJ, OH, IN, MD, VA and WV) is LEAD only (LEAD-TAX). Credits for tax paid to another state: UNKNOWN. The open request `docs/research/requests/state-wage-income-tax-withholding.json` asks for each state's withholding method, the residence-versus-work-place rule and the unpaid-balance rules; all UNKNOWN.

## Tax 3. State sales tax, local add-ons, grocery treatment

Coverage: the general state rate, or an official "none," is REPO-SOURCED for 44 of 51. AR, KS, WV and MT are UNKNOWN; AZ (by business class), MO and UT (place-specific tables) have no single state rate stated. Whether local add-ons exist: REPO-SOURCED (TAX56) or REPO-SOURCED (92N) for all 50 states. Typical local add-on rates: 92N caps only. Grocery treatment: REPO-SOURCED for 2 states (IL, MS), plus PR's 7% prepared-food rate; LEAD for 3 more (AL, AR, TN).

| Place | State rate | Local add-on | Groceries | Status |
|---|---|---|---|---|
| AL | 4% | yes, varies by locality | reduced state rate, 2% (lead) | REPO-SOURCED; grocery LEAD |
| AK | none statewide | boroughs and cities, 92N "up to 7%+" | UNKNOWN | REPO-SOURCED; local permission verified in production |
| AZ | TPT; rate by business class | city TPT, by class and region | UNKNOWN | REPO-SOURCED (ADOR table); state rate not stated |
| AR | UNKNOWN | city and county | state rate repealed; local still applies (lead) | UNKNOWN; grocery LEAD |
| CA | 7.25% statewide base (includes statutory local shares) | districts 0.10% to 2.00% each | UNKNOWN | REPO-SOURCED (CDTFA, rates effective 4/1/2026) |
| CO | 2.9% | yes, varies | UNKNOWN | REPO-SOURCED (DR 1002, Jan. 2025; not a 2026 citation) |
| CT | 6.35% | none (official) | UNKNOWN | REPO-SOURCED |
| DE | none (official); gross receipts tax on sellers 0.0945% to 1.9914% | none | not applicable | REPO-SOURCED |
| FL | 6% | county discretionary surtax; 92N up to 1.5% | UNKNOWN | REPO-SOURCED |
| GA | 4% | LOST, SPLOST, ESPLOST | UNKNOWN | REPO-SOURCED |
| HI | GET 4.5% retail (includes 0.5% county surcharge); 0.5% wholesale | the county surcharge only | UNKNOWN | REPO-SOURCED; a tax on the business, not a retail sales tax |
| ID | 6% | UNKNOWN; 92N: resort cities only | UNKNOWN | REPO-SOURCED |
| IL | 6.25%; qualifying drugs 1% | yes | state grocery tax removed 1/1/2026; locals may levy 1% | REPO-SOURCED (IDOR) |
| IN | 7% | UNKNOWN; 92N: none | UNKNOWN | REPO-SOURCED |
| IA | 6% | local option; 92N 1% with a vote | UNKNOWN | REPO-SOURCED |
| KS | UNKNOWN | yes, address-specific | UNKNOWN | UNKNOWN (state rate) |
| KY | 6% | none (official) | UNKNOWN | REPO-SOURCED |
| LA | 5% | yes | UNKNOWN | REPO-SOURCED |
| ME | 5.5% | 92N: none | UNKNOWN | REPO-SOURCED |
| MD | 6% | 92N: none | UNKNOWN | REPO-SOURCED |
| MA | 6.25% | 92N: meals and lodging only | UNKNOWN | REPO-SOURCED |
| MI | 6% | none (official) | UNKNOWN | REPO-SOURCED |
| MN | 6.875% | yes | UNKNOWN | REPO-SOURCED |
| MS | 7% | 92N: tourism taxes only | 5% | REPO-SOURCED (DOR rate table) |
| MO | place-specific 2026 tables | yes | UNKNOWN | REPO-SOURCED (statewide rate not stated) |
| MT | UNKNOWN; 92N: none; the lead says none | 92N: resort tax | UNKNOWN | UNKNOWN (TAX56); REPO-SOURCED (92N) |
| NE | 5.5% | 0.5%, 1%, 1.5%, 1.75% or 2% | UNKNOWN | REPO-SOURCED |
| NV | 6.85% base | by district | UNKNOWN | REPO-SOURCED |
| NH | none (official) | 92N: none | not applicable | REPO-SOURCED |
| NJ | 6.625% | limited zone exceptions | UNKNOWN | REPO-SOURCED |
| NM | GRT 4.875% base | county and municipal | UNKNOWN | REPO-SOURCED |
| NY | 4% | county, city and school district, plus 0.375% MCTD | UNKNOWN | REPO-SOURCED |
| NC | 4.75% | county and transit | UNKNOWN | REPO-SOURCED |
| ND | 5% | city and county | UNKNOWN | REPO-SOURCED |
| OH | 5.75% | county and transit | UNKNOWN | REPO-SOURCED |
| OK | 4.5% | city and county | UNKNOWN | REPO-SOURCED |
| OR | none (official) | 92N: none | not applicable | REPO-SOURCED |
| PA | 6% | Allegheny 1%; Philadelphia 2% | UNKNOWN | REPO-SOURCED |
| RI | 7% | 92N: none | UNKNOWN | REPO-SOURCED |
| SC | 6% | local option | UNKNOWN | REPO-SOURCED |
| SD | 4.2% | municipal up to 2%, plus a gross receipts tax up to 1% | UNKNOWN | REPO-SOURCED |
| TN | 7% | county and city | reduced state rate, 4% (lead) | REPO-SOURCED; grocery LEAD |
| TX | 6.25% | up to 2%; combined maximum 8.25% | UNKNOWN | REPO-SOURCED |
| UT | combined rates by locality (4/1/2026 table) | yes | UNKNOWN | REPO-SOURCED (no single state rate stated) |
| VT | 6% | 1% local option in listed towns | UNKNOWN | REPO-SOURCED |
| VA | 5.3% in most places; 6.0%, 6.3% or 7.0% in listed regions | included in those combined rates | UNKNOWN | REPO-SOURCED |
| WA | 6.5% (6.8% on vehicles) | yes | UNKNOWN | REPO-SOURCED |
| WV | UNKNOWN | municipal add-ons | UNKNOWN | UNKNOWN (state rate) |
| WI | 5% | county and local option | UNKNOWN | REPO-SOURCED |
| WY | 4% | county, up to a 3% cap with voter approval | UNKNOWN | REPO-SOURCED |
| DC | 6% through 9/30/2026; 7% from 10/1/2026 | none | UNKNOWN | REPO-SOURCED (OTR) |
| PR | IVU 11.5% (10.5% commonwealth plus 1% municipal) | the 1% municipal share | prepared food 7% where authorized | REPO-SOURCED (Hacienda) |
| GU | no retail sales tax found; business privilege tax 5% of gross receipts | — | UNKNOWN | REPO-SOURCED (BPT); sales tax UNKNOWN |
| VI | UNKNOWN; a gross receipts tax exists | — | UNKNOWN | UNKNOWN |
| AS | UNKNOWN | — | UNKNOWN | UNKNOWN |
| MP | UNKNOWN; a business gross revenue tax exists | — | UNKNOWN | UNKNOWN |

Calibration leads (LEAD-TAX, Tax Foundation 2026): the population-weighted average combined rate is 7.53%. The highest average combined rates are LA 10.13%, TN 9.61%, WA 9.57%, AR 9.48% and AL 9.46%. AARP says 8 states tax groceries in 2026; the list is UNKNOWN.

## Tax 4. Property tax

Coverage. County effective rate (ACS B25103 ÷ B25077): **0 of 56**; the repository holds no B25103 or B25077 data (`git grep` finds none). Split among levying bodies: **0**. The repository does have the Census 2024 government-finance individual-unit raw file (`data/source/government-finances/raw/data.txt`), but the compiled corpus is a 25-unit sample. The split has not been computed, and the sample is not the universe. State limits and voter rules: **50 of 50 states, REPO-SOURCED (92N)**, all matrix-only except Alaska's 30-mill cap, which is verified. D.C. and the territories: UNKNOWN. Homestead exemption amounts: **0 of 56**. 92N gives homestead-linked assessment caps for AR (5% homestead, 10% commercial) and FL (lower of 3% or CPI; 10% for non-homestead). It also gives them for IN (1% of gross value for homesteads, 2%, 3%), MD (10% homestead credit cap; counties may set 0% to 10%), OK (3% homestead, 5% commercial) and TX (10% homestead appraisal cap). It gives homestead tiers in VT and county freezes in GA. 

Property tax is REPO-SOURCED (TAX56) as existing in many places. MD has an official 2026–27 rate index. MN's state rates for taxes payable in 2026 are 28.313% of net tax capacity for commercial and industrial and 9.203% for seasonal recreational. The other places: IA, KS, KY, LA, ME, MI, MS, MO, NE, NV, NH, NJ (2026 general rates by municipality), NY, NC, ND, OH, OK, OR, PA, RI, SC, TN, TX, WY and DC. AK has none statewide except oil and gas property.

Method (spec 2 proposal, not yet run): effective rate ≈ B25103_001E ÷ B25077_001E by county, ACS 5-year. PR is covered through the PRCS; GU, VI, AS and MP are not in the ACS (LEAD-TAX). A third-party lead gives a median county rate of 0.84%, a median bill of $1,547, and a range of 0.08% to 3.64%. LEAD, not verified.

State limits from 92N (as of 9/5/2026). "A:" is an assessment cap, "R:" a rate cap, "L:" a levy cap. Text is abridged from the matrix; status REPO-SOURCED (92N) except AK's rate cap, which is verified.

| State | Assessment growth cap | Rate (millage) cap | Levy growth cap | Rollback on reassessment | Voter or hearing rule |
|---|---|---|---|---|---|
| AK | none stated | R: 30-mill cap in home rule/general law municipalities (AS 29.45.080) | none stated | no | Local voter referendum required for municipal sales tax adoption |
| AL | none stated | R: Const. caps 5 mills county, 5 mills city, 6.5 state | none stated | no | Constitutional amendments required for local rate increases |
| AR | none stated | A: 5% homestead / 10% commercial (Amend. 79); R: 5 mills county | none stated | no | Voter referendum required for local sales tax enactment |
| AZ | 5.0% LPV (Prop 117) | none stated | A: 5% LPV cap (Prop 117); L: 2% levy cap for cities/counties | no | Truth in Taxation hearings if levy exceeds prior year collections |
| CA | 2.0% (Prop 13) | A: 2% cap (Prop 13); R: 1% max ad valorem rate; Prop 218 constraints | none stated | no | Prop 218: Majority for general tax; 2/3 supermajority for special taxes |
| CO | none stated | none stated | L: TABOR (inflation + local growth cap); 5.5% statutory levy limit | no | TABOR: Mandatory voter approval for ANY tax/rate hike or debt |
| CT | none stated | R: Uniform motor vehicle millage cap (32.46 mills under C.G.S. § 12-71e) | none stated | no | Town Meeting / Referendum depending on municipal charter |
| DE | none stated | R: Statutory rate caps by county and school district | none stated | no | School district tax increases require local referendum |
| FL | 3.0% (Save Our Homes) | A: 3% Save Our Homes; R: 10 mills county, 10 city, 10 school | none stated | no | TRIM (Truth in Millage) process; voter vote for surtax |
| GA | none stated | R: Homestead exemption assessment freezes in specific counties | none stated | no | Voter referendum mandatory for SPLOST and ESPLOST |
| HI | none stated | none stated | none stated | no | Council sets rate annually; No local school districts (single state DOE) |
| IA | none stated | none stated | none stated | yes | Voter approval mandatory for LOST and reverse referendum triggers |
| ID | none stated | none stated | L: 3% property tax budget growth limit (Idaho Code § 63-802) | no | Exceeding 3% limit requires voter approval |
| IL | none stated | none stated | L: PTELL (lesser of 5% or CPI in Cook and collar counties) | no | PTELL levy referendum to exceed CPI cap; school rate votes |
| IN | none stated | R: Constitutional Caps: 1% homestead, 2% other, 3% business | none stated | no | Referendum required for school operating referendums and capital projects |
| KS | none stated | none stated | L: Revenue Neutral Rate (RNR) hearing to exceed neutral rate | no | Voter referendum required for sales taxes and bond elections |
| KY | none stated | none stated | L: HB 44: Compensating rate; >4% growth triggers recall petition | yes | 10% voter petition forces referendum if levy exceeds 4% rate |
| LA | none stated | R: Constitutional millage caps; mandatory 4-year reassessment rollback | none stated | yes | Voter approval required for all local sales taxes and millage increases |
| MA | none stated | none stated | L: Prop 2 1/2: 2.5% levy ceiling and 2.5% annual levy growth limit | no | Prop 2 1/2 Override Ballot Question required to exceed levy limit |
| MD | none stated | none stated | none stated | no | Charter county referendum provisions for specific tax increases |
| ME | none stated | none stated | L: LD 1 municipal property tax levy cap (growth tied to income) | no | Town meeting / Council vote by designated supermajority to exceed |
| MI | 5.0% or CPI (Proposal A) | none stated | A: Proposal A (lesser of 5% or CPI); L: Headlee rollback | yes | Headlee rollback override election required to restore millage |
| MN | none stated | R: Statutory classification net tax capacity limits | none stated | no | Voter approval mandatory for all local sales tax adoptions |
| MO | none stated | none stated | L: Hancock Amendment: mandatory tax rate rollbacks on reassessment | yes | Hancock vote required for any local tax rate increase |
| MS | none stated | none stated | L: 10% annual increase cap on municipal property tax levies | no | Voter referendum with 60% affirmative vote for local sales options |
| MT | none stated | none stated | L: MCA 15-10-420: annual levy increase capped at half rate of inflation | no | Voter election required for resort tax or millage levy increase |
| NC | none stated | none stated | none stated | no | Voter approval mandatory for Article 46 quarter-cent sales tax |
| ND | none stated | R: Mill levy caps by fund under N.D.C.C. 57-15 | none stated | no | Voter approval required to approve home rule charter tax powers |
| NE | none stated | R: Hard Levy Caps: County $0.50/$100; Schools $1.05/$100 AV | none stated | no | Voter override election to exceed statutory levy caps |
| NH | none stated | none stated | none stated | no | SB 2 Official Ballot Referendum voting on town/school budgets |
| NJ | none stated | none stated | L: 2.0% Local Property Tax Levy Cap (N.J.S.A. 40A:4-45.45) | no | Voter referendum required to exceed 2% cap or school budget cap |
| NM | none stated | A: 3% annual valuation increase cap on residential property; R: 20 mills | none stated | no | Referendum required for specific local GRT increments |
| NV | none stated | R: $3.64 per $100 AV statutory combined cap (NRS 361.453); A: 3%/8% cap | none stated | no | Voter approval for local option fuel/sales taxes |
| NY | none stated | L: 2% Tax Levy Cap (lesser of 2% or CPI); R: Const. 2% rate cap | L: 2% Tax Levy Cap (lesser of 2% or CPI); R: Const. 2% rate cap | no | 60% Supermajority of local board or school vote to override 2% cap |
| OH | none stated | R: 10-Mill Unvoted Limitation (Ohio Const. Art. XII, § 2) | none stated | no | Voter approval mandatory for all tax levies outside 10-mill limit |
| OK | none stated | A: 3% homestead / 5% commercial cap; R: Const. 10 mills county, 5 city | none stated | no | Mandatory voter referendum for municipal sales taxes |
| OR | 3.0% MAV (Measure 50) | A: 3% MAV cap (Measure 50); R: $10/$1,000 govt, $5/$1,000 schools (M5) | none stated | no | Local option levies require November election or 50% voter turnout |
| PA | none stated | none stated | L: Act 1 of 2006 (Taxpayer Relief Act Index for school property taxes) | no | Act 1 referendum required for school tax hikes above state index |
| RI | none stated | none stated | L: 4.0% Property Tax Levy Cap (R.I.G.L. § 44-5-2) | no | 4/5 council vote or state emergency approval to exceed 4% cap |
| SC | none stated | none stated | L: Millage rate increases capped at CPI + population growth (S.C. Code § 6-1-320) | no | Voter referendum mandatory for Capital Project Sales Tax |
| SD | none stated | none stated | L: Property tax revenue growth capped at CPI or 3% (SDCL 10-13-35) | no | Opt-out referendum allows voters to overturn school/county opt-out |
| TN | none stated | none stated | L: Certified Tax Rate law (T.C.A. § 67-5-1701: rate rolls back after reappraisal) | yes | Public notice and public hearing required to exceed certified rate |
| TX | none stated | none stated | L: Truth in Taxation: 3.5% Voter-Approval Tax Rate (2.5% for schools) | no | Mandatory Automatic Election if adopted rate exceeds Voter-Approval Rate |
| UT | none stated | none stated | L: Certified Tax Rate law (Utah Code § 59-2-924: automatic rate rollback) | yes | Truth in Taxation advertisement and public hearing to exceed rate |
| VA | none stated | none stated | L: Reduced Tax Rate ordinance / hearing if reassessment increases levy >1% | no | Voter approval required for county GO debt; cities issue under charter |
| VT | none stated | R: Common Level of Appraisal (CLA) adjustments under Act 60/68 | none stated | no | Town Meeting voting on municipal budget and school spending |
| WA | none stated | none stated | L: 101% Levy Limit (lesser of 1% or inflation plus new growth) | no | Levy Lid Lift election required to exceed 1% annual growth cap |
| WI | none stated | none stated | L: Net New Construction levy cap (Wis. Stat. § 66.0602) | no | Referendum required to exceed net new construction levy limit |
| WV | none stated | R: Constitutional property tax classification rate limits (Class I-IV) | none stated | no | 60% voter approval for excess levies up to 50% above maximum rates |
| WY | none stated | R: Constitutional millage caps: 12 mills county, 8 mills city, 12 state | none stated | no | Voter referendum mandatory for local option sales taxes (every 4 years) |
## Tax 5. Local income taxes

Coverage. Which states allow them: 50 of 50 states, REPO-SOURCED (92N), all matrix-only. 92N marks 13 states as allowing some local income, wage, payroll, head or occupational tax: AL, CO, DE, IN, KY, MD, MI, MO, NJ, NY, OH, OR, PA. Its narrative says 14; the fourteenth is probably Iowa's school surtax, which the IA row calls "PROHIBITED" while its detail text mentions the surtax (CONFLICT). D.C. and the territories: UNKNOWN (not in 92N). Official repository sources exist for two places only (ROUTE): Ohio Revised Code 718.04 and Philadelphia. Rates in major cities and counties: 2 REPO-SOURCED, the rest LEAD or 92N. The open request `docs/research/requests/local-income-tax-authority-56-places.json` (all 56 places × county, city and school district) is unanswered.

92N local income authority, all 50 states (as of 9/5/2026; REPO-SOURCED (92N)):

| State | 92N status | Tax type | 92N detail |
|---|---|---|---|
| AK | PROHIBITED | NONE | NO: Strictly unauthorized (`NO_STATUTORY_AUTHORITY`) |
| AL | PERMITTED_GENERAL | OCCUPATIONAL_LICENSE_TAX | YES: Certain cities/counties (Birmingham 1%, Gadsden 2% occupational) |
| AR | PROHIBITED | NONE | NO: Unauthorized |
| AZ | PROHIBITED | NONE | NO: Barred by state preemption |
| CA | PROHIBITED | NONE | NO: Strictly prohibited by Cal. Rev. & Tax. Code § 17041.5 |
| CO | PERMITTED_GENERAL | HEAD_TAX | YES: Flat monthly Head Tax (Denver, Aurora, Greenwood Village) |
| CT | PROHIBITED | NONE | NO: Zero local income tax authority |
| DE | RESTRICTED_SPECIFIC_CITIES | EARNED_INCOME_TAX | YES: City of Wilmington 1.25% Earned Income Tax (22 Del. C. § 901) |
| FL | PROHIBITED | NONE | NO: Strictly barred by Fla. Const. Art. VII, § 5 |
| GA | PROHIBITED | NONE | NO: Unauthorized |
| HI | PROHIBITED | NONE | NO: Unauthorized |
| IA | PROHIBITED | NONE | NO: Permitted for schools (Emergency Surtax) under Ch. 298 |
| ID | PROHIBITED | NONE | NO: Unauthorized |
| IL | PROHIBITED | NONE | NO: Unauthorized for non-home rule; home rule barred by Art. VII § 6(e) |
| IN | PERMITTED_PIGGYBACK | EARNED_INCOME_TAX | YES: County Local Income Tax (LIT) up to 2.5%+ (IC 6-3.6) |
| KS | PROHIBITED | NONE | NO: Unauthorized |
| KY | PERMITTED_GENERAL | OCCUPATIONAL_LICENSE_TAX | YES: Occupational License Tax on wages and net profits (KRS Ch. 67/68/91/92) |
| LA | PROHIBITED | NONE | NO: Unauthorized |
| MA | PROHIBITED | NONE | NO: Unauthorized |
| MD | PERMITTED_PIGGYBACK | COUNTY_PIGGYBACK | YES: Mandatory County Income Tax Piggyback (2.25% to 3.20%) |
| ME | PROHIBITED | NONE | NO: Unauthorized |
| MI | RESTRICTED_SPECIFIC_CITIES | EARNED_INCOME_TAX | YES: Uniform City Income Tax (Act 284 of 1964; 24 cities; 1.0%-2.4%) |
| MN | PROHIBITED | NONE | NO: Strictly unauthorized |
| MO | RESTRICTED_SPECIFIC_CITIES | EARNED_INCOME_TAX | YES: Kansas City & St. Louis 1% Earnings Tax (RSMo 92.110) |
| MS | PROHIBITED | NONE | NO: Unauthorized |
| MT | PROHIBITED | NONE | NO: Unauthorized |
| NC | PROHIBITED | NONE | NO: Unauthorized |
| ND | PROHIBITED | NONE | NO: Unauthorized |
| NE | PROHIBITED | NONE | NO: Unauthorized |
| NH | PROHIBITED | NONE | NO: Prohibited |
| NJ | RESTRICTED_SPECIFIC_CITIES | PAYROLL_TAX | YES: City of Newark Employer Payroll Tax (N.J.S.A. 40:48C-14) |
| NM | PROHIBITED | NONE | NO: Unauthorized |
| NV | PROHIBITED | NONE | NO: Prohibited by state constitution |
| NY | PERMITTED_GENERAL | EARNED_INCOME_TAX | YES: NYC Personal Income Tax (Art. 30); Yonkers Surcharge (Art. 30-A) |
| OH | PERMITTED_GENERAL | EARNED_INCOME_TAX | YES: Municipal Income Tax (~650 cities; 1.0%-3.0% under R.C. Ch. 718) |
| OK | PROHIBITED | NONE | NO: Prohibited |
| OR | PERMITTED_GENERAL | PAYROLL_TAX | YES: TriMet & Lane Transit District Employer Payroll Taxes |
| PA | PERMITTED_GENERAL | EARNED_INCOME_TAX | YES: Act 511 Earned Income Tax (EIT; 1%-2%); Phila Wage Tax (~3.75%) |
| RI | PROHIBITED | NONE | NO: Unauthorized |
| SC | PROHIBITED | NONE | NO: Unauthorized |
| SD | PROHIBITED | NONE | NO: Prohibited |
| TN | PROHIBITED | NONE | NO: Constitutionally banned (State income tax repealed) |
| TX | PROHIBITED | NONE | NO: Strictly prohibited by Tex. Const. Art. VIII, § 24-a |
| UT | PROHIBITED | NONE | NO: Unauthorized |
| VA | PROHIBITED | NONE | NO: Unauthorized |
| VT | PROHIBITED | NONE | NO: Unauthorized |
| WA | PROHIBITED | NONE | NO: Barred by state preemption; cities levy local B&O taxes |
| WI | PROHIBITED | NONE | NO: Unauthorized |
| WV | PROHIBITED | NONE | NO: Unauthorized; cities levy local B&O gross receipts taxes |
| WY | PROHIBITED | NONE | NO: Prohibited |
Rates in major cities and counties, and how work city and home city interact:

| Place | Rate | Work vs. home rule | Source | As of | Status |
|---|---|---|---|---|---|
| Ohio municipalities | 92N: about 650 cities, 1.0% to 3.0% | Cities may levy income and withholding taxes within the chapter's limits; a resident's credit for tax paid elsewhere may be partial | ROUTE: Ohio Rev. Code 718.04(A), (D), (F), effective 9/29/2015 | 9/22/2026 read | REPO-SOURCED (authority and credit rule); rate range REPO-SOURCED (92N) |
| Columbus, OH | 2.5%; residents on all income, nonresidents on Columbus income; resident credit up to 2.5% | effectively the higher rate | LEAD-TAX (columbus.gov/incometax) | — | LEAD |
| Philadelphia, PA | residents 3.74%, nonresidents 3.43% from 7/1/2025; residents 3.735%, nonresidents 3.425% from 7/1/2026 | Wage Tax and Earnings Tax are one tax: withholding and direct payment settle the same liability. A January 2026 world must not use the July 2026 rate. | ROUTE: phila.gov Earnings Tax page | 9/22/2026 read | REPO-SOURCED |
| Pennsylvania Act 511 / Act 32 EIT | 92N: 1% to 2%; the lead says a common 1% combined resident rate | Lead: the employer withholds the higher of the resident total or the work place's nonresident rate; school districts cannot tax nonresidents | 92N (Act 511); LEAD-TAX (PA DCED Act 32 FAQ) | — | REPO-SOURCED (92N) / LEAD |
| Lexington-Fayette, KY | 2.25% occupational license fee on wages and net profits | credits between localities UNKNOWN | LEAD-TAX (LFUCG) | — | LEAD (92N confirms KY occupational license authority) |
| Maryland counties | 92N: 2.25% to 3.20%. Lead: 2.25% to 3.30%; Kent County 3.30% and Allegany 3.20% in 2026; Montgomery and Baltimore City 3.20% | residence county, collected on the state return; nonresidents pay a special nonresident rate (UNKNOWN) | 92N; LEAD-TAX (Comptroller 2026 withholding memo). TAX56 confirms the county rates are published in the Comptroller's 2026 Withholding Tax Facts but does not transcribe them | 2026 | CONFLICT on the top of the range (3.20% vs. 3.30%) |
| Indiana counties | 92N: county LIT up to 2.5% or more. Lead: Marion County 2.02% from 1/1/2026 | county of residence on January 1 governs; out-of-state residents use the work county | 92N; LEAD-TAX (IN DOR Departmental Notice 1) | 2026 | REPO-SOURCED (92N) / LEAD |
| Michigan cities | 92N: 24 cities, 1.0% to 2.4%. Lead: Detroit 2.4% resident, 1.2% nonresident; Grand Rapids and Saginaw 1.5% / 0.75%; most others 1% / 0.5% | nonresidents pay half the resident rate (Uniform City Income Tax Act); resident credit UNKNOWN | 92N (Act 284 of 1964); LEAD-TAX (Form 5469 TY2026) | 2026 | REPO-SOURCED (92N) / LEAD |
| New York City | lead: 4 brackets, 3.078% to 3.876%; the bracket starts are UNKNOWN | residents only | 92N (Tax Law Art. 30); LEAD-TAX | — | LEAD (rates) |
| Kansas City and St. Louis, MO | 1% earnings tax each; residents on all earnings, nonresidents on work done in the city. St. Louis voters kept it on 4/7/2026 | credits UNKNOWN | 92N (RSMo 92.110); LEAD-TAX (KCMO; St. Louis Public Radio) | 4/7/2026 | REPO-SOURCED (92N) / LEAD |
| Wilmington, DE | 1.25% earned income tax | UNKNOWN | 92N (22 Del. C. §901) | 9/5/2026 | REPO-SOURCED (92N) |
| Newark, NJ | employer payroll tax; rate UNKNOWN | falls on the employer | 92N (N.J.S.A. 40:48C-14) | 9/5/2026 | REPO-SOURCED (92N) |
| TriMet and Lane Transit, OR | employer payroll taxes; rates UNKNOWN | falls on the employer | 92N | 9/5/2026 | REPO-SOURCED (92N) |
| Denver, Aurora, Greenwood Village, CO | flat monthly head tax; amounts UNKNOWN | UNKNOWN | 92N | 9/5/2026 | REPO-SOURCED (92N) |
| Birmingham and Gadsden, AL | occupational tax: Birmingham 1%, Gadsden 2% | UNKNOWN | 92N | 9/5/2026 | REPO-SOURCED (92N) |
| Lead-only additions | AR, KS (intangibles only), CA (San Francisco, a payroll-type tax), IA (school surtax), WV (92N says B&O gross receipts, not income) | — | LEAD-TAX (LevyIO, a secondary compilation) | — | CONFLICT with 92N for AR, KS, CA and WV; IA as above |

Local sales-tax authority, from 92N (REPO-SOURCED (92N); AK verified):

| State | Local sales tax (92N) | Typical caps (92N) | Voter approval (92N) |
|---|---|---|---|
| AK | PERMITTED | YES: Boroughs/Cities up to 7%+ (No state sales tax) | yes |
| AL | PERMITTED | YES: County up to 3%, City up to 5% | yes |
| AR | PERMITTED | YES: County up to 2%, City up to 3% with voter approval | yes |
| AZ | PERMITTED | YES: City Transaction Privilege Tax (TPT) 1%-3% | yes |
| CA | PERMITTED | YES: Bradley-Burns 1% uniform + District Trans taxes (2% cap) | yes |
| CO | PERMITTED | YES: County up to 2%, City up to 4%+ with voter approval | yes |
| CT | PROHIBITED | NO: Zero local option sales tax authority | no |
| DE | PROHIBITED | NO: Zero local sales tax authority | yes |
| FL | PERMITTED | YES: County Discretionary Sales Surtax up to 1.5% | yes |
| GA | PERMITTED | YES: LOST, SPLOST, ESPLOST (1% each; typically 2%-4% local) | yes |
| HI | LIMITED_RESORT_LODGING_ONLY | LIMITED: County 0.5% GET surcharge (No separate sales tax) | no |
| IA | PERMITTED | YES: Local Option Sales Tax (LOST) 1.0% with voter approval | yes |
| ID | LIMITED_RESORT_LODGING_ONLY | LIMITED: Resort cities (<10,000 pop) up to 3% with 60% vote | yes |
| IL | PERMITTED | YES: Home rule sales taxes (Cook County 1.75%, Chicago 1.25%) | yes |
| IN | PROHIBITED | NO: Zero local option sales tax authority | yes |
| KS | PERMITTED | YES: County up to 1%, City up to 2%+ with voter approval | yes |
| KY | PROHIBITED | NO: Constitutionally unauthorized (Sections 181, 157) | yes |
| LA | PERMITTED | YES: Parish up to 5%+, City up to 3%+ with voter approval | yes |
| MA | LIMITED_RESORT_LODGING_ONLY | LIMITED: Local Option Meals (0.75%) and Lodging (up to 6%) | no |
| MD | PROHIBITED | NO: Zero local option general sales tax authority | no |
| ME | PROHIBITED | NO: Zero local option sales tax authority | yes |
| MI | PROHIBITED | NO: Zero local option sales tax authority | yes |
| MN | PERMITTED | YES: Local sales taxes require special legislative act + referendum | yes |
| MO | PERMITTED | YES: County and City sales taxes up to statutory caps (voter vote) | yes |
| MS | LIMITED_RESORT_LODGING_ONLY | LIMITED: Tourism / Restaurant tax (1%-2%) with special act | yes |
| MT | LIMITED_RESORT_LODGING_ONLY | LIMITED: Resort Community Tax (up to 3% in towns <5,500 pop) | yes |
| NC | PERMITTED | YES: County Local Option Sales Taxes (Arts. 39, 40, 42; 2.0%-2.75%) | yes |
| ND | PERMITTED | YES: Home Rule cities/counties up to 2% sales tax | yes |
| NE | PERMITTED | YES: Local Option Revenue Act (0.5% to 2.0% with voter approval) | yes |
| NH | PROHIBITED | NO: Zero local option sales tax authority | yes |
| NJ | PROHIBITED | NO: Zero local option sales tax authority | yes |
| NM | PERMITTED | YES: Municipal & County Local Option GRT (up to 3.5%+) | yes |
| NV | PERMITTED | YES: Local School Support Tax & County Relief Tax | yes |
| NY | PERMITTED | YES: Local Sales Taxes up to 3%-4.875% (State approval required) | yes |
| OH | PERMITTED | YES: County Piggyback Sales Tax (0.5% to 1.5% under R.C. 5739.026) | yes |
| OK | PERMITTED | YES: City sales taxes up to 4%+; County sales taxes (voter vote) | yes |
| OR | PROHIBITED | NO: Zero general sales tax authority | yes |
| PA | LIMITED_RESORT_LODGING_ONLY | LIMITED: Allegheny County (1%) & Philadelphia (2%) sales taxes | yes |
| RI | PROHIBITED | NO: Zero local option sales tax authority | yes |
| SC | PERMITTED | YES: Local Option Sales Tax (LOST) & Capital Project Sales Tax (1%) | yes |
| SD | PERMITTED | YES: Municipal Sales and Use Tax (up to 2.0% with voter approval) | yes |
| TN | PERMITTED | YES: Local Option Sales Tax (T.C.A. § 67-6-702; up to 2.75%) | yes |
| TX | PERMITTED | YES: Combined Local Sales Tax Capped at 2.0% (City, County, Transit) | yes |
| UT | PERMITTED | YES: Local Option Sales Taxes (0.5% to 1.5%+ with voter/council vote) | yes |
| VA | LIMITED_RESORT_LODGING_ONLY | LIMITED: 1.0% Uniform Local Sales Tax + regional transportation surcharges | yes |
| VT | LIMITED_RESORT_LODGING_ONLY | LIMITED: 1% Local Option Sales, Meals, or Rooms Tax in ~20 towns | no |
| WA | PERMITTED | YES: Local Sales Taxes up to 3.5%+ (Transit, Criminal Justice, Housing) | yes |
| WI | LIMITED_RESORT_LODGING_ONLY | LIMITED: County 0.5% sales tax; City of Milwaukee 2.0% (2023 Act 12) | yes |
| WV | PERMITTED | YES: Municipal Sales and Service Tax (1.0% for Home Rule cities) | yes |
| WY | PERMITTED | YES: County 1% General Purpose & 1% Specific Purpose LOST | yes |
## Tax 6. State unemployment insurance tax: wage base and new-employer rate

Coverage: **1 of 56 REPO-SOURCED**, and that one covers the rate only: Michigan's 2026 employer rates run from 0.06% to 12.2%, with 2.7% for a new employer (TAX56, Michigan UIA); the wage base is UNKNOWN. TAX56 says a state UI tax exists (rates UNKNOWN) for IA, KS, KY, LA, ME, MS, MO, NE, NH, NJ, NY, NC, ND, OH, OK, OR, PA, RI (including temporary disability insurance), SC and TN. The open request `employer-payroll-tax-deposits-and-unemployment.json` asks for exactly this table.

| Item | Value | Source | Status |
|---|---|---|---|
| MI | 0.06% to 12.2%; new employer 2.7%; wage base UNKNOWN | TAX56 (Michigan UIA) | REPO-SOURCED (2026) |
| NV Modified Business Tax (a payroll tax, not UI) | 1.17% of quarterly wages less health benefits, the first $50,000 a quarter exempt; financial institutions 1.554% | TAX56 (NV Taxation); in code as base-unknown | REPO-SOURCED |
| WA wage base | $72,800 | LEAD-TAX | LEAD |
| NE new-employer rate | 1.25%; 5.4% for construction | LEAD-TAX (Patriot Software summary) | LEAD |
| Employee UI contributions | AK, NJ, PA | LEAD-TAX (EY) | LEAD |
| Wage bases lowered for 2026 | IA, LA, MO, OK | LEAD-TAX (EY) | LEAD |
| "Many states start new employers at 2.7%" | not a state value; never use it as a default | LEAD-TAX | LEAD (do not build on it) |
| All other states, D.C., PR, VI; GU, AS and MP (possibly no program) | — | — | UNKNOWN |

---

## Gaps (what still needs an official source)

Pay
1. Pay frequency by size and industry, worker-weighted: BLS CES "Length of pay periods" and BLS Beyond the Numbers vol. 3. State payday rules for all 56: U.S. Department of Labor, Wage and Hour Division, "State Payday Requirements."
2. 2026 minimum and tipped wages for 50 states, D.C., PR, GU and VI: DOL WHD "State Minimum Wage Laws," "Consolidated Minimum Wage Table" and "Minimum Wages for Tipped Employees." American Samoa (industry rates) and CNMI: DOL WHD. Cities: the city labor-standards offices (Seattle, San Francisco, Denver, Chicago, D.C. DOES, NYS DOL), and Washington L&I's local-rates page.
3. Raises: BLS Employment Cost Index, Q2 2026 release (Table 9, wages and salaries, 12-month change by ownership and industry).
4. Health premium shares: KFF 2025 Employer Health Benefits Survey. Retirement: BLS National Compensation Survey, "Employee Benefits in the United States, March 2025" (or March 2026). A typical employee deferral rate needs a source decision (the NCS does not publish one). Public pensions: NASRA "Employee Contributions to Public Pension Plans."
5. Unemployment benefits for all 56: DOL ETA "Comparison of State Unemployment Insurance Laws 2026," chapter 3 (monetary entitlement), and "Significant Provisions of State UI Laws."
6. OEWS percentiles: already in the repository's raw BLS files; they need compiling, not research (`scripts/source/regional-money/compile.ts` reads only the median and mean).

Taxes
7. Federal: the 24% to 37% bracket starts for joint and head-of-household filers, the full EITC table, and the child tax credit phase-outs (Rev. Proc. 2025-32). Publication 15-T (2026) annual percentage-method tables, Standard and Checkbox. The no-W-4 default, deposit schedule, penalties and interest (IRS Pub. 15; Form 940 instructions). The final 2026 FUTA credit-reduction list (IRS, November 2026). Coverage exceptions (IRS Pub. 15-A, Pub. 80, Pub. 570; SSA for Section 218 and wage-base indexing).
8. State income tax: 2026 brackets for AR, CT, NJ, NM, NY and VT, and thresholds for MN, NE and WV. It also needs 2026 updates for the 12 states cited at TY2025 or earlier (AL, AZ, CA, CO, HI, ID, KS, MO, ND, OK, OR, WI), Montana entirely, and Mississippi's conflict. Standard deductions and exemptions for 49 states plus D.C.; main credits for all; nonresident rules and reciprocity for 29 or more. Source: each state revenue department's 2026 rate schedule and withholding guide. The Tax Foundation's "2026 State Income Tax Rates and Brackets" may calibrate if labeled.
9. Territories' income tax: PR Hacienda, Guam DRT, VI BIR, American Samoa Treasury, CNMI Division of Revenue and Taxation; and IRS Pub. 570.
10. Sales tax: state rates for AR (DFA), KS (KDOR), WV (Tax Division), MT; grocery treatment for 45 or more states (each revenue department; the Tax Foundation 2026 table for calibration). VI, AS and MP: each revenue agency.
11. Property tax: county effective rates from ACS 5-year B25103 and B25077 (Census API, which was blocked this session). The split among levying bodies: the 2022 Census of Governments finance files. Verify the 92N limits against statute text (2,110 of 2,650 claims are matrix-only). Homestead exemption amounts: (Lincoln Institute "Significant Features of the Property Tax," then each state's statute); D.C. (OTR) and the territories.
12. Local income taxes: first-party statutes for the 13 or 14 92N states, plus a check of AR, KS, CA, IA and WV. City and county rates: the Maryland Comptroller 2026 withholding memo, IN DOR Departmental Notice 1, Michigan Form 5469, NYC (NYS IT-201 instructions), the Ohio municipal rate table, PA DCED's Act 32 EIT register, and the LFUCG and Kentucky county and school tax lists.
13. Unemployment tax: 2026 wage base and new-employer rate for 50 states, D.C., PR and VI: the DOL ETA "Significant Provisions of State UI Laws" (2026) or each state workforce agency. Program existence in GU, AS and MP: DOL ETA.
14. D.C. and the territories are missing from 92N entirely, so their local-authority and property rules are UNKNOWN.

## Proposed game rules pending approval

Only where the spec asks for a game value. Each one is a proposal; none is built.

1. **Pay rate draw (spec 1).** Draw each worker's rate from the OEWS May 2025 distribution for their SOC code in their OEWS area (the metro or nonmetro area of their county). Fall back to the state row, then to the major SOC group in the area, when a cell is "*". Place the draw by tenure: new hire around the 25th percentile, 5 years around the median, 15 or more years around the 75th, with seeded spread so no two people in a cell match. This needs the percentile columns compiled from the raw files already in the repository. Until then, the only honest anchor is the median, with the spread held as a labeled game profile. Top-coded "#" cells keep the rate as a game value at or above the published top code, never 0. AS and MP have no OEWS: a labeled game profile, stated as such.
2. **Hourly or salaried and hours.** Per the owner decision: hourly work quoted by the hour, salaried by the year. Weekly hours come from the jobs-and-units work-hours intake (CPS, or PRCS/Island Areas for territories), not from dividing a shift.
3. **Pay frequency (spec 1).** Until DOL payday research is approved, a labeled game profile: an employer's frequency drawn from the CES establishment shares by size band (LEAD; needs approval), then limited by the state's payday rule once sourced. A public employer uses its government's cycle (UNKNOWN; profile).
4. **Minimum-wage floor.** The floor is the highest of the federal, state and city minimums in force on the date. Where the state or city value is UNKNOWN, keep the federal $7.25 floor (LEAD until the DOL page is cited) and record the state floor as UNKNOWN, not as $7.25.
5. **Raises.** Yearly review of about 3.1% for private employers and 3.4% for state and local government, before tenure adjustment. LEAD only; needs the ECI citation first.
6. **Pre-tax deductions.** Health share of 16% (single) or 26% (family) of the premium; public pension 6.2% (covered by Social Security) or 9.0% (not covered). LEAD only; needs KFF and NASRA citations first. The private 401(k) deferral stays a labeled profile until a source is chosen.
7. **Property tax effective rate.** Once ACS B25103 ÷ B25077 is pulled per county, use it as the calibration target for the opening combined millage on an owner-occupied home. Split it among levying bodies by a labeled game profile until the Census of Governments split is sourced. Apply the 92N assessment, rate and levy caps only after each is verified against statute.

## Checks on this checkpoint

- Every value above cites a repository path, the official source that path names, or a lead file; nothing was computed from outside data.
- Counts were measured from the repository files on origin/main: OEWS rows, scopes and fields; 92N states and fields; disposition status tallies (2,650 claims: 2,110 matrix-only, 300 malformed locator, 235 blank or unknown, 5 verified).
- Known internal inconsistencies flagged: 92N lists NH as graduated and MT as having no sales tax without a TAX56 match; 92N's IA local-income row contradicts itself; spec 1 says OEWS has percentiles, but the compiled corpus does not.
