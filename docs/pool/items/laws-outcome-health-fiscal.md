---
id: laws-outcome-health-fiscal
title: "Medicaid expansion, its work requirement, universal preschool, the grocery sales-tax exemption and the sales tax reach households and sellers as a read"
area: laws
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/laws-outcome-health-fiscal
pr: #5179
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:54:26.933Z
---

**What.** Medicaid expansion and its work requirement now reach people as money: the state treasury pays each covered adult the average monthly medical spending, named adults to their own account and counted adults through the town's residents account times their weights. The work requirement stops the payment for the adults it reaches by hours, income and young children, and a repeal ends it. The sales tax and the grocery exemption already reach every seller and buyer through the purchase-tax engine, and universal preschool now pays the household of each 3- and 4-year-old the state's spending per enrolled child ($7,888, NIEER 2024) times an estimated 70% enrolled share.

**Rules.** An effect is a read: the expansion pays through the accounts journal, and the work requirement is read by that payment, not written as a second record. No dice: coverage follows age, income, hours and children from each person's records. The chain is the acceptance: law, obligation, payment received. One rule, all 56 places: the law-reach test draws a place from all 56.

**Done when.** In `law-reach-group-b.test.ts` (a drawn place, seed named in the failure message) the expansion opens a coverage obligation for every eligible named adult, a month on each has been paid, the work requirement ends the obligation of every adult it reaches, and a repeal ends all of them. The owner plays it: pass Medicaid expansion and see a low-income neighbor's medical spending paid by the state.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-money.ts, src/core2/data/laws/reach-group-b.json, src/core2/data/laws/reach-group-b-parameters.json, src/core2/law-reach-group-b.test.ts

**Notes.** Preschool is a payment, not an enrollment (stopgap SG-GOV-REACH-B-preschool-enrollment stays open: no child is recorded as enrolled and no child-care bill changes). Medicaid stays registered as SG-GOV-REACH-B-medicaid-coverage: the payment is average spending, not an itemized bill.
