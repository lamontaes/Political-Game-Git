# Reach-ins left, Nov 26 (end of the overnight pass)

**353 reach-ins remain** (`tests/guards/families-baseline.json` at this head), down from 575. This list names each one and why it stays. Source: the families guard's own count, by import statement. Reasons are the codemod's: a skip-list file, the past engine, a `tsconfig.node.json` file, or a move the load checks refused (`npm run tests:load`, the canary entry files, a name read while a module loads).

## jobs-businesses (75)

**left as it was: moving it through the other engine's entry broke a load-order check (a file that loads alone on main fails), or the name is read while the module loads, or the entry already exports a different symbol under that name, or it is a default or namespace import** (57):

- `src/core2/business-books-view.ts` → `src/core2/modules/employer-taxes.ts` [budgets]
- `src/core2/business-operating-rules.ts` → `src/core2/residents-economy.ts` [people]
- `src/core2/census-scale-closures-support.ts` → `src/bench/world.ts` [screens]
- `src/core2/credit-deposits.ts` → `src/core2/accounts.ts` [budgets]
- `src/core2/credit-deposits.ts` → `src/core2/counted-money.ts` [people]
- `src/core2/credit-deposits.ts` → `src/core2/residents-economy.ts` [people]
- `src/core2/job-lifecycle.ts` → `src/core2/finance-state.ts` [budgets]
- `src/core2/jobs-benefits.ts` → `src/core2/counted-actor.ts` [people]
- `src/core2/jobs-benefits.ts` → `src/core2/counted-money.ts` [people]
- `src/core2/jobs-benefits.ts` → `src/core2/emotion.ts` [people]
- `src/core2/jobs-benefits.ts` → `src/core2/law-reach/pay-reach.ts` [laws]
- `src/core2/jobs-benefits.ts` → `src/core2/laws-starting.ts` [laws]
- `src/core2/jobs-benefits.ts` → `src/core2/person-state.ts` [people]
- `src/core2/jobs-benefits.ts` → `src/core2/world-transfer.ts` [budgets]
- `src/core2/modules/business.ts` → `src/core2/accounts.ts` [budgets]
- `src/core2/modules/business.ts` → `src/core2/counted-money.ts` [people]
- `src/core2/modules/business.ts` → `src/core2/finance-types.ts` [budgets]
- `src/core2/modules/business.ts` → `src/core2/residents-economy.ts` [people]
- `src/core2/modules/business.ts` → `src/core2/world-transfer.ts` [budgets]
- `src/core2/modules/credit.ts` → `src/core2/accounts.ts` [budgets]
- `src/core2/modules/credit.ts` → `src/core2/counted-money.ts` [people]
- `src/core2/modules/credit.ts` → `src/core2/residents-economy.ts` [people]
- `src/core2/modules/macro.ts` → `src/core2/central-bank-appointments.ts` [executive]
- `src/core2/modules/macro.ts` → `src/core2/central-bank-board.ts` [executive]
- `src/core2/modules/macro.ts` → `src/core2/residents-economy.ts` [people]
- `src/core2/modules/place-prices.ts` → `src/core2/counted-money.ts` [people]
- `src/core2/modules/place-prices.ts` → `src/core2/modules/prices-web-gaps.ts` [laws]
- `src/core2/modules/place-prices.ts` → `src/core2/outcome-web-reach.ts` [laws]
- `src/core2/modules/work.ts` → `src/core2/finance-plan.ts` [budgets]
- `src/core2/public-payroll.ts` → `src/core2/public-pay-floor.ts` [laws]
- `src/core2/public-work-pay.ts` → `src/core2/finance-plan.ts` [budgets]
- `src/core2/question-wages.ts` → `src/core2/law-reach/group-a-records.ts` [laws]
- `src/core2/question-wages.ts` → `src/core2/laws-starting.ts` [laws]
- `src/core2/work-attendance.ts` → `src/core2/finance-plan.ts` [budgets]
- `src/core2/work-cash.ts` → `src/core2/act-cash.ts` [budgets]
- `src/core2/work-cash.ts` → `src/core2/act-cash.ts` [budgets]
- `src/core2/work-cash.ts` → `src/core2/cash-host.ts` [budgets]
- `src/core2/work-cash.ts` → `src/core2/finance-cash.ts` [budgets]
- `src/core2/work-cash.ts` → `src/core2/finance-plan.ts` [budgets]
- `src/core2/work-cash.ts` → `src/core2/finance-plan.ts` [budgets]
- `src/core2/work-cash.ts` → `src/core2/finance-types.ts` [budgets]
- `src/core2/work-cash.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/work-cash.ts` → `src/core2/journal.ts` [people]
- `src/core2/work-pay-period.ts` → `src/core2/finance-plan.ts` [budgets]
- `src/core2/work-payroll-cash.ts` → `src/core2/cash-host.ts` [budgets]
- `src/core2/work-payroll-cash.ts` → `src/core2/finance-cash.ts` [budgets]
- `src/core2/work-payroll-cash.ts` → `src/core2/finance-plan.ts` [budgets]
- `src/core2/work-payroll-cash.ts` → `src/core2/finance-plan.ts` [budgets]
- `src/core2/work-payroll-cash.ts` → `src/core2/finance-types.ts` [budgets]
- `src/core2/work-payroll-cash.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/work-payroll-cash.ts` → `src/core2/journal.ts` [people]
- `src/core2/work-payroll-dispatch.ts` → `src/core2/accounts.ts` [budgets]
- `src/core2/work-payroll-dispatch.ts` → `src/core2/cash-host.ts` [budgets]
- `src/core2/work-payroll-dispatch.ts` → `src/core2/finance-cash.ts` [budgets]
- `src/core2/work-payroll-dispatch.ts` → `src/core2/finance-plan.ts` [budgets]
- `src/core2/work-payroll-group.ts` → `src/core2/finance-plan.ts` [budgets]
- `src/core2/work-spans-v1.ts` → `src/core2/finance-plan.ts` [budgets]

**a file the History, Past-and-Day-One or Talk sessions own, or a target of theirs (skip lists)** (18):

- `src/core2/modules/business.ts` → `src/core2/pre-start.ts` [past]
- `src/core2/modules/jobs.ts` → `src/core2/counted-groups.ts` [people]
- `src/core2/modules/jobs.ts` → `src/core2/encounters.ts` [people]
- `src/core2/modules/jobs.ts` → `src/core2/jobs-web.ts` [laws]
- `src/core2/modules/jobs.ts` → `src/core2/modules/retirement-claims.ts` [people]
- `src/core2/modules/jobs.ts` → `src/core2/opening-profile.ts` [people]
- `src/core2/modules/jobs.ts` → `src/core2/outcome-web-reach.ts` [laws]
- `src/core2/modules/jobs.ts` → `src/core2/public-pay-floor.ts` [laws]
- `src/core2/modules/jobs.ts` → `src/core2/residents-economy.ts` [people]
- `src/core2/modules/jobs.ts` → `src/core2/school-measures.ts` [people]
- `src/core2/modules/jobs.ts` → `src/core2/school-outcomes.ts` [people]
- `src/core2/modules/macro.ts` → `src/core2/pre-start.ts` [past]
- `src/core2/opening-customers.ts` → `src/core2/finance-types.ts` [budgets]
- `src/core2/opening-department-pay.ts` → `src/core2/gov-rules/local-governments.ts` [executive]
- `src/core2/opening-economy.ts` → `src/core2/opening-income-funding.ts` [people]
- `src/core2/opening-economy.ts` → `src/core2/opening-income.ts` [people]
- `src/core2/opening-finance.ts` → `src/core2/finance-types.ts` [budgets]
- `src/core2/opening-outside-market.ts` → `src/core2/residents.ts` [people]

## executive (42)

**left as it was: moving it through the other engine's entry broke a load-order check (a file that loads alone on main fails), or the name is read while the module loads, or the entry already exports a different symbol under that name, or it is a default or namespace import** (31):

- `src/core2/central-bank-board.ts` → `src/core2/starting-cash.ts` [budgets]
- `src/core2/modules/constituent-cases.ts` → `src/core2/counted-money.ts` [people]
- `src/core2/modules/constituent-cases.ts` → `src/core2/wage-floor.ts` [laws]
- `src/core2/modules/executive.ts` → `src/core2/campaign-views.ts` [elections]
- `src/core2/modules/executive.ts` → `src/core2/modules/disasters.ts` [clock-places]
- `src/core2/modules/executive.ts` → `src/core2/public-payroll.ts` [jobs-businesses]
- `src/core2/modules/office-day.ts` → `src/core2/modules/world-legislating.ts` [bodies]
- `src/core2/modules/office-day.ts` → `src/core2/player-stops-v1.ts` [clock-places]
- `src/core2/modules/office-day.ts` → `src/core2/public-payroll.ts` [jobs-businesses]
- `src/core2/modules/office-day.ts` → `src/core2/state-item-veto.ts` [bodies]
- `src/core2/modules/officials.ts` → `src/core2/legislative-district-results.ts` [elections]
- `src/core2/modules/staff.ts` → `src/core2/campaign-views.ts` [elections]
- `src/core2/modules/staff.ts` → `src/core2/public-payroll.ts` [jobs-businesses]
- `src/core2/modules/succession.ts` → `src/core2/board-appointer.ts` [bodies]
- `src/core2/modules/succession.ts` → `src/core2/modules/leadership.ts` [bodies]
- `src/core2/modules/succession.ts` → `src/core2/nativity.ts` [people]
- `src/core2/office-day-acts.ts` → `src/core2/campaign-views.ts` [elections]
- `src/core2/office-day-acts.ts` → `src/core2/modules/projects.ts` [budgets]
- `src/core2/office-day-acts.ts` → `src/core2/modules/speech.ts` [people]
- `src/core2/office-day-acts.ts` → `src/core2/policy-answers.ts` [laws]
- `src/core2/office-day-federal-president.ts` → `src/core2/campaign-views.ts` [elections]
- `src/core2/office-day-federal-president.ts` → `src/core2/coarse-place.ts` [clock-places]
- `src/core2/office-day-federal.ts` → `src/core2/modules/leadership.ts` [bodies]
- `src/core2/office-day-state.ts` → `src/core2/campaign-views.ts` [elections]
- `src/core2/office-day-state.ts` → `src/core2/modules/leadership.ts` [bodies]
- `src/core2/office-day-state.ts` → `src/core2/modules/world-legislating.ts` [bodies]
- `src/core2/office-day-state.ts` → `src/core2/state-item-veto.ts` [bodies]
- `src/core2/office-day-state.ts` → `src/core2/state-session-calendar.ts` [bodies]
- `src/core2/offices-local.ts` → `src/core2/business-names.ts` [jobs-businesses]
- `src/core2/official-living.ts` → `src/core2/hud-rents.ts` [people]
- `src/core2/officials-roster.ts` → `src/core2/campaign-views.ts` [elections]

**a file the History, Past-and-Day-One or Talk sessions own, or a target of theirs (skip lists)** (11):

- `src/core2/modules/executive.ts` → `src/core2/modules/counted-moves.ts` [people]
- `src/core2/modules/executive.ts` → `src/core2/opening-profile.ts` [people]
- `src/core2/modules/executive.ts` → `src/core2/past-work.ts` [past]
- `src/core2/modules/offices.ts` → `src/core2/elections-calendar.ts` [elections]
- `src/core2/modules/offices.ts` → `src/core2/electorate.ts` [elections]
- `src/core2/modules/offices.ts` → `src/core2/policy-answers.ts` [laws]
- `src/core2/modules/offices.ts` → `src/core2/pre-start.ts` [past]
- `src/core2/modules/offices.ts` → `src/core2/press-conflict.ts` [news]
- `src/core2/modules/officials.ts` → `src/core2/opening-personality.ts` [people]
- `src/core2/modules/staff.ts` → `src/core2/opening-personality.ts` [people]
- `src/core2/office-day-federal-president.ts` → `src/core2/modules/counted-moves.ts` [people]

## people (41)

**left as it was: moving it through the other engine's entry broke a load-order check (a file that loads alone on main fails), or the name is read while the module loads, or the entry already exports a different symbol under that name, or it is a default or namespace import** (13):

- `src/core2/housing-assistance.ts` → `src/core2/law-reach/group-a-money.ts` [laws]
- `src/core2/housing-assistance.ts` → `src/core2/law-reach/group-a-records.ts` [laws]
- `src/core2/housing-assistance.ts` → `src/core2/law-reach/group-b-money.ts` [laws]
- `src/core2/housing-homeless.ts` → `src/core2/outcome-web-reach.ts` [laws]
- `src/core2/modules/residents.ts` → `src/core2/accounts.ts` [budgets]
- `src/core2/modules/residents.ts` → `src/core2/business-books.ts` [jobs-businesses]
- `src/core2/modules/residents.ts` → `src/core2/living-cost-split.ts` [jobs-businesses]
- `src/core2/population.ts` → `src/core2/starting-cash.ts` [budgets]
- `src/core2/population.ts` → `src/core2/town-pay.ts` [jobs-businesses]
- `src/core2/residents.ts` → `src/core2/finance-plan.ts` [budgets]
- `src/core2/residents.ts` → `src/core2/work-pay-period.ts` [jobs-businesses]
- `src/core2/trait-pairs.ts` → `src/bench/world.ts` [screens]
- `src/core2/trait-test-kit.ts` → `src/bench/world.ts` [screens]

**a file the History, Past-and-Day-One or Talk sessions own, or a target of theirs (skip lists)** (26):

- `src/core2/housing-construction.ts` → `src/core2/opening-outside-market.ts` [jobs-businesses]
- `src/core2/housing-foreclosure.ts` → `src/core2/opening-outside-market.ts` [jobs-businesses]
- `src/core2/housing-property-tax.ts` → `src/core2/opening-outside-market.ts` [jobs-businesses]
- `src/core2/housing-sale.ts` → `src/core2/opening-outside-market.ts` [jobs-businesses]
- `src/core2/modules/counted-demotion.ts` → `src/core2/opening-outside-market.ts` [jobs-businesses]
- `src/core2/modules/counted-moves.ts` → `src/core2/country-law.ts` [jobs-businesses]
- `src/core2/modules/counted-moves.ts` → `src/core2/outcome-web-reach.ts` [laws]
- `src/core2/modules/housing.ts` → `src/core2/opening-outside-market.ts` [jobs-businesses]
- `src/core2/modules/moves.ts` → `src/core2/opening-outside-market.ts` [jobs-businesses]
- `src/core2/modules/residents.ts` → `src/core2/opening-outside-market.ts` [jobs-businesses]
- `src/core2/opening-income.ts` → `src/core2/finance-types.ts` [budgets]
- `src/core2/opening-income.ts` → `src/core2/social-security-law.ts` [laws]
- `src/core2/opening-key-people.ts` → `src/core2/modules/leadership.ts` [bodies]
- `src/core2/opening-private-tuition.ts` → `src/core2/finance-types.ts` [budgets]
- `src/core2/opening-public-schools.ts` → `src/core2/opening-department-pay.ts` [jobs-businesses]
- `src/core2/opening-public-schools.ts` → `src/core2/work-pay-period.ts` [jobs-businesses]
- `src/core2/opening-trait-table.ts` → `src/core2/legislature-trait-pack.ts` [bodies]
- `src/core2/population.ts` → `src/core2/opening-capital.ts` [jobs-businesses]
- `src/core2/population.ts` → `src/core2/opening-department-pay.ts` [jobs-businesses]
- `src/core2/population.ts` → `src/core2/opening-employment.ts` [jobs-businesses]
- `src/core2/population.ts` → `src/core2/opening-org-profiles.ts` [jobs-businesses]
- `src/core2/population.ts` → `src/core2/opening-payroll-calendar.ts` [jobs-businesses]
- `src/core2/population.ts` → `src/core2/opening-public-owner.ts` [jobs-businesses]
- `src/core2/population.ts` → `src/core2/opening-public-pay.ts` [jobs-businesses]
- `src/core2/population.ts` → `src/core2/opening-work.ts` [jobs-businesses]
- `src/core2/residents.ts` → `src/core2/opening-outside-market.ts` [jobs-businesses]

**the file is listed in tsconfig.node.json, which may not import outside its list (TS6307)** (2):

- `src/core2/person-names.ts` → `src/core2/gov-rules/types.ts` [executive]
- `src/core2/town-households.ts` → `src/core2/gov-rules/invented-person-age.ts` [executive]

## screens (37)

**a file the History, Past-and-Day-One or Talk sessions own, or a target of theirs (skip lists)** (31):

- `src/bench/campaign.ts` → `src/core2/campaign-day.ts` [elections]
- `src/bench/campaign.ts` → `src/core2/modules/speech.ts` [people]
- `src/bench/card.ts` → `src/core2/law-reach/host.ts` [laws]
- `src/bench/card.ts` → `src/core2/past-public.ts` [past]
- `src/bench/card.ts` → `src/core2/people-trait-definitions.ts` [people]
- `src/bench/changes.ts` → `src/core2/law-reach/host.ts` [laws]
- `src/bench/changes.ts` → `src/core2/laws-starting.ts` [laws]
- `src/bench/dev-mode.ts` → `src/core2/journal.ts` [people]
- `src/bench/dev-mode.ts` → `src/core2/knowledge-retention.ts` [people]
- `src/bench/dev-mode.ts` → `src/core2/law-reach/group-a-records.ts` [laws]
- `src/bench/dev-mode.ts` → `src/core2/law-reach/group-b-money.ts` [laws]
- `src/bench/dev-mode.ts` → `src/core2/law-reach/group-b.ts` [laws]
- `src/bench/dev-mode.ts` → `src/core2/laws-starting.ts` [laws]
- `src/bench/dev-mode.ts` → `src/core2/policy-answers.ts` [laws]
- `src/bench/dev-mode.ts` → `src/core2/public-pay-floor.ts` [laws]
- `src/bench/government.ts` → `src/core2/opening-key-people.ts` [people]
- `src/bench/m0-check.ts` → `src/core2/player-v1.ts` [clock-places]
- `src/bench/m1-13-check.ts` → `src/core2/modules/counted-moves.ts` [people]
- `src/bench/m1-14-check.ts` → `src/core2/pre-start.ts` [past]
- `src/bench/printed-words.ts` → `data/english/bill-names.json` [english]
- `src/bench/printed-words.ts` → `src/core2/appointments.ts` [executive]
- `src/bench/reached.ts` → `src/core2/law-reach/host.ts` [laws]
- `src/bench/scene.ts` → `src/core2/player-v1.ts` [clock-places]
- `src/bench/world.ts` → `src/core2/modules/record.ts` [people]
- `src/bench/world.ts` → `src/core2/opening-economy.ts` [jobs-businesses]
- `src/bench/world.ts` → `src/core2/opening-finance.ts` [jobs-businesses]
- `src/bench/world.ts` → `src/core2/opening-kin.ts` [people]
- `src/bench/world.ts` → `src/core2/opening-outside-market.ts` [jobs-businesses]
- `src/bench/world.ts` → `src/core2/opening-private-tuition.ts` [people]
- `src/bench/world.ts` → `src/core2/opening-public-schools.ts` [people]
- `src/bench/world.ts` → `src/core2/pre-start.ts` [past]

**left as it was: moving it through the other engine's entry broke a load-order check (a file that loads alone on main fails), or the name is read while the module loads, or the entry already exports a different symbol under that name, or it is a default or namespace import** (6):

- `src/bench/m1-11-check.ts` → `src/core2/modules/drives.ts` [people]
- `src/bench/path-check.ts` → `src/core2/office-day-acts.ts` [executive]
- `src/bench/path-check.ts` → `src/core2/office-day-state.ts` [executive]
- `src/bench/race-words.ts` → `data/english/parts/campaign-standing.json` [english]
- `src/bench/words.ts` → `data/english/parts/choice-names.json` [english]
- `src/bench/world.ts` → `src/core2/modules/public-safety.ts` [laws]

## elections (36)

**a file the History, Past-and-Day-One or Talk sessions own, or a target of theirs (skip lists)** (8):

- `src/core2/campaign-stances.ts` → `src/core2/modules/record.ts` [people]
- `src/core2/electorate-inputs.ts` → `src/core2/modules/record.ts` [people]
- `src/core2/modules/campaigns.ts` → `src/core2/modules/record.ts` [people]
- `src/core2/modules/campaigns.ts` → `src/core2/opening-outside-market.ts` [jobs-businesses]
- `src/core2/modules/candidacy.ts` → `src/core2/modules/record.ts` [people]
- `src/core2/modules/elections.ts` → `src/core2/appointments.ts` [executive]
- `src/core2/modules/elections.ts` → `src/core2/law-reach/group-a-voting.ts` [laws]
- `src/core2/modules/voting.ts` → `src/core2/modules/record.ts` [people]

**left as it was: moving it through the other engine's entry broke a load-order check (a file that loads alone on main fails), or the name is read while the module loads, or the entry already exports a different symbol under that name, or it is a default or namespace import** (28):

- `src/core2/campaign-stances.ts` → `src/core2/appointments.ts` [executive]
- `src/core2/candidate-identity.ts` → `src/core2/officials-identity.ts` [executive]
- `src/core2/candidate-pool.ts` → `src/core2/officials-roster.ts` [executive]
- `src/core2/contest-positions.ts` → `src/core2/modules/world-legislating.ts` [bodies]
- `src/core2/contingent-election.ts` → `src/core2/appointments.ts` [executive]
- `src/core2/contingent-election.ts` → `src/core2/modules/leadership.ts` [bodies]
- `src/core2/elections-calendar.ts` → `src/core2/gov-rules/county-election-calendar.ts` [executive]
- `src/core2/elections-calendar.ts` → `src/core2/gov-rules/municipal-ballot-rules.ts` [executive]
- `src/core2/elections-calendar.ts` → `src/core2/gov-rules/municipal-election-rules.ts` [executive]
- `src/core2/elections-calendar.ts` → `src/core2/gov-rules/town-election-calendar.ts` [executive]
- `src/core2/electorate-inputs.ts` → `src/core2/appointments.ts` [executive]
- `src/core2/electorate-inputs.ts` → `src/core2/law-reach/group-a-voting.ts` [laws]
- `src/core2/electorate-places.ts` → `src/core2/appointments.ts` [executive]
- `src/core2/electorate.ts` → `src/core2/counted-groups.ts` [people]
- `src/core2/membership-dues.ts` → `src/core2/residents.ts` [people]
- `src/core2/modules/campaigns.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/modules/campaigns.ts` → `src/core2/modules/drives.ts` [people]
- `src/core2/modules/candidacy.ts` → `src/core2/modules/drives.ts` [people]
- `src/core2/modules/interest-groups.ts` → `src/core2/counted-actor.ts` [people]
- `src/core2/modules/interest-groups.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/modules/interest-groups.ts` → `src/core2/modules/place-prices.ts` [jobs-businesses]
- `src/core2/modules/recalls.ts` → `src/core2/gov-rules/municipal-ballot-rules.ts` [executive]
- `src/core2/modules/recalls.ts` → `src/core2/gov-rules/municipal-election-rules.ts` [executive]
- `src/core2/modules/recalls.ts` → `src/core2/gov-rules/municipal-election-rules.ts` [executive]
- `src/core2/modules/voting.ts` → `src/core2/appointments.ts` [executive]
- `src/core2/modules/voting.ts` → `src/core2/modules/constituent-cases.ts` [executive]
- `src/core2/modules/voting.ts` → `src/core2/office-holdover.ts` [executive]
- `src/core2/modules/voting.ts` → `src/core2/officials-identity.ts` [executive]

## budgets (35)

**left as it was: moving it through the other engine's entry broke a load-order check (a file that loads alone on main fails), or the name is read while the module loads, or the entry already exports a different symbol under that name, or it is a default or namespace import** (29):

- `src/core2/accounts.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/act-cash.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/budgets-service-charges.ts` → `src/core2/living-cost-split.ts` [jobs-businesses]
- `src/core2/budgets-treasury.ts` → `src/core2/modules/retirement-claims.ts` [people]
- `src/core2/budgets-treasury.ts` → `src/core2/public-work-pay.ts` [jobs-businesses]
- `src/core2/cash-host.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/finance-cash.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/finance-cash.ts` → `src/core2/journal.ts` [people]
- `src/core2/finance-plan.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/finance-plan.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/finance-plan.ts` → `src/core2/journal.ts` [people]
- `src/core2/finance-state.ts` → `src/core2/business-books.ts` [jobs-businesses]
- `src/core2/finance-state.ts` → `src/core2/cost-of-living.ts` [jobs-businesses]
- `src/core2/finance-state.ts` → `src/core2/work-payroll-cash.ts` [jobs-businesses]
- `src/core2/finance-types.ts` → `src/core2/cost-of-living.ts` [jobs-businesses]
- `src/core2/finance-types.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/finance-types.ts` → `src/core2/journal.ts` [people]
- `src/core2/finance-types.ts` → `src/core2/work-payroll-cash.ts` [jobs-businesses]
- `src/core2/modules/budgets.ts` → `src/core2/housing-property-tax.ts` [people]
- `src/core2/modules/budgets.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/modules/budgets.ts` → `src/core2/work-payroll-cash.ts` [jobs-businesses]
- `src/core2/modules/contracts.ts` → `src/core2/modules/corruption.ts` [laws]
- `src/core2/modules/employer-taxes.ts` → `src/core2/counted-money.ts` [people]
- `src/core2/modules/employer-taxes.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/modules/employer-taxes.ts` → `src/core2/residents-economy.ts` [people]
- `src/core2/modules/finance.ts` → `src/core2/cost-of-living.ts` [jobs-businesses]
- `src/core2/modules/finance.ts` → `src/core2/work-payroll-dispatch.ts` [jobs-businesses]
- `src/core2/world-transfer.ts` → `src/core2/counted-money.ts` [people]
- `src/core2/world-transfer.ts` → `src/core2/residents.ts` [people]

**a file the History, Past-and-Day-One or Talk sessions own, or a target of theirs (skip lists)** (6):

- `src/core2/budgets-treasury.ts` → `src/core2/opening-outside-market.ts` [jobs-businesses]
- `src/core2/finance-cash.ts` → `src/core2/opening-customer-geography.ts` [jobs-businesses]
- `src/core2/finance-cash.ts` → `src/core2/opening-customer-qualification.ts` [jobs-businesses]
- `src/core2/finance-cash.ts` → `src/core2/opening-customers.ts` [jobs-businesses]
- `src/core2/finance-cash.ts` → `src/core2/opening-public-owner.ts` [jobs-businesses]
- `src/core2/modules/budgets.ts` → `src/core2/pre-start.ts` [past]

## laws (22)

**left as it was: moving it through the other engine's entry broke a load-order check (a file that loads alone on main fails), or the name is read while the module loads, or the entry already exports a different symbol under that name, or it is a default or namespace import** (21):

- `src/core2/health-web.ts` → `src/core2/death-cause.ts` [people]
- `src/core2/jobs-web.ts` → `src/core2/counted-groups.ts` [people]
- `src/core2/jobs-web.ts` → `src/core2/counted-groups.ts` [people]
- `src/core2/law-reach/group-a-money.ts` → `src/core2/work-payroll-cash.ts` [jobs-businesses]
- `src/core2/law-reach/group-a-records.ts` → `src/core2/counted-reach.ts` [people]
- `src/core2/law-reach/group-a-records.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/law-reach/group-a-staffing.ts` → `src/core2/residents-economy.ts` [people]
- `src/core2/law-reach/group-a-wages.ts` → `src/core2/question-wages.ts` [jobs-businesses]
- `src/core2/law-reach/group-b-money.ts` → `src/core2/counted-money.ts` [people]
- `src/core2/law-reach/group-b.ts` → `src/core2/modules/place-prices.ts` [jobs-businesses]
- `src/core2/law-reach/reach-workers.ts` → `src/core2/work-payroll-cash.ts` [jobs-businesses]
- `src/core2/modules/crime.ts` → `src/core2/counted-income-fifth.ts` [people]
- `src/core2/modules/justice.ts` → `src/core2/journal-state.ts` [people]
- `src/core2/modules/outcome-web.ts` → `src/core2/housing-property-tax.ts` [people]
- `src/core2/modules/outcome-web.ts` → `src/core2/modules/world-metrics.ts` [clock-places]
- `src/core2/modules/outcome-web.ts` → `src/core2/school-measures.ts` [people]
- `src/core2/outcome-web-reach.ts` → `src/core2/counted-groups.ts` [people]
- `src/core2/public-safety.ts` → `src/core2/counted-groups.ts` [people]
- `src/core2/public-safety.ts` → `src/core2/counted-money.ts` [people]
- `src/core2/right-to-work-dues.ts` → `src/core2/residents-economy.ts` [people]
- `src/core2/wage-floor.ts` → `src/core2/residents-economy.ts` [people]

**a file the History, Past-and-Day-One or Talk sessions own, or a target of theirs (skip lists)** (1):

- `src/core2/modules/laws.ts` → `src/core2/pre-start.ts` [past]

## past (21)

**a file the History, Past-and-Day-One or Talk sessions own, or a target of theirs (skip lists)** (19):

- `src/core2/past-bodies.ts` → `src/core2/campaign-views.ts` [elections]
- `src/core2/past-bodies.ts` → `src/core2/offices-local.ts` [executive]
- `src/core2/past-bodies.ts` → `src/core2/officials-identity.ts` [executive]
- `src/core2/past-bodies.ts` → `src/core2/officials-roster.ts` [executive]
- `src/core2/past-business.ts` → `src/core2/business-names.ts` [jobs-businesses]
- `src/core2/past-elections.ts` → `src/core2/appointments.ts` [executive]
- `src/core2/past-elections.ts` → `src/core2/campaign-views.ts` [elections]
- `src/core2/past-elections.ts` → `src/core2/electorate-places.ts` [elections]
- `src/core2/past-elections.ts` → `src/core2/electorate.ts` [elections]
- `src/core2/past-elections.ts` → `src/core2/gov-rules/town-election-calendar.ts` [executive]
- `src/core2/past-elections.ts` → `src/core2/policy-answers.ts` [laws]
- `src/core2/past-laws.ts` → `src/core2/campaign-views.ts` [elections]
- `src/core2/past-laws.ts` → `src/core2/laws-starting.ts` [laws]
- `src/core2/past-laws.ts` → `src/core2/modules/record.ts` [people]
- `src/core2/past-laws.ts` → `src/core2/officials-roster.ts` [executive]
- `src/core2/past-laws.ts` → `src/core2/policy-answers.ts` [laws]
- `src/core2/past-public.ts` → `src/core2/modules/record.ts` [people]
- `src/core2/past-work.ts` → `src/core2/opening-profile.ts` [people]
- `src/core2/past-work.ts` → `src/core2/residents-economy.ts` [people]

**left as it was: moving it through the other engine's entry broke a load-order check (a file that loads alone on main fails), or the name is read while the module loads, or the entry already exports a different symbol under that name, or it is a default or namespace import** (2):

- `src/core2/places-elsewhere.ts` → `src/core2/business-names.ts` [jobs-businesses]
- `src/core2/places-elsewhere.ts` → `src/core2/person-names.ts` [people]

## clock-places (16)

**a file the History, Past-and-Day-One or Talk sessions own, or a target of theirs (skip lists)** (3):

- `src/core2/coarse-place.ts` → `src/core2/opening-employment.ts` [jobs-businesses]
- `src/core2/life.ts` → `src/core2/modules/counted-moves.ts` [people]
- `src/core2/life.ts` → `src/core2/opening-payroll-calendar.ts` [jobs-businesses]

**left as it was: moving it through the other engine's entry broke a load-order check (a file that loads alone on main fails), or the name is read while the module loads, or the entry already exports a different symbol under that name, or it is a default or namespace import** (13):

- `src/core2/coarse-place.ts` → `src/core2/town-pay.ts` [jobs-businesses]
- `src/core2/coarse-place.ts` → `src/core2/town-workplaces.ts` [jobs-businesses]
- `src/core2/life.ts` → `src/core2/emotion.ts` [people]
- `src/core2/life.ts` → `src/core2/grief.ts` [people]
- `src/core2/life.ts` → `src/core2/modules/counted-demotion.ts` [people]
- `src/core2/life.ts` → `src/core2/modules/retirement-claims.ts` [people]
- `src/core2/life.ts` → `src/core2/modules/school.ts` [people]
- `src/core2/life.ts` → `src/core2/work-state.ts` [jobs-businesses]
- `src/core2/modules/world-metrics.ts` → `src/core2/world-poverty.ts` [people]
- `src/core2/modules/world.ts` → `src/core2/modules/credit.ts` [jobs-businesses]
- `src/core2/modules/world.ts` → `src/core2/modules/place-prices.ts` [jobs-businesses]
- `src/core2/player-control-state-v1.ts` → `src/core2/finance-plan.ts` [budgets]
- `src/core2/player-v1.ts` → `src/core2/work-payroll-dispatch.ts` [jobs-businesses]

## director (14)

**a file the History, Past-and-Day-One or Talk sessions own, or a target of theirs (skip lists)** (13):

- `src/director/conversation.ts` → `src/core2/heard-claims.ts` [people]
- `src/director/conversation.ts` → `src/core2/modules/crime.ts` [laws]
- `src/director/conversation.ts` → `src/core2/shared-history.ts` [past]
- `src/director/journal.ts` → `src/core2/laws-starting.ts` [laws]
- `src/director/ledger.ts` → `src/core2/emotion.ts` [people]
- `src/director/ledger.ts` → `src/core2/player-stops-v1.ts` [clock-places]
- `src/director/ledger.ts` → `src/core2/shared-history.ts` [past]
- `src/director/opening-story.ts` → `src/core2/modules/leadership.ts` [bodies]
- `src/director/opening-story.ts` → `src/core2/officials-president.ts` [executive]
- `src/director/opening-story.ts` → `src/core2/opening-key-people.ts` [people]
- `src/director/purpose-scene.ts` → `src/core2/campaign-views.ts` [elections]
- `src/director/purpose-scene.ts` → `src/core2/modules/interest-groups.ts` [elections]
- `src/director/tooling/director-year.ts` → `src/core2/opening-finance.ts` [jobs-businesses]

**left as it was: moving it through the other engine's entry broke a load-order check (a file that loads alone on main fails), or the name is read while the module loads, or the entry already exports a different symbol under that name, or it is a default or namespace import** (1):

- `src/director/play-modules.ts` → `src/core2/modules/corruption.ts` [laws]

## news (6)

**a file the History, Past-and-Day-One or Talk sessions own, or a target of theirs (skip lists)** (4):

- `src/core2/modules/news.ts` → `src/core2/heard-claims.ts` [people]
- `src/core2/modules/press.ts` → `src/core2/modules/record.ts` [people]
- `src/core2/modules/press.ts` → `src/core2/opening-capital.ts` [jobs-businesses]
- `src/core2/press-desk.ts` → `src/core2/past-public.ts` [past]

**left as it was: moving it through the other engine's entry broke a load-order check (a file that loads alone on main fails), or the name is read while the module loads, or the entry already exports a different symbol under that name, or it is a default or namespace import** (2):

- `src/core2/press-money.ts` → `src/core2/living-cost-split.ts` [jobs-businesses]
- `src/core2/press-staff.ts` → `src/core2/public-payroll.ts` [jobs-businesses]

## bodies (4)

**the file is listed in tsconfig.node.json, which may not import outside its list (TS6307)** (1):

- `src/core2/legislature-trait-pack.ts` → `src/core2/trait-packs.ts` [people]

**left as it was: moving it through the other engine's entry broke a load-order check (a file that loads alone on main fails), or the name is read while the module loads, or the entry already exports a different symbol under that name, or it is a default or namespace import** (2):

- `src/core2/modules/legislature.ts` → `src/core2/modules/corruption.ts` [laws]
- `src/core2/modules/legislature.ts` → `src/core2/policy-answers.ts` [laws]

**a file the History, Past-and-Day-One or Talk sessions own, or a target of theirs (skip lists)** (1):

- `src/core2/modules/legislature.ts` → `src/core2/modules/record.ts` [people]

## english (4)

**left as it was: moving it through the other engine's entry broke a load-order check (a file that loads alone on main fails), or the name is read while the module loads, or the entry already exports a different symbol under that name, or it is a default or namespace import** (4):

- `src/english/mined/conversation-bank.ts` → `src/director/data/conversation-rules.json` [director]
- `src/english/mined/journal-bank.ts` → `src/director/data/journal-rows.json` [director]
- `src/english/mined/scene-bank.ts` → `src/director/data/bring-it-up-rows.json` [director]
- `src/english/mined/scene-bank.ts` → `src/director/data/scene-rows.json` [director]

## Import cycles left (queue item 2; guard baseline 1210 edges in 239 files, `tests/guards/import-cycles-baseline.json`)

The largest cycle holds 218 files (main: 214 at the start of the stack; the stack's own moves raised it to 229, `reach-17` took it down). What is left, by cause:

- **The front doors themselves.** 162 of the cycle's edges are `export ... from` lines in engine entry files (`laws-in-force.ts`, `budgets-treasury.ts`, `modules/people.ts`, `modules/elections.ts` and others). They are the front-door design (item 4): dropping them sends every importer back inside the engine, which is the reach-in count going up. They stay.
- **`modules/residents.ts` and `residents-economy.ts`** (19 and 9 in-cycle edges through `law-reach/group-b-people.ts`): the 3,000-line module keeps the counted-residents runtime in a module-level map the economy file reads. Cutting it means moving `ResidentsRuntime` (a 120-line interface over eight local types) and its map into a leaf; a cut that size is its own item, not a side cut.
- **`choice.ts` to `state.ts`** (14): `choice.ts` calls `coreAPI` for each chosen act. It needs the act path split out of the chooser, which is the Talk and decisions engine's call.
- **`pre-start.ts` to `state.ts`, `electorate-places.ts` to `electorate-century.ts`** (11 each): both are Past and Day One's files, left to that session.
- **`modules/regional.ts` to `national-events.ts`, `counted-income-fifth.ts` to `modules/laws.ts`, `death-cause.ts` to `modules/laws.ts`** (6, 5, 4): each reads one function from a module that is itself in the cycle; the fix is moving that function to a leaf, one file per cut.
- **Constants:** only 39 cyclic edges were pure literal constants; 8 are cut (`reach-16`), the rest sit in files `modules/jobs.ts`, `laws.ts` and `campaigns.ts` that the goal says to skip.
