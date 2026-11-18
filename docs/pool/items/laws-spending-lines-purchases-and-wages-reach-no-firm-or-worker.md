---
id: laws-spending-lines-purchases-and-wages-reach-no-firm-or-worker
title: "A raised spending line's purchases and wages reach no business or public worker beyond a few in-town dollars"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
source: Account lead thread "Check state and federal laws take effect", Nov 14, 2026 (/mnt/project-files/laws/take-effect.md)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** The contractor and worker shares of a raised spending line are paid to the outside account under "Contractors and suppliers elsewhere" and "Public employees who live elsewhere". Raising Medicare, or a state's fire, corrections or administration line, paid no worker or business by name; administration and parks paid one firm in town a few thousand dollars. A state fire raise reached no one at all, and a state corrections raise funded positions only on the state's own record, with nobody hired. Other state lines reach people as a service level or a benefit, credited to the wrong law, which item laws-budget-line-reach-credited-to-latest-measure covers. Seen: the bill card, a business's books in town, and the Journal of a public worker.

**Cause.** Measured: Eveleth, Minnesota (2719934), world seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, train head 9ed4bf9c4b065f8c4d260fd3431b28e7a35ab936. Each line was raised a tenth by a bill passed through the game's own legislature (`draftBill`, `provisionFor`, dev mode's `decideAt`), signed, and the world run 100 days; the bill's reach was read with `lawReach` over every store at Train 8b6c8903 (probes `/mnt/project-files/laws/probes/budget-lines.ts` and `budget-state.ts`). Medicare H.R. 5 and the state lines HF 4 to HF 13: nearly all of each raise went to the outside account; administration paid $3,851 and parks $1,413 to one firm in town. Found in code: src/core2/budgets-treasury.ts pays the in-town part only to a line's awarded firm (`awarded[line]`, `contractAwarder.award`) and the in-town public payroll; the raise is added to the outside part (`p.outside`), and the `contractors` and `workers` groups are paid to `accounts.main(outside)`. Fire and corrections, found in code: src/core2/data/laws/reach-group-a.json `staffing` lets fire fund positions only at the city and county levels, so a state fire raise funds no one; corrections may fund state positions, but with no corrections employer in the town (`correctionsEmployers`: service:corrections, service:jail) `staffing` in src/core2/law-reach/group-a-staffing.ts puts the positions on the state government's own record and hires no one, while the treasury pays the worker share to the outside account. The state's prison and wildland fire workers live elsewhere; they are the counted public workers the worker share should reach.

**Fix.** Split a raise the way the line's spending is split: the contractor share awards contracts through the existing `contractAwarder` among firms in the line's places by their share of the line's work (in town, firms; elsewhere, the country tier's employer cells), and the worker share raises the public payroll the public employers already pay (src/core2/public-pay-floor.ts and the jobs engine), in town for full and counted workers by the same rule.

**Time box.** 8 hours for one Opus session at medium effort.

**Rules.** One model, two tiers. Money moves only through existing accounts. No dice: who wins a contract is the awarder's own rule.

**Done when.** A second session, not the builder, in a drawn place raises the state's police line by a tenth in dev mode; after the next close, the bill card names businesses or public workers reached with dollars, at least one in town, and twin money shows the treasury's loss arriving at businesses and households.

**Waits on.** Nothing.

**Files.** src/core2/budgets-treasury.ts, src/core2/public-pay-floor.ts, src/core2/modules/jobs.ts
