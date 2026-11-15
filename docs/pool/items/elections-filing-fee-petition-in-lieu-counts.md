---
id: elections-filing-fee-petition-in-lieu-counts
title: "A candidate who cannot pay the filing fee may file by the petition the law allows in its place, with a signature count from the place's row"
area: elections
kind: feature
priority: 2
size: M
status: open
standard: 2
after: elections-filing-fee-paid
blocked-on:
model: sonnet
effort: medium
root: none
source: carry of #8722 (PR #9153), account lead ruling Nov 14
lead: wire-elections
---

**What.** Where a place's law lets a petition stand in for the filing fee, a candidate short of the fee should be offered the petition, not turned away. #9153 charges the fee and drops it where the row's own signature count is the one the candidate already gathers (31 rows). 41 fee rows allow a petition but give no usable count, so a short candidate is refused there: 21 rows with `petitionInLieuOfFee: true` and a count only in text or none (Minnesota, Kansas, Michigan, Texas and others, California's "1,000 in-lieu signatures replace the fee"), and 20 rows where the law allows it only "with a showing of inability to pay". Seen: at the filing counter, where the clerk offers the signatures a candidate short of the fee may gather instead.

**Cause.** Found in code: `feeOf` in `src/core2/modules/elections.ts` returns the fee for every row it does not waive, and `petitionRule` (same file) reads `petitionInLieuOfFee` only to say the petition is "none-in-law" when the row has no number. The in-lieu count sits in `signatureFormula` text in `data/research/elections/filing-requirements.json` (for example US-CA stateLegislative: "1,000 in-lieu signatures replace the fee"), so no engine can read it. The hardship rows carry the condition as the string value of `petitionInLieuOfFee`.

**Fix.** Add a numeric `inLieuSignatures` to each of the 41 rows from the cited statute text (researcher), and for the 20 hardship rows add the showing as a record the candidate can make (a person whose cash is under the fee holds it). Read it in `filingRequirements` beside `feeMinor`; where the candidate is short and the row has it, `fileCandidacy` files them as petitioning with that count and takes no fee; the clerk says the route (the Words lead's "file with signatures instead" lines in `data/english/parts/scene-talk.json`, move `tell-petition-instead`), and the player's reply "Give me the petition forms" opens the petition. The world's decision to run (`weighs` in `src/core2/modules/candidacy.ts`) counts the route as paying the fee.

**Time box.** 4 hours for one Sonnet session plus the research pass on the 41 rows.

**Rules.** No dice: who takes the route is their cash against the fee. One rule, all 56 places: the counts are data in the filing rows. Every number sourced.

**Done when.** A second session plays a place with an in-lieu route and a candidate short of the fee: the clerk offers the signatures, the petition opens at the row's count, no fee is charged, and the Campaign tab shows the signatures; names the place and seed. A test pins one place with and one without the route.

**Waits on.** elections-filing-fee-paid (#9153).

**Files.** src/core2/modules/elections.ts, src/core2/modules/candidacy.ts, src/director/filing-visit.ts, data/research/elections/filing-requirements.json, data/english/parts/scene-talk.json

**Notes.** Filed by the #9153 carry thread, Nov 14.
