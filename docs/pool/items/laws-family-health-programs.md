---
id: laws-family-health-programs
title: "Assistance and Medicaid work requirements decide who the welfare line pays"
area: laws
kind: wiring
priority: 1
size: M
status: done
claimed-by: claude/laws-family-health-programs
pr: #4415
blocked-on:
milestone:
source: "split of laws-remaining-families (Oct 15)"
---

**What.** The welfare and Medicaid budget line pays a monthly benefit to eligible named households (`payBenefits`, group-b-money.ts). Make that selection read the work-requirement laws in force (assistance work requirement, Medicaid work requirement): a person the law reaches by hours and income is not paid or is time-limited, instead of the law writing a generic record beside the benefit. Medicaid expansion likewise widens or narrows who the line reaches.

**Rules.** No dice; an effect is a read; the chain is the acceptance; one rule, all 56 places; numbers in the parameter table; replace, never layer (the generic reach row for each law that the line now reads is removed).

**Done when.** In a played year in a drawn place, with the line raised and the law enacted then repealed: a named person the law reaches is paid before and not after (and paid again after repeal), by record id of the obligation; the director line or the person's recorded reason cites where they heard. `law-reach-group-b.test.ts` shows it; the generic rows for these laws are gone.

**Files.** src/core2/law-reach/group-b.ts, group-b-money.ts, src/core2/data/laws/reach-group-b.json, src/core2/data/stopgaps.json.

**Notes.** Stopgaps SG-GOV-REACH-B-assistance-benefits and SG-GOV-REACH-B-medicaid-coverage name what is faked today.
