---
id: words-filing-reply-seat-as-member-test-disagrees-topstone
title: "The filing counter's 'file' reply says the seat as one member ('file for selectman') while its test expects the body ('the selectmen'), red at Topstone, Connecticut"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
after:
blocked-on:
model: sonnet
effort: low
root: none
source: found by the #9153 filing-fee carry thread, Nov 14
lead: words
---

**What.** `src/bench/filing-visit-talk.test.ts` fails on the clean train (9ed4bf9c) at Topstone, Connecticut (0976400) with `GOLDEN_PATH_SEED=644cb35f99f72b1b8f7f`: the file reply reads "Then I'll file for selectman." and the test expects it to contain `seatSaid(contest.seat, { first: false })`, which is "the selectmen". The test draws its seed (`randomBytes`), so it is red only when a draw lands on a board of members whose title is a member word. Seen: the filing counter in a Connecticut town, where the player's reply names the seat.

**Cause.** Found in code: `seatSaid` in `src/english/journal-words.ts` has two forms, as a body (`asMember` off, "the selectmen") and as the candidate's own seat (`asMember: true`, "file for selectman", #8750); the counter's reply is worded as the member, and the assertion at `src/bench/filing-visit-talk.test.ts` line 185 still expects the body form.

**Fix.** Make the assertion read the form the reply is worded in (`seatSaid(contest.seat!, { first: false, asMember: true })` for the file reply), and pin the test to named places and fixed seeds with an explicit timeout (skill `pinned-tests`), Topstone CT with seed 644cb35f99f72b1b8f7f among them.

**Time box.** 1 hour.

**Rules.** No dice. One rule, all 56 places: no place is named in the logic.

**Done when.** A second session runs the test on main with the Topstone seed and it passes, and a file reply that names a member seat is asserted in the member form; names the place and seed.

**Waits on.** Nothing.

**Files.** src/bench/filing-visit-talk.test.ts

**Notes.** Reproduced on the clean train 9ed4bf9c at Topstone CT, seed 644cb35f99f72b1b8f7f, by the #9153 carry thread (it is not from #9153). Not yet confirmed whether the second failure seen at seed 666a506f2d9e131799f2 is the same cause.
