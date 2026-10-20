---
id: gov-service-charges-table1-gaps
title: "Find why the Census item-code sums differ from Table 1 by more than 10 percent in HI, KY, MO, OK, SC, TN and TX"
area: gov
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Ten state-and-local rows in the 2022 service-charge export differ from Census Table 1 (22slsstab1.xlsx) by more than 10 percent. Find the item codes that explain each gap, or record that Table 1 uses a rule the item-code file does not carry.

**Rules.** Read only `data/source/government-finances/census-tables/` and the technical documentation. No place named in logic. Any code added to `scripts/research/export-service-charges-2022.py` is sourced by its documentation line.

**Done when.** Each of the ten rows below matches Table 1 within 10 percent, or the item says why no item-code sum can.

**Files.** `scripts/research/export-service-charges-2022.py`, `data/source/government-finances/census-tables/`.

**Notes.** The gaps (item codes against Table 1):

- HI local miscellaneous: item codes $308M against Table 1 $388M (0.794, difference $-80M)
- KY local current charges: item codes $2,992M against Table 1 $2,627M (1.139, difference $+365M)
- MO local current charges: item codes $6,295M against Table 1 $5,616M (1.121, difference $+679M)
- MO local miscellaneous: item codes $1,677M against Table 1 $1,453M (1.154, difference $+224M)
- OK state miscellaneous: item codes $2,652M against Table 1 $2,982M (0.889, difference $-330M)
- SC local current charges: item codes $5,052M against Table 1 $8,404M (0.601, difference $-3,351M)
- SC local miscellaneous: item codes $1,095M against Table 1 $1,263M (0.867, difference $-167M)
- TN state miscellaneous: item codes $1,428M against Table 1 $2,537M (0.563, difference $-1,109M)
- TN local miscellaneous: item codes $1,503M against Table 1 $1,812M (0.830, difference $-309M)
- TX state miscellaneous: item codes $17,634M against Table 1 $20,744M (0.850, difference $-3,110M)

Ruled out (Oct 20): a missing U code (the export lists U01 U11 U20 U30 U40 U41 U50 U95 U99; for several states the sum of every U code in the file equals the sum used). Texas state: Table 1 interest earnings is $5,122M against U20 $2,012M in the file, and that $3,110M difference equals the miscellaneous gap exactly, so Table 1 books interest from more than U20 (likely insurance-trust and utility interest). The Y and X codes (Y02 $13M, Y12 $382M) are too small to carry it, and no combination of small Y/X/W/Z codes matched; the near-matches were spurious. Next step: read the Table 1 footnotes in the technical documentation for which item codes feed interest earnings.
