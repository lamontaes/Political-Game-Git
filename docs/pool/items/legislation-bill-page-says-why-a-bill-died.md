---
id: legislation-bill-page-says-why-a-bill-died
title: "A bill its committee chair would not hear says only that the chair held it, never why"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/cluster11-bill-page-says-why
pr: #9572
blocked-on:
source: "the lead's relay of the lying thread's 60-run search (Nov 15): 51 of 60 player bills died with no roll call and the page said nothing of why"
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** The committee section of a bill's page prints "The chair held it and did not hear it" and nothing about why, though the committee record keeps the chair's reasons, and the page already words a governor's reasons at the desk. A player whose bill died unheard learns that it was held and not what weighed against it. Seen: the page of any bill a chair held, in a state legislature or Congress.

**Cause.** Measured: at Texas (4846968), seed 8647-mason, by `npx vitest run src/bench/bill-stage-chair-reasons.test.ts`, a state senator's housing bill (right to counsel in eviction) is held by the Senate housing chair on Feb 9, and the page's committee section carried the chair, the votes and the held line but not the chair's `chairReasons` (their views, party and wing against it, their temperament and the sponsor for it), which `billStage` in src/bench/bill-stage.ts never read for a committee.

**Fix.** `billStage` words a held committee's reasons with the one `reasonsOf` wording the desk uses (the chair's position terms, their temperament toward a hearing added to the temperament term, the co-sponsors' pull added to the sponsor's), and the page lists them under "Why the chair held it" with the same `words.reasons` and for or against labels. A committee that heard the bill lists none. No second wording path; nothing invented where the record kept no reasons.

**Time box.** 3 hours for one opus session.

**Rules.** Wording through the English engine's banks for the reason names; one engine; No dice; pinned place and seed in the test. The Words lead and the second reader see the played page at the exact sha.

**Done when.** A second session plays a state senator in a drawn place on a seed it did not choose through buildBenchWorld, drafts bills until one is held by its chair, opens that bill's page and reads the chair's reasons in the same words a governor's reasons at the desk are read in, then opens a bill the chair heard and sees none; the place, seed and bill record id are written down.

**Waits on.** Nothing.

**Files.** src/bench/bill-stage.ts, src/bench/ui/bill-stage.mjs, src/bench/data/controls.json, src/bench/bill-stage-chair-reasons.test.ts (new)

**Notes.** The held-bill scene (`bill-held-chair`) and the stopgap SG-LAW-held-bill-chair-reasons-unread are a separate item.
