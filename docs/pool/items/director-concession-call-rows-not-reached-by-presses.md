---
id: director-concession-call-rows-not-reached-by-presses
title: "The concession call has no answer yet for a recount, a race as polled or a closer race"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: election-results thread, concession-call press runs, Nov 16 2026
checked:
---

**What.** On election night after a loss, the player can ask the campaign manager "How close was it?" only when the race read (src/director/race-turnout-facts.ts `raceReadFacts`) says the loss was wider than the campaign's own last poll and outside the state's recount rule. That is the only row a player has reached by the page's presses. For every other row the ask isn't offered. Seen: at Amherst, NH (3301220, world seed 2988b829…df4a9) the ask is offered and answered; in a race inside the recount rule or one that came in as polled, it is not offered.

**Cause.** Measured: the Words lead's lines for the other rows were written (/mnt/project-files/words-lead/election-results/concession-close-lines.md), but by the Words rule a line ships only once played by the player's own presses. No press run reached them: Amherst NH (3301220, world seed 2988b829…df4a9, lost wider), Haleyville AL (0132704, world seed ab5f58e9be125c95, won), Saxonburg PA (4268056, lost wider), Harrells NC (3729680, won), Bayard WV (the script never reached its window). Alexander NY, the one automatic-recount loss found by a script, cannot be filed by presses: the counter refuses its council race all through its window (sent to the filing-counter thread). The press player is the script /tmp/claude-0/arrival/press-concede.mts.

**Fix.** Play each row by presses in a race a player can file for, then add its lines as written:

- recount-automatic: "So close the state has to count it again." / "Close enough that the law says count it again."; the player's reply "It was close. I can live on that. Dial it."
- poll-as-polled with recount-none: "About where our poll had it. No surprise in it." / "It came in the way our numbers said it would."
- poll-wider, the second wording: "It wasn't close. Our own poll had it tighter than that."
- poll-closer with recount-none: "Closer than our poll had it. Not close enough to count again."
- recount-offered: no lines yet (Words lead).

Each row adds its gate to the ask's uses. Two lines already in the bank are gated on recount-automatic and wait on the same play: the refusal "Then it's close enough to wait for the last count." and the family's "It's hard to hear it was that close." The Words lead's open question, whether the call is staged at all while a required recount runs, is decided first.

**Time box.** 3 hours for one session.

**Rules.** No count, share or figure in a line (owner, Nov 14). "Close" means inside the state's recount rule and nothing else. Lines played at the exact head by the player's own presses. Review: words.

**Done when.** A second session plays, by the page's presses in a place drawn from all 56, a lost race in each row above and sees the manager's answer to "How close was it?" match the race read, naming place, seed, the result and poll or recount record ids.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/bench/concession-close-call.test.ts

**Notes.** Built on director-concession-call-says-close-when-the-race-was-not.
