---
id: laws-budget-line-pay-cut-floors-clinic-wages-to-a-cent
title: "A county's small health budget cut drops a private clinic worker's pay to one cent an hour"
area: laws
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: Found by the premiums thread tracing why a policyholder lost their plan while employed, Nov 16 2026
lead: laws-effects
standard: 2
model: opus
effort: medium
root: none
---

**What.** When a county trims its health and hospitals line by under 2%, the town's share of the whole cut is taken out of the pay of the few workers at the town's clinics and hospitals. The cut is several times their payroll, so each one's hourly rate is floored at one cent while they keep working. Their pay goes from about $229 a day to six cents, which no employer would do and which a worker would quit over. Seen: a clinic worker's Money screen and dev mode's pay trace show the rate fall to one cent the day the county's budget is adopted.

**Cause.** Found in code: `scalePayroll` in src/core2/law-reach/group-b-money.ts, called by `runBudgetLine` in src/core2/law-reach/group-b.ts. Measured: at Gillette, Wyoming (5631855), seed cov-5631855, by a script that reads the `core2-law-reach-b-v1` tables after `advanceCore` to 2025-03-19. On 2025-03-18 the county:56005 budget set the town's healthAndHospitals line 245,345,012 minor units under its base (level 0.983 of a base of 14,765,839,537). The line's payroll classifications are `service:public-health`, `service:hospital` and `service:clinic`, and the jobs found there that day were 5 records standing for 10 workers, with a base payroll of 52,365 minor units a day by record (126,792 weighted). The cut times `healthCompensationShare` times the modeled share, over that payroll for a year, gave a factor of -6.02, and `Math.max(1, ...)` floored each rate at 1 minor unit: row `pay|budget-line:healthAndHospitals|work-relationship_a8ac25b50ab2e52e` (person_e697e8cc64893ef9 at organization_03069fd9bd897f7b, Patterson Family Clinic, a private clinic) holds `appliedMinor: 1, factor: -6.0186`, from 3,558 an hour. Three faults meet: the whole town share of a county line is laid on the private clinics in town, though most of the line pays the county's own health department; the payroll counts each counted job once, not times the workers its household stands for; and a factor at or below zero is floored instead of being impossible.

**Fix.** In `scalePayroll`, spread only the part of the line's change that pays the jobs it finds: the line's compensation share of the government's own health payroll (the line's payees in src/core2/data/budgets/spending-payees.json), weight each counted job's base by its household's weight as `staffOf` does, and keep a private employer out of a government line's pay unless the line pays it (a clinic is paid by insurers and patients; a Medicaid or county contract reaches it through the payment engine, not its wage rate). A factor at or below zero then cannot arise; the change that is left reaches staffing through the business engine's labor bill. The player sees it on a clinic worker's Money screen and in dev mode's pay trace.

**Time box.** 4 hours.

**Rules.** One model, two tiers: a counted job's base pay counts once for each worker its household stands for. Wire to the world: a government line changes only the pay of the workers it actually funds.

**Done when.** In a drawn place, Gillette, Wyoming (5631855, seed cov-5631855) and two more named in the PR body, a county budget that moves its health and hospitals line leaves every private clinic worker's hourly rate where the clinic set it, and a public health worker's rate moves by the line's change over the weighted payroll, by pay row id. A second session sees it in the running game.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/law-reach/group-b.ts, src/core2/data/laws/reach-group-b.json

**Notes.**

- Nov 16, premiums thread: the same worker's employer went from 29 to 8 staff on 2025-02-01 (the business staffing engine), which is a separate change; the pay was untouched by it (hours 6.43 a day and 3,558 an hour until 2025-03-18). Not the layoffs thread's hours or staffing engine.
