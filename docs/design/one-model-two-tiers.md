# One model, two tiers (owner, Oct 14, 2026)

Current as of 2026-10-23 (checked by the Oct 23 doc audit: every path resolves and no replaced rule is stated)

The owner: "This concept has to apply not just to the 348 generated people but to the entire simulation for an area, so districts can have personalities and all the numbers make sense. Instead of saying 18 people were affected by a new bill, it says 1,800 or 4,300. And population needs to be able to adjust: if California repealed its state income tax, people would flood in."

## The two tiers

- **Full people** (unchanged): the player, their household and circle, officials and other named people, anyone met or clicked. Every engine treats them one by one.
- **Counted groups**: everyone else, in every place the world holds. A group is one record holding a count and the fields a full person has where they matter, held once for the group: income, rent or mortgage, mortgage balance, arrears, benefits, view lean, health band, its own money account. The town and its neighboring places are held in detail; every other state and territory of the 56 is held at a coarser grain (age band by income band).

A town group is keyed by place, district, the household's kind (one adult, a couple, a family with children, other), its income band (national household-income fifths), its tenure (owns or rents) and its head's age band and work (working, retired, not working). Inside the record, its households and members are columns (id, name, birth day, sex, traits packed as small integers, household), so the same person comes back at fill-in and a counted vote reads that member's own traits. Nothing else about a counted person exists: no past, no ties outside the household, no looks, no sources. Those are built at fill-in.

## Same reads, scaled

Every engine that reads a law, a price, a budget line, a payroll rule or a program's eligibility for a full person applies the same read to each group, times its count:

- **Wages** post to each group's account in one journal entry with the employer, and the law in force is withheld on each group's pay with the same function full workers' paychecks use (`withholdingFor`), on the group's per-worker pay times its workers.
- **Rent, mortgages and purchases** are paid from each group's account in one entry with the payee. A group short of its housing payment carries arrears; a counted mortgage's balance falls only by what was paid.
- **Reach** is one function, `reachOf(core, placeId, rule)`: how many people and how many dollars a rule touches in a place, by group, with the full people counted by the same rule. Law reach, budgets and news call it.

Full people are consistent members of their groups: a filled-in person's job, pay and rent fall within their group's band, because they are built from it.

## Districts

A town's districts are the state House districts its population splits into (from the place-district join), else the whole town. Households are placed into districts by their own lean against each district's 2024 result, so the more conservative district holds the households that lean right, and with them whatever income, housing and age goes with that in the generated population. Group records are keyed by district, so two districts differ in the records.

## Moves from causes

Each month every group weighs each other place at the coarse grain: its after-tax income there against here (the income tax in force in each state, read from the law table), rent against income, job prospects (the place's unemployment), benefits, held back by owning a home and children at home, scaled by the age band's real rate of leaving (ACS 2024). The pull slides; nothing is rolled. Fractions carry to the next month and whole households move when due, the ones whose causes are strongest first. Counts shift between places; the regional engine reads the new counts.

## Fill-in and demotion

Meeting or clicking a counted person builds their household from the group record and the place's records (an employer's books with 12 counted employees yields one of the 12, with that job and pay), seeded so the same person returns, with health from the health engine's fill-in. A full person who has been out of the player's life for a long while (a parameter) goes back into their group's count with their money and job reconciled. Named officials, the player's household and circle are never demoted.
