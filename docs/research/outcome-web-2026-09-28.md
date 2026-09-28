# 05 THE OUTCOME WEB: how the game's areas affect each other, and how strongly (research, Sept 28, 2026)

Written by Claude CTO, Mon Sep 28, from 8:05 a.m. EDT. The build rules are in 04 SYSTEM SPECS, part 5; this doc is the evidence behind them.

Lamontae: "are these things linked together? ... graduation rates. Are those tied to both education and healthcare? ... we need to figure out what systems they affect and to what degree." And: "This is the bread and butter of the game ... not necessarily a percentage or whatever, but the relationship and the degree needs to be correct for the simulation to actually produce incredible things."

## How to read this

- Every link below was checked against published causal research: randomized trials, natural experiments, or court and eligibility rules that act like a lottery. None of it is raw correlation.
- STRENGTH says how hard a link pushes, compared with the other causes of the same outcome:
  - STRONG: one of the main levers on this outcome.
  - MODERATE: real, and it adds up over time or across many people.
  - WEAK: real but small.
  - ABOUT ZERO: people expect an effect, and the best evidence finds none. The game must NOT invent one.
  - CONTESTED: good studies disagree. The game uses a small size and flags it.
- The ANCHOR is the size a study measured. It calibrates the game's size and is never shown to players.
- SHAPE and TIMING say how the effect behaves: in a straight line, past a threshold, with diminishing returns, piling up year after year in childhood, as a sudden hit that fades, or only when something else is true.
- WHO is the group the effect falls on. Most effects are several times larger for low-income families.
- Rows marked "(to confirm)" are from my knowledge of the literature and weren't re-checked today. The owning lane confirms them before building.

## Ten rules the research forces on the engine

1. **Use causal sizes, never correlations.** Poor children graduate less for many reasons at once. Each link carries only its own causal slice. The slices, plus each person's own traits, must add back up to the real-world gaps. That is the calibration test.
2. **Childhood effects pile up by years of exposure.** Each year in a better neighborhood closes about 4% of the gap in adult outcomes. School spending counts every year of all 12 grades. Medicaid years count before adulthood. So each child carries a running childhood record: years covered, years in poverty, years of school funding, moves, lead, pollution. Adult outcomes read that record.
3. **Some hits are sudden and fade; some last.**
   - A homicide on a child's block cuts reading scores by about half a standard deviation, but only for about a week.
   - A police killing nearby has a lasting effect on grades and graduation.
   - Losing a job raises the worker's death risk 50–100% the next year, and still 10–15% twenty years later.
4. **Many effects have thresholds or diminishing returns.**
   - Homelessness rises once rent passes 22% of income and rises faster past 32%.
   - Minimum wages showed no job loss in U.S. studies up to high levels, but the risk grows the higher the floor sits against local wages.
   - At today's incarceration levels, one more prisoner barely changes crime.
5. **Some links only work when something else is true.**
   - Air conditioning removes about 75% of heat's toll on deaths, and it largely offsets heat's harm to learning.
   - Local radio or a local paper doubles how hard voters punish exposed corruption.
   - Public insurance shields children's coverage when parents lose jobs.
   - Pre-K works when it is good (Boston) and can backfire when it is not (Tennessee).
6. **A person and a place can move in opposite directions.**
   - A worker who loses a job gets sicker, but a recession no longer raises the overall death rate.
   - Rent control helps sitting tenants stay put, and it raises rents citywide by shrinking supply.
   - The engine must run both: odds for people in the player's town, rates for places.
7. **The groups hit differ by link.**
   - The homicide effect showed for Black children, not Hispanic ones.
   - The coverage gain from marriage equality showed for men in same-sex couples.
   - Minimum-wage job effects fall on teens and the least skilled.
   - Each link names its group.
8. **Zero is sometimes the right answer, and it matters as much as a big effect.** See the "ABOUT ZERO" list below. A game that makes voter ID crush turnout, or home computers raise test scores, is wrong.
9. **Laws have side effects the author didn't intend, and those are real links too.**
   - Rent control shrinks supply.
   - Part of a minimum-wage raise is lost to benefit cuts; income gains end up about two thirds as large.
   - Abortion bans raise births and infant deaths.
   - Immigration enforcement cuts school enrollment and even U.S.-born employment.
   - More police means more low-level arrests.
10. **Voters see some effects and not others.**
    - They reward disaster relief spending but not preparedness, though $1 of preparedness saves about $15 of damage.
    - Economic conditions drive approval.
    - Local news makes voters see more.
    - This gap between what helps and what gets rewarded is the game's core political tension.

## Worked example: graduation

**What moves a student's odds of graduating** (each is its own link; they add up):

| Cause | Strength | What the research found (anchor) | Shape, timing, who |
|---|---|---|---|
| School money per student | STRONG | 10% more per student in every year of school → 0.31 more years of schooling, 7% higher adult wages, 3.2 points less adult poverty (Jackson, Johnson and Persico 2016) | Piles up across all 12 years; much larger for low-income children |
| Child health coverage | MODERATE | The 1980s–90s Medicaid and CHIP expansions cut high-school non-completion by about 10% and raised college completion about 6% (Cohodes et al. 2016) | Years of eligibility during childhood (mostly after infancy), low-income children |
| Teacher quality | MODERATE to STRONG | A much better teacher in a single grade (one standard deviation) raises college going and earnings at 28 by about 1.3% (Chetty, Friedman and Rockoff 2014; the 1.3% is to confirm) | Per year; teacher vacancies and turnover feed this |
| Class size (grades K to 3) | MODERATE | Small classes: +0.22 standard deviations after 4 years; +2 points college enrollment (Tennessee STAR) | Early grades; fades partly later |
| Pre-K | MODERATE if good, NEGATIVE if poor | Boston: graduation +6 points, college +8 points, no test-score gain. Tennessee: lower scores and more discipline by 6th grade | Depends on program quality; the game tracks quality, not just enrollment |
| Family income | MODERATE | $1,000 more (EITC) → +0.06 standard deviations in scores (Dahl and Lochner 2012) | Short run; larger for disadvantaged kids; the EITC, CTC and minimum wage all feed here |
| Neighborhood | STRONG over time | Each childhood year in a better area closes about 4% of the adult gap; moving before 13 → +31% adult earnings (Chetty, Hendren and Katz) | Years of exposure; strongest young |
| Violence nearby | Sudden (homicide) and lasting (police killing) | A homicide on the block → about −0.5 SD for a week (Sharkey 2010). A police killing nearby → 9th graders 3.5% less likely to graduate (Ang 2021) | Proximity and timing matter |
| Moves and evictions | WEAK per move, frequent | Each school switch → about −0.03 SD in math, and it also costs the classmates left behind (Hanushek, Kain and Rivkin 2004). An eviction → more homelessness and hospital visits and lower earnings for 2 years (Collinson et al. 2024) | Mid-year moves; renters |
| Lead | MODERATE | 1 µg/dL less blood lead → about 1 point fewer children far below proficient in reading (base 12%) (Aizer et al. 2018) | Early childhood; old housing, water lines |
| Heat in school | WEAK to MODERATE, switched off by AC | A school year 1°F hotter → 1% less learning without AC (Park et al. 2020) | School buildings with no AC; climate |
| Air pollution | MODERATE | Carbon monoxide raises absences even below federal limits (Currie et al. 2009) | Near highways and plants |
| Immigration status and enforcement | STRONG for those affected | DACA → +15% high-school graduation for undocumented youth. Local ICE partnerships → −10% Hispanic enrollment within 2 years | Immigrant families |
| Home computers and internet | ABOUT ZERO | A randomized free-computer program changed no school outcome; home access slightly lowered scores in North Carolina | The game must not reward this with scores. Internet affects jobs instead (below) |

**What graduating changes later:**

| Effect | Strength | Anchor | Notes |
|---|---|---|---|
| Earnings and employment | STRONG | The best-established result in economics: each year of school adds several percent to wages (to confirm the size) | Lifelong |
| Arrests and prison | MODERATE to STRONG | Graduating cuts the chance of prison by about 0.8 points (white men) and 3.4 points (Black men); 10 points more graduation → about 7% fewer arrests (Lochner and Moretti 2004) | Men; murder, assault, car theft most |
| Voting | CONTESTED | Experiments that raised graduation found big turnout gains (Sondheimer and Green 2010); draft-era college found none (Berinsky and Lenz 2011) | Use moderate, flagged |
| Health and lifespan | CONTESTED, WEAK | The famous large estimate didn't hold up on later checks | Small and slow |

## The links by area

### Health and coverage (lane F owns the links into these)

| Cause → effect | Strength | Anchor | Shape, timing, who |
|---|---|---|---|
| Unemployment → coverage lost | STRONG for working-age men | +1 point unemployment → −1.67 points in men's coverage; women and children unaffected because public insurance catches them (Cawley, Moriya and Simon 2015) | Moderated by Medicaid rules; immediate |
| Coverage → catastrophic medical bills | STRONG | Medicaid nearly eliminated out-of-pocket bills over 30% of income (Oregon experiment) | Immediate |
| Coverage → medical debt and credit | STRONG | The ACA expansion cut medical bills sent to collections by $3.4 billion in 2 years and improved credit scores and loan terms (Brevoort, Grodzicki and Hackmann) | Feeds loans and defaults (#861) |
| Coverage → depression | MODERATE | −9 points screening positive (Oregon) | Within 2 years |
| Coverage → blood pressure and cholesterol in 2 years | ABOUT ZERO | Oregon found no significant change | Physical health moves slowly |
| Coverage → deaths (ages 55 to 64) | MODERATE | Medicaid expansion → −9.4% annual mortality, growing to −11.9% by year 3 (Miller, Johnson and Wherry 2021) | Low-income near-elderly; builds over years |
| Work requirements → coverage | STRONG, down | Arkansas: over 18,000 lost coverage, nearly 1 in 4 of those subject to the rule | Paperwork loss, mostly among people who qualified |
| Work requirements → employment | ABOUT ZERO | No change; 97% already met the rule | The game must not reward it with jobs |
| Losing your own job → your death risk | STRONG, person level | +50–100% the next year, still +10–15% twenty years on (Sullivan and von Wachter 2009) | Displaced long-tenure workers |
| Recession → overall death rate | ABOUT ZERO now | Used to fall in recessions; since the 2000s it's unrelated, except that heart and traffic deaths still fall and cancer and injury deaths rise (Ruhm) | Place level |
| Long work weeks → heart disease and stroke | MODERATE | 55+ hours a week → +35% stroke risk, +17% heart-disease death risk, compared with 35–40 hours (WHO and ILO 2021) | Years of exposure; work-week laws feed this |
| Particle pollution → infant deaths | STRONG | 1% less pollution → 0.5% fewer infant deaths (Chay and Greenstone, Clean Air Act) | Fetal and first-month exposure |
| Traffic pollution → premature births | STRONG | E-ZPass cut congestion: −10.8% premature, −11.8% low birth weight within 2 km (Currie and Walker 2011) | Near highways |
| Birth-year pollution → adult earnings | MODERATE | Cleaner air at birth → higher earnings and work at age 30 (Isen, Rossin-Slater and Walker 2017) | Childhood record |
| Drinking water violations → infant health | MODERATE | Violations lowered birth weight and shortened pregnancies, mostly for less-educated mothers (Currie et al. 2013) | Water systems |
| Heat → deaths | MODERATE, switched off by AC | AC removed about 75% of hot days' death toll since 1960 (Barreca et al. 2016) | Older people, no AC, energy shutoffs |
| Family income (EITC) → low birth weight | WEAK, CONTESTED | $1,000 → −2 to 3% low birth weight (Hoynes, Miller and Simon 2015); a 2020 re-analysis questioned it | Use small |
| Childhood food stamps → adult health and self-sufficiency | MODERATE | Less obesity, high blood pressure and diabetes as adults; more self-sufficiency for women (Hoynes, Schanzenbach and Almond 2016) | Childhood record |

### Safety net and poverty (F)

| Cause → effect | Strength | Anchor | Shape, timing, who |
|---|---|---|---|
| Child benefits → child poverty | STRONG | The 2021 expanded child tax credit took child poverty to a record low of 5.2%; it rose to 12.4% the year after it expired | Immediate, program-sized |
| SNAP → food insecurity | STRONG | Receiving it cuts food insecurity by about 30% and very low food security by about 20% (Ratcliffe, McKernan and Zhang 2011) | Take-up and paperwork matter |
| Minimum wage → poverty | MODERATE | A 10% higher minimum → 2 to 4.6% fewer people in poverty in the long run (Dube 2019). Income gains shrink to about 2/3 after benefit losses | 3+ years; families at the bottom |
| Minimum wage → jobs | CONTESTED, WEAK | No job loss in low-wage jobs over 5 years across 138 state increases (Cengiz et al. 2019). A survey of 70 studies found elasticities of −0.1 to −0.2 for teens and the least skilled (Neumark and Shirley 2022) | Grows as the floor rises against local wages; teens |
| Unemployment → poverty | STRONG | (to confirm the size) | Immediate |
| Parent incarcerated → household income | STRONG | Loses an earner; pretrial detention alone cuts formal employment (Dobbie, Goldin and Yang 2018) | See justice |

### Housing (M)

| Cause → effect | Strength | Anchor | Shape, timing, who |
|---|---|---|---|
| New apartments → nearby rents | MODERATE | Large new buildings cut rents nearby by 5 to 7% (Asquith, Mast and Reed 2023) | Permits take 1 to 3 years to become homes |
| Rent control → rental supply and citywide rent | MODERATE | Landlords under control cut rental supply 15%. Covered tenants were far more likely to stay put (renter mobility −20%), and citywide rents rose (Diamond, McQuade and Qian 2019) | Winners and losers at the same time |
| Rent burden → homelessness | STRONG past a threshold | Rises once rent passes 22% of income, faster past 32% (Zillow and UNH). Rents and vacancy explain regional homelessness better than drugs, mental illness or poverty (Colburn and Aldern) | Thresholds |
| Eviction → homelessness, hospital visits, earnings, credit | MODERATE to STRONG | All worse in the first 2 years (Collinson et al. 2024, random judge assignment) | Driven by women and Black tenants |
| Disaster → people leaving, home values | MODERATE | Severe disasters → +1.5 points out-migration; home prices and rents −2.5 to 5% (Boustan et al. 2020) | Lasts years |
| Home prices → births | MODERATE, opposite by group | +$10,000 in home prices → +5% births for owners, −2.4% for renters (Dettling and Kearney 2014) | Owners vs renters |
| Property tax → rent | WEAK to MODERATE (to confirm) | Split between owners and renters | Provisional |

### Infrastructure and transport (M)

| Cause → effect | Strength | Anchor | Shape, timing, who |
|---|---|---|---|
| Transit service → neighborhood unemployment | MODERATE | Losing a subway line after Hurricane Sandy raised unemployment where people depended on it (Tyndall 2017) | People without cars |
| Broadband → employment | MODERATE | Gaining broadband → +1.8 points county employment rate, more in rural areas (Atasoy 2013); married women's work +4.1 points (Dettling) | Rural areas; parents |
| Broadband → children's test scores | ABOUT ZERO | See graduation | Don't build |
| Speed limits → traffic deaths | STRONG | 55 → 65 mph on rural interstates → +35% fatality rate (Ashenfelter and Greenstone 2004) | Immediate |
| Road condition → vehicle costs and crashes | WEAK to MODERATE (to confirm) | | Provisional |
| Water system condition → violations → infant health | MODERATE | Chain through the water rows above | Lead lines feed lead → learning |

### Public safety and justice (O)

| Cause → effect | Strength | Anchor | Shape, timing, who |
|---|---|---|---|
| Unemployment → property crime | MODERATE | Falling unemployment explains nearly 40% of the 1990s drop in property crime (Raphael and Winter-Ebmer 2001). Violent crime responds much less | Keeps crime's current rule of 1–3% per point, with violent crime at the low end |
| Police officers → crime | MODERATE | Elasticity −0.34 for violent crime and −0.17 for property crime (Chalfin and McCrary): 10% more officers → about 3.4% less violent crime | Diminishing |
| Police officers → homicides by race, and low-level arrests | MODERATE | Each officer prevents about 0.1 homicides a year, twice as much per capita for Black victims; larger forces also make more low-level arrests, falling heavily on Black residents (Chalfin et al. 2022) | Both effects at once |
| Summer jobs → youth violence | STRONG for participants | Chicago: −43% violent-crime arrests over 16 months (Heller 2014, randomized) | Mostly after the program ends |
| Prison growth at today's levels → crime | ABOUT ZERO net | Crime prevented while locked up is offset by more crime after release (Roodman review) | Sentencing laws mainly move prison counts and costs |
| Releasing lower-level offenders → property crime | WEAK | California Prop 47: larceny +9%, no violent crime change. Realignment: car theft up. Some checks don't hold up | Small, property only |
| Pretrial detention → conviction and employment | STRONG | More guilty pleas and convictions; lower formal work; no effect on future crime (Dobbie, Goldin and Yang 2018) | Bail laws feed this |
| Gun laws → deaths | By law, from RAND's ratings | Child-access-prevention laws reduce youth firearm suicide, injuries and homicide. Stand-your-ground laws increase firearm homicides. Raising the minimum age cuts youth firearm suicide. Most other laws are inconclusive (RAND, 5th ed. 2026) | Only the rated links get sizes; the rest stay small |
| Crime → people leaving the city | STRONG | Each added reported crime → about 1 fewer city resident, mostly families with children and higher incomes moving to the suburbs (Cullen and Levitt 1999) | Already built as "moving away"; resize it |
| Crime → business, home values | MODERATE (to confirm) | | Provisional |

### Environment and energy (O)

See the pollution, heat and water rows under health. Also:

| Cause → effect | Strength | Anchor | Shape, timing, who |
|---|---|---|---|
| Emission rules → air quality | STRONG | The Clean Air Act's nonattainment rules cut particles and saved infants (Chay and Greenstone) | On compliance dates |
| Congestion relief → local air → infant health | STRONG | E-ZPass (above) | Road and toll laws matter for health |
| Disasters → public spending | STRONG (to confirm) | After a hurricane, non-disaster payments like unemployment and public medical spending rise for years (Deryugina 2017) | Budgets |
| Energy prices → household budgets and AC use | MODERATE (to confirm) | Price shocks and shutoffs cut AC use, which feeds heat deaths | Poor households, the elderly |

### Economy and jobs (B)

| Cause → effect | Strength | Anchor | Shape, timing, who |
|---|---|---|---|
| State corporate tax → who pays | Established | Firm owners bear about 40%, workers 30 to 35%, landowners 25 to 30% (Suárez Serrato and Zidar 2016) | Tax cuts help workers partly |
| Deal-specific business incentives → jobs | WEAK | About 1,500 jobs in the deal's industry; little broader growth (Slattery and Zidar 2020) | Big deals, small ripple |
| Unemployment → births | MODERATE | +1 point unemployment → −1.4% births (Kearney, Levine and Pardue 2022) | Place level |
| Immigration enforcement → jobs | MODERATE | Secure Communities cut likely-undocumented employment 5.7% and slightly lowered U.S.-born employment and wages (East et al. 2023) | Complementary workers |
| Education → wages | STRONG | See graduation | Lifelong |

### Rights, social issues and families (C)

| Cause → effect | Strength | Anchor | Shape, timing, who |
|---|---|---|---|
| Marriage equality → marriages, coverage, care | STRONG for marriage; MODERATE for coverage | More marriage; men in same-sex couples gained coverage, access to care and use of care (Carpenter et al. 2021) | Spousal coverage, joint taxes |
| Abortion bans → births | MODERATE | About +2.3% births in ban states (Dench, Pineda-Torres and Myers 2024) | Starts about 6 to 9 months after enforcement |
| Abortion bans → infant deaths | MODERATE | About +6% infant mortality from 2021 through 2023 (Gemmill et al. 2025) | |
| Being denied an abortion → finances | STRONG | Past-due debt up 78% ($1,746); bankruptcies, evictions and tax liens up 81% (Miller, Wherry and Foster 2023) | Years |
| Universal child care or pre-K → mothers' work | STRONG | D.C. → +10 points in mothers' labor force participation; Quebec → about +7% | Mothers of young children |
| Baby bonuses and child tax credits → births | WEAK to ABOUT ZERO | Quebec's large bonus: +5–10% (up to +25% for third children), at high cost. The 2021 U.S. credit: no clear effect on births | A family-benefit law shouldn't produce a baby boom |
| DACA-style relief → school and work | STRONG | +15% graduation and +20% college for undocumented youth (Kuka, Shenhav and Shih 2020) | Immigrant youth |

### Government, democracy and the press (C and G)

| Cause → effect | Strength | Anchor | Shape, timing, who |
|---|---|---|---|
| Strict voter ID → turnout | ABOUT ZERO | −0.1 points, not significant, for every group (Cantoni and Pons 2021, 1.6 billion records) | The game must not make ID laws crush turnout |
| Same-day registration → youth turnout | MODERATE | +3.1 to 7.3 points for ages 18 to 24 (Grumbach and Hill) | Presidential years most |
| All-mail voting → turnout and party share | WEAK; ABOUT ZERO for party | About +2 points turnout, no partisan effect (Thompson et al. 2020) | |
| Polling place distance or closures → turnout | MODERATE | A quarter mile farther → 2–5% fewer ballots (Cantoni 2020). Los Angeles consolidation → −1.85 points net (Brady and McNulty 2011) | Non-white areas and local elections most |
| Newspaper closure → government cost and politics | MODERATE | Borrowing costs +5 to 11 basis points, higher wages and deficits (Gao, Lee and Murphy 2020); fewer candidates, less knowledge, lower local turnout (Hayes and Lawless) | Local news is a watchdog |
| Exposed corruption → reelection | STRONG | Two or more audit violations → −7 points reelection; much stronger where local radio spread it (Ferraz and Finan 2008) | Media multiplies it |
| Officials attacking the press → media trust | MODERATE | Elite and partisan criticism lowers trust in news, and those supporters then discount the press's reports (Ladd 2012) | Press-hostile leaders shield themselves from bad coverage with their base, and pay with everyone else |
| Relief vs preparedness spending → votes | STRONG, and lopsided | Voters reward relief spending, not preparedness, though preparedness saves about 15 times its cost (Healy and Malhotra 2009) | The core tension |
| Economy → approval | STRONG (to confirm the size) | | C's exposure model |

## The ABOUT ZERO list

The game must not invent these effects:
- strict voter ID on turnout;
- home computers and internet on children's test scores;
- Medicaid on blood pressure and cholesterol within two years;
- Medicaid work requirements on employment;
- more prisoners, at today's levels, on crime;
- pretrial detention on future crime;
- child tax credits on birth rates (U.S. 2021);
- recessions on the overall death rate (today);
- vote-by-mail on which party wins;
- business incentives on broad local growth.

## Build notes for the engine (04 SPECS part 5 is the rule)

- Each link records these fields: shape (linear, threshold, diminishing, exposure-years, acute-decay, moderated), moderator (for example AC share, local news, insurance rules), group, lag and decay, strength, and anchor.
- Children's links write to a childhood record on the person, and adult outcomes read it.
- Calibration test: in a 5-year world, the gaps between groups (graduation by income, coverage by job status, homelessness by rent burden) should land near the real gaps. Too big means double counting; too small means a missing link.
- The ABOUT ZERO list is a test too. A law in these areas must not move those outcomes.

## Sources (dev only; never on a player screen)

Jackson, Johnson and Persico 2016 (QJE); Cohodes, Grossman, Kleiner and Lovenheim 2016 (JHR); Chetty, Friedman and Rockoff 2014 (AER); Krueger (Tennessee STAR); Gray-Lobe, Pathak and Walters 2023 (QJE); the Vanderbilt Tennessee VPK study; Dahl and Lochner 2012 (AER); Chetty, Hendren and Katz 2016 (AER); Chetty and Hendren 2018 (QJE); Sharkey 2010 (PNAS); Ang 2021 (QJE); Hanushek, Kain and Rivkin 2004 (JPubE); Collinson et al. 2024 (QJE); Aizer, Currie, Simon and Vivier 2018 (AEJ Applied); Park, Goodman, Hurwitz and Smith 2020 (AEJ Policy); Currie, Hanushek, Kahn, Neidell and Rivkin 2009 (REStat); Kuka, Shenhav and Shih 2020 (AEJ Policy); Dee and Murphy 2020 (AERJ); Vigdor, Ladd and Martinez 2014; Fairlie and Robinson 2013 (AEJ Applied); Lochner and Moretti 2004 (AER); Sondheimer and Green 2010 (AJPS); Berinsky and Lenz 2011; Lleras-Muney 2005 and later re-examinations; the Oregon Health Insurance Experiment (Finkelstein, Baicker et al.); Miller, Johnson and Wherry 2021 (QJE); Brevoort, Grodzicki and Hackmann 2020 (JPubE); Sommers et al. 2019 (NEJM); Cawley, Moriya and Simon 2015 (Health Economics); Sullivan and von Wachter 2009 (QJE); Ruhm (2000, 2015); WHO and ILO 2021; Chay and Greenstone 2003; Currie and Walker 2011 (AEJ Applied); Isen, Rossin-Slater and Walker 2017 (JPE); Currie et al. 2013 (CJE); Barreca et al. 2016 (JPE); Deryugina et al. 2019 (AER); Hoynes, Miller and Simon 2015 (AEJ Policy) and Dench and Joyce 2020; Hoynes, Schanzenbach and Almond 2016 (AER); Ratcliffe, McKernan and Zhang 2011 (AJAE); Census SPM 2021–22; Dube 2019 (AEJ Applied); Cengiz, Dube, Lindner and Zipperer 2019 (QJE); Neumark and Shirley 2022; Asquith, Mast and Reed 2023 (REStat); Diamond, McQuade and Qian 2019 (AER); Colburn and Aldern 2022; Zillow and UNH 2018; Boustan, Kahn, Rhode and Yanguas 2020 (JUE); Dettling and Kearney 2014 (JPubE); Tyndall 2017 (Urban Studies); Atasoy 2013 (ILR Review); Dettling 2017 (ILR Review); Ashenfelter and Greenstone 2004 (JPE); Raphael and Winter-Ebmer 2001 (JLE); Chalfin and McCrary 2017–18; Chalfin, Hansen, Weisburst and Williams 2022 (AER Insights); Heller 2014 (Science); Roodman 2017/2020; Lofstrom and Raphael; Bartos and Kubrin 2018; Dobbie, Goldin and Yang 2018 (AER); RAND Science of Gun Policy, 5th ed.; Cullen and Levitt 1999 (REStat); Suárez Serrato and Zidar 2016 (AER); Slattery and Zidar 2020 (JEP); Kearney, Levine and Pardue 2022 (JEP); East, Luck, Mansour and Velásquez 2023 (JOLE); Carpenter, Eppink, Gonzales and McKay 2021 (JPAM); Dench, Pineda-Torres and Myers 2024 (JPubE); Gemmill et al. 2025 (JAMA); Miller, Wherry and Foster 2023 (AEJ Policy); Baker, Gruber and Milligan 2008 (JPE); Malik 2018 (D.C.); Milligan 2005; Cantoni and Pons 2021 (QJE); Grumbach and Hill 2022 (JOP); Thompson, Wu, Yoder and Hall 2020 (PNAS); Cantoni 2020 (AEJ Applied); Brady and McNulty 2011 (APSR); Gao, Lee and Murphy 2020 (JFE); Hayes and Lawless 2021; Ferraz and Finan 2008 (QJE); Ladd 2012; Healy and Malhotra 2009 (APSR).
