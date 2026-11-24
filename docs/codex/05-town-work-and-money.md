# Job 05: town work and money

Wait for job 04's population layer if you need it; the money work can start at once.

## Why

- Town unemployment blows up: Yonkers went from 2% to 38%, and Hamilton from 1.8% to 17.7%.
- Four dice decide who works, and pay is undercounted. Lamontae thought all pay already ran through the one money system; it doesn't.

## Work

1. **One money system for all pay.** `monthlyPayByPerson` in `src/simulation/living-world/town-rent.ts` counts only pay recorded as work. It misses wages and an owner's draw. Make every reader of a person's or household's income (rent, Medicaid eligibility, taxes, the world report) read one function that counts every kind of pay the money system records.

   Build 21 measured the gap in Oak Grove Village, Missouri (place 2953650, seed medicaid-1): about 56 of 305 working-age adults had any recorded pay, and 237 of 246 adults on Medicaid had no job. Fix it and re-measure.

2. **Replace the four rolls in `laborStatus`** (`src/simulation/living-world/town-employment.ts`) and the fixed `TOWN_PART_TIME_SHARE`. Everything works on sliding scales; nothing flips at a line (Lamontae's correction):
   - **A student works** more hours the less money per person the household has and the more the student needs their own money. School hours and the student's traits limit it.
   - **Someone 62 or older retires** gradually as their savings, Social Security eligibility and amount, the rest of the household's income, their health and how physically demanding the job is add up. Desk workers in good health retire later.
   - **A parent stays home with a young child** as the partner's pay covers more of the household and childcare in the place costs more relative to what the parent would earn, weighed by the parent's own values.
   - **Looking for work** is whoever wants work and isn't hired. The town's employers hire by skills, experience and relationships, from real openings.
   - **Part-time** comes from the employer's hours and the person's school or caregiving.

   Settle the earners first, then the others in a fixed order, so household income doesn't loop. Check totals, never one person, against:
   - student employment;
   - labor force participation at 62 and older;
   - parents at home with children under 5;
   - the state's unemployment rate.

3. **Unemployment measured over the represented population** (job 04), with the named residents consistent with it.
4. Run `npm run zero-dice -- --update` so the five lines leave the list.

## Checks

- 5-year watched worlds in 3 random places, one of them a big city. Unemployment must stay within real variation; show it by year.
- Paid adults and Medicaid enrollees against real shares.
- The speed budget applies.
