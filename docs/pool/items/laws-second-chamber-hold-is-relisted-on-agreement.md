---
id: laws-second-chamber-hold-is-relisted-on-agreement
title: "A hold in a bill's second chamber is re-listed when its chair agrees in the sponsor's scene"
area: laws
kind: wiring
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: design-story-director
source: added by hand, from the builder of laws-hold-record-names-the-sponsor
---

**What.** When a committee holds a bill, the sponsor can ask the chair for a hearing in a scene, and if the chair agrees the bill goes back before the committee (#8972). That works only for a hold in the bill's first chamber. In a bill's second chamber (a House bill held by the Senate committee, say) the chair can agree in the same scene and nothing happens: the reply is recorded, the bill stays failed, and the scene has made a promise the engine does not keep. Re-list a second-chamber hold on the chair's agreement without counting the first chamber's floor vote twice. Seen: a chair who agrees in the sponsor's scene after a second-chamber hold sets a hearing and the bill goes back before that committee.

**Cause.** Found in code: `holdCommittee` in src/core2/modules/legislature.ts runs only the first chamber's committee, so reopenHeldBill (added by #8972) returns early when the hold's chamber is not chambersOf(bill)[0], and setting the bill back to drafted lets holdVote run the first chamber's floor vote a second time (a second set of vote rows and a second settling of bribes). Found by the builder of laws-hold-record-names-the-sponsor on seed eee5, Tres Arroyos, New Mexico (a Senate hold; the House committee was re-run instead).

**Fix.** Give holdCommittee (or a small sibling beside it) a chamber argument, so the reopened hold's own chamber's committee is the one that runs, and put the bill back where the first chamber's floor vote is already on the record (its status after that vote) instead of to drafted, so the vote is not taken again. Read the agreement the same way as now (the per-bill row `hearing:<bill>` that committeeStage reads), and drop the early return in reopenHeldBill. Add a test in src/core2/second-chamber-hold.test.ts that picks a second-chamber hold in a drawn place, applies the chair's agreeing scene.reply, and shows one committee-hearing record for that chamber, the first chamber's vote rows unchanged in count, and no second settled bribe.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the chair's decision stays what laws-hold-record-names-the-sponsor made it (an agreed reply is one more recorded reason, never a roll). One engine: reuse committeeStage and holdCommittee, add no second committee path. One rule, all 56 places: the test draws its place from all 56 and names the place and seed.

**Done when.** A second session, not the builder, plays a place drawn from all 56 with a seed nobody chose (`buildBenchWorld`, both named), finds a bill held by its second chamber's committee, answers yes as the chair in the sponsor's scene (or applies the agreeing scene.reply), and sees a committee-hearing record for that chamber, with the first chamber's vote count on the bill unchanged. src/core2/second-chamber-hold.test.ts shows it with the place and seed named.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/second-chamber-hold.test.ts (new)
