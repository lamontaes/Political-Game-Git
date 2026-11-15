---
id: gov-serve-ask-yes-drops-the-reason-given
title: "A running mate who said no for their own race says yes a month later without a word about that race"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: words
source: Second reader on #9369 (Nov 15 19:48Z, rules 111 and 113); filed by the story builder (bill stages)
standard: 2
model: opus
effort: medium
root: none
---

**What.** Asked to run for lieutenant governor, Kyle Vazquez says no: "I've got my own name on a ballot this year. I can't split myself in two." and "Ask me again after my own election." Asked again a month on, he says "Since we talked, I've thought about it, Arthur. Yes, I'll run with you." His own race is still on the record at the same weight, and the yes says nothing of it. The player sees a person drop the reason they gave without saying why. Seen: the running-mate ask, asked again a month after a no.

**Cause.** Measured: src/director/serve-ask-scene.test.ts, Santa Rita, Guam (territory:GU:santa-rita), seed 8d04db587cd640d7, on the Train at 892427ec. Terms at the no: base 0.35, ambition 0.34, stranger -0.15, own-seat -0.30, own-race -0.30, question 0.20, standing -0.30 (sum -0.26). Terms a month on: base 0.35, ambition 0.34, known 0.04, own-seat -0.30, own-race -0.30, question 0.20, standing -0.24 (sum above zero). Found in code: the no says only the term that weighed most (`standing.reason` in src/core2/modules/serve-asks.ts, "own-race"), and the yes says only what moved most since (`movedSince`, "met", read as the fact `changed-met` in `composeBinding`, src/director/purpose-scene.ts, which places "Since we talked, I've thought about it, {self}. Yes, I'll run with you."). The no came from several terms together (own race and not knowing the player); meeting removed one and the sum crossed.

Account lead's reading (Nov 15 19:51Z), not the owner's words: the yes is right, because it comes from the person's own terms, and no second rule may sit on top of the sum. The fault is in what is said. Either the first no says the reasons that actually carried it, or the yes says what moved and that the own race still weighs. Which one, and the words, is for this thread and the Words lead.

**Fix.** In `composeBinding` (src/director/purpose-scene.ts), pass the terms the no rested on as facts, read from the serve-asks row's own standing at the no (`reasonBefore` and the row's terms), so the lines can be placed by them. Then either (a) a no that rested on more than one term says the second one too, or (b) a yes after a no whose said reason still weighs at the same value says that reason still stands and what moved (Words lead's lines). No change to the sum in serve-asks.ts. The player sees it in the running-mate ask, asked again.

**Time box.** 2 hours.

**Rules.** No dice and no threshold; the answer stays the sum of the person's own terms (Account lead, Nov 15). Lines are the Words lead's. Never loosen serve-ask-scene.test.ts: the 8d04 case stays a yes.

**Done when.** A second session runs src/director/serve-ask-scene.test.ts at the drawn place Santa Rita, Guam (territory:GU:santa-rita), seed 8d04db587cd640d7, in a played world built by buildBenchWorld: the running-mate ask gets a no, is asked again a month on, and the yes (or the earlier no) names the own race as the record holds it, with the terms printed beside the talk.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/core2/modules/serve-asks.ts, data/english/parts/scene-talk.json, src/director/serve-ask-scene.test.ts
