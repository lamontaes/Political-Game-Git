---
id: people-child-care-and-enrollment
title: "Child care and school enrollment on children, so preschool and vouchers change a family's choice"
area: people
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found while building laws-family-school; stopgaps SG-GOV-REACH-B-preschool-enrollment and SG-GOV-REACH-B-voucher-payment"
---

**What.** Children have no school or child-care enrollment. Private tuition is an aggregate bill spread over every family with school-age children, and nobody pays for child care. Add an enrollment record on named children and counted groups (public school, private school, pre-K, child care, home), chosen by the family from cost, distance and their own situation, so universal pre-K enrolls 3- and 4-year-olds and lowers the family's child-care bill, and a voucher can move a child from public to private school.

**Rules.** No dice; one model, two tiers; an effect is a read (the family's choice reads the price and the law); numbers in the parameter table with sources.

**Done when.** In a one-year run of a drawn place, a named 4-year-old is enrolled after the pre-K law and the family's child-care payment falls by record id; a named child changes schools after a voucher.

**Files.** `src/core2/modules/school.ts`, `src/core2/opening-private-tuition.ts`, `src/core2/law-reach/group-b-school.ts`, `src/core2/data/`.

**Notes.** The voucher is paid today to families that already pay private tuition (`group-b-school.ts`).
