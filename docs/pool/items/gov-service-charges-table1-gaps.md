---
id: gov-service-charges-table1-gaps
title: "Find why the Census item-code sums differ from Table 1 by more than 10 percent in HI, KY, MO, OK, SC, TN and TX"
area: gov
kind: research
priority: 3
size: S
status: claimed
claimed-by: claude/fs11vb-sc
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:07:14.365Z
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

Oct 20 (fs11vb): traced to the sub-line, with `scripts/research/compare-service-charges-table1.py` (it compares each item-code group with Table 1's own sub-line, thousands of dollars, and prints only the lines off by more than 10 percent). Every gap sits in one or two sub-lines, and they fall in two kinds.

Item codes above Table 1 (the codes carry what Table 1 nets out). Table 1's footnote 1 says "Duplicative intergovernmental transactions are excluded"; the item-code file carries them gross. KY local sewerage A80 $1,174M against $808M (-$365M, the whole -$365M gap); MO local hospitals A36 $2,816M against $2,277M (-$538M), other charges -$98M, housing -$29M, other general revenue -$197M (the MO charges gap -$679M and miscellaneous gap -$224M). These are local governments buying services from each other (sewer districts, hospital districts). No item-code sum can net them: the file does not carry the duplicated amounts.

Table 1 above the item codes (Table 1 holds amounts the A and U groups do not). SC local hospitals $5,991M against A36 $2,572M (+$3,419M, the SC charges gap of +$3,351M less small offsets); TX state interest earnings $5,122M against U20 $2,012M (+$3,110M, which is the whole TX miscellaneous gap); OK state interest +$462M (of +$330M); TN state other general revenue +$1,062M and interest +$46M; TN local other general revenue +$304M; HI local other general revenue +$80M; SC local interest +$70M, special assessments +$16M, sale of property +$20M. Exclusion of duplicates would lower Table 1, not raise it, so the difference is extra revenue Table 1 books in these lines. A search of every set of up to three item codes (any prefix, within $1.5M of the gap) found only sets that differ from row to row (E, F, M and X codes), none the same code in two rows, so the match is by chance. The technical documentation lists no footnote that adds codes to these lines. No item-code sum can explain them from these files; the open question for a later read is the Census methodology PDF (`2022_methodology.pdf`), which this checkout cannot reach.

What the export does with this: nothing changes in `service-charges-2022.json`. Its `againstTable1` ratio already shows each row's gap, and shares for these rows are item-code shares. If the game wants these ten rows to agree with Table 1, take their shares from Table 1's own sub-lines (which exist for every service) instead of the item codes; that is a data change for the owner's money area, not made here.
