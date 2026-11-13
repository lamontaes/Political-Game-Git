---
id: core-life-record-part-15-a-childs-other-parent-is-a-partner
title: "The life record, part 15: a child's other parent is a past partner, so no child comes first"
area: people
kind: feature
priority: 1
size: S
status: merged
standard: 2
claimed-by: opus-lr
pr: #8957
after: core-life-record-part-6-the-past-holds-what-happened-between-people
blocked-on:
lead: lives
model: sonnet
effort: medium
root: design-life-record
source: gap sheet, Nov 12, 2026 (Fable A), filed by the Life records builder opus-lr
checked: opus-lr 2026-11-12
merged-at: 2026-11-13T03:59:15.643Z
---

**What.** Seen (gap sheet, Nov 12, row 11; Kaibito, Arizona, seed 7c1e5a90b3d24f68): a 36-year-old's first child was born when she was 15, with no partner record for either child's other parent. A child's other parent is made as a person, but nothing says the two were ever together. Part 6's earlier partner can then name someone else. Seen: a parent's card, which tells the partner before the child.

**Cause.** Found in code: `src/core2/opening-kin.ts` (lines 689 to 723) makes the other parent as a husk person with the relation `other-parent` (`parentOf(second, child, R.otherParent)`), and `src/core2/population.ts` (lines 1756 to 1775) turns the relation into a `family:other-parent` fact only; no partnership record is written for a past couple, so `lifeOf` (`src/core2/person-life.ts` line 406) tells a child with no partner before it. #8670's `earlierPartnership` draws a new name for someone living alone, which can disagree with the child's other parent. The age of 15 is the tail of `firstBirthAge(birthYear) + normal * kinFirstBirthAgeSdYears`, floored at the table's minimum (`opening-kin.ts` lines 376 and 498).

**Fix.** In #8670's `pastPartnersFor` (proposed on #8670, 20:34Z Nov 12): where the person has a child whose other parent is not their present partner, that other parent is the earlier partner, named from the husk record, begun before the first child's birth, ended by the same chain and never before the child's birth, with the other parent's id in `personIds`. Check the first-birth floor against the fertility table's own lowest age band (`OPENING_KIN.fertilityByAge`) and raise it only if the table says so.

**Time box.** 3 hours for one Sonnet session, after #8670 merges (or as a pull request into its branch).

**Rules.** Two-level population: the other parent stays a husk until met and gets no full past. No dice: the end of the partnership comes from the chain and the person's seeded line. Story writes the lines for the partner spots.

**Done when.** A test in three drawn places opens every town adult with a child: none has a child before a partnership with that child's other parent, and the earlier partner's name is the other parent's. A second session opens such a card on main and sees the partner told before the child.

**Waits on.** Part 6 (#8670) merged, or a pull request into its branch.

**Files.** src/core2/past-partners.ts (new), src/core2/opening-kin.ts
