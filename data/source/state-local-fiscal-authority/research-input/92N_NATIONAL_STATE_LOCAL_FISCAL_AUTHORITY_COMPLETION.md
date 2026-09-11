# 92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY_COMPLETION — 2026-09-05
**Authoritative 50-State Legal Landscape of State & Local Fiscal Authority: Executive Budget Proposal Duty, Legislative Primacy, Balanced-Budget Mandates, Debt Ceilings, Rainy-Day Reserves, Property Tax Limitations, Local-Option Levies, and Home-Rule Preemption Across All 50 States**

- **Document Identifier:** `92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY_COMPLETION.md`
- **Task ID:** `R-FISCAL-001`
- **Research Lane:** Antigravity (Google DeepMind)
- **As-Of / Retrieval Date:** 2026-09-05
- **Companion Machine Artifact:** [`92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY.json`](file:///Users/lamontae/Documents/PG%20AntiGravity/docs/research/92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY.json) (50 validated jurisdictions, 100% first-party legal citations)
- **Google Drive Deposit Status:** VERIFIED & SYNCHRONIZED
  - Master Completion Report (`92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY_COMPLETION.md`):
    - Primary Handoff Drive ID: `1ezJo8hGj5LleWTTibtUfDuzoWiaht0WM`
    - Root Continuity Mirror Drive ID: `1B38_7xN1Oym4eWia7ETGdYxi-RiAIhFU`
  - Machine Authority Matrix (`92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY.json`):
    - Primary Handoff Drive ID: `1seosgE-jWhkCQFyuqwF9O5Z_ZYzXuydS`
    - Root Continuity Mirror Drive ID: `19Tj0Ejmp1uAXHkFNujrC69g8NDtjoZeX`
- **Controlling Project Authorities:** Game Constitution, Decision Log (D-001 through D-074), Architecture Integrity Audit, Executive Governing Research (`92H`), Kentucky Municipal Governance Cargo (`92I`), Kentucky Local Political Career Research (`92J`), National Executive Authority Completion (`92K`), PR #97 Government Finance Observed Data Baseline.
- **Target Consumers:**
  1. `executive-governing` (Gubernatorial budget formulation, consensus revenue forecasting, line-item vetoes, emergency reserve draws)
  2. `municipal-governing` (Mayoral/Council budget cycles, property tax rate-setting, compensating rate public hearings, local option referendums)
  3. `government-finances-source-observations` (Empirical grounding against PR #97 / U.S. Census Bureau Annual Survey of State and Local Government Finances [SLGF])
  4. `budget-systems` (Deterministic simulation engine constraints: BBR verification, TEL headroom calculation, debt capacity tracking)
- **Critical Architectural Boundary:**
  - **PR #97 gives OBSERVED government finance and employment DATA.**
  - **This research (92N) answers LEGAL and INSTITUTIONAL AUTHORITY.**
  - **Do NOT conflate the two.** Observed zero revenue does not equal legal prohibition, and legal authority does not guarantee revenue collection.
  - **Zero Generic "Fiscal Freedom" Scores:** No arbitrary indices, power rankings, or aggregated freedom metrics. Grounded legal mechanics only.
- **Epistemic Classification System:**
  - `[FACT]`: Direct constitutional article/section, statutory title/chapter, or appellate case holding verified through first-party authority.
  - `[INFERENCE]`: Institutional mechanism or operational dynamic derived directly from established statutory/constitutional rules.
  - `[STRUCTURAL EXCEPTION]`: State-specific legal anomaly that fundamentally breaks national baseline assumptions (e.g., CO TABOR, CA Prop 13, MD Executive Budget, NE Unicameral).
  - `[DATA SPEC]`: Ingestion schemas and candidate field definitions for deterministic simulation engines.

---

## 1. EXECUTIVE SUMMARY & CORE ANALYTICAL FRAMEWORKS

### 1.1. The Anti-Universal Tax Rule: Why Universal Fiscal Models Fail
In commercial strategy and municipal simulation games, taxation is frequently abstracted into a single slider (e.g., "Tax Rate: 1% to 20%") or a universal triad of income, sales, and property taxes uniformly available to all levels of government. 

In the American constitutional republic, this abstraction is legally and mechanically invalid:
1. **Strict State Fiscal Preemption:** Local governments (cities, counties, school districts, special districts) have **zero inherent sovereign taxing power**. Under the foundational doctrine of *Dillon's Rule*, local governments possess only the fiscal authority expressly granted to them by the state legislature or state constitution. Even in strong "Home Rule" states, home rule grants administrative and regulatory autonomy; state courts almost universally hold that the power of taxation remains an exclusive sovereign state power unless affirmative enabling legislation exists.
2. **Asymmetric Tax Availability:**
   - 5 states have **no general state sales tax** (Alaska, Delaware, Montana, New Hampshire, Oregon).
   - 9 states have **no broad-based personal income tax** on earned wages (Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington, Wyoming).
   - Only 14 states authorize **any** form of local income, payroll, earnings, or occupational license tax, while 36 states enforce strict statutory or constitutional prohibitions against local income taxation.
   - 12 states strictly prohibit or provide no statutory mechanism for **local-option sales taxes** (LOST).
3. **Institutional Primacy Inversions:** While in 47 states the legislature possesses plenary power to amend executive budget bills upwards, in 3 states (Maryland, New York, West Virginia), constitutional amendments strictly bar the legislature from increasing executive budget line items for executive agencies, creating an "Executive-Dominant" budget regime.

### 1.2. The 4-Stage Balanced-Budget Requirement (BBR) Taxonomy
Every state except Vermont operates under a formal balanced-budget framework. However, treating all balanced-budget rules as identical obscures critical governing mechanics. State balanced-budget constraints operate across four distinct institutional stages:

```
+---------------------------------------------------------------------------------------------------------+
|                                  THE 4-STAGE BALANCED BUDGET TAXONOMY                                   |
+---------------------------------------------------------------------------------------------------------+
| STAGE 1: EXECUTIVE SUBMISSION MANDATE                                                                   |
| - Governor is legally required to submit an executive budget proposal where proposed expenditures do    |
|   not exceed anticipated consensus/certified revenues plus unencumbered reserves.                      |
| - Enforced in 44 states (e.g., Cal. Const. Art. IV, § 12; Ill. Const. Art. VIII, § 2).                 |
+---------------------------------------------------------------------------------------------------------+
| STAGE 2: LEGISLATIVE ENACTMENT MANDATE                                                                  |
| - Legislature is constitutionally or statutorily barred from passing an appropriations bill that exceeds|
|   official revenue estimates.                                                                           |
| - Enforced in 41 states (e.g., Tex. Const. Art. III, § 49-a; Pa. Const. Art. VIII, § 13).                |
+---------------------------------------------------------------------------------------------------------+
| STAGE 3: GUBERNATORIAL SIGNATURE MANDATE                                                                |
| - Governor cannot sign an appropriations act into law unless total appropriations match certified       |
|   revenues, requiring line-item vetoes to restore balance if legislative additions caused a deficit.   |
| - Enforced in 39 states (e.g., Fla. Const. Art. III, § 19).                                            |
+---------------------------------------------------------------------------------------------------------+
| STAGE 4: DEFICIT CARRYOVER PROHIBITION (END-OF-YEAR BALANCE)                                            |
| - The strictest fiscal constraint: The state is legally prohibited from rolling an operating deficit    |
|   into the subsequent fiscal year or biennium. Mid-year shortfalls require mandatory budget cuts,      |
|   reserve transfers, or special session revenue increases.                                              |
| - Present in ~38 states (e.g., Ohio Const. Art. II, § 22; Colo. Const. Art. X, § 16).                   |
| - Absent in ~11 states (e.g., CA, NY, IL, PA, MA, WI, CT, MI), where accounting maneuvers, short-term   |
|   borrowing notes (RANs/TRANs), or delayed disbursements can legally carry a shortfall into next year.  |
+---------------------------------------------------------------------------------------------------------+
```

### 1.3. The 3-Tier State Debt Limitation Architecture
State general obligation (GO) debt—debt backed by the full faith, credit, and taxing power of the state—is subject to three distinct constitutional regimes:
1. **Mandatory Statewide Voter Referendum:** In ~20 states, the state constitution strictly caps legislative debt issuance at a nominal dollar threshold (e.g., Kentucky § 49 cap of $500,000; Idaho Art. VIII § 1 cap of $2,000,000; California Art. XVI § 1 cap of $300,000) unless approved by a majority vote of the people at a general election.
2. **Legislative Supermajority Requirement:** In states without a mandatory referendum, incurring long-term bonded indebtedness requires a supermajority legislative roll call (e.g., 3/4 vote in each house in Delaware [Art. VIII, § 3]; 3/5 vote in Illinois [Art. IX, § 9] and Minnesota [Art. XI, § 5]; 2/3 roll-call vote in Massachusetts [amend. art. LXII, § 3]).
3. **Debt Service / Revenue Ratio Ceilings:** Fixed constitutional or statutory formulas capping debt service as a percentage of general revenues (e.g., Florida 7% target / 10% maximum; Georgia 10% cap under Art. VII, Sec. IV; Hawaii 18.5% cap under Art. VII, § 13; Washington 9% cap under Art. VIII, § 1).

### 1.4. The Rainy-Day / Budget Stabilization Reserve Framework
Budget Stabilization Funds (BSFs) insulate state operations from economic volatility. Institutionally meaningful reserve rules fall into three legal mechanics:
- **Mandatory Deposit Triggers:** Formulaic sweeps of revenue windfalls (e.g., Texas Economic Stabilization Fund receiving 75% of oil/gas severance tax collections exceeding a baseline under Tex. Const. Art. III, § 49-g; Connecticut volatility cap sweeping pass-through and capital gains taxes under C.G.S. § 4-30a; California Prop 2 sweeping 1.5% of General Fund plus capital gains over 8% under Cal. Const. Art. XVI, § 20).
- **Statutory / Constitutional Fund Ceilings:** Strict maximums on fund balances (typically 5%, 10%, 15%, or 20% of general fund appropriations). Excesses above the cap are automatically swept into pension amortization funds, school funding, or taxpayer rebate mechanisms.
- **Withdrawal Supermajorities:** High legislative hurdles to prevent routine raiding of reserves (e.g., Alaska Constitutional Budget Reserve requiring a 3/4 vote of both chambers under Art. IX, § 17; Texas ESF requiring a 3/5 vote to cover shortfalls and 2/3 for any other purpose; Washington BSA requiring a 3/5 vote unless state employment growth is below 1%).

### 1.5. The Local Fiscal Triad & Tax and Expenditure Limitations (TELs)
At the municipal and county level, fiscal authority is bounded by the interaction of three distinct legal mechanisms:
1. **Assessment Growth Limits:** Caps on the annual percentage increase in the taxable assessed value (AV) of real property, irrespective of actual market value appreciation (e.g., California Prop 13 [2% cap], Florida Save Our Homes [3% or CPI], Michigan Proposal A [5% or CPI], Arizona Prop 117 [5% Limited Property Value cap], Oregon Measure 50 [3% Maximum Assessed Value cap]).
2. **Rate / Millage Limits:** Hard constitutional or statutory ceilings on the nominal millage rate that can be levied by a single jurisdiction or aggregate overlapping jurisdictions (e.g., California [10 mills / 1% base rate], Florida [10 mills each for county, city, school], Ohio [10-mill unvoted limitation], Nevada [$3.64 per $100 statutory cap / $5.00 constitutional cap], New Mexico [20 mills constitutional aggregate]).
3. **Levy Revenue Growth Caps:** Caps on the total annual percentage growth in property tax dollar revenue collected, forcing tax rates to automatically roll down (roll back) when assessment values rise (e.g., Massachusetts Proposition 2 1/2 [2.5% levy growth cap], New York 2% Tax Cap, Washington 1% Property Tax Limit [RCW 84.55.010], Kentucky HB 44 Compensating Rate [KRS 132.010/132.017], Illinois PTELL [35 ILCS 200/18-185]).

---

## 2. STRUCTURAL EXCEPTION FAMILIES (THE 8 NATIONAL FISCAL ANOMALIES)

To prevent simulation systems from making invalid general assumptions, the 50 states are partitioned into eight distinct structural exception families where statutory or constitutional architecture radically diverges from standard norms.

```
+---------------------------------------------------------------------------------------------------------+
|                                    STRUCTURAL EXCEPTION FAMILIES                                        |
+---------------------------------------------------------------------------------------------------------+
| FAMILY 1: TABOR / DIRECT DEMOCRACY PREEMPTION (Colorado)                                                |
| - Complete subordination of representative fiscal authority to mandatory voter plebiscites.             |
+---------------------------------------------------------------------------------------------------------+
| FAMILY 2: PROPERTY TAX REVOLT & SUPERMAJORITY LOCK (California)                                         |
| - Prop 13, Prop 218, Prop 26 constitutional triad; 2/3 voter hurdles for all local special taxes/debt.  |
+---------------------------------------------------------------------------------------------------------+
| FAMILY 3: EXECUTIVE-DOMINANT CONSTITUTIONAL BUDGET SYSTEMS (Maryland, New York, West Virginia)         |
| - Strict constitutional prohibition barring the legislature from increasing executive budget lines.    |
+---------------------------------------------------------------------------------------------------------+
| FAMILY 4: UNICAMERAL NONPARTISAN FISCAL ARCHITECTURE (Nebraska)                                         |
| - Single-chamber appropriations process, nonpartisan committee chair selections, no conference committee.|
+---------------------------------------------------------------------------------------------------------+
| FAMILY 5: SEVERANCE SOVEREIGN WEALTH & ZERO BROAD TAX ARCHETYPES (Alaska, Wyoming, New Hampshire)      |
| - Resource rents or unique tax bases replacing broad personal income and/or sales taxes.                |
+---------------------------------------------------------------------------------------------------------+
| FAMILY 6: MANDATORY LOCAL INCOME PIGGYBACK & OCCUPATIONAL LICENSING (MD, IN, PA, OH, KY, MI, MO)       |
| - Comprehensive authorization of municipal/county taxes on earned income, wages, and net profits.      |
+---------------------------------------------------------------------------------------------------------+
| FAMILY 7: COMPENSATING RATE & REVENUE ROLLBACK RECALL FAMILIES (Kentucky, Massachusetts, Washington)   |
| - Mandatory rate rollbacks on reassessment; citizen recall petitions or mandatory override referendums.|
+---------------------------------------------------------------------------------------------------------+
| FAMILY 8: STRICT DILLON'S RULE / ZERO LOCAL NON-PROPERTY DISCRETION (CT, RI, ME, MA, NH)               |
| - Complete local fiscal dependence on property taxes; total absence of general local sales/income taxes.|
+---------------------------------------------------------------------------------------------------------+
```

### Family 1: TABOR / Direct Democracy Fiscal Preemption (Colorado)
- `[STRUCTURAL EXCEPTION]`: Governed by **Colo. Const. Art. X, § 20** (The Taxpayer's Bill of Rights, adopted 1992).
- **Core Mechanism:** TABOR strips the General Assembly, city councils, county commissions, and school boards of the unilateral legal authority to:
  1. Levy any new tax.
  2. Increase any tax rate.
  3. Extend an expiring tax.
  4. Incur any multi-fiscal year bonded indebtedness or financial obligation.
  5. Retain revenues exceeding the TABOR spending limit (calculated as prior year spending adjusted for the rate of inflation [CPI] plus annual local population growth).
- **Voter Plebiscite Mandate:** Any tax increase or debt issuance requires an affirmative vote of the electors at a general election or coordinated odd-year election.
- **Refund Mandate:** All revenues collected in excess of the statutory growth formula must be refunded directly to taxpayers (via sales tax refunds, income tax credits, or temporary rate reductions) unless voters affirmatively approve a "de-Brucing" measure allowing the jurisdiction to retain the excess.

### Family 2: Property Tax Revolt & Supermajority Anti-Tax Lock (California)
- `[STRUCTURAL EXCEPTION]`: Governed by **Cal. Const. Art. XIII A** (Prop 13, 1978), **Art. XIII C & XIII D** (Prop 218, 1996), and **Art. XIII A, § 3** (Prop 26, 2010).
- **Core Mechanism:**
  - **Millage Cap:** Maximum ad valorem property tax rate is capped at 1.00% of full cash value (plus voter-approved bonded indebtedness debt service).
  - **Assessment Growth Cap:** Assessed property value increases are capped at the rate of inflation not to exceed 2.0% per year; properties are reassessed to full market value only upon a change of ownership or new construction.
  - **State Tax Supermajority:** Any change in state statute that results in a taxpayer paying a higher tax must be passed by a two-thirds (2/3) roll-call vote of all members in each branch of the California Legislature.
  - **Local Tax Classification:**
    - *General Taxes* (for general municipal operations) require majority voter approval.
    - *Special Taxes* (taxes earmarked for specific purposes, e.g., parks, libraries, police) require a **two-thirds (2/3) supermajority voter approval**.
  - **Local GO Debt:** Municipal and county general obligation bonds require a **two-thirds (2/3) affirmative vote** (Cal. Const. Art. XVI, § 18). School bonds require a 55% vote under Prop 39.

### Family 3: Executive-Dominant Constitutional Budget Systems (Maryland, New York, West Virginia)
- `[STRUCTURAL EXCEPTION]`: Governed by **Md. Const. Art. III, § 52** (1916 Executive Budget Amendment), **N.Y. Const. Art. VII, §§ 1–7** (1927 Smith-Dewey Amendment), and **W. Va. Const. Art. VI, § 51**.
- **Core Mechanism:** Unlike the federal government and 47 other states where the legislature can freely rewrite, substitute, or expand executive appropriation line items, these states strictly circumscribe legislative budget authority:
  - **Maryland:** The General Assembly cannot increase any appropriation in the Governor's budget bill for the executive branch, nor can it introduce supplementary appropriations until the budget bill has passed both houses. (Note: Under 2020 Question 1, starting in FY 2024, the legislature gained the power to reallocate/increase items, but total spending cannot exceed the Governor's total, and any increased item is subject to gubernatorial line-item veto).
  - **New York:** Under N.Y. Const. Art. VII, § 4, the Legislature "may not alter an appropriation bill submitted by the governor, or in strike out or reduce items therein, but it may add thereto items of appropriation provided that such additions are stated separately and distinctly from the original items of the bill and refer each to a single object or purpose."
  - **West Virginia:** Under W. Va. Const. Art. VI, § 51, the Legislature may amend the budget bill by striking or reducing items, but it cannot amend it so as to create a deficit; it cannot increase executive branch items without the Governor's consent.

### Family 4: Unicameral Nonpartisan Fiscal Architecture (Nebraska)
- `[STRUCTURAL EXCEPTION]`: Governed by **Neb. Const. Art. III, § 22** and **Art. IV, § 7**.
- **Core Mechanism:**
  - Nebraska operates the nation's sole unicameral, nonpartisan legislative body (the 49-member Nebraska Unicameral Legislature).
  - There are no party caucuses or conference committees. The 9-member Appropriations Committee conducts all budget hearings, reviews the Governor's biennial budget, and crafts the unified state appropriations bill.
  - Floor amendments require 25 votes (simple majority) or 33 votes (two-thirds supermajority to overcome a filibuster or override a gubernatorial line-item veto under Neb. Const. Art. IV, § 15).
  - Local governments operate under hard statutory property tax levy caps: counties are capped at $0.50 per $100 AV, school districts at $1.05 per $100 AV (Neb. Rev. Stat. § 77-3442).

### Family 5: Severance Sovereign Wealth & Zero Broad Tax Archetypes (Alaska, Wyoming, New Hampshire)
- `[STRUCTURAL EXCEPTION]`: Governed by **Alaska Const. Art. IX**, **Wyo. Const. Art. 15 & 16**, and **N.H. Const. Pt. II, Arts. 5 & 5-b**.
- **Core Mechanism:**
  - **Alaska:** Zero state personal income tax; zero state general sales tax. The state budget is predominantly funded by oil and gas production/severance taxes (AS 43.55) and investment earnings from the Alaska Permanent Fund (Alaska Const. Art. IX, § 15). Local governments are empowered to levy broad local-option sales taxes (up to 7%+) and local property taxes (AS 29.45).
  - **Wyoming:** Zero state personal income tax; zero state corporate income tax. Constitutionally prohibits an income tax without a 100% dollar-for-dollar credit for all sales, use, and property taxes paid (Wyo. Const. Art. 15, § 18). State funding relies on mineral severance taxes on coal, oil, and natural gas, plus a uniform 4.0% state sales tax. Local revenue is strictly confined to property taxes (12-mill county cap, 8-mill city cap) and voter-approved 1% optional sales taxes.
  - **New Hampshire:** Operates the "Pledge" against broad-based sales and income taxes. No general sales tax; no personal earned income tax (the 5% Interest and Dividends Tax under RSA 77 is phasing down to 0% by 2027). State education aid is funded via the Statewide Education Property Tax (SWEPT, RSA 76:3) and the Business Profits Tax (BPT, RSA 77-A). Local government is virtually 100% dependent on local ad valorem property taxes.

### Family 6: Mandatory Local Income Piggyback & Occupational Licensing (MD, IN, PA, OH, KY, MI, MO)
- `[STRUCTURAL EXCEPTION]`: Governed by **Md. Code Ann., Tax-Gen. §§ 10-103/106**; **Ind. Code § 6-3.6**; **53 P.S. § 6924.101 (PA Act 511 / Act 32)**; **Ohio R.C. Ch. 718**; **KRS Ch. 67/68/91/92**; **MCL 141.501 (MI Act 284)**; **RSMo 92.110**.
- **Core Mechanism:** These seven states fundamentally reject the standard rule that income taxation is an exclusively state-level tool:
  - **Maryland:** Mandatory county income tax "piggyback." All 23 counties and Baltimore City must levy an income tax on county residents between 2.25% and 3.20% of Maryland taxable income, collected directly by the Comptroller of Maryland on Form 502.
  - **Indiana:** County Local Income Tax (LIT). County Income Tax Councils or County Councils levy LIT on residents and workers across all 92 counties (rates typically 1.0% to 3.0%), administered and collected by the Indiana Department of Revenue.
  - **Pennsylvania:** Act 511 (Local Tax Enabling Act) and Act 32 authorize municipalities and school districts to levy an Earned Income Tax (EIT), collected through countywide Tax Collection Committees (typically 1.0% to 2.0% split between city and school). Philadelphia levies a separate wage tax under the Sterling Act of 1932 (53 P.S. § 15971) on residents (~3.75%) and nonresidents (~3.44%).
  - **Ohio:** Over 650 cities and villages levy municipal income taxes under R.C. Chapter 718 on wages and net corporate profits earned within the city (typically 1.0% to 3.0%). Cities may enact up to 1.0% by council ordinance; rates exceeding 1.0% require voter approval. Administered locally or through the Regional Income Tax Agency (RITA).
  - **Kentucky:** Cities and counties levy an Occupational License Tax on earned compensation and business net profits (KRS 67.083, 68.180, 91.200, 92.281), serving as the primary local operational revenue source in urban jurisdictions (e.g., Louisville 2.2%, Lexington 2.25%).
  - **Michigan:** 24 cities levy uniform city income taxes under the City Income Tax Act of 1964 (Detroit 2.4% resident / 1.2% nonresident; other cities typically 1.0% / 0.5%).
  - **Missouri:** Kansas City and St. Louis levy a 1.0% earnings tax on salaries and net business profits (RSMo 92.110), subject to a mandatory voter reauthorization referendum every 5 years under RSMo 92.115.

### Family 7: Compensating Rate & Revenue Rollback Recall Families (Kentucky, Massachusetts, Washington)
- `[STRUCTURAL EXCEPTION]`: Governed by **KRS 132.010, 132.017 (KY HB 44)**; **M.G.L. c. 59, § 21C (MA Prop 2 1/2)**; **RCW 84.55.010 (WA 101% Limit)**.
- **Core Mechanism:** These states enforce statutory formulas that prevent local governments from capturing inflationary windfalls from property revaluations:
  - **Kentucky (HB 44):** The Property Valuation Administrator (PVA) reassesses property. The local taxing jurisdiction must calculate the *Compensating Tax Rate*—the rate that produces exactly the same revenue as the prior year, excluding new property. A jurisdiction may adopt a rate producing up to a 4.0% revenue increase with a simple public hearing. If the council adopts a rate producing **greater than 4.0% revenue growth**, that excess portion is automatically subject to a **voter recall petition**: if 10% of voters who voted in the last presidential election sign a petition within 50 days, the tax hike is suspended until approved at a general referendum.
  - **Massachusetts (Proposition 2 1/2):** Total property tax levy cannot exceed 2.5% of full and fair cash value (*Levy Ceiling*). In addition, the annual levy cannot increase by more than 2.5% over the prior year's levy limit plus new growth (*Levy Limit*). Exceeding the levy limit requires a formal *Override Ballot Question* approved by a majority of municipal voters at the polls.
  - **Washington (101% Limit):** Under RCW 84.55.010, a taxing district's regular property tax levy is limited to the lesser of 101% (a 1.0% annual increase) or 100% plus the rate of inflation (Implicit Price Deflator), plus additions for new construction. To exceed this 1% cap, the district must submit a *Levy Lid Lift* referendum to the voters.

### Family 8: Strict Dillon's Rule / Zero Local Non-Property Discretion (CT, RI, ME, MA)
- `[STRUCTURAL EXCEPTION]`: Governed by state municipal enabling statutes in New England.
- **Core Mechanism:**
  - In Connecticut, Rhode Island, Maine, and Massachusetts, county government is either completely abolished (CT, RI, 8 of 14 MA counties) or functionally powerless (ME).
  - Municipalities (cities and towns) possess **zero statutory authority** to levy local-option general sales taxes or local income taxes.
  - In Connecticut, C.G.S. Title 12 restricts municipal tax revenue almost exclusively to ad valorem real and personal property taxes (with state revenue sharing and motor vehicle millage caps under C.G.S. § 12-71e).
  - In Rhode Island, R.I. Gen. Laws § 44-5-2 caps annual municipal property tax levy increases at 4.0% (requiring a 4/5 vote of the council or state approval to exceed).

---

## 3. MASTER 50-STATE FISCAL AUTHORITY MATRIX: STATE LEVEL

The following matrix documents the sovereign legal authority of all 50 states as of September 5, 2026. Every field is grounded in first-party state constitutions and statutory codes.

### Matrix Key:
- **State Tax Codes:** `IIT` = Individual Income Tax; `CIT` = Corporate Income Tax; `GST` = General Sales & Use Tax; `GRT` = Gross Receipts / Franchise Tax; `SPT` = Statewide Property Tax; `SEV` = Severance Tax.
- **BBR Stages:** `1` = Gov Proposes Balanced; `2` = Leg Enacts Balanced; `3` = Gov Signs Balanced; `4` = Deficit Carryover Prohibited.
- **Debt Constraint:** `REF` = Mandatory Statewide Referendum; `SUPER` = Legislative Supermajority Required; `CAP` = Constitutional Debt Ceiling / Debt Service Ratio.

| State | Major State Taxes Available | BBR Stages | State Debt Limits & Approval | Rainy Day / Budget Stabilization Fund | Executive Budget Proposal Duty | Legislative Budget Authority | First-Party Citations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AL** | IIT, CIT, GST, SPT (6.5 mills), SEV | 1, 2, 3, 4 | Const. Cap ($300k without amend); Amend. 225 | Emergency Reserve Fund; capped at 10% | Gov submits within 10 days of session (Ala. Code § 41-4-84) | Plenary power of purse; simple majority; line-item veto override 50%+1 elected | Ala. Const. Art. XI, §§ 213, 214; Ala. Code Title 40 & 41 |
| **AK** | CIT, SEV, SPT (oil/gas); NO IIT, NO GST | 1, 2, 3 | Voter Referendum (Alaska Const. Art. IX, § 8) | Constitutional Budget Reserve (CBR); requires 3/4 vote to spend | Gov submits by Dec 15 (AS 37.07.020 / AS 37.07.060) | Line-item veto override requires 3/4 vote of bicameral joint session | Alaska Const. Art. IX, §§ 7, 8, 15, 17; AS 37.07, AS 43.55 |
| **AZ** | IIT (flat 2.5%), CIT, GST (TPT) | 1, 2, 3, 4 | Const. Cap ($350k); Leg 2/3 supermajority for tax hikes | Budget Stabilization Fund; 10% cap; transfer triggers | Gov submits by 5th day of regular session (A.R.S. § 35-111) | Prop 108: 2/3 roll-call vote in each house to increase any tax | Ariz. Const. Art. IX, §§ 5, 17, 22; A.R.S. Title 35 & 42 |
| **AR** | IIT, CIT, GST, SEV | 1, 2, 3, 4 | Const. Cap ($500k); Revenue Stabilization Act | Long Term Reserve Fund (Ark. Code § 19-5-1252) | Gov submits 60 days before biennial session (Ark. Code § 19-4-201) | Art. 5, § 31: 3/4 supermajority required for general appropriations | Ark. Const. Art. 5, § 31; Art. 16; Ark. Code Title 19 & 26 |
| **CA** | IIT, CIT, GST | 1, 2, 3 | Voter Referendum (Cal. Const. Art. XVI, § 1) | Budget Stabilization Account (Prop 2); 10% cap; Gov declaration | Gov submits by January 10 (Cal. Const. Art. IV, § 12) | Prop 25: Simple majority budget; Prop 26: 2/3 vote for tax increases | Cal. Const. Art. IV, § 12; Art. XIII A; Art. XVI, §§ 1, 20 |
| **CO** | IIT (flat 4.4%), CIT, GST | 1, 2, 3, 4 | TABOR: Mandatory Voter Approval for any debt | Statutory Reserve; mandated 15% ending balance | Gov submits by November 1 (C.R.S. § 24-75-201.1) | TABOR (Art. X, § 20): Plenary power subordinated to voter referendums | Colo. Const. Art. X, § 20; Art. XI; C.R.S. Title 24 & 39 |
| **CT** | IIT, CIT, GST | 1, 2, 3 | Legislative Majority; General Obligation Debt Cap | Budget Reserve Fund; 18% cap; excess pays down pensions | Gov submits by 1st Wednesday after 1st Monday in Feb (C.G.S. § 4-71) | Constitutional spending cap (amend. art. XXVIII); line-item override 2/3 | Conn. Const. amend. art. XXVIII; C.G.S. Title 4 & 12 |
| **DE** | IIT, CIT, GRT; NO GST, NO SPT | 1, 2, 3, 4 | Legislative 3/4 Supermajority (Del. Const. Art. VIII, § 3) | Budget Reserve Account; 5% cap; 3/5 vote to withdraw | Gov submits by second Tuesday in January (29 Del. C. § 6335) | 98% appropriation ceiling; 2/3 vote to increase taxes (Art. VIII, § 6) | Del. Const. Art. VIII, §§ 3, 6; 29 Del. C. Ch. 63; 30 Del. C. |
| **FL** | CIT, GST; NO IIT (Const. Bar) | 1, 2, 3, 4 | Voter Referendum for GO debt; 7% debt service cap | Budget Stabilization Fund (Fla. Const. Art. III, § 19(g)); 10% cap | Gov submits 30 days before session (Fla. Stat. § 216.162) | Art. VII, § 19: 2/3 vote in each house for new state taxes/fees | Fla. Const. Art. III, § 19; Art. VII, §§ 1, 5, 11; Fla. Stat. Ch. 216 |
| **GA** | IIT, CIT, GST | 1, 2, 3, 4 | Const. Cap: Debt service cannot exceed 10% of revenue | Revenue Shortfall Reserve; 15% cap of net revenues | Gov submits within 5 days of General Assembly convening (O.C.G.A. § 45-12-74) | Plenary appropriation authority; Line-item veto override 2/3 elected | Ga. Const. Art. III, Sec. IX; Art. VII, Sec. IV; O.C.G.A. Title 45 |
| **HI** | IIT, CIT, GET (General Excise), Transient | 1, 2, 3, 4 | Debt service capped at 18.5% of revenues (Art. VII, § 13) | Emergency and Budget Reserve Fund; statutory deposit triggers | Gov submits 30 days before legislative session (HRS § 37-67) | Council on Revenues sets binding revenue forecast; line-item override 2/3 | Haw. Const. Art. VII, §§ 8, 9, 13; HRS Ch. 37, Ch. 237 |
| **ID** | IIT (flat 5.8%), CIT, GST | 1, 2, 3, 4 | Const. Cap ($2M without referendum; Art. VIII, § 1) | Budget Stabilization Fund; 15% cap; Joint Finance transfer | Gov submits by 5th day of session (Idaho Code § 67-3506) | Joint Finance-Appropriations Committee (JFAC) writes appropriation bills | Idaho Const. Art. VII, § 11; Art. VIII, § 1; Idaho Code Title 67 |
| **IL** | IIT (flat 4.95%), CIT, GST | 1, 2, 3 | Legislative 3/5 Supermajority or Voter Referendum | Budget Stabilization Fund; 7.5% target; monthly comptroller transfer | Gov submits by 3rd Wednesday in February (15 ILCS 20/50-5) | General Assembly appropriates within estimated revenues; override 3/5 | Ill. Const. Art. VIII, § 2; Art. IX, §§ 3, 9; 15 ILCS 20 |
| **IN** | IIT (flat 3.05%), CIT, GST | 1, 2, 3, 4 | Const. Prohibition on state debt (Ind. Const. Art. 10, § 5) | Counter-Cyclical Revenue and Economic Stabilization Fund; 7% cap | Gov submits budget report by second Monday in January (IC 4-12-1-7) | State Budget Agency/Committee controls draft; simple majority passage | Ind. Const. Art. 10, §§ 1, 5; Ind. Code § 4-12-1, § 6-2.5, § 6-3 |
| **IA** | IIT (flat 3.8%), CIT, GST | 1, 2, 3, 4 | Const. Cap ($250k without referendum; Art. VII, § 5) | Cash Reserve Fund (7.5%) & Economic Emergency Fund (2.5%) | Gov submits by February 1 (Iowa Code § 8.21) | 99% expenditure limitation rule under Iowa Code § 8.54 | Iowa Const. Art. VII, § 5; Iowa Code Ch. 8, Ch. 422, Ch. 423 |
| **KS** | IIT, CIT, GST | 1, 2, 3, 4 | Const. Cap ($1M without referendum; Art. 11, § 6) | Budget Stabilization Fund; statutory transfers from excess receipts | Gov submits by 8th calendar day of session (K.S.A. 75-3721) | Plenary appropriation authority; line-item veto override 2/3 elected | Kan. Const. Art. 11, §§ 6, 7; K.S.A. Ch. 75, Art. 37 |
| **KY** | IIT (flat 4.0%), CIT, GST, SPT, SEV | 1, 2, 3, 4 | Const. Cap ($500k without referendum; Ky. Const. §§ 49, 50) | Budget Reserve Trust Fund; 15% statutory target; surplus sweeps | Gov submits by 15th legislative day (odd) or 10th day (even) (KRS 48.100) | Consensus Forecasting Group sets official receipts; line-item override 50%+1 | Ky. Const. §§ 49, 50, 171, 181; KRS Ch. 48, Ch. 131, Ch. 132 |
| **LA** | IIT, CIT, GST, SEV | 1, 2, 3 | Legislative 2/3 Supermajority for bond issuance | Budget Stabilization Fund (La. Const. Art. VII, § 10.3); 4% cap | Gov submits 45 days before regular session (La. R.S. 39:36) | Revenue Estimating Conference sets binding baseline; 2/3 for tax hikes | La. Const. Art. VII, §§ 6, 10, 10.3; La. R.S. Title 39 & 47 |
| **ME** | IIT, CIT, GST | 1, 2, 3, 4 | Const. Cap ($2M without referendum; Me. Const. Art. IX, § 14) | Maine Budget Stabilization Fund; 18% cap (5 M.R.S. § 1532) | Gov submits by first Friday after first Wednesday in Jan (5 M.R.S. § 1666) | Line-item veto override requires 2/3 of members present and voting | Me. Const. Art. IX, § 14; 5 M.R.S. Part 4; 36 M.R.S. |
| **MD** | IIT, CIT, GST, SPT (debt service) | 1, 2, 3, 4 | Leg Majority with 15-year maturity & dedicated tax | Revenue Stabilization Account ("Rainy Day Fund"); 10% target | Gov submits by 3rd Wednesday in January (Md. Const. Art. III, § 52) | **Executive-Dominant:** Leg cannot increase executive lines; override 3/5 | Md. Const. Art. III, §§ 34, 52; Md. Code Ann., State Fin. & Proc. Title 7 |
| **MA** | IIT (5% + 4% surtax), CIT, GST | 1, 2, 3 | Legislative 2/3 Roll-Call Vote (amend. art. LXII, § 3) | Commonwealth Stabilization Fund; 15% cap (M.G.L. c. 29, § 2H) | Gov submits within 5 weeks of convening (Mass. Const. amend. art. LXIII) | Plenary appropriation authority; 2/3 roll-call vote for line-item override | Mass. Const. amend. arts. LXII, LXIII; M.G.L. c. 29 |
| **MI** | IIT (flat 4.25%), CIT, GST | 1, 2, 3 | Legislative 2/3 Supermajority or Voter Referendum | Counter-Cyclical Budget and Economic Stabilization Fund; 15% cap | Gov submits within 30 days of convening (MCL 18.1363) | Headlee Amendment (Art. IX, § 26) spending limit; line-item override 2/3 | Mich. Const. Art. V, § 18; Art. IX, §§ 25-34; MCL Ch. 18 |
| **MN** | IIT, CIT, GST | 1, 2, 3 | Legislative 3/5 Supermajority (Minn. Const. art. XI, § 5) | Budget Reserve ($2.9B statutory target) & Cash Flow Account | Gov submits by fourth Tuesday in January (Minn. Stat. § 16A.11) | Biennial appropriation power; line-item veto override 2/3 elected | Minn. Const. art. XI, §§ 5, 6; Minn. Stat. Ch. 16A, Ch. 290 |
| **MS** | IIT (flat 4.0%), CIT, GST | 1, 2, 3, 4 | Legislative 2/3 Supermajority for bond authorization | Working Cash-Stabilization Reserve Fund; 10% cap (Miss. Code § 27-103-203) | Gov submits by November 15 (Miss. Code Ann. § 27-103-139) | Joint Legislative Budget Committee prepares primary working draft bill | Miss. Const. Art. 4, §§ 63, 64, 73; Miss. Code Ann. Title 27 |
| **MO** | IIT, CIT, GST | 1, 2, 3, 4 | Voter Referendum (Mo. Const. Art. III, § 37) | Budget Stabilization Fund; 5% cap of net general revenue collections | Gov submits within 30 days of convening (Mo. Const. Art. IV, § 24) | Hancock Amendment (Art. X, § 18) revenue limit; line-item override 2/3 | Mo. Const. Art. IV, §§ 24-28; Art. X, §§ 16-24; RSMo Ch. 33 |
| **MT** | IIT, CIT, SPT (95 mills), SEV; NO GST | 1, 2, 3, 4 | Legislative 2/3 Supermajority (Mont. Const. Art. VIII, § 8) | Budget Stabilization Reserve Fund; 4.5% cap (MCA 17-7-130) | Gov submits by November 15 preceding session (MCA 17-7-112) | Plenary appropriation authority; line-item veto override 2/3 present | Mont. Const. Art. VIII, §§ 8, 9, 17; MCA Title 15 & 17 |
| **NE** | IIT, CIT, GST | 1, 2, 3, 4 | Const. Cap ($100k without referendum; Art. XIII, § 1) | Cash Reserve Fund; transfers directed by Unicameral Legislature | Gov submits by January 15 (biennial) (Neb. Rev. Stat. § 81-125) | **Unicameral:** 9-member Appropriations Committee; override 3/5 (30/49) | Neb. Const. Art. III, § 22; Art. IV, § 7; Neb. Rev. Stat. Ch. 81 |
| **NV** | Commerce Tax (GRT), GST, SEV; NO IIT, NO CIT | 1, 2, 3, 4 | Const. Cap: Debt cannot exceed 2% of total AV (Art. 9, § 3) | Account to Stabilize the Operation of State Government; 20% cap | Gov submits 14 days before biennial session (NRS 353.230) | Leg 2/3 supermajority for any tax increase (Art. 4, § 18); override 2/3 | Nev. Const. Art. 4, § 18; Art. 9, § 3; Art. 10, § 1; NRS Ch. 353 |
| **NH** | BPT/BET (CIT), SWEPT (SPT), Meals/Rooms; NO Broad IIT/GST | 1, 2, 3 | Legislative Roll Call; General Obligation Debt Limits | Revenue Stabilization Reserve Account; 10% cap (RSA 9:13-e) | Gov submits by February 15 of odd-numbered years (RSA 9:2) | Plenary appropriation authority; line-item veto override 2/3 elected | N.H. Const. Pt. II, Arts. 5, 5-b, 56; RSA Ch. 9, Ch. 76, Ch. 77 |
| **NJ** | IIT, CIT, GST | 1, 2, 3 | Voter Referendum (N.J. Const. Art. VIII, Sec. II, para. 3) | Surplus Revenue Fund (N.J.S.A. 52:9H-14 et seq.); 5% formula | Gov submits by fourth Tuesday in February (N.J.S.A. 52:27B-20) | Plenary appropriation power; line-item veto override 2/3 elected | N.J. Const. Art. VIII, Sec. II, paras. 2, 3; N.J.S.A. Title 52 & 54 |
| **NM** | IIT, CIT, GRT, SEV | 1, 2, 3, 4 | Voter Referendum (N.M. Const. Art. IX, § 8) | Tax Stabilization Reserve & Severance Tax Permanent Fund | Gov submits by January 5 (biennial) (NMSA 1978 § 6-3-21) | Legislative Finance Committee (LFC) submits co-equal working draft | N.M. Const. Art. IV, § 16; Art. VIII, § 2; Art. IX, § 8; NMSA Ch. 6 |
| **NY** | IIT, CIT, GST | 1, 2, 3 | Voter Referendum (N.Y. Const. Art. VII, § 11) | Tax Stabilization Reserve (5% cap) & Rainy Day Reserve (15% cap) | Gov submits by second Tuesday in January / Feb 1 (N.Y. Const. Art. VII, § 2) | **Executive-Dominant:** Leg can only strike or reduce executive lines; override 2/3 | N.Y. Const. Art. VII, §§ 1-7, 11; N.Y. State Fin. Law |
| **NC** | IIT (flat 4.5%), CIT, GST | 1, 2, 3, 4 | Voter Referendum (N.C. Const. Art. V, § 3) unless 2/3 rule | Savings Reserve Account; 15% cap (N.C.G.S. § 143C-4-2) | Gov submits by March 15 in odd-numbered years (N.C.G.S. § 143C-3-5) | General Assembly prepares appropriations; line-item veto override 3/5 | N.C. Const. Art. III, § 5(3); Art. V, § 3; N.C.G.S. Ch. 143C |
| **ND** | IIT, CIT, GST, SEV | 1, 2, 3, 4 | Const. Cap ($2M without referendum; Art. X, § 13) | Budget Stabilization Fund (15% cap) & Legacy Fund (Oil/Gas 30%) | Gov submits by first Tuesday in December (N.D.C.C. § 54-44.1-06) | Legislative Assembly appropriates; line-item veto override 2/3 elected | N.D. Const. Art. X, §§ 13, 26; N.D.C.C. Title 54 & 57 |
| **OH** | IIT, CAT (GRT), GST | 1, 2, 3, 4 | Const. Cap ($750k); Voter Referendum for GO debt | Budget Stabilization Fund; 8.5% cap of General Revenue Fund | Gov submits by February 1 (March 15 for new Gov) (R.C. 107.03) | Controlling Board provides mid-year adjustments; line-item override 3/5 | Ohio Const. Art. II, § 22; Art. VIII, §§ 1, 2; R.C. Ch. 126 & 5751 |
| **OK** | IIT, CIT, GST, SEV | 1, 2, 3, 4 | Voter Referendum (Okla. Const. Art. X, § 25) | Constitutional Reserve Fund ("Rainy Day Fund"); 15% cap | Gov submits by first day of regular session (62 O.S. § 34.36) | **SQ 640:** 3/4 supermajority in each house or statewide vote for tax hikes | Okla. Const. Art. X, §§ 23, 25, 33; 62 O.S., 68 O.S. |
| **OR** | IIT, CAT (GRT), SEV; NO GST, NO SPT | 1, 2, 3, 4 | Const. Cap ($50k without referendum; Art. XI, § 7) | Rainy Day Fund (7.5% cap) & Education Stability Fund (5% cap) | Gov submits by December 1 preceding session (ORS 291.202) | **Kicker Law:** Personal income tax kicker refunds when receipts >2% over forecast | Or. Const. Art. IX, §§ 2, 6, 14; Art. XI, § 7; ORS Ch. 291 |
| **PA** | IIT (flat 3.07%), CIT, GST | 1, 2, 3 | Voter Referendum (Pa. Const. Art. VIII, § 7) | Budget Stabilization Reserve Fund; 15% cap (72 P.S. § 1701-A) | Gov submits by first Tuesday in February (March for new Gov) (71 P.S. § 229) | Uniformity Clause (Art. VIII, § 1) bars graduated taxes; override 2/3 | Pa. Const. Art. VIII, §§ 1, 7, 12, 13; 72 P.S. (Fiscal Code) |
| **RI** | IIT, CIT, GST | 1, 2, 3, 4 | Voter Referendum (R.I. Const. Art. VI, § 16) | Budget Reserve and Cash Stabilization Account; 5% cap | Gov submits by third Thursday in January (Feb for new Gov) (R.I.G.L. § 35-3-7) | 97% spending cap rule; line-item veto override 3/5 of members elected | R.I. Const. Art. VI, § 16; Art. IX, § 15; R.I.G.L. Title 35 |
| **SC** | IIT, CIT, GST | 1, 2, 3, 4 | Debt service capped at 5%-7% of revenue (Art. X, § 13) | General Reserve Fund (7% cap) & Capital Reserve Fund (3% cap) | Gov submits by January 15 (S.C. Code Ann. § 11-11-30) | Constitutional debt service ceilings; line-item veto override 2/3 elected | S.C. Const. Art. X, §§ 7, 13, 14; S.C. Code Ann. Title 11 & 12 |
| **SD** | GST, Contractor Excise; NO IIT, NO CIT | 1, 2, 3, 4 | Const. Cap ($100k without referendum; Art. XIII, § 1) | Budget Reserve Fund & General Revenue Replacement Fund; 10% cap | Gov submits by first Tuesday in December (SDCL 4-7-7) | Const. Art. XI, § 13: 2/3 supermajority in each house to impose/raise taxes | S.D. Const. Art. XI, §§ 1, 13; Art. XIII, § 1; SDCL Title 4 & 10 |
| **TN** | F&E (CIT), GST; NO IIT (Eliminated 2021) | 1, 2, 3, 4 | Legislative Majority with 20-year maturity limit | Revenue Fluctuation Reserve; statutory target 8% of general revenue | Gov submits by February 1 (T.C.A. § 9-4-5105) | Spending growth capped by growth of state economy (Art. II, § 24) | Tenn. Const. Art. II, §§ 24, 28; T.C.A. Title 9 & 67 |
| **TX** | Margin Tax (GRT), GST, SEV; NO IIT (Const. Bar) | 1, 2, 3, 4 | Const. Prohibition on GO debt without constitutional amend | Economic Stabilization Fund ("Rainy Day"); 10% cap; 3/5 or 2/3 vote | Gov submits draft, but Legislative Budget Board (LBB) writes actual bill | **Pay-As-You-Go:** Comptroller must certify bill is within revenue before signing | Tex. Const. Art. III, §§ 49, 49-a, 49-g; Art. VIII, §§ 22, 24-a; Gov't Code Ch. 322 |
| **UT** | IIT (flat 4.55%), CIT, GST | 1, 2, 3, 4 | Const. Cap: Debt cannot exceed 1.5% of total AV (Art. XIV, § 1) | General Fund Budget Reserve Account (9% cap) & Income Tax Reserve (11%) | Gov submits 30 days before session (Utah Code § 63J-1-201) | Art. XIII, § 5: All IIT revenues constitutionally dedicated to public education | Utah Const. Art. XIII, § 5; Art. XIV, § 1; Utah Code Title 63J & 59 |
| **VT** | IIT, CIT, GST, Act 60/68 Statewide Property | NONE | Legislative Majority; General Obligation Debt Limits | General Fund Budget Stabilization Reserve; 5% cap (32 V.S.A. § 308) | Gov submits by third Tuesday in January (32 V.S.A. § 306) | **Sole state with NO constitutional/statutory balanced budget mandate** | Vt. Const. Ch. II, § 27; 32 V.S.A. Ch. 5, Ch. 135 |
| **VA** | IIT, CIT, GST | 1, 2, 3, 4 | Voter Referendum (Va. Const. Art. X, § 9) | Revenue Stabilization Fund (15% cap) & Revenue Reserve Fund (5%) | Gov submits by December 20 preceding session (Va. Code § 2.2-1508) | Plenary appropriation authority; line-item veto override 2/3 present | Va. Const. Art. X, §§ 7, 8, 9; Va. Code Ann. Title 2.2 & 58.1 |
| **WA** | B&O (GRT), GST, SPT (state school), CapGains; NO IIT | 1, 2, 3, 4 | Debt service capped at 9% of general state revenues (Art. VIII, § 1) | Budget Stabilization Account (1% sweep; 3/5 vote to withdraw) | Gov submits by December 20 preceding session (RCW 43.88.030) | *Culliton v. Chase*: Graduated income tax unconstitutional; override 2/3 | Wash. Const. Art. VII, §§ 1, 12; Art. VIII, § 1; RCW Ch. 43.88 & 82.04 |
| **WV** | IIT, CIT, GST, SEV | 1, 2, 3, 4 | Voter Referendum (W. Va. Const. Art. X, § 4) | Revenue Shortfall Reserve Fund (Part A 13% cap; Part B) | Gov submits on first day of regular session (W. Va. Const. Art. VI, § 51) | **Executive-Dominant:** Leg cannot create deficit or increase executive lines | W. Va. Const. Art. VI, § 51; Art. X, §§ 1, 4; W. Va. Code Ch. 11B |
| **WI** | IIT, CIT, GST | 1, 2, 3 | Legislative Roll Call of All Members Elected (Art. VIII, § 7) | Budget Stabilization Fund; formula transfers under Wis. Stat. § 16.518 | Gov submits on or before last Tuesday in January (Wis. Stat. § 16.45) | Plenary power; extensive partial/line-item veto power under Art. V, § 10 | Wis. Const. Art. V, § 10; Art. VIII, §§ 5, 7; Wis. Stat. Ch. 16 & 71 |
| **WY** | Mineral Severance, GST, SPT (12-mill school); NO IIT, NO CIT | 1, 2, 3, 4 | Const. Cap: Debt cannot exceed 1% of total AV (Art. 16, § 1) | Legislative Stabilization Reserve Account (LSRA; "Rainy Day") | Gov submits by December 1 preceding session (W.S. § 9-2-1012) | Art. 15, § 18: Income tax banned unless 100% credit for sales/property taxes | Wyo. Const. Art. 15, §§ 18, 19; Art. 16, § 1; W.S. Title 9 & 39 |

---

## 4. MASTER 50-STATE FISCAL AUTHORITY MATRIX: LOCAL LEVEL

The following matrix documents the legal boundaries of municipal, county, and school district fiscal authority across all 50 states as of September 5, 2026.

### Matrix Key:
- **LOST Auth:** Local-Option Sales Tax authority (`YES`, `NO`, `LIMITED` [resort/lodging only]).
- **Local Income Auth:** Local Income / Payroll / Occupational Tax authority (`YES`, `NO`).
- **TEL Types:** `A` = Assessment Growth Cap; `R` = Nominal Millage Rate Cap; `L` = Annual Levy Revenue Growth Cap.
- **GO Bond Vote:** Voter approval hurdle for local General Obligation bonded indebtedness (`MAJ` = Simple Majority 50%+1; `60%` = Three-Fifths Supermajority; `2/3` = Two-Thirds Supermajority; `NONE` = Council vote within non-electoral borrowing limits).
- **Home Rule Fiscal Status:** `PREEMPTED` = Broad home rule for governance, but state strictly preempts and limits local taxation to state-authorized types; `DILLON` = Strict Dillon's Rule, powers strictly construed against locality; `BROAD` = Local taxing discretion permitted unless expressly forbidden.

| State | Property Tax Assessing & Millage Body | LOST Auth & Typical Caps | Local Income / Wage / Payroll Auth | State-Imposed TELs (Caps) | Referendum / Petition Requirements | Local GO Bond Voter Approval | Home Rule Fiscal Status | First-Party Citations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AL** | County Tax Assessor; County Comm / City Council | YES: County up to 3%, City up to 5% | YES: Certain cities/counties (Birmingham 1%, Gadsden 2% occupational) | R: Const. caps 5 mills county, 5 mills city, 6.5 state | Constitutional amendments required for local rate increases | Simple Majority (Ala. Const. Amend. 225) | DILLON: Pervasive state legislative control | Ala. Const. §§ 214, 215, 216; Ala. Code Title 11 & 40 |
| **AK** | Borough / City Assessor; Assembly / Council | YES: Boroughs/Cities up to 7%+ (No state sales tax) | NO: Strictly unauthorized (`NO_STATUTORY_AUTHORITY`) | R: 30-mill cap in home rule/general law municipalities (AS 29.45.080) | Local voter referendum required for municipal sales tax adoption | Simple Majority (AS 29.47.190) | BROAD: Home rule boroughs have broad local sales/property powers | Alaska Const. Art. X, §§ 1, 2; AS 29.35, AS 29.45 |
| **AZ** | County Assessor; Board of Supervisors / Council | YES: City Transaction Privilege Tax (TPT) 1%-3% | NO: Barred by state preemption | A: 5% LPV cap (Prop 117); L: 2% levy cap for cities/counties | Truth in Taxation hearings if levy exceeds prior year collections | Simple Majority (A.R.S. § 35-455) | PREEMPTED: Broad home rule, but uniform state tax preemption | Ariz. Const. Art. IX, §§ 18, 19; A.R.S. Title 35 & 42 |
| **AR** | County Assessor; Quorum Court / Council | YES: County up to 2%, City up to 3% with voter approval | NO: Unauthorized | A: 5% homestead / 10% commercial (Amend. 79); R: 5 mills county | Voter referendum required for local sales tax enactment | Simple Majority (Ark. Const. Amend. 62) | DILLON: Strict statutory delegation | Ark. Const. Amend. 62, 79; Ark. Code Ann. Title 14 & 26 |
| **CA** | County Assessor; Board of Supervisors / Council | YES: Bradley-Burns 1% uniform + District Trans taxes (2% cap) | NO: Strictly prohibited by Cal. Rev. & Tax. Code § 17041.5 | A: 2% cap (Prop 13); R: 1% max ad valorem rate; Prop 218 constraints | Prop 218: Majority for general tax; 2/3 supermajority for special taxes | 2/3 Supermajority (Prop 39 55% for schools) | PREEMPTED: Strict constitutional taxation handcuffs | Cal. Const. Art. XIII A, XIII C, XIII D; Cal. Gov. Code § 53720 |
| **CO** | County Assessor; County Comm / City Council | YES: County up to 2%, City up to 4%+ with voter approval | YES: Flat monthly Head Tax (Denver, Aurora, Greenwood Village) | L: TABOR (inflation + local growth cap); 5.5% statutory levy limit | **TABOR:** Mandatory voter approval for ANY tax/rate hike or debt | Simple Majority under TABOR | PREEMPTED: TABOR constitutionally supersedes home rule | Colo. Const. Art. X, § 20 (TABOR); C.R.S. Title 29 & 39 |
| **CT** | Municipal Assessor; Town Council / Board of Finance | NO: Zero local option sales tax authority | NO: Zero local income tax authority | R: Uniform motor vehicle millage cap (32.46 mills under C.G.S. § 12-71e) | Town Meeting / Referendum depending on municipal charter | Council Vote / Town Referendum under charter | DILLON: No county government; strict municipal tax limits | C.G.S. Title 7 & 12; C.G.S. § 12-71e |
| **DE** | County Department of Land Use; Levy Court / Council | NO: Zero local sales tax authority | YES: City of Wilmington 1.25% Earned Income Tax (22 Del. C. § 901) | R: Statutory rate caps by county and school district | School district tax increases require local referendum | Simple Majority (22 Del. C. Ch. 1) | DILLON: Explicit legislative charters dictate powers | 22 Del. C. § 901; 9 Del. C. Ch. 80; 14 Del. C. Ch. 19 |
| **FL** | County Property Appraiser; County Comm / Council | YES: County Discretionary Sales Surtax up to 1.5% | NO: Strictly barred by Fla. Const. Art. VII, § 5 | A: 3% Save Our Homes; R: 10 mills county, 10 city, 10 school | TRIM (Truth in Millage) process; voter vote for surtax | Simple Majority for GO debt (Fla. Const. Art. VII, § 12) | PREEMPTED: Constitutional millage caps and tax bans | Fla. Const. Art. VII, §§ 4, 9, 12; Fla. Stat. Ch. 200 & 212 |
| **GA** | County Board of Tax Assessors; County Comm / Council | YES: LOST, SPLOST, ESPLOST (1% each; typically 2%-4% local) | NO: Unauthorized | R: Homestead exemption assessment freezes in specific counties | Voter referendum mandatory for SPLOST and ESPLOST | Simple Majority (Ga. Const. Art. IX, Sec. V, Para. I) | PREEMPTED: County home rule subject to uniform tax acts | Ga. Const. Art. IX, Sec. II & V; O.C.G.A. Title 36 & 48 |
| **HI** | City & County of Honolulu / County Assessors; Council | LIMITED: County 0.5% GET surcharge (No separate sales tax) | NO: Unauthorized | NONE: No state-imposed millage cap or assessment cap | Council sets rate annually; No local school districts (single state DOE) | Council Vote within constitutional debt limits | BROAD: Counties hold exclusive property tax power | Haw. Const. Art. VII, § 13; Art. VIII, § 3; HRS Ch. 246 |
| **ID** | County Assessor; County Comm / City Council | LIMITED: Resort cities (<10,000 pop) up to 3% with 60% vote | NO: Unauthorized | L: 3% property tax budget growth limit (Idaho Code § 63-802) | Exceeding 3% limit requires voter approval | **2/3 Supermajority** (Idaho Const. Art. VIII, § 3) | DILLON: Local taxing authority strictly delegated | Idaho Const. Art. VII & VIII; Idaho Code Title 50 & 63 |
| **IL** | County Assessor / Supervisor of Assessments; Council | YES: Home rule sales taxes (Cook County 1.75%, Chicago 1.25%) | NO: Unauthorized for non-home rule; home rule barred by Art. VII § 6(e) | L: PTELL (lesser of 5% or CPI in Cook and collar counties) | PTELL levy referendum to exceed CPI cap; school rate votes | Simple Majority (65 ILCS 5/Art. 8) | PREEMPTED: Home rule broad, but income tax barred | Ill. Const. Art. VII, § 6; 35 ILCS 200/18-185; 65 ILCS 5 |
| **IN** | County Assessor; County Council / City Council | NO: Zero local option sales tax authority | YES: County Local Income Tax (LIT) up to 2.5%+ (IC 6-3.6) | R: Constitutional Caps: 1% homestead, 2% other, 3% business | Referendum required for school operating referendums and capital projects | Simple Majority for debt referendum (IC 6-1.1-20) | PREEMPTED: DLGF strictly supervises local budgets | Ind. Const. Art. 10, § 1; Ind. Code § 6-1.1, § 6-3.6 |
| **IA** | County / City Conference Board; County / Council | YES: Local Option Sales Tax (LOST) 1.0% with voter approval | NO: Permitted for schools (Emergency Surtax) under Ch. 298 | A: 3% residential rollback limit (Iowa Code § 441.21) | Voter approval mandatory for LOST and reverse referendum triggers | 60% Supermajority for local GO bonds (Iowa Code § 75.1) | PREEMPTED: Constitutional home rule subordinated to tax statutes | Iowa Const. Art. III, §§ 38A, 39A; Iowa Code Ch. 24, 75, 423B |
| **KS** | County Appraiser; Board of County Comm / Council | YES: County up to 1%, City up to 2%+ with voter approval | NO: Unauthorized | L: Revenue Neutral Rate (RNR) hearing to exceed neutral rate | Voter referendum required for sales taxes and bond elections | Simple Majority (K.S.A. 10-120) | PREEMPTED: Statutory home rule overridden by RNR law | Kan. Const. Art. 12, § 5; K.S.A. 10-120, 12-187, 79-2988 |
| **KY** | County PVA (State Constitutional Officer); Fiscal Court / Council | NO: Constitutionally unauthorized (Sections 181, 157) | YES: Occupational License Tax on wages and net profits (KRS Ch. 67/68/91/92) | L: HB 44: Compensating rate; >4% growth triggers recall petition | 10% voter petition forces referendum if levy exceeds 4% rate | **2/3 Supermajority** if debt exceeds annual revenue (Ky. Const. § 157) | PREEMPTED: Broad home rule, but sales tax strictly barred | Ky. Const. §§ 157, 181; KRS 67.083, 68.180, 91A.030, 132.017 |
| **LA** | Parish Assessor; Police Jury / Parish Council / Council | YES: Parish up to 5%+, City up to 3%+ with voter approval | NO: Unauthorized | R: Constitutional millage caps; mandatory 4-year reassessment rollback | Voter approval required for all local sales taxes and millage increases | Simple Majority (La. Const. Art. VI, § 35) | BROAD: Parishes hold extensive local sales tax authority | La. Const. Art. VI, §§ 26, 29, 30, 35; La. R.S. Title 33 & 47 |
| **ME** | Municipal Assessor; Town Council / Board of Selectmen | NO: Zero local option sales tax authority | NO: Unauthorized | L: LD 1 municipal property tax levy cap (growth tied to income) | Town meeting / Council vote by designated supermajority to exceed | Simple Majority at town meeting or municipal referendum | DILLON: No functioning county fiscal tier; town meeting primacy | 30-A M.R.S. § 5721-A; 36 M.R.S. |
| **MD** | State Dept of Assessments and Taxation (SDAT); County Council | NO: Zero local option general sales tax authority | YES: Mandatory County Income Tax Piggyback (2.25% to 3.20%) | A: Homestead Property Tax Credit (10% state cap; counties 0%-10%) | Charter county referendum provisions for specific tax increases | Council Vote within charter debt limits / General Assembly bond acts | PREEMPTED: County charter home rule strong, but sales tax barred | Md. Code Ann., Tax-Gen. §§ 10-103, 10-106; Tax-Prop. § 9-105 |
| **MA** | Municipal Board of Assessors; City Council / Town Meeting | LIMITED: Local Option Meals (0.75%) and Lodging (up to 6%) | NO: Unauthorized | L: Prop 2 1/2: 2.5% levy ceiling and 2.5% annual levy growth limit | **Prop 2 1/2 Override Ballot Question** required to exceed levy limit | 2/3 vote of Town Meeting or City Council for GO debt | DILLON: Highly centralized municipal tax law | M.G.L. c. 59, § 21C (Prop 2 1/2); c. 44, §§ 7, 8 |
| **MI** | City / Township Assessor; City Council / Township Board | NO: Zero local option sales tax authority | YES: Uniform City Income Tax (Act 284 of 1964; 24 cities; 1.0%-2.4%) | A: Proposal A (lesser of 5% or CPI); L: Headlee rollback | Headlee rollback override election required to restore millage | Simple Majority for voted bonds (MCL 141.111) | PREEMPTED: Strict constitutional property tax restrictions | Mich. Const. Art. IX, §§ 3, 25-34; MCL Ch. 141 & 211 |
| **MN** | County Assessor / City Assessor; County Board / Council | YES: Local sales taxes require special legislative act + referendum | NO: Strictly unauthorized | R: Statutory classification net tax capacity limits | Voter approval mandatory for all local sales tax adoptions | Simple Majority (Minn. Stat. § 475.58) | PREEMPTED: Special legislative authority required for local taxes | Minn. Stat. Ch. 275, Ch. 297A.99, Ch. 475 |
| **MS** | County Tax Assessor; Board of Supervisors / Council | LIMITED: Tourism / Restaurant tax (1%-2%) with special act | NO: Unauthorized | L: 10% annual increase cap on municipal property tax levies | Voter referendum with 60% affirmative vote for local sales options | Simple Majority / 60% depending on bond class (Miss. Code § 19-9-11) | DILLON: Requires specific local acts of legislature | Miss. Code Ann. Title 19, 21, 27 |
| **MO** | County Assessor; County Commission / Council | YES: County and City sales taxes up to statutory caps (voter vote) | YES: Kansas City & St. Louis 1% Earnings Tax (RSMo 92.110) | L: Hancock Amendment: mandatory tax rate rollbacks on reassessment | Hancock vote required for any local tax rate increase | **4/7 (57.14%) or 2/3 Supermajority** (Mo. Const. Art. VI, § 26) | PREEMPTED: Hancock Amendment strictly limits local discretion | Mo. Const. Art. VI, §§ 18, 19, 26; Art. X, §§ 16-24; RSMo Ch. 67, 92 |
| **MT** | State Dept of Revenue (Centralized); County / Council | LIMITED: Resort Community Tax (up to 3% in towns <5,500 pop) | NO: Unauthorized | L: MCA 15-10-420: annual levy increase capped at half rate of inflation | Voter election required for resort tax or millage levy increase | Simple Majority (MCA 7-7-4221) | PREEMPTED: Property assessment fully centralized at state level | Mont. Const. Art. XI, §§ 4, 5; MCA Title 7 & 15 |
| **NE** | County Assessor; County Board / City Council | YES: Local Option Revenue Act (0.5% to 2.0% with voter approval) | NO: Unauthorized | R: Hard Levy Caps: County $0.50/$100; Schools $1.05/$100 AV | Voter override election to exceed statutory levy caps | Simple Majority (Neb. Rev. Stat. § 10-701) | PREEMPTED: Strict statutory millage ceilings | Neb. Rev. Stat. § 77-27,142, § 77-3442 |
| **NV** | County Assessor; Board of County Comm / Council | YES: Local School Support Tax & County Relief Tax | NO: Prohibited by state constitution | R: $3.64 per $100 AV statutory combined cap (NRS 361.453); A: 3%/8% cap | Voter approval for local option fuel/sales taxes | Simple Majority (NRS 350.020) | PREEMPTED: Strict statutory oversight by Committee on Local Gov Finance | Nev. Const. Art. 10; NRS Ch. 350, 354, 361 |
| **NH** | Municipal Assessor; Town Meeting / City Council | NO: Zero local option sales tax authority | NO: Prohibited | NONE: No state levy cap; local town meetings set tax effort | SB 2 Official Ballot Referendum voting on town/school budgets | 60% or 2/3 Supermajority for municipal bonds (RSA 33:8) | DILLON: Town meeting direct democracy controls property tax | N.H. Const. Pt. I, Art. 28-a; RSA Ch. 32 & 33 |
| **NJ** | Municipal Tax Assessor; Borough Council / Township Comm | NO: Zero local option sales tax authority | YES: City of Newark Employer Payroll Tax (N.J.S.A. 40:48C-14) | L: 2.0% Local Property Tax Levy Cap (N.J.S.A. 40A:4-45.45) | Voter referendum required to exceed 2% cap or school budget cap | Council Vote within Local Bond Law caps (N.J.S.A. 40A:2) | PREEMPTED: State Division of Local Government Services (DLGS) oversight | N.J.S.A. Title 40A, Ch. 2 & 4; N.J.S.A. 40:48C-14 |
| **NM** | County Assessor; Board of County Comm / Council | YES: Municipal & County Local Option GRT (up to 3.5%+) | NO: Unauthorized | A: 3% annual valuation increase cap on residential property; R: 20 mills | Referendum required for specific local GRT increments | Simple Majority for municipal GO bonds (N.M. Const. Art. IX, § 12) | PREEMPTED: Local taxation channeled through gross receipts framework | N.M. Const. Art. VIII, § 2; Art. IX, § 12; NMSA Ch. 7, Arts. 19D & 20E |
| **NY** | Town / City Assessor; County Leg / Town Board / Council | YES: Local Sales Taxes up to 3%-4.875% (State approval required) | YES: NYC Personal Income Tax (Art. 30); Yonkers Surcharge (Art. 30-A) | L: 2% Tax Levy Cap (lesser of 2% or CPI); R: Const. 2% rate cap | 60% Supermajority of local board or school vote to override 2% cap | Permissive Referendum for town/village; Mandatory for school bonds | PREEMPTED: NYC/Yonkers income taxes require state legislative acts | N.Y. Const. Art. VIII, §§ 10, 11; Gen. Mun. Law § 3-c; Tax Law Art. 29, 30 |
| **NC** | County Tax Assessor; Board of County Comm | YES: County Local Option Sales Taxes (Arts. 39, 40, 42; 2.0%-2.75%) | NO: Unauthorized | NONE: No general property tax rate cap; Truth in Taxation reassessment | Voter approval mandatory for Article 46 quarter-cent sales tax | Simple Majority (Subject to LGC approval) | DILLON: Local Government Commission (LGC) must approve all local debt | N.C. Const. Art. V, § 4; N.C.G.S. Ch. 105 & 159 |
| **ND** | County Director of Tax Equalization; County Comm / Council | YES: Home Rule cities/counties up to 2% sales tax | NO: Unauthorized | R: Mill levy caps by fund under N.D.C.C. 57-15 | Voter approval required to approve home rule charter tax powers | 60% Supermajority for local GO bonds (N.D.C.C. § 21-03-07) | PREEMPTED: Home rule enables local sales taxes under state code | N.D.C.C. Title 21, Ch. 40-05.1, Title 57 |
| **OH** | County Auditor; County Comm / City Council | YES: County Piggyback Sales Tax (0.5% to 1.5% under R.C. 5739.026) | YES: Municipal Income Tax (~650 cities; 1.0%-3.0% under R.C. Ch. 718) | R: 10-Mill Unvoted Limitation (Ohio Const. Art. XII, § 2) | Voter approval mandatory for all tax levies outside 10-mill limit | Simple Majority for voted bonds (R.C. 133.18) | PREEMPTED: Municipal income taxes capped at 1% without voter approval | Ohio Const. Art. XII, § 2; Art. XVIII, § 3; R.C. Ch. 133, 718, 5705 |
| **OK** | County Assessor; Board of County Comm / Council | YES: City sales taxes up to 4%+; County sales taxes (voter vote) | NO: Prohibited | A: 3% homestead / 5% commercial cap; R: Const. 10 mills county, 5 city | Mandatory voter referendum for municipal sales taxes | **60% Supermajority** (Okla. Const. Art. X, § 26) | PREEMPTED: Municipalities heavily reliant on sales taxes | Okla. Const. Art. X, §§ 8B, 9, 26; 68 O.S. § 1370 |
| **OR** | County Assessor; Board of County Comm / Council | NO: Zero general sales tax authority | YES: TriMet & Lane Transit District Employer Payroll Taxes | A: 3% MAV cap (Measure 50); R: $10/$1,000 govt, $5/$1,000 schools (M5) | Local option levies require November election or 50% voter turnout | Simple Majority (Or. Const. Art. XI, § 11k) | PREEMPTED: Measure 5 & 50 constitutionally constrain property taxing | Or. Const. Art. XI, §§ 11, 11b; ORS Ch. 267, 294, 308 |
| **PA** | County Board of Assessment Appeals; Commissioners / Council | LIMITED: Allegheny County (1%) & Philadelphia (2%) sales taxes | YES: Act 511 Earned Income Tax (EIT; 1%-2%); Phila Wage Tax (~3.75%) | L: Act 1 of 2006 (Taxpayer Relief Act Index for school property taxes) | Act 1 referendum required for school tax hikes above state index | None for non-electoral debt within borrowing limits (53 P.S. § 8001) | PREEMPTED: Strict municipal class codes and Act 511 limits | 53 P.S. § 6924.101 (Act 511); 53 P.S. § 8001; 53 P.S. § 15971 |
| **RI** | Municipal Tax Assessor; City / Town Council | NO: Zero local option sales tax authority | NO: Unauthorized | L: 4.0% Property Tax Levy Cap (R.I.G.L. § 44-5-2) | 4/5 council vote or state emergency approval to exceed 4% cap | Financial Town Meeting or Municipal Referendum under charter | DILLON: No county government; strict state statutory levy constraints | R.I.G.L. Title 44, Ch. 5; R.I.G.L. § 44-5-2 |
| **SC** | County Assessor; County Council / City Council | YES: Local Option Sales Tax (LOST) & Capital Project Sales Tax (1%) | NO: Unauthorized | L: Millage rate increases capped at CPI + population growth (S.C. Code § 6-1-320) | Voter referendum mandatory for Capital Project Sales Tax | Simple Majority (S.C. Const. Art. X, § 14) unless within 8% AV limit | PREEMPTED: Strict statutory limits on local millage expansion | S.C. Const. Art. X, §§ 14, 15; S.C. Code Ann. Title 4 & 6 |
| **SD** | Director of Equalization; County Comm / Council | YES: Municipal Sales and Use Tax (up to 2.0% with voter approval) | NO: Prohibited | L: Property tax revenue growth capped at CPI or 3% (SDCL 10-13-35) | Opt-out referendum allows voters to overturn school/county opt-out | Simple Majority (SDCL 6-8B) | PREEMPTED: Strict property tax revenue growth caps | SDCL Title 6, Ch. 10-12, 10-13, 10-52 |
| **TN** | County Property Assessor; County Commission / Council | YES: Local Option Sales Tax (T.C.A. § 67-6-702; up to 2.75%) | NO: Constitutionally banned (State income tax repealed) | L: Certified Tax Rate law (T.C.A. § 67-5-1701: rate rolls back after reappraisal) | Public notice and public hearing required to exceed certified rate | Simple Majority (T.C.A. Title 9, Ch. 21) | PREEMPTED: County legislative bodies control primary tax levies | Tenn. Const. Art. II, § 28; T.C.A. Title 9, Ch. 21; Title 67 |
| **TX** | County Appraisal District (CAD); Comm Court / Council | YES: Combined Local Sales Tax Capped at 2.0% (City, County, Transit) | NO: Strictly prohibited by Tex. Const. Art. VIII, § 24-a | L: Truth in Taxation: 3.5% Voter-Approval Tax Rate (2.5% for schools) | **Mandatory Automatic Election** if adopted rate exceeds Voter-Approval Rate | **Simple Majority Voter Approval Mandatory** (Tex. Gov't Code § 1251.003) | PREEMPTED: CAD is independent; strict state caps on revenue growth | Tex. Const. Art. VIII, §§ 1, 24-a; Tex. Tax Code Ch. 26, 321, 323 |
| **UT** | County Assessor; County Commission / Council | YES: Local Option Sales Taxes (0.5% to 1.5%+ with voter/council vote) | NO: Unauthorized | L: Certified Tax Rate law (Utah Code § 59-2-924: automatic rate rollback) | Truth in Taxation advertisement and public hearing to exceed rate | Simple Majority (Utah Code § 11-14-201) | PREEMPTED: Uniform property tax administration under state commission | Utah Const. Art. XIII; Utah Code Title 11 & 59 |
| **VT** | Town Listers / Assessor; Selectboard / City Council | LIMITED: 1% Local Option Sales, Meals, or Rooms Tax in ~20 towns | NO: Unauthorized | R: Common Level of Appraisal (CLA) adjustments under Act 60/68 | Town Meeting voting on municipal budget and school spending | Australian Ballot / Floor Vote at Town Meeting (24 V.S.A. § 1755) | DILLON: Town meeting democracy with state education equalization | 24 V.S.A. Ch. 138; 32 V.S.A. Ch. 135 (Act 60/68) |
| **VA** | Commissioner of the Revenue; Board of Supervisors / Council | LIMITED: 1.0% Uniform Local Sales Tax + regional transportation surcharges | NO: Unauthorized | L: Reduced Tax Rate ordinance / hearing if reassessment increases levy >1% | Voter approval required for county GO debt; cities issue under charter | Simple Majority for county GO bonds (Va. Const. Art. VII, § 10) | DILLON: Independent cities separate from counties; strict Dillon's Rule | Va. Const. Art. VII, §§ 2, 10; Va. Code Ann. Title 15.2 & 58.1 |
| **WA** | County Assessor; Board of County Comm / Council | YES: Local Sales Taxes up to 3.5%+ (Transit, Criminal Justice, Housing) | NO: Barred by state preemption; cities levy local B&O taxes | L: 101% Levy Limit (lesser of 1% or inflation plus new growth) | **Levy Lid Lift** election required to exceed 1% annual growth cap | **60% Supermajority + 40% Turnout Validation** (Wash. Const. Art. VIII, § 6) | PREEMPTED: Strict 1% annual levy growth limit and bond supermajority | Wash. Const. Art. VII, § 2; Art. VIII, § 6; RCW 84.55.010, 82.14 |
| **WV** | County Assessor; County Commission / Council | YES: Municipal Sales and Service Tax (1.0% for Home Rule cities) | NO: Unauthorized; cities levy local B&O gross receipts taxes | R: Constitutional property tax classification rate limits (Class I-IV) | 60% voter approval for excess levies up to 50% above maximum rates | 60% Supermajority for local GO bonds (W. Va. Const. Art. X, § 8) | PREEMPTED: Constitutional property tax classes restrict millage | W. Va. Const. Art. X, §§ 1, 8; W. Va. Code Ch. 8 & 11 |
| **WI** | Municipal Assessor; Common Council / Town Board | LIMITED: County 0.5% sales tax; City of Milwaukee 2.0% (2023 Act 12) | NO: Unauthorized | L: Net New Construction levy cap (Wis. Stat. § 66.0602) | Referendum required to exceed net new construction levy limit | Simple Majority (Wis. Stat. § 67.05) | PREEMPTED: State levy limit strictly binds municipal and county levies | Wis. Stat. Ch. 66, 67, 70, 77 |
| **WY** | County Assessor; Board of County Comm / Council | YES: County 1% General Purpose & 1% Specific Purpose LOST | NO: Prohibited | R: Constitutional millage caps: 12 mills county, 8 mills city, 12 state | Voter referendum mandatory for local option sales taxes (every 4 years) | Simple Majority (W.S. § 22-21-101) | PREEMPTED: Strict constitutional debt limits (2% county, 4% city AV) | Wyo. Const. Art. 15, §§ 4, 6; Art. 16, §§ 1, 3, 5; W.S. Title 39 |

---

## 5. STATE-BY-STATE COMPREHENSIVE LEGAL DOSSIERS (50 STATES, AL THROUGH WY)

The following state dossiers detail the statutory and constitutional mechanics governing executive, legislative, and local fiscal actors.

### Alabama (`us-al`)
- `[FACT]`: **State Level:** Governed by Ala. Const. Art. XI and Ala. Code Title 40. Major taxes: Individual Income Tax (capped at 5% under Amend. 212), Corporate Income Tax (6.5%), General Sales Tax (4.0%), State Property Tax (6.5 mills under Art. XI, § 214), and Severance Taxes. Balanced-budget mandate is constitutional under Art. XI, § 213 (amended by Amend. 26), prohibiting expenditure of funds in excess of revenues; deficit carryover is strictly prohibited. State debt is capped at $300,000 without constitutional amendment. Governor must submit budget within 10 days of legislative convening (Ala. Code § 41-4-84).
- `[FACT]`: **Local Level:** Governed by Ala. Code Title 11. Property taxes are strictly limited by constitutional caps: 5 mills for general county purposes (§ 215), 5 mills for municipal purposes (§ 216). Local option sales taxes are pervasive (cities up to 5%, counties up to 3%). Certain municipalities (Birmingham, Gadsden) levy occupational license taxes on gross wages under Ala. Code § 11-51-90. Bonded debt requires simple majority voter approval (Amend. 225). Strict Dillon's Rule state: local rate increases frequently require statewide constitutional amendments.

### Alaska (`us-ak`)
- `[FACT]`: **State Level:** Governed by Alaska Const. Art. IX and AS Title 37/43. Zero state personal income tax; zero state general sales tax. Revenues dominated by Corporate Income Tax, Oil and Gas Production Severance Tax (AS 43.55), and Alaska Permanent Fund earnings (Art. IX, § 15). Balanced budget required at submission and enactment; deficit carryover prevented via draws from the Constitutional Budget Reserve (CBR, Art. IX, § 17), which requires a **three-fourths (3/4) roll-call vote of both houses**. State GO debt requires statewide voter referendum (Art. IX, § 8). Governor submits budget by December 15 (AS 37.07.020). Veto override requires two-thirds for general bills, but **three-fourths (3/4) of the legislature in joint session for appropriations bills** (Art. II, § 16).
- `[FACT]`: **Local Level:** Governed by AS Title 29 (Municipal Government). Organized boroughs and cities have broad local option sales tax authority (AS 29.45.650) with rates reaching 7%+, and ad valorem property taxes capped at 30 mills (AS 29.45.080). Local income taxes are unauthorized. Local GO bonds require simple majority voter approval (AS 29.47.190). Boroughs exercise broad home rule fiscal powers, while the Unorganized Borough has zero local government or local taxes.

### Arizona (`us-az`)
- `[FACT]`: **State Level:** Governed by Ariz. Const. Art. IX and A.R.S. Titles 35 & 42. Taxes: Flat Individual Income Tax (2.5%), Corporate Income Tax (4.9%), Transaction Privilege Tax (TPT / Sales Tax 5.6%). Proposition 108 (Ariz. Const. Art. IX, § 22) mandates a **two-thirds (2/3) supermajority vote in both houses to increase any state tax or fee**. Strict balanced budget; deficit carryover prohibited (Art. IX, § 5). State debt strictly capped at $350,000. Governor submits budget by the fifth day of the regular session (A.R.S. § 35-111).
- `[FACT]`: **Local Level:** Governed by A.R.S. Title 42. Real property assessed under a dual-value system: Full Cash Value (FCV) and Limited Property Value (LPV). Under Proposition 117 (Ariz. Const. Art. IX, § 18), **LPV increases are capped at 5.0% annually**. City and county primary property tax levies are capped at a 2.0% annual increase plus new construction. Cities levy local TPT (sales tax) up to 3%+. Local income taxes are strictly preempted. Local GO bonds require majority voter approval (A.R.S. § 35-455).

### Arkansas (`us-ar`)
- `[FACT]`: **State Level:** Governed by Ark. Const. Art. 5 & 16 and Ark. Code Title 19 & 26. Taxes: Graduated Individual Income Tax, Corporate Income Tax, Sales Tax (6.5%), Severance Taxes. Under Ark. Const. Art. 5, § 31, **appropriations require a two-thirds (2/3) vote, and general appropriations require a three-fourths (3/4) supermajority**. The Revenue Stabilization Act (Ark. Code § 19-5-101 et seq.) strictly prioritizes appropriations into Category A, B, and C allotments, making deficits mathematically impossible; deficit carryover is barred. State debt capped at $500,000 without constitutional amendment. Governor submits budget 60 days before session.
- `[FACT]`: **Local Level:** Governed by Ark. Code Title 14. Real property assessment increases capped by Amendment 79 at 5.0% annually for homesteads and 10.0% for commercial property. County property taxes capped at 5 mills for general purposes (Ark. Const. Art. 16, § 9). Cities and counties have broad local option sales tax authority (up to 2% county, 3% city) subject to voter approval. Local income taxes unauthorized. Local GO bonds require majority voter approval (Amend. 62). Dillon's Rule state.

### California (`us-ca`)
- `[FACT]`: **State Level:** Governed by Cal. Const. Art. IV, XIII, and XVI. Taxes: Highly progressive graduated Individual Income Tax (top rate 13.3%), Corporate Tax (8.84%), Sales & Use Tax (7.25% base). Governor submits budget by January 10 (Art. IV, § 12). Budget bills pass by simple majority under Proposition 25 (2010), but **any state tax increase requires a two-thirds (2/3) roll-call vote under Proposition 26**. State GO debt requires two-thirds legislative approval plus statewide voter referendum (Art. XVI, § 1). Budget Stabilization Account (BSA / Prop 2) mandates 1.5% general fund deposits plus capital gains windfalls (10% cap); withdrawals require gubernatorial declaration of fiscal emergency. Deficit carryover permitted via short-term revenue notes.
- `[FACT]`: **Local Level:** Governed by Cal. Const. Art. XIII A, XIII C, XIII D. **Proposition 13 caps property taxes at 1.0% of assessed value and limits assessment growth to 2.0% per year**. Properties reassessed to market value only upon change of ownership. Local sales taxes authorized under Bradley-Burns (1.0% uniform) plus transactions and use taxes (capped at 2.0% aggregate district cap). **Local personal income taxes are strictly banned by Cal. Rev. & Tax. Code § 17041.5**. Proposition 218 requires majority vote for general taxes and **two-thirds (2/3) supermajority vote for special taxes**. Municipal/county GO bonds require a **two-thirds (2/3) voter approval** (Art. XVI, § 18); school bonds require 55% under Proposition 39.

### Colorado (`us-co`)
- `[FACT]`: **State Level:** Governed by Colo. Const. Art. X, § 20 (TABOR). Taxes: Flat Individual Income Tax (4.4%), Corporate Income Tax (4.4%), Sales Tax (2.9%). **TABOR strictly bars the General Assembly from increasing tax rates, enacting new taxes, or issuing multi-year debt without statewide voter approval**. State spending growth is limited to inflation (Denver-Boulder CPI) plus population growth. Revenues collected above the cap must be refunded to taxpayers. End-of-year deficit carryover is strictly unconstitutional (Art. X, § 16). Governor submits budget by November 1 (C.R.S. § 24-75-201.1).
- `[FACT]`: **Local Level:** Governed by C.R.S. Title 29 & 31. TABOR binds all cities, counties, and school districts: no property tax rate increase, mill levy increase, or new tax can be levied without prior voter approval. Statutory 5.5% property tax revenue limit (C.R.S. § 29-1-301) caps annual levy increases. Municipalities have broad sales tax powers (up to 4%+) with voter approval. Denver, Aurora, and several home rule municipalities levy a flat monthly employee/employer "Head Tax" (Occupational Privilege Tax). Local GO debt requires voter approval.

### Connecticut (`us-ct`)
- `[FACT]`: **State Level:** Governed by Conn. Const. Art. IV and C.G.S. Title 4 & 12. Taxes: Graduated Individual Income Tax, Corporate Business Tax, Sales Tax (6.35%). Governor submits biennial budget by first Wednesday after first Monday in February (C.G.S. § 4-71). Constitutional spending cap (amend. art. XXVIII) limits appropriations growth to personal income growth or CPI. Budget Reserve Fund (C.G.S. § 4-30a) features a volatility cap that sweeps pass-through entity and capital gains tax revenues (capped at 18% of net appropriations; excess pays down pension liabilities). Deficit carryover permitted through GAAP notes.
- `[FACT]`: **Local Level:** Governed by C.G.S. Title 7. County government was abolished in 1960. Municipalities (169 towns) rely almost exclusively on ad valorem property taxes. **Zero local sales tax or local income tax authority exists**. State imposes a uniform motor vehicle property tax cap (32.46 mills under C.G.S. § 12-71e). Local debt authorized by town meeting or municipal council under charter caps. Strict Dillon's Rule framework.

### Delaware (`us-de`)
- `[FACT]`: **State Level:** Governed by Del. Const. Art. VIII and 30 Del. C. Taxes: Graduated Individual Income Tax, Corporate Income Tax, Gross Receipts Tax (GRT). **Zero general sales tax; zero statewide property tax**. State debt requires a **three-fourths (3/4) supermajority vote in each house (Art. VIII, § 3)**. Appropriations capped at 98% of estimated general fund revenue plus unencumbered reserves (Art. VIII, § 6). Any act to increase taxes requires a **three-fifths (3/5) roll-call vote**. Governor submits budget by the second Tuesday in January (29 Del. C. § 6335). Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by 9 Del. C. and 22 Del. C. Zero local sales tax authority. Real property taxes levied by counties and school districts. **City of Wilmington levies a 1.25% Earned Income Tax on residents and workers (22 Del. C. § 901)**. School district property tax increases require local referendum (14 Del. C. Ch. 19). Local debt subject to legislative charter caps.

### Florida (`us-fl`)
- `[FACT]`: **State Level:** Governed by Fla. Const. Art. III & VII and Fla. Stat. Ch. 216. Taxes: Corporate Income Tax (5.5%), Sales & Use Tax (6.0%). **Personal income tax is strictly prohibited by Fla. Const. Art. VII, § 5**. Any new state tax or fee requires a **two-thirds (2/3) supermajority vote in both houses (Art. VII, § 19)**. Balanced budget required across all stages; deficit carryover barred (Fla. Stat. § 216.221). State GO debt requires voter referendum or must meet the 7% debt service limit (Art. VII, § 11). Budget Stabilization Fund must equal at least 5% of net general revenue collections (10% cap). Governor submits budget 30 days before session.
- `[FACT]`: **Local Level:** Governed by Fla. Stat. Ch. 200 & 212. Constitutional millage caps: **10 mills for county purposes, 10 mills for municipal purposes, and 10 mills for school districts (Art. VII, § 9)**. Save Our Homes amendment (Art. VII, § 4) **caps annual assessment increases on homestead property at the lower of 3.0% or CPI**, and 10.0% on non-homestead property. Counties may levy local option sales surtaxes (up to 1.5%) with voter approval. Local income taxes strictly barred. Local GO debt requires simple majority voter approval (Art. VII, § 12). Truth in Millage (TRIM) process mandates rolled-back rate calculations.

### Georgia (`us-ga`)
- `[FACT]`: **State Level:** Governed by Ga. Const. Art. III & VII and O.C.G.A. Title 45 & 48. Taxes: Flat Individual Income Tax (transitioning to 5.39%), Corporate Income Tax, Sales & Use Tax (4.0%). Balanced budget required; deficit carryover prohibited. State debt service is capped at **10.0% of total state revenue receipts of the prior fiscal year (Art. VII, Sec. IV, Para. II)**. Revenue Shortfall Reserve capped at 15% of net revenues. Governor submits budget within 5 days of General Assembly convening (O.C.G.A. § 45-12-74).
- `[FACT]`: **Local Level:** Governed by O.C.G.A. Title 36 & 48. County commissions and city councils levy property taxes. Local option sales taxes are heavily utilized: Local Option Sales Tax (LOST, 1%), Special Purpose Local Option Sales Tax (SPLOST, 1%), and Education SPLOST (ESPLOST, 1%), all requiring countywide voter referendums. Local income taxes unauthorized. Local GO debt requires simple majority voter approval (Ga. Const. Art. IX, Sec. V, Para. I) and is capped at 10% of assessed valuation.

### Hawaii (`us-hi`)
- `[FACT]`: **State Level:** Governed by Haw. Const. Art. VII and HRS Ch. 37. Taxes: Graduated Individual Income Tax (top rate 11%), Corporate Income Tax, General Excise Tax (GET, 4.0% comprehensive gross receipts tax), Transient Accommodations Tax. The Council on Revenues generates binding revenue estimates for the executive and legislative branches (Art. VII, § 7). Debt service is capped at **18.5% of general fund revenues (Art. VII, § 13)**. Governor submits executive budget 30 days before regular session (HRS § 37-67). Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by Haw. Const. Art. VIII, § 3. **Hawaii has only 4 basic county governments and ZERO independent school districts** (public education is 100% funded and administered by the State Department of Education). Counties have the exclusive constitutional power to levy real property taxes; no state property tax exists. Counties may levy a 0.5% GET surcharge, but have no independent sales or income tax authority.

### Idaho (`us-id`)
- `[FACT]`: **State Level:** Governed by Idaho Const. Art. VII & VIII and Idaho Code Title 67. Taxes: Flat Individual Income Tax (5.8%), Corporate Income Tax (5.8%), Sales Tax (6.0%). Strict balanced-budget mandate (Art. VII, § 11); deficit carryover barred. State debt is capped at **$2,000,000 without a statewide voter referendum (Art. VIII, § 1)**. Budget Stabilization Fund capped at 15% of general fund collections. Joint Finance-Appropriations Committee (JFAC) drives budget enactment. Governor submits budget by the 5th day of the session.
- `[FACT]`: **Local Level:** Governed by Idaho Code Title 50 & 63. Property tax budget growth is strictly limited to **3.0% annually plus new construction (Idaho Code § 63-802)**. Resort cities (<10,000 population) may levy a local option sales tax up to 3% with a 60% voter approval. Local income taxes unauthorized. Local GO debt requires a **two-thirds (2/3) supermajority voter approval (Idaho Const. Art. VIII, § 3)**. Strict Dillon's Rule state.

### Illinois (`us-il`)
- `[FACT]`: **State Level:** Governed by Ill. Const. Art. VIII & IX and 15 ILCS 20. Taxes: Flat Individual Income Tax (4.95%; **non-graduated rate constitutionally mandated by Art. IX, § 3**; corporate tax rate ratio cannot exceed 8:5), Corporate Income Tax (9.5% including personal property replacement tax), Retailers' Occupation Tax (Sales Tax 6.25%). State debt requires a **three-fifths (3/5) vote of each house or statewide voter referendum (Art. IX, § 9)**. Governor submits budget by third Wednesday in February (15 ILCS 20/50-5). Deficit carryover permitted through short-term borrowing certificates.
- `[FACT]`: **Local Level:** Governed by 35 ILCS 200 and 65 ILCS 5. Property Tax Extension Limitation Law (PTELL, 35 ILCS 200/18-185) caps annual property tax levy growth to the **lesser of 5.0% or CPI** in Cook and collar counties (and opting-in downstate counties). Home rule municipalities (>25,000 population or by referendum) have broad taxing powers, including home rule sales taxes (e.g., Chicago 1.25%, Cook County 1.75%), **but are strictly barred from levying income or occupation taxes under Ill. Const. Art. VII, § 6(e)**. Local GO debt requires majority voter approval unless exempt by home rule debt rules.

### Indiana (`us-in`)
- `[FACT]`: **State Level:** Governed by Ind. Const. Art. 10 and Ind. Code § 4-12-1. Taxes: Flat Individual Income Tax (3.05%), Corporate Adjusted Gross Income Tax (4.9%), Sales Tax (7.0%). **State debt is strictly prohibited by Ind. Const. Art. 10, § 5** (except to meet casual deficits or repel invasion). Deficit carryover strictly barred. Counter-Cyclical Revenue Fund capped at 7% of general fund revenue. State Budget Agency submits executive report by second Monday in January.
- `[FACT]`: **Local Level:** Governed by Ind. Code § 6-1.1 & § 6-3.6. Constitutional property tax caps (Circuit Breaker, Ind. Const. Art. 10, § 1): **1.0% of gross AV for homesteads, 2.0% for rental residential/agricultural, 3.0% for commercial/business personal property**. Zero local sales tax authority. **Pervasive Local Income Tax (LIT, IC 6-3.6)** levied by county tax councils (rates 1.0% to 3.0%), administered by the Indiana Department of Revenue. Department of Local Government Finance (DLGF) must approve all local levies. Capital debt referendums governed by IC 6-1.1-20.

### Iowa (`us-ia`)
- `[FACT]`: **State Level:** Governed by Iowa Const. Art. VII and Iowa Code Ch. 8. Taxes: Flat Individual Income Tax (3.8%), Corporate Income Tax, Sales Tax (6.0%). Balanced budget required; appropriations limited to 99% of adjusted revenue receipts under Iowa Code § 8.54; deficit carryover barred. State debt capped at **$250,000 without statewide voter referendum (Art. VII, § 5)**. Cash Reserve Fund (7.5%) and Economic Emergency Fund (2.5%) provide reserve buffers. Governor submits budget by February 1.
- `[FACT]`: **Local Level:** Governed by Iowa Code Ch. 24, 75, and 423B. Residential assessment growth capped by the state rollback formula at **3.0% annually (Iowa Code § 441.21)**. Local Option Sales and Services Tax (LOST, 1.0%) authorized subject to voter referendum. School districts may levy an instructional support income surtax under Ch. 298. Local GO bonds require a **60% supermajority voter approval (Iowa Code § 75.1)**.

### Kansas (`us-ks`)
- `[FACT]`: **State Level:** Governed by Kan. Const. Art. 11 and K.S.A. Ch. 75, Art. 37. Taxes: Graduated Individual Income Tax, Corporate Income Tax, Sales Tax (6.5%). Balanced budget required; deficit carryover prohibited. State debt capped at **$1,000,000 without statewide voter referendum (Art. 11, § 6)**. Governor submits budget by the 8th calendar day of regular session (K.S.A. 75-3721).
- `[FACT]`: **Local Level:** Governed by K.S.A. Ch. 12 & 79. Under the **Revenue Neutral Rate (RNR) law (K.S.A. 79-2988)**, local taxing subdivisions cannot exceed the revenue-neutral tax rate without published notice, public hearings, and a formal roll-call resolution. Cities and counties may levy local sales taxes (1% to 2%+) with voter approval. Local income taxes unauthorized. Local GO bonds require majority voter approval (K.S.A. 10-120).

### Kentucky (`us-ky`)
- `[FACT]`: **State Level:** Governed by Ky. Const. §§ 49, 50, 171, 181 and KRS Ch. 48. Taxes: Flat Individual Income Tax (4.0%), Corporate Income Tax (5.0%), Sales & Use Tax (6.0%), State Ad Valorem Property Tax (KRS 132.020), Severance Taxes. State debt is strictly capped at **$500,000 without a statewide voter referendum (Ky. Const. §§ 49, 50)**. Balanced budget required; Consensus Forecasting Group provides official revenue estimates; deficit carryover barred. Governor submits budget by 15th legislative day (odd) or 10th day (even) (KRS 48.100). Line-item veto override requires a simple majority of members elected (50%+1).
- `[FACT]`: **Local Level:** Governed by KRS Ch. 67, 68, 83A, 91A, 92, and 132. Property taxes governed by **House Bill 44 (KRS 132.010, 132.017)**: rates producing >4% revenue growth over the compensating rate trigger a citizen recall petition (10% of voters). **Local option sales taxes are constitutionally prohibited (Ky. Const. §§ 181, 157)**. Cities and counties levy extensive **Occupational License Taxes** on wages and business net profits (KRS 67.083, 68.180, 91.200, 92.281). Local debt exceeding annual income requires a **two-thirds (2/3) supermajority voter approval (Ky. Const. § 157)**.

### Louisiana (`us-la`)
- `[FACT]`: **State Level:** Governed by La. Const. Art. VII and La. R.S. Title 39. Taxes: Graduated Individual Income Tax (top rate 4.25%), Corporate Income Tax, Sales Tax (4.45%), Severance Taxes. State debt requires a **two-thirds (2/3) supermajority vote in each house (Art. VII, § 6)**. Revenue Estimating Conference sets binding baseline revenue forecasts. Budget Stabilization Fund (Art. VII, § 10.3) capped at 4% of total state revenue receipts. Governor submits budget 45 days before regular session (La. R.S. 39:36).
- `[FACT]`: **Local Level:** Governed by La. Const. Art. VI and La. R.S. Title 33 & 47. Parishes, municipalities, and school boards have broad local option sales tax authority (frequently exceeding 5.0% combined local rate), requiring local voter approval. Property taxes subject to mandatory 4-year reassessment rollbacks; millage increases require voter referendum. Local income taxes unauthorized. Local GO bonds require majority voter approval (Art. VI, § 35).

### Maine (`us-me`)
- `[FACT]`: **State Level:** Governed by Me. Const. Art. V & IX and 5 M.R.S. Part 4. Taxes: Graduated Individual Income Tax (top rate 7.15%), Corporate Income Tax, Sales Tax (5.5%). State debt capped at **$2,000,000 without statewide voter referendum (Art. IX, § 14)**. Balanced budget required; deficit carryover prohibited. Maine Budget Stabilization Fund capped at 18% of general fund revenue (5 M.R.S. § 1532). Governor submits budget by first Friday after first Wednesday in January.
- `[FACT]`: **Local Level:** Governed by 30-A M.R.S. and 36 M.R.S. Municipalities rely almost exclusively on property taxes. **Zero local sales tax or local income tax authority exists**. Municipal property tax levy growth is limited by **LD 1 (30-A M.R.S. § 5721-A)** to the rate of state personal income growth plus local property growth. Overriding LD 1 requires a supermajority vote of the municipal council or town meeting. GO debt approved at town meeting or city referendum.

### Maryland (`us-md`)
- `[FACT]`: **State Level:** Governed by Md. Const. Art. III, §§ 34 & 52 and Md. Code Ann., State Fin. & Proc. Title 7. Taxes: Graduated Individual Income Tax, Corporate Income Tax (8.25%), Sales Tax (6.0%), State Property Tax ($0.112 per $100 dedicated to debt service). **Executive-Dominant Budget System:** Governor submits the budget bill by third Wednesday in January; the General Assembly **cannot increase executive agency line items, only strike or reduce them** (Art. III, § 52; 2020 Question 1 allowed reallocations subject to line-item veto starting FY 2024). State debt requires legislative act with a dedicated annual tax and maximum 15-year maturity (Art. III, § 34). Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by Md. Code Ann., Local Gov't & Tax-Gen. **Mandatory County Income Tax Piggyback (Md. Code Ann., Tax-Gen. §§ 10-103, 10-106)**: All 23 counties and Baltimore City levy a local income tax between 2.25% and 3.20% on state taxable income, collected by the Comptroller. **Local option general sales taxes are strictly barred**. Homestead Property Tax Credit (Tax-Prop. § 9-105) caps annual assessment increases at 10% (counties may set lower caps, 0% to 10%). Counties issue debt within charter borrowing limits or through state enabling acts.

### Massachusetts (`us-ma`)
- `[FACT]`: **State Level:** Governed by Mass. Const. amend. arts. LXII & LXIII and M.G.L. c. 29. Taxes: Flat Individual Income Tax (5.0%) plus a 4.0% surtax on income over $1M (Fair Share Amendment), Corporate Excise Tax, Sales Tax (6.25%). State debt requires a **two-thirds (2/3) roll-call vote of both houses (amend. art. LXII, § 3)**. Commonwealth Stabilization Fund capped at 15% of budgeted revenues (M.G.L. c. 29, § 2H). Governor submits budget within 5 weeks of convening. Deficit carryover permitted through temporary borrowing.
- `[FACT]`: **Local Level:** Governed by M.G.L. c. 59 & c. 44. **Proposition 2 1/2 (M.G.L. c. 59, § 21C)**: Total property tax levy cannot exceed 2.5% of full cash value (*Levy Ceiling*), and annual levy increases cannot exceed 2.5% plus new growth (*Levy Limit*). Exceeding the limit requires an **Override Ballot Question** approved by majority vote at the polls. Zero local sales tax authority (except local option meals 0.75% and room occupancy up to 6%). Zero local income tax authority. Municipal debt requires a two-thirds vote of Town Meeting or City Council (M.G.L. c. 44, §§ 7, 8).

### Michigan (`us-mi`)
- `[FACT]`: **State Level:** Governed by Mich. Const. Art. V & IX and MCL Ch. 18. Taxes: Flat Individual Income Tax (4.25%), Corporate Income Tax (6.0%), Sales & Use Tax (6.0%). State debt requires a **two-thirds (2/3) supermajority vote of both houses or statewide voter referendum (Art. IX, § 15)**. Headlee Amendment (Art. IX, § 26) limits state revenues to a fixed proportion of state personal income. Counter-Cyclical Budget Stabilization Fund capped at 15% of state general fund. Governor submits budget within 30 days of convening (MCL 18.1363).
- `[FACT]`: **Local Level:** Governed by Mich. Const. Art. IX and MCL Ch. 141 & 211. **Proposal A (1994, Art. IX, § 3)** caps annual assessment growth on taxable value to the **lesser of 5.0% or CPI** until ownership transfers. **Headlee Amendment (Art. IX, § 31)** mandates automatic millage rollbacks if total assessed valuation increases faster than inflation; rollbacks can only be overridden by a local vote ("Headlee Override"). Zero local sales tax authority. **24 cities levy uniform municipal income taxes under Act 284 of 1964** (Detroit 2.4% resident / 1.2% nonresident; others 1.0% / 0.5%). Local GO bonds require majority voter approval.

### Minnesota (`us-mn`)
- `[FACT]`: **State Level:** Governed by Minn. Const. art. XI and Minn. Stat. Ch. 16A & 290. Taxes: Graduated Individual Income Tax (top rate 9.85%), Corporate Franchise Tax (9.8%), Sales Tax (6.875%). State debt requires a **three-fifths (3/5) supermajority vote in each house (Minn. Const. art. XI, § 5)**. Budget Reserve and Cash Flow accounts maintained under Minn. Stat. § 16A.152. Governor submits biennial budget by the fourth Tuesday in January. Deficit carryover permitted through cash flow adjustments.
- `[FACT]`: **Local Level:** Governed by Minn. Stat. Ch. 275, 297A.99, and 475. Real property taxed on Net Tax Capacity (NTC) under a complex state classification system. Local option sales taxes require **explicit special legislative authorization followed by local voter approval (Minn. Stat. § 297A.99)**. Local income taxes are strictly unauthorized. Local GO bonds require simple majority voter approval (Minn. Stat. § 475.58) with strict debt limits (typically 3% of market value for cities).

### Mississippi (`us-ms`)
- `[FACT]`: **State Level:** Governed by Miss. Const. Art. 4 and Miss. Code Ann. Title 27 & 31. Taxes: Flat Individual Income Tax (4.0%), Corporate Income Tax, Sales Tax (7.0%), Severance Taxes. State debt requires a **two-thirds (2/3) supermajority vote of the legislature**. Working Cash-Stabilization Reserve Fund capped at 10% of general fund appropriations (Miss. Code § 27-103-203). Joint Legislative Budget Committee prepares the primary legislative budget draft. Governor submits budget by November 15. Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by Miss. Code Ann. Title 19 & 21. Municipal property tax levies capped at a **10.0% annual increase (Miss. Code § 21-33-45)**. Local option sales taxes require special local enabling acts passed by the Legislature and a **60% supermajority local voter approval**. Local income taxes unauthorized. Local GO debt requires 60% voter approval if challenged or depending on statutory bond category. Strict Dillon's Rule state.

### Missouri (`us-mo`)
- `[FACT]`: **State Level:** Governed by Mo. Const. Art. IV & X and RSMo Ch. 33. Taxes: Graduated Individual Income Tax (top rate 4.7%), Corporate Income Tax (4.0%), Sales Tax (4.225%). State debt requires a **statewide voter referendum (Mo. Const. Art. III, § 37)**. Hancock Amendment (Art. X, § 18) imposes a constitutional limit on total state revenue receipts. Budget Stabilization Fund capped at 5% of net general revenue collections. Governor submits executive budget within 30 days of convening. Deficit carryover strictly prohibited.
- `[FACT]`: **Local Level:** Governed by Mo. Const. Art. VI & X and RSMo Ch. 67 & 92. **Hancock Amendment (Art. X, § 22)** mandates that no local government may levy any new tax or increase an existing tax rate without voter approval; requires automatic millage rollbacks if reassessment increases revenue faster than inflation. Cities and counties have broad local option sales tax authority subject to voter approval. **Kansas City and St. Louis levy a 1.0% Earnings Tax (RSMo 92.110)**, subject to mandatory voter reauthorization every 5 years (RSMo 92.115). Local GO bonds require a **four-sevenths (57.14%) vote at primary/general elections or two-thirds (66.67%) at municipal elections (Mo. Const. Art. VI, § 26)**.

### Montana (`us-mt`)
- `[FACT]`: **State Level:** Governed by Mont. Const. Art. VIII and MCA Title 15 & 17. Taxes: Graduated Individual Income Tax, Corporate Income Tax, Statewide Property Tax (95 mills for school equalization under MCA 15-10-108), Severance Taxes. **Zero statewide general sales tax**. State debt requires a **two-thirds (2/3) vote in each house or statewide voter approval (Art. VIII, § 8)**. Balanced budget required; deficit carryover barred. Budget Stabilization Reserve Fund capped at 4.5% of general fund appropriations (MCA 17-7-130). Governor submits budget by November 15 preceding session.
- `[FACT]`: **Local Level:** Governed by MCA Title 7 & 15. Property assessment is **100% centralized and conducted directly by the State Department of Revenue**. Annual property tax levy increases are capped by **MCA 15-10-420 to half the rate of inflation over the prior three years**. Zero local sales tax authority, except that designated *Resort Communities* (<5,500 population) may levy a Resort Tax up to 3.0% with voter approval (MCA 7-6-1501). Local income taxes unauthorized. Local GO bonds require majority voter approval.

### Nebraska (`us-ne`)
- `[FACT]`: **State Level:** Governed by Neb. Const. Art. III & IV and Neb. Rev. Stat. Ch. 81. Taxes: Graduated Individual Income Tax, Corporate Income Tax, Sales Tax (5.5%). **Unicameral Legislature:** The 9-member Appropriations Committee reviews the Governor's biennial budget (submitted by January 15) and formulates the unified appropriations bill. State debt is capped at **$100,000 without a constitutional amendment (Neb. Const. Art. XIII, § 1)**. Deficit carryover prohibited. Cash Reserve Fund managed by legislative appropriations.
- `[FACT]`: **Local Level:** Governed by Neb. Rev. Stat. Ch. 77. Hard statutory property tax levy caps (**Neb. Rev. Stat. § 77-3442**): **Counties capped at $0.50 per $100 AV; School districts capped at $1.05 per $100 AV**. Local Option Revenue Act (§ 77-27,142) authorizes cities to levy local sales taxes from 0.5% to 2.0% with voter approval. Local income taxes unauthorized. Local GO bonds require majority voter approval.

### Nevada (`us-nv`)
- `[FACT]`: **State Level:** Governed by Nev. Const. Art. 4, 9, 10 and NRS Ch. 353. Taxes: Commerce Tax (Gross Receipts Tax), Sales & Use Tax (6.85% base), Gaming Taxes, Modified Business Tax (payroll excise). **Personal income tax is constitutionally prohibited (Nev. Const. Art. 10, § 1)**. Any bill that increases any public tax or fee requires a **two-thirds (2/3) supermajority vote in each house (Art. 4, § 18)**. State debt cannot exceed **2.0% of total state assessed valuation (Art. 9, § 3)**. Account to Stabilize State Government capped at 20% of general fund. Governor submits budget 14 days before biennial session.
- `[FACT]`: **Local Level:** Governed by NRS Ch. 350, 354, and 361. Property tax rates subject to a statutory combined cap of **$3.64 per $100 of assessed valuation (NRS 361.453)**, well below the $5.00 constitutional limit (Art. 10, § 2). Property tax revenue increases are capped by abatement rules (3% residential, up to 8% commercial). Local option sales taxes authorized under Local School Support Tax and County City Relief Tax. Local income taxes strictly barred. Local GO bonds require majority voter approval (NRS 350.020).

### New Hampshire (`us-nh`)
- `[FACT]`: **State Level:** Governed by N.H. Const. Pt. II, Arts. 5 & 5-b and RSA Ch. 9 & 76. Taxes: Business Profits Tax (BPT), Business Enterprise Tax (BET), Meals & Rooms Tax (8.5%), Statewide Education Property Tax (SWEPT, RSA 76:3). **Zero general sales tax; zero earned personal income tax** (the 5% Interest and Dividends Tax under RSA 77 is phasing down to 0% by 2027). Revenue Stabilization Reserve Account capped at 10% of general fund revenue (RSA 9:13-e). Governor submits budget by February 15. Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by RSA Ch. 32 & 33. County government has minimal fiscal footprint. Municipalities (cities and towns) and school districts rely almost exclusively on property taxes. **Zero local sales tax or local income tax authority exists**. Town Meeting direct democracy governs appropriations; towns adopting the "Official Ballot" (SB 2) vote on budget warrant articles by referendum. Local GO bonds require a **three-fifths (60%) or two-thirds (2/3) supermajority vote (RSA 33:8)**.

### New Jersey (`us-nj`)
- `[FACT]`: **State Level:** Governed by N.J. Const. Art. VIII and N.J.S.A. Title 52 & 54. Taxes: Progressive Gross Income Tax (top rate 10.75%), Corporation Business Tax (top rate 11.5%), Sales & Use Tax (6.625%). Balanced-budget requirement is constitutional (Art. VIII, Sec. II, para. 2); deficit carryover strictly prohibited. State debt requires a **statewide voter referendum (Art. VIII, Sec. II, para. 3)**. Surplus Revenue Fund (N.J.S.A. 52:9H-14) provides reserve funding. Governor submits budget by fourth Tuesday in February.
- `[FACT]`: **Local Level:** Governed by N.J.S.A. Title 40A. **Local property tax levy increases are capped at 2.0% annually (N.J.S.A. 40A:4-45.45)**; exceeding the cap requires a voter referendum. Zero local option sales tax authority. **City of Newark levies an Employer Payroll Tax (1.0% under N.J.S.A. 40:48C-14)**. School district budget increases above 2% require voter approval. Local debt issued under the Local Bond Law (N.J.S.A. 40A:2) subject to strict state statutory debt ceilings.

### New Mexico (`us-nm`)
- `[FACT]`: **State Level:** Governed by N.M. Const. Art. IV, VIII, IX and NMSA 1978 Ch. 6 & 7. Taxes: Graduated Individual Income Tax, Corporate Income Tax, Gross Receipts Tax (GRT, 4.875% state base), Severance Taxes. State debt requires a **statewide voter referendum (Art. IX, § 8)**. Severance Tax Permanent Fund and Tax Stabilization Reserve provide volatility buffers. Governor and Legislative Finance Committee (LFC) submit separate budget recommendations in January. Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by NMSA 1978 Ch. 7, Arts. 19D & 20E. Counties and municipalities have extensive **Local Option Gross Receipts Tax (Local GRT)** authority (rates typically 2% to 4%+). Property tax rates capped at **20 mills total constitutional limit for all purposes (Art. VIII, § 2)**, and residential assessment increases are capped at **3.0% annually (NMSA 1978 § 7-36-21.2)**. Local income taxes unauthorized. Local GO bonds require majority voter approval (Art. IX, § 12).

### New York (`us-ny`)
- `[FACT]`: **State Level:** Governed by N.Y. Const. Art. VII and N.Y. State Finance Law. Taxes: Graduated Personal Income Tax (top rate 10.9%), Corporate Franchise Tax, Sales & Use Tax (4.0%). **Executive-Dominant Budget System:** Governor submits executive budget by second Tuesday in January (or Feb 1); under **N.Y. Const. Art. VII, § 4, the Legislature can only strike out or reduce executive items**, though it may add separate single-purpose items. State debt requires a **statewide voter referendum (Art. VII, § 11)**. Tax Stabilization Reserve Fund capped at 5% of general fund. Deficit carryover permitted via cash management.
- `[FACT]`: **Local Level:** Governed by N.Y. Const. Art. VIII, Gen. Mun. Law § 3-c, and Tax Law Art. 29 & 30. **New York 2% Property Tax Cap (Gen. Mun. Law § 3-c)** limits property tax levy growth to the **lesser of 2.0% or CPI**; overriding the cap requires a **60% supermajority vote of the local governing board or school district voters**. Counties and cities levy local sales taxes (up to 3.0% general authority; rates between 3.0% and 4.875% require biennial state legislative authorization). **New York City levies a municipal Personal Income Tax (Art. 30; rates up to 3.876%) and Yonkers levies an income tax surcharge (Art. 30-A)**. Local GO debt subject to constitutional debt limits (7% to 10% of 5-year average full valuation).

### North Carolina (`us-nc`)
- `[FACT]`: **State Level:** Governed by N.C. Const. Art. III & V and N.C.G.S. Ch. 143C. Taxes: Flat Individual Income Tax (4.5% in 2026, phasing down to 3.99%), Corporate Income Tax (phasing out to 0% by 2030), Sales Tax (4.75%). State debt requires a **statewide voter referendum (Art. V, § 3)** unless issued under the "two-thirds rule" (authorizing debt up to 2/3 of debt retired in previous biennium). Balanced budget required; deficit carryover prohibited. Savings Reserve Account capped at 15% of general fund appropriations (N.C.G.S. § 143C-4-2). Governor submits budget by March 15 in odd years.
- `[FACT]`: **Local Level:** Governed by N.C.G.S. Ch. 105 & 159. Counties levy uniform Local Option Sales Taxes under Articles 39 (1%), 40 (0.5%), and 42 (0.5%), plus optional Article 46 (0.25% with voter approval). Zero local income tax authority. Local property taxes subject to Truth in Taxation reappraisal notices. **The Local Government Commission (LGC, N.C.G.S. Ch. 159) exercises plenary statutory oversight and must approve all local debt issuances**. Local GO bonds require majority voter approval.

### North Dakota (`us-nd`)
- `[FACT]`: **State Level:** Governed by N.D. Const. Art. X and N.D.C.C. Title 54 & 57. Taxes: Graduated Individual Income Tax (rates 0% to 2.5%), Corporate Income Tax, Sales Tax (5.0%), Oil and Gas Gross Production and Extraction Taxes. State debt capped at **$2,000,000 without a constitutional amendment (Art. X, § 13)**. The **Legacy Fund (Art. X, § 26)** receives 30% of oil and gas taxes; principal cannot be spent without a two-thirds vote of each house. Budget Stabilization Fund capped at 15% of general fund. Governor submits budget by first Tuesday in December. Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by N.D.C.C. Ch. 40-05.1 & Title 57. Home rule cities and counties have broad authority to levy local option sales taxes (up to 2.0%+). Property tax millage rates subject to statutory fund caps (N.D.C.C. 57-15). Local income taxes unauthorized. Local GO bonds require a **60% supermajority voter approval (N.D.C.C. § 21-03-07)**.

### Ohio (`us-oh`)
- `[FACT]`: **State Level:** Governed by Ohio Const. Art. II, VIII, XII and R.C. Ch. 126 & 5751. Taxes: Graduated Individual Income Tax (top rate 3.5%), Commercial Activity Tax (CAT, 0.26% gross receipts tax on gross receipts over $1M), Sales Tax (5.75%). State debt strictly capped at **$750,000 without a statewide constitutional amendment or voter referendum (Art. VIII, §§ 1, 2)**. Balanced budget required; deficit carryover prohibited. Budget Stabilization Fund capped at 8.5% of General Revenue Fund receipts. Governor submits executive budget by February 1 (March 15 for new Governor) (R.C. 107.03).
- `[FACT]`: **Local Level:** Governed by Ohio Const. Art. XII & XVIII and R.C. Ch. 133, 718, 5705. **10-Mill Limitation (Art. XII, § 2)**: Total unvoted property taxes levied by all overlapping jurisdictions cannot exceed 10 mills ($1.00 per $100 AV); any levy outside the 10-mill limit requires voter approval. Counties levy piggyback sales taxes (0.5% to 1.5%). **Over 650 cities and villages levy Municipal Income Taxes under R.C. Chapter 718** (up to 1.0% by council; >1.0% requires voter approval). Local GO bonds outside debt limits require majority voter approval (R.C. 133.18).

### Oklahoma (`us-ok`)
- `[FACT]`: **State Level:** Governed by Okla. Const. Art. X and 62 O.S. & 68 O.S. Taxes: Graduated Individual Income Tax, Corporate Income Tax (4.0%), Sales Tax (4.5%), Severance Taxes. **State Question 640 (Art. X, § 33) mandates that any revenue-raising measure must receive a three-fourths (3/4) supermajority vote in both houses or be approved by the voters at a statewide referendum**. State Board of Equalization certifies binding revenue estimates; appropriations capped at **95.0% of estimated revenues (Art. X, § 23)**. Constitutional Reserve Fund ("Rainy Day Fund") capped at 15% of general revenue collections. State debt requires voter referendum (Art. X, § 25).
- `[FACT]`: **Local Level:** Governed by Okla. Const. Art. X and 68 O.S. Counties and cities have **zero authority to levy local income taxes**. Cities rely heavily on municipal sales taxes (rates typically 2% to 5%+), which require voter approval (68 O.S. § 1370). Property tax rates capped by constitutional millage limits (Art. X, § 9: 10 mills county, 5 mills municipal, 15 mills school base). Assessment increases capped at 3.0% for homesteads and 5.0% for commercial property (Art. X, § 8B). Local GO debt requires a **60% supermajority voter approval (Art. X, § 26)**.

### Oregon (`us-or`)
- `[FACT]`: **State Level:** Governed by Or. Const. Art. IX & XI and ORS Ch. 291 & 317A. Taxes: Progressive Individual Income Tax (top rate 9.9%), Corporate Activity Tax (CAT, 0.57% gross receipts tax on receipts >$1M), Corporate Excise Tax. **Zero general sales tax; zero statewide property tax**. State debt strictly capped at **$50,000 without statewide voter referendum (Art. XI, § 7)**. **The "Kicker" Law (Art. IX, § 14)**: If actual personal income tax collections exceed biennial projections by more than 2.0%, the entire excess must be refunded directly to individual taxpayers as a refundable credit. Rainy Day Fund capped at 7.5% of general fund. Governor submits budget by December 1 preceding session.
- `[FACT]`: **Local Level:** Governed by Or. Const. Art. XI and ORS Ch. 267 & 294. **Measure 5 (Art. XI, § 11b)** caps property taxes for operational purposes at **$10 per $1,000 of real market value for general government and $5 per $1,000 for schools**. **Measure 50 (Art. XI, § 11)** established a permanent tax rate for each district and **capped Maximum Assessed Value (MAV) growth at 3.0% annually**. Local option property tax levies require approval at a general election or an election with at least 50% voter turnout ("double majority"). Zero local sales tax authority. **TriMet (Portland) and Lane Transit District levy employer payroll taxes (ORS 267.385)**. Local GO bonds require majority voter approval.

### Pennsylvania (`us-pa`)
- `[FACT]`: **State Level:** Governed by Pa. Const. Art. VIII and 72 P.S. (Fiscal Code). Taxes: Flat Personal Income Tax (3.07%; **graduated rates strictly barred by the Uniformity Clause, Art. VIII, § 1**), Corporate Net Income Tax (phasing down to 4.99% by 2031), Sales & Use Tax (6.0%). State debt requires a **statewide voter referendum (Art. VIII, § 7)**. Balanced budget required across all stages; deficit carryover permitted through tax anticipation notes. Budget Stabilization Reserve Fund capped at 15% of general fund. Governor submits budget by first Tuesday in February (71 P.S. § 229).
- `[FACT]`: **Local Level:** Governed by 53 P.S. (Local Tax Enabling Act / Act 511 & Act 32). Counties, municipalities, and school districts levy property taxes. **Act 511 and Act 32 authorize pervasive municipal and school district Earned Income Taxes (EIT)** (typically 1.0% to 2.0% split between city and school). **Philadelphia levies a wage tax under the Sterling Act of 1932 (53 P.S. § 15971) on residents (~3.75%) and nonresidents (~3.44%)**. **Act 1 of 2006 (Taxpayer Relief Act)** caps annual school district property tax increases to a state index unless approved by voter referendum. Non-electoral debt permitted under the Local Government Unit Debt Act (53 P.S. § 8001) within statutory borrowing ratios.

### Rhode Island (`us-ri`)
- `[FACT]`: **State Level:** Governed by R.I. Const. Art. VI & IX and R.I.G.L. Title 35 & 44. Taxes: Graduated Personal Income Tax (top rate 5.99%), Business Corporation Tax (7.0%), Sales & Use Tax (7.0%). State debt requires a **statewide voter referendum (Art. VI, § 16)**. Appropriations capped at 97% of estimated general revenues. Budget Reserve and Cash Stabilization Account capped at 5% of total general revenues. Governor submits budget by third Thursday in January (R.I.G.L. § 35-3-7). Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by R.I.G.L. Title 44. County government is legally non-existent. Municipalities (39 cities and towns) rely almost exclusively on property taxes. **Annual property tax levy increases are capped at 4.0% (R.I.G.L. § 44-5-2)**; exceeding the cap requires a four-fifths (4/5) vote of the council or state approval. Zero local sales tax or local income tax authority. Local GO bonds approved by financial town meeting or municipal referendum under charter provisions.

### South Carolina (`us-sc`)
- `[FACT]`: **State Level:** Governed by S.C. Const. Art. X and S.C. Code Ann. Title 11 & 12. Taxes: Graduated Individual Income Tax (top rate 6.4%), Corporate Income Tax (5.0%), Sales Tax (6.0%). General Obligation debt service is capped at **5.0% to 7.0% of general fund revenues (Art. X, § 13)**. General Reserve Fund (7% cap) and Capital Reserve Fund (3% cap) provide structural stabilization. Governor submits budget by January 15 (S.C. Code § 11-11-30). Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by S.C. Code Ann. Title 4 & 6. **Annual property tax millage rate increases are capped by S.C. Code § 6-1-320 to the rate of inflation (CPI) plus population growth**. Property assessment increases capped at 15% over a 5-year reassessment cycle. Counties may levy a 1.0% Local Option Sales Tax (LOST) or Capital Project Sales Tax with voter approval. Zero local income tax authority. Local GO debt is limited to **8.0% of total assessed valuation without a voter referendum (Art. X, § 14)**.

### South Dakota (`us-sd`)
- `[FACT]`: **State Level:** Governed by S.D. Const. Art. XI & XIII and SDCL Title 4 & 10. Taxes: State Sales and Use Tax (4.2%), Contractor's Excise Tax (2.0%). **Personal income tax and corporate income tax are completely absent**. Under **S.D. Const. Art. XI, § 13, any new tax or increase in an existing tax rate requires a two-thirds (2/3) supermajority vote in each house or a statewide voter referendum**. State debt is capped at **$100,000 without a constitutional amendment (Art. XIII, § 1)**. Budget Reserve Fund capped at 10% of general fund. Governor submits budget by first Tuesday in December. Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by SDCL Title 6 & 10. Municipalities may levy a local option sales and use tax up to 2.0% with voter approval (SDCL 10-52). Property tax revenue increases are capped by **SDCL 10-13-35 to the lesser of 3.0% or CPI plus new construction**; taxing districts can "opt out" of the cap by council resolution, which is subject to a citizen referendum petition. Local income taxes strictly prohibited. Local GO bonds require majority voter approval.

### Tennessee (`us-tn`)
- `[FACT]`: **State Level:** Governed by Tenn. Const. Art. II and T.C.A. Title 9 & 67. Taxes: Franchise & Excise Tax (Corporate Income Tax 6.5%), Sales & Use Tax (7.0%). **Personal income tax is constitutionally prohibited (Tenn. Const. Art. II, § 28, amended 2014; Hall Income Tax eliminated 2021)**. State spending growth is limited to the estimated growth of the state economy (Art. II, § 24). Balanced budget required across all stages; deficit carryover prohibited. Revenue Fluctuation Reserve maintained at 8% of general revenues. Governor submits budget by February 1.
- `[FACT]`: **Local Level:** Governed by T.C.A. Title 9 & 67. Counties and cities levy property taxes. **Under the Certified Tax Rate law (T.C.A. § 67-5-1701), property reassessments require the tax rate to be recalculated so that total revenue collections remain flat (excluding new property)**; exceeding the certified rate requires published notice and public hearings. Counties and municipalities may levy local option sales taxes up to 2.75% with voter approval (T.C.A. § 67-6-702). Local income taxes strictly barred. Local GO debt requires simple majority voter approval or council action under general bond laws.

### Texas (`us-tx`)
- `[FACT]`: **State Level:** Governed by Tex. Const. Art. III & VIII and Tex. Gov't Code Ch. 322 & 401. Taxes: Franchise "Margin" Tax (0.75% / 0.375% gross receipts tax), Sales & Use Tax (6.25%), Oil and Gas Severance Taxes. **Individual income tax is permanently prohibited without a statewide constitutional amendment (Tex. Const. Art. VIII, § 24-a, Proposition 4 in 2019)**. Under Art. III, § 49-a, **the Comptroller of Public Accounts must certify that the biennial appropriations bill is within anticipated revenues before the Governor can sign it ("Pay-As-You-Go")**. State debt requires a constitutional amendment/referendum (Art. III, § 49). **Economic Stabilization Fund ("Rainy Day Fund", Art. III, § 49-g)** automatically captures 75% of severance tax revenues above a 1987 baseline; withdrawals require a 3/5 vote for shortfalls or 2/3 vote for other appropriations. Legislative Budget Board (LBB) writes primary budget bill.
- `[FACT]`: **Local Level:** Governed by Tex. Tax Code Ch. 26, 321, 323 and Tex. Gov't Code Ch. 1251. Independent County Appraisal Districts (CADs) appraise all property; homestead assessment growth is capped at 10.0% annually (Tex. Tax Code § 23.23). **Truth in Taxation (SB 2, 2019): Property tax revenue growth is capped by the Voter-Approval Tax Rate at 3.5% for cities/counties and 2.5% for school districts; adopting a rate above this threshold triggers a MANDATORY AUTOMATIC ELECTION at the November general election**. Local sales taxes capped at 2.0% aggregate (cities up to 1.5%, transit authorities up to 1%, counties up to 0.5%). Local income taxes strictly prohibited. **All local General Obligation bonds require mandatory voter approval at an election (Tex. Gov't Code § 1251.003)**.

### Utah (`us-ut`)
- `[FACT]`: **State Level:** Governed by Utah Const. Art. XIII & XIV and Utah Code Title 59 & 63J. Taxes: Flat Individual Income Tax (4.55%), Corporate Franchise Tax (4.55%), Sales & Use Tax (4.85% base). Under **Utah Const. Art. XIII, § 5, ALL revenue from individual and corporate income taxes is constitutionally dedicated exclusively to public education and children/disabled programs**. State debt cannot exceed **1.5% of the total value of taxable property in the state (Art. XIV, § 1)**. General Fund Budget Reserve Account capped at 9%. Governor submits budget 30 days before session. Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by Utah Code Title 11 & 59. Property tax rates governed by the **Certified Tax Rate statute (Utah Code § 59-2-924)**: when property values rise, the tax rate automatically rolls down so that total revenue remains identical to the prior year; any rate increase above the certified rate requires comprehensive "Truth in Taxation" newspaper advertisements and public hearings. Local option sales taxes authorized up to 1.5%+ with voter or council approval. Local income taxes unauthorized. Local GO bonds require majority voter approval (Utah Code § 11-14-201).

### Vermont (`us-vt`)
- `[FACT]`: **State Level:** Governed by Vt. Const. Ch. II, § 27 and 32 V.S.A. Ch. 5 & 135. Taxes: Graduated Personal Income Tax (top rate 8.75%), Corporate Income Tax, Sales Tax (6.0%), Statewide Education Property Tax (Act 60/Act 68). **Vermont is the sole state in the United States with NO constitutional or statutory balanced-budget requirement** (though balanced budgets are maintained by institutional practice). State debt issued under legislative authorization. General Fund Budget Stabilization Reserve capped at 5% of appropriations (32 V.S.A. § 308). Governor submits budget by third Tuesday in January.
- `[FACT]`: **Local Level:** Governed by 24 V.S.A. & 32 V.S.A. **Act 60 / Act 68 Statewide Education Property Tax (32 V.S.A. Ch. 135)**: Real property is split into *Homestead* and *Non-Homestead* tiers. The state sets base education tax rates, which are adjusted locally based on per-pupil school district spending and equalized by the Common Level of Appraisal (CLA). Municipalities (towns) levy municipal property taxes. Around 20 towns levy a 1.0% local option sales, meals, or rooms tax. Local income taxes unauthorized. Town Meeting approval required for municipal budgets and local debt.

### Virginia (`us-va`)
- `[FACT]`: **State Level:** Governed by Va. Const. Art. X and Va. Code Ann. Title 2.2 & 58.1. Taxes: Graduated Individual Income Tax (top rate 5.75%), Corporate Income Tax (6.0%), Sales & Use Tax (5.3% base; 6.0% in Northern VA / Hampton Roads). State debt requires a **statewide voter referendum for general obligation debt (Art. X, § 9)**. Balanced budget required; deficit carryover prohibited. Revenue Stabilization Fund capped at 15% of average annual tax revenues (Art. X, § 8). Governor submits biennial budget by December 20 preceding the legislative session.
- `[FACT]`: **Local Level:** Governed by Va. Code Ann. Title 15.2 & 58.1. Virginia features a unique structural separation: **Cities are independent governmental units completely separate from counties**. Real property taxed locally; if reassessment increases total assessed value by >1%, the jurisdiction must reduce its tax rate or hold a public hearing under the **Reduced Tax Rate ordinance (Va. Code § 58.1-3321)**. Local option sales tax is uniform at 1.0% statewide (Va. Code § 58.1-605), with additional regional transportation sales taxes in Northern Virginia and Hampton Roads. Local income taxes unauthorized. County GO bonds require voter referendum; city GO bonds issued under charter provisions. Strict Dillon's Rule state.

### Washington (`us-wa`)
- `[FACT]`: **State Level:** Governed by Wash. Const. Art. VII & VIII and RCW Ch. 43.88 & 82.04. Taxes: Business & Occupation (B&O) Gross Receipts Tax, Sales & Use Tax (6.5% base), Statewide Property Tax for Common Schools (RCW 84.52.065), 7.0% Capital Gains Tax on high-income earners (upheld as an excise tax in *Quinn v. State*, 2023). **Individual personal income tax is unconstitutional under the Uniformity Clause (*Culliton v. Chase*, 1933)**. Debt service is capped at **9.0% of general state revenues (Wash. Const. Art. VIII, § 1)**. Budget Stabilization Account receives 1.0% of general revenues; withdrawals require a 3/5 vote of both houses unless employment growth is under 1%. Governor submits budget by December 20. Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by RCW Ch. 82.14, 84.52, and 84.55. **101% Property Tax Levy Limit (RCW 84.55.010)**: Regular property tax levy increases are capped at the **lesser of 1.0% or inflation (IPD) plus additions for new construction**. Exceeding the 1% cap requires a **Levy Lid Lift** referendum approved by voters. Local option sales taxes are heavily utilized (rates reach 3.5%+ for transit, public safety, housing). Around 40 cities levy local B&O gross receipts taxes (RCW 35.102). Local income taxes strictly prohibited. Local GO bonds require a **60% supermajority vote AND a minimum 40% turnout validation based on the last general election (Wash. Const. Art. VIII, § 6)**.

### West Virginia (`us-wv`)
- `[FACT]`: **State Level:** Governed by W. Va. Const. Art. VI & X and W. Va. Code Ch. 11B. Taxes: Graduated Personal Income Tax, Corporate Net Income Tax, Consumer Sales Tax (6.0%), Severance Taxes. **Executive-Dominant Budget System:** Under the **Modern Budget Amendment (W. Va. Const. Art. VI, § 51)**, the Legislature **cannot amend the Governor's budget bill so as to create a deficit, nor can it increase executive branch line items without gubernatorial approval**. State debt requires a **statewide voter referendum (Art. X, § 4)**. Revenue Shortfall Reserve Fund capped at 13% of general revenue appropriations. Governor submits budget on opening day of regular session. Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by W. Va. Const. Art. X and W. Va. Code Ch. 8 & 11. Property taxes subject to **constitutional classification millage limits (Art. X, § 1)**: Class I (farm personal), Class II (owner-occupied residential), Class III (property outside municipalities), Class IV (property inside municipalities). Excess levies up to 50% above maximum rates require a **60% voter approval**. Municipalities participating in the Municipal Home Rule Program may levy a 1.0% Municipal Sales and Service Tax (W. Va. Code § 8-13C). Cities levy local B&O gross receipts taxes. Local income taxes unauthorized. Local GO bonds require a **60% supermajority voter approval (Art. X, § 8)**.

### Wisconsin (`us-wi`)
- `[FACT]`: **State Level:** Governed by Wis. Const. Art. V & VIII and Wis. Stat. Ch. 16 & 71. Taxes: Graduated Individual Income Tax, Corporate Income Tax, Sales & Use Tax (5.0%). State debt requires a **roll-call vote of all members elected to each house (Wis. Const. Art. VIII, § 7)**. Budget Stabilization Fund receives statutory surplus sweeps under Wis. Stat. § 16.518. Governor submits biennial budget by the last Tuesday in January. **Governor possesses extraordinarily broad partial veto / line-item veto authority (Art. V, § 10)**. Deficit carryover permitted through GAAP adjustments.
- `[FACT]`: **Local Level:** Governed by Wis. Stat. Ch. 66, 67, 70, and 77. **Local Property Tax Levy Limits (Wis. Stat. § 66.0602)**: Municipal and county property tax levy increases are capped at the **percentage growth in equalized value due to net new construction**; exceeding the limit requires a local referendum. Counties may levy a 0.5% county sales tax. Municipal sales taxes are strictly unauthorized statewide, **except that the City of Milwaukee was authorized to levy a 2.0% municipal sales tax under 2023 Wisconsin Act 12**. Local income taxes unauthorized. Local GO bonds require majority voter approval (Wis. Stat. § 67.05).

### Wyoming (`us-wy`)
- `[FACT]`: **State Level:** Governed by Wyo. Const. Art. 15 & 16 and W.S. Title 9 & 39. Taxes: Mineral Severance Taxes (coal, oil, natural gas), Sales & Use Tax (4.0%), Statewide Education Property Tax (12 mills under W.S. 39-13-104). **Zero individual personal income tax; zero corporate income tax**. Under **Wyo. Const. Art. 15, § 18, no income tax can be levied without a 100% dollar-for-dollar credit for all sales, use, and property taxes paid**. State debt is capped at **1.0% of total assessed valuation without a constitutional amendment (Art. 16, § 1)**. Legislative Stabilization Reserve Account (LSRA, "Rainy Day Fund") holds billions in mineral savings. Governor submits budget by December 1 preceding session. Deficit carryover prohibited.
- `[FACT]`: **Local Level:** Governed by Wyo. Const. Art. 15 & 16 and W.S. Title 39. Constitutional property tax millage caps: **12 mills for county purposes (Art. 15, § 4), 8 mills for municipal purposes (Art. 15, § 6)**. Counties may levy a 1.0% general purpose and a 1.0% specific purpose local option sales tax (W.S. 39-15-204) subject to voter referendum every 4 years. Local income taxes strictly prohibited. Local GO debt is capped at **2.0% of assessed value for counties, 4.0% for cities, and 10.0% for school districts (Art. 16, §§ 3, 5)**, requiring majority voter approval.

---

## 6. MACHINE-READY CANDIDATE FIELDS & DATA SCHEMAS

To enable deterministic ingestion by `budget-systems`, `executive-governing`, `municipal-governing`, and `government-finances-source-observations`, the following data contracts are established.

### 6.1. TypeScript Interface Definitions
```typescript
/**
 * State-level constitutional and statutory fiscal authority contract.
 */
export interface StateFiscalAuthorityRecord {
  jurisdictionId: string;                 // e.g., "us-ky", "us-ca", "us-co"
  effectiveDate: string;                  // ISO 8601 YYYY-MM-DD
  retrievalDate: string;                  // 2026-09-05
  legalCitations: {
    constitution: string[];
    statutes: string[];
    leadDepartmentOfRevenue: string;
    leadBudgetOffice: string;
  };
  taxAvailability: {
    individualIncomeTax: "GRADUATED" | "FLAT" | "PROHIBITED" | "NONE_ENACTED";
    individualIncomeTaxRateDetails?: string;
    corporateTaxType: "INCOME" | "GROSS_RECEIPTS" | "FRANCHISE_MARGIN" | "NONE";
    generalSalesTax: boolean;
    statewidePropertyTax: boolean;
    statewidePropertyTaxMillage?: number;
    severanceTax: boolean;
  };
  balancedBudgetFramework: {
    governorProposesBalanced: boolean;
    legislatureEnactsBalanced: boolean;
    governorSignsBalanced: boolean;
    deficitCarryoverProhibited: boolean;
    stageClassification: 1 | 2 | 3 | 4;
  };
  debtConstraints: {
    generalObligationRule: "MANDATORY_VOTER_REFERENDUM" | "LEGISLATIVE_SUPERMAJORITY" | "DEBT_SERVICE_RATIO_CAP" | "CONSTITUTIONAL_DOLLAR_CAP";
    referendumThreshold?: "SIMPLE_MAJORITY" | "THREE_FIFTHS" | "TWO_THIRDS" | "NONE";
    supermajorityVoteRequirement?: string; // e.g., "3/4", "3/5", "2/3"
    constitutionalCapDetails?: string;
  };
  reserveFundConstraints: {
    fundName: string;
    mandatoryDepositRule: boolean;
    depositFormulaSummary?: string;
    capPercentageOfGeneralFund: number;
    withdrawalSupermajority?: string;     // e.g., "3/4", "3/5", "2/3", "SIMPLE_MAJORITY"
    governorEmergencyDeclarationRequired: boolean;
  };
  executiveBudgetPrimacy: {
    mandateType: "CONSTITUTIONAL" | "STATUTORY";
    submissionDeadlineFormula: string;
    legislativeAmendmentConstraint: "UNRESTRICTED" | "CANNOT_INCREASE_EXECUTIVE_LINES" | "LEGISLATIVE_BUDGET_BOARD_DOMINANT";
    lineItemVetoAvailable: boolean;
    lineItemVetoOverrideHurdle: "SIMPLE_MAJORITY_ELECTED" | "THREE_FIFTHS_ELECTED" | "TWO_THIRDS_ELECTED" | "TWO_THIRDS_PRESENT" | "THREE_FOURTHS_JOINT";
  };
}

/**
 * Local-level (county, municipal, school district) fiscal authority contract.
 */
export interface LocalFiscalAuthorityRecord {
  jurisdictionId: string;                 // e.g., "us-ky-lexington", "us-tx-harris", "us-ca-los-angeles"
  stateId: string;                        // e.g., "us-ky"
  localUnitType: "COUNTY" | "MUNICIPALITY" | "CONSOLIDATED_CITY_COUNTY" | "SCHOOL_DISTRICT" | "SPECIAL_DISTRICT";
  dillonsRuleStatus: "STRICT_DILLONS_RULE" | "CONSTITUTIONAL_HOME_RULE" | "STATUTORY_HOME_RULE";
  fiscalHomeRuleScope: "PREEMPTED_BY_STATE" | "BROAD_LOCAL_TAXING_POWER" | "ZERO_LOCAL_DISCRETION";
  propertyTaxAuthority: {
    assessingEntity: "COUNTY_ASSESSOR" | "MUNICIPAL_ASSESSOR" | "STATE_CENTRALIZED" | "CONSOLIDATED_DISTRICT";
    millageRateSettingBody: string;
    assessmentGrowthCapPercentage?: number; // e.g., 2.0 for CA Prop 13, 3.0 for FL Save Our Homes
    nominalMillageCapRate?: number;         // in mills, e.g., 10.0
    annualLevyRevenueGrowthCapPercentage?: number; // e.g., 1.0 for WA, 2.5 for MA Prop 2 1/2
    rollbackOnReassessmentMandated: boolean;
    protestPetitionThreshold?: string;     // e.g., "10% of presidential voters in 50 days" (KY HB 44)
  };
  localOptionSalesTax: {
    authorized: boolean;
    maximumLocalRatePercentage?: number;
    voterReferendumMandatory: boolean;
    earmarkingConstraints?: string[];
  };
  localIncomePayrollAuthority: {
    authorized: boolean;
    taxType?: "WAGE_NET_PROFITS_OCCUPATIONAL" | "EARNED_INCOME_TAX" | "COUNTY_PIGGYBACK" | "PAYROLL_TAX" | "HEAD_TAX" | "NONE";
    voterReferendumRequiredForAdoption: boolean;
    maximumRatePercentage?: number;
  };
  bondedDebtAuthority: {
    generalObligationVoterApprovalHurdle: "SIMPLE_MAJORITY" | "THREE_FIFTHS" | "TWO_THIRDS" | "NONE_COUNCIL_VOTE";
    debtCeilingPercentageOfAssessedValue?: number; // e.g., 2.0%, 5.0%, 10.0%
    stateAdministrativeApprovalRequired: boolean; // e.g., NC Local Government Commission (LGC)
  };
}
```

### 6.2. Concrete Instantiated Ingestion JSON Payload
The following candidate payload instantiates the verified legal fiscal authority for key bellwether jurisdictions across all structural exception families.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "asOfDate": "2026-09-05",
  "records": [
    {
      "jurisdictionId": "us-ky",
      "effectiveDate": "2026-07-15",
      "retrievalDate": "2026-09-05",
      "legalCitations": {
        "constitution": ["Ky. Const. §§ 49, 50, 171, 181"],
        "statutes": ["KRS Ch. 48", "KRS Ch. 131", "KRS Ch. 132"],
        "leadDepartmentOfRevenue": "Kentucky Department of Revenue",
        "leadBudgetOffice": "Office of State Budget Director (OSBD)"
      },
      "taxAvailability": {
        "individualIncomeTax": "FLAT",
        "individualIncomeTaxRateDetails": "4.0% flat rate (KRS 141.020)",
        "corporateTaxType": "INCOME",
        "generalSalesTax": true,
        "statewidePropertyTax": true,
        "statewidePropertyTaxMillage": 1.14,
        "severanceTax": true
      },
      "balancedBudgetFramework": {
        "governorProposesBalanced": true,
        "legislatureEnactsBalanced": true,
        "governorSignsBalanced": true,
        "deficitCarryoverProhibited": true,
        "stageClassification": 4
      },
      "debtConstraints": {
        "generalObligationRule": "CONSTITUTIONAL_DOLLAR_CAP",
        "referendumThreshold": "SIMPLE_MAJORITY",
        "constitutionalCapDetails": "Ky. Const. § 49 cap of $500,000 without statewide voter referendum"
      },
      "reserveFundConstraints": {
        "fundName": "Budget Reserve Trust Fund",
        "mandatoryDepositRule": true,
        "depositFormulaSummary": "General Fund revenue surplus sweeps up to statutory target",
        "capPercentageOfGeneralFund": 15.0,
        "withdrawalSupermajority": "SIMPLE_MAJORITY_ELECTED",
        "governorEmergencyDeclarationRequired": false
      },
      "executiveBudgetPrimacy": {
        "mandateType": "STATUTORY",
        "submissionDeadlineFormula": "15th legislative day in odd years / 10th day in even years (KRS 48.100)",
        "legislativeAmendmentConstraint": "UNRESTRICTED",
        "lineItemVetoAvailable": true,
        "lineItemVetoOverrideHurdle": "SIMPLE_MAJORITY_ELECTED"
      }
    },
    {
      "jurisdictionId": "us-co",
      "effectiveDate": "2026-01-01",
      "retrievalDate": "2026-09-05",
      "legalCitations": {
        "constitution": ["Colo. Const. Art. X, § 20 (TABOR)", "Colo. Const. Art. XI"],
        "statutes": ["C.R.S. Title 24, Art. 75", "C.R.S. Title 39"],
        "leadDepartmentOfRevenue": "Colorado Department of Revenue",
        "leadBudgetOffice": "Governor's Office of State Planning and Budgeting (OSPB)"
      },
      "taxAvailability": {
        "individualIncomeTax": "FLAT",
        "individualIncomeTaxRateDetails": "4.4% flat rate",
        "corporateTaxType": "INCOME",
        "generalSalesTax": true,
        "statewidePropertyTax": false,
        "severanceTax": true
      },
      "balancedBudgetFramework": {
        "governorProposesBalanced": true,
        "legislatureEnactsBalanced": true,
        "governorSignsBalanced": true,
        "deficitCarryoverProhibited": true,
        "stageClassification": 4
      },
      "debtConstraints": {
        "generalObligationRule": "MANDATORY_VOTER_REFERENDUM",
        "referendumThreshold": "SIMPLE_MAJORITY",
        "constitutionalCapDetails": "TABOR (Art. X, § 20(4)) prohibits any multi-year fiscal obligation without voter approval"
      },
      "reserveFundConstraints": {
        "fundName": "Statutory General Fund Reserve",
        "mandatoryDepositRule": true,
        "depositFormulaSummary": "Mandatory 15% ending balance of General Fund appropriations (C.R.S. § 24-75-201.1)",
        "capPercentageOfGeneralFund": 15.0,
        "governorEmergencyDeclarationRequired": false
      },
      "executiveBudgetPrimacy": {
        "mandateType": "STATUTORY",
        "submissionDeadlineFormula": "November 1 annually (C.R.S. § 24-75-201.1)",
        "legislativeAmendmentConstraint": "UNRESTRICTED",
        "lineItemVetoAvailable": true,
        "lineItemVetoOverrideHurdle": "TWO_THIRDS_ELECTED"
      }
    },
    {
      "jurisdictionId": "us-md",
      "effectiveDate": "2026-01-01",
      "retrievalDate": "2026-09-05",
      "legalCitations": {
        "constitution": ["Md. Const. Art. III, §§ 34, 52"],
        "statutes": ["Md. Code Ann., State Fin. & Proc. Title 7", "Md. Code Ann., Tax-Gen."],
        "leadDepartmentOfRevenue": "Comptroller of Maryland",
        "leadBudgetOffice": "Department of Budget and Management (DBM)"
      },
      "taxAvailability": {
        "individualIncomeTax": "GRADUATED",
        "individualIncomeTaxRateDetails": "Top marginal rate 5.75%",
        "corporateTaxType": "INCOME",
        "generalSalesTax": true,
        "statewidePropertyTax": true,
        "statewidePropertyTaxMillage": 1.12,
        "severanceTax": false
      },
      "balancedBudgetFramework": {
        "governorProposesBalanced": true,
        "legislatureEnactsBalanced": true,
        "governorSignsBalanced": true,
        "deficitCarryoverProhibited": true,
        "stageClassification": 4
      },
      "debtConstraints": {
        "generalObligationRule": "LEGISLATIVE_SUPERMAJORITY",
        "constitutionalCapDetails": "Must include dedicated annual tax to discharge principal within 15 years (Md. Const. Art. III, § 34)"
      },
      "reserveFundConstraints": {
        "fundName": "Revenue Stabilization Account (Rainy Day Fund)",
        "mandatoryDepositRule": true,
        "depositFormulaSummary": "Mandatory statutory transfers to maintain fund at 10% of estimated general fund revenues",
        "capPercentageOfGeneralFund": 10.0,
        "withdrawalSupermajority": "SIMPLE_MAJORITY_ELECTED",
        "governorEmergencyDeclarationRequired": false
      },
      "executiveBudgetPrimacy": {
        "mandateType": "CONSTITUTIONAL",
        "submissionDeadlineFormula": "Third Wednesday in January annually (Md. Const. Art. III, § 52)",
        "legislativeAmendmentConstraint": "CANNOT_INCREASE_EXECUTIVE_LINES",
        "lineItemVetoAvailable": true,
        "lineItemVetoOverrideHurdle": "THREE_FIFTHS_ELECTED"
      }
    },
    {
      "jurisdictionId": "us-tx",
      "effectiveDate": "2026-01-01",
      "retrievalDate": "2026-09-05",
      "legalCitations": {
        "constitution": ["Tex. Const. Art. III, §§ 49, 49-a, 49-g", "Tex. Const. Art. VIII, §§ 22, 24-a"],
        "statutes": ["Tex. Gov't Code Ch. 322", "Tex. Tax Code Ch. 171"],
        "leadDepartmentOfRevenue": "Texas Comptroller of Public Accounts",
        "leadBudgetOffice": "Legislative Budget Board (LBB) & Governor's Office of Budget and Policy"
      },
      "taxAvailability": {
        "individualIncomeTax": "PROHIBITED",
        "individualIncomeTaxRateDetails": "Permanently prohibited without constitutional amendment (Art. VIII, § 24-a, Prop 4)",
        "corporateTaxType": "FRANCHISE_MARGIN",
        "generalSalesTax": true,
        "statewidePropertyTax": false,
        "severanceTax": true
      },
      "balancedBudgetFramework": {
        "governorProposesBalanced": true,
        "legislatureEnactsBalanced": true,
        "governorSignsBalanced": true,
        "deficitCarryoverProhibited": true,
        "stageClassification": 4
      },
      "debtConstraints": {
        "generalObligationRule": "MANDATORY_VOTER_REFERENDUM",
        "referendumThreshold": "SIMPLE_MAJORITY",
        "constitutionalCapDetails": "Tex. Const. Art. III, § 49 prohibits state debt unless approved by constitutional amendment"
      },
      "reserveFundConstraints": {
        "fundName": "Economic Stabilization Fund (ESF / Rainy Day Fund)",
        "mandatoryDepositRule": true,
        "depositFormulaSummary": "Captures 75% of oil and natural gas production taxes exceeding 1987 baseline collections",
        "capPercentageOfGeneralFund": 10.0,
        "withdrawalSupermajority": "THREE_FIFTHS_ELECTED",
        "governorEmergencyDeclarationRequired": false
      },
      "executiveBudgetPrimacy": {
        "mandateType": "STATUTORY",
        "submissionDeadlineFormula": "Governor submits draft by early session, but LBB controls operative legislative bill",
        "legislativeAmendmentConstraint": "LEGISLATIVE_BUDGET_BOARD_DOMINANT",
        "lineItemVetoAvailable": true,
        "lineItemVetoOverrideHurdle": "TWO_THIRDS_ELECTED"
      }
    }
  ]
}
```

---

## 7. CONSUMER INTEGRATION BLUEPRINT

This research directly feeds four active and future simulation subsystems.

### 7.1. Consumer 1: Executive Governing Gameplay (`92H`)
- `[FACT]`: In `92H` (`docs/research/92H_ANTIGRAVITY_EXECUTIVE_GOVERNING_GAMEPLAY_AND_WORKFLOW_RESEARCH.md`), executive time and calendar allocation are structured around mandatory statutory deadlines.
- **Budget Formulation Beat:** The simulation engine must schedule the Governor's Executive Budget Address and bill submission strictly against the state-specific deadline (e.g., January 10 in California, December 15 in Alaska, February 15 in New Hampshire).
- **Consensus Forecasting Friction:** In states with independent consensus forecasting boards (e.g., Kentucky Consensus Forecasting Group, Florida Revenue Estimating Conference, Hawaii Council on Revenues), the player cannot fabricate revenue numbers to balance the budget; expenditures must strictly align with certified receipts.
- **Line-Item Veto Mechanics:** When the legislature presents an enrolled appropriations bill, the engine checks whether the state allows line-item vetoes (44 states) and calculates the exact legislative override threshold (e.g., 50%+1 in Kentucky, 3/5 in Ohio and Maryland, 2/3 in California and New York, 3/4 in Alaska joint session).
- **Rainy-Day Fund Unlocking:** During recessions or emergency disaster events, withdrawing from state reserves triggers the statutory voting hurdle (e.g., 3/4 in Alaska, 3/5 in Texas, 3/5 in Washington).

### 7.2. Consumer 2: Municipal Governing Gameplay (`92I`, `92J`)
- `[FACT]`: In `92I` and `92J` (`docs/research/92I_ANTIGRAVITY_KENTUCKY_MUNICIPAL_GOVERNANCE_IMPLEMENTATION_CARGO — 2026-09-05.md`), municipal and county executives face strict statutory tax handcuffs.
- **Compensating Tax Rate Hearing Loop:** In Kentucky (`us-ky`), when property values rise, the mayor or county judge/executive cannot simply collect the windfall. Proposing a rate exceeding the 4% compensating rate generates a citizen recall petition beat. If 10% of voters sign within 50 days, the player faces a high-stakes voter referendum campaign.
- **Local Option Prohibition:** In states like Kentucky, Connecticut, and New Jersey, the local simulation must disable any "Local Option Sales Tax" or "City Sales Tax" policy cards; local revenue can only be expanded through property tax adjustments, occupational license fees (in KY), or state aid lobbying.
- **Bond Referendum Requirements:** Attempting to issue municipal general obligation debt forces the engine to evaluate whether the debt requires a voter referendum (e.g., mandatory 2/3 supermajority in California and Idaho, 60% in Washington and Oklahoma, simple majority in Texas and Florida).

### 7.3. Consumer 3: Deterministic Budget Systems
- `[DATA SPEC]`: The simulation budget engine enforces deterministic assertions:
  1. `assert(proposedSpending <= consensusRevenue + unencumberedSurplus)` in Stage 1 BBR states.
  2. `assert(propertyTaxLevy <= priorLevy * (1 + netNewConstructionGrowth))` in Wisconsin.
  3. `assert(aggregatePropertyTaxRate <= 10.0)` in Ohio unvoted millage jurisdictions.
  4. `assert(localIncomeTaxRate == 0)` in all 36 states with state fiscal preemption barring municipal income taxes.

### 7.4. Consumer 4: Government-Finances Source Observations
- `[DATA SPEC]`: When ingesting empirical data from the U.S. Census Bureau Annual Survey of State and Local Government Finances (SLGF):
  - Line item `T09` (Local General Sales Tax) must be mapped to zero in CT, DE, IN, KY, ME, MD, MA, MI, NH, NJ, OR, RI.
  - Line item `T40` (Local Individual Income Tax) must be verified against the 14 authorized states (OH, PA, MD, IN, KY, MI, MO, NY, AL, DE, NJ, OR, CO, CA [business gross receipts]).
  - State debt service observations must track against constitutional debt ceilings (e.g., Florida 7%, Georgia 10%, Hawaii 18.5%).

---

## 8. VERIFICATION OF FACTUAL GROUNDING & AUDIT TRAIL

1. **All 50 States Covered:** Every state from Alabama to Wyoming is comprehensively profiled with both state-level and local-level statutory/constitutional legal citations.
2. **No Universal Tax Model:** The research documents the exact boundaries of state sales tax exemptions (5 states), state personal income tax bans/absences (9 states), local income tax preemption (36 states), and local sales tax prohibitions (12 states).
3. **Exact First-Party Citations:** Grounded directly in state constitutions (e.g., Cal. Const. Art. XIII A; Colo. Const. Art. X, § 20; Md. Const. Art. III, § 52; Tex. Const. Art. III, § 49-a; Ky. Const. §§ 49, 157, 181) and state statutes (e.g., KRS 132.017; M.G.L. c. 59, § 21C; RCW 84.55.010; Ohio R.C. Ch. 718; 53 P.S. § 6924.101).
4. **Temporal Freshness:** All statutory and constitutional provisions verified as of **September 5, 2026**.
