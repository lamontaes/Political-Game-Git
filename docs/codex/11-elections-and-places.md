# Job 11: elections and place counts

## Why

In Claude CTO's watched worlds on September 29:

- Arizona's governor race produced identical vote counts in 2026 and 2030.
- One place (Concho) had population 0.
- Build 24: no sitting member lost a general election.
- Build 5: no election reads turnout. Local turnout is still rolled at `local-elections.ts` (about line 937).

## Work

1. **Find why the vote counts repeat.** The likely cause is a fixed turnout times a fixed population that doesn't change between cycles; confirm it in the code and name the file:line. Counts must come from each race's own voters in that year:
   - the represented population (job 04) and how it has changed;
   - turnout;
   - each voter's leaning, on a sliding scale;
   - the candidates;
   - the national mood (job 02).
2. **Turnout for every count.** Use Research 3's ratios: 0.91 in presidential years, 0.72 in midterms, 0.39 off-cycle, relative to the presidential-year base. Adjust by the state's election laws in force (automatic registration, photo ID and so on) and by the race's competitiveness. Remove the turnout roll.
3. **No place with population 0** unless its real count is 0 (job 04 supplies the counts). Any place without a count starts from the average of similar places, marked ESTIMATED FROM AVERAGE.

## Checks

- A 9-year watched world in a random state, with every statewide and congressional count by year.
- No two cycles identical.
- Turnout within the real range for each kind of election.
