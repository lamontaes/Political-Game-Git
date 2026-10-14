# OFFICE-FEDERAL status

Only OFFICE-FEDERAL writes this file. Package: `docs/packages/office-play.md` (federal part). Branch: `office/federal`, from main.

## What the owner can play now

Nothing new yet. The branch was opened on October 14, 2026, with its contract.

## Contract

Build the federal officeholder's day on OFFICE-LOCAL's one engine (`src/core2/modules/office-day.ts`), through GOV's engines, never forking them. FEDERAL writes only `src/core2/office-day-federal.ts`, its tests and its data rows.

- **U.S. representative:** the Washington week or the district week, chosen by the player; Congress meets on its own calendar from data, cited; committee and subcommittee seats; the whip's ask before a vote; casework and district projects; town halls; the midterm on the election calendar.
- **President:** the cabinet and nominations with Senate confirmation; executive orders; the budget request; the State of the Union on its date; pardons; the daily brief; the situation room when a crisis needs it; the press; the vice president; a trip to a town drawn at random to meet people.
- **Simulate or do:** every act above can be done or simulated, with the same risks either way.

**How it is checked:** ten days played as a U.S. representative and ten as president, in a generated world whose town is drawn at random from all 56 places, the seed named, record ids named. The golden-path suite, the speed guard and the dollar balance stay green; a year is measured before and after.

## Checklist

- [ ] Map the engines the federal day reads (offices, legislature, executive, pay, cases, press).
- [ ] Congress's calendar as data, cited.
- [ ] Federal acts as rows in the day's catalog.
- [ ] Representative: Washington week, district week, committees, whip, casework, projects, town halls.
- [ ] President: cabinet, nominations and confirmation, orders, budget request, State of the Union, pardons, brief, situation room, press, vice president, the town trip.
- [ ] Ten days as each, written into the PR body.

## Needs from other sessions

- OFFICE-LOCAL: the engine `src/core2/modules/office-day.ts` is not on any branch yet; FEDERAL builds against the smallest registered stand-in until it lands.

## Sub-agents

- Explore (read-only): map of the federal engines.

## Questions for the owner

None yet.
