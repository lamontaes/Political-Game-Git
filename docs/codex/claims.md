# File claims

| Team | Files | Claimed at |
| ---- | ----- | ---------- |
| Team 3 cloud | `src/simulation/nationwide-world/represented-population.ts`, `represented-population.test.ts`, `place-population.ts`; `docs/codex/handbacks/team-3.md`, `docs/release/changes/wave1-towns.md` | September 29, cloud continuation after final local transfer |
| Team 3 cloud, Team 1 narrow release | `src/simulation/living-world/town-residents.ts`: only townRoster, its World/reference import/type seam and existing calls in townRosterPlace/seatTownResidents/describeTownResidents; `src/simulation/job-market.ts`: public-body staffing reader only; `src/simulation/living-world/local-elections.ts`: townRoster reader only. Public-land and immigration adapters will use the published law baseline on a separate bounded branch. | Released baseline a8dfa63bac8d6921944b4bdbb65b59423635def5; law, eligibility, quota, household/person, pay and speed hunks reserved |

Fairness WIP and labor/turnout drafts remain preserved on `codex/wave1-fairness-pay` at `48631f388627f5697db79a3719b240f5d10bc457`. This Census branch does not replace that work. Census raw observations remain nullable source evidence; runtime readers fill gaps from national comparable distributions. No other ownership is acquired here.
