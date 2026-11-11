---
id: elections-one-person-two-seats-same-body
title: "A resident filed for one council seat ends up on the ballot for a second seat of the same council"
area: elections
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: elections
standard: 2
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
---

**What.** A resident filed for one council seat ends up on the ballot for a second seat of the same council. In the played world for Pine Village, Indiana (bench seed for place 1860084, test draw seed 481e7f68661a9c52ac455d9d17f5f6d044064bd2:1 of `src/director/donor-ask-scene.test.ts` on branch words/donor-ask-scene), the test filed person_100ab96a014f4908, who had no filing, for the council seat 0 contest of the 2025-11-04 election. Two days later the same person had a second campaign, for council seat 4 of the same council (filing:contest:seat:gus2025:193267:council:4:2025-11-04:person_100ab96a014f4908), and a donor gave to both on 2025-01-23. A person runs for one seat of a body at a time. The first filing was made by a test on an unmerged branch, so the second filing may be a fixture artifact.

**Cause.** Found in code: the one eligibility check every filing passes, `checkEligibility` in `src/core2/modules/elections.ts` (line 1034, called by `fileCandidacy` at line 1199), refuses a second filing only in the same contest: its `already-filed` rule (line 1094) is "one filing per contest". Nothing refuses a person who already holds a live filing for another seat of the same body on the same election day. The candidacy engine keeps someone out of a second seat only while it weighs: `committedOn` in `src/core2/modules/candidacy.ts` (line 1104), read by `weighContest` (line 943). `fileRunners` (line 1233) files the runners of a weighing done earlier without asking again, when the weighing is from today, through `fileFor` (line 829). So in the Pine Village case, a person whom the engine had already decided would run for council seat 4 was filed for it two days after the test filed them, by hand, for seat 0. Any other route into `fileCandidacy` (the player's filing, a party's or a retiring holder's ask) has the same gap.

**Fix.** Add a rule to `checkEligibility` beside `already-filed`: `one-seat-per-body`, met when the person holds no filing that is not withdrawn or refused in another contest for an office of the same body on the same election date (read the contests `byDate` and the filings `byContest`, as `committedOn` does). Name the other filing in `actual`. A refusal then reaches every filing route at once, the candidacy engine's `fileFor` included, which already turns a refusal into a decision with `unmet`. Add `src/core2/elections.test.ts` (new): in a drawn place with a council of several seats, file one person for seat 0, then try seat 1 the same day, and see it refused with `one-seat-per-body`.

**Time box.** 1 hour for one Sonnet session.

**Rules.** One rule, all 56 places: the guard holds for any body with several seats. Ask why: name the record that created the second filing. No dice.

**Done when.** A second session plays to a council filing deadline in a drawn place with a council of several seats (named with its seed), files the player for one seat and tries a second seat of the same council, and sees the second refused with the reason on the filing screen. No person holds two live filings for seats of one body on one election day, by filing record id, and the test passes on two fresh seeds.

**Waits on.** Nothing.

**Files.** src/core2/modules/elections.ts, src/core2/modules/candidacy.ts, src/core2/elections.test.ts (new)

**Notes.** TODO

Nov 11 (cause finder for Fable B): read on main d604b3494b. The filing check refuses only a second filing in the same contest. The candidacy engine's own guard runs only while it weighs, so a decision made before a person filed elsewhere is filed anyway. The fix adds the body-wide rule to the one check every filing passes.
