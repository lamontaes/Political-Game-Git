---
id: tests-donor-meeting-no-host-at-turner-maine
title: "The donor-meeting test draws its place from the clock and fails where no race is open for filing (Turner, Maine on a named seed)"
area: gov
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by:
pr: 9291
after:
blocked-on:
lead: wire-office
model: sonnet
effort: medium
root: none
source: found by the Account lead's gate of the I Liyang fix, Nov 14, 2026
---

**What.** `src/core2/donor-meeting.test.ts` "asks each person in the host's room for money and names every gift" fails on the pushed train, with and without the I Liyang change, with GOLDEN_PATH_SEED=598046547d276dc32779bfc36706a9edcf70f8e6b592e02be6099c19b4c2e507: "no candidate had a host: Turner, Maine, US-ME (2377765), place seed f960399f48c0a61fa37ee8b9a4fa3052919505036b9e6e52e33653bb72efdf61: expected 0 to be greater than 0". Without a seed the test hashes the clock (`donor-meeting:${Date.now()}`), so it passes or fails by when it runs. Seen: the failure reproduces in about three seconds with the command `GOLDEN_PATH_SEED=598046547d276dc32779bfc36706a9edcf70f8e6b592e02be6099c19b4c2e507 npx vitest run src/core2/donor-meeting.test.ts`.

**Cause.** Found in code: the test's start date is 2026-01-05 and at Turner, Maine on that seed no contest is open for filing on that date (`openContests(api)` returns none), so no candidate files, `checked` stays 0 and the closing message ("no candidate had a host") blames the host rule for what is a missing race. The host rule in src/core2/modules/campaigns.ts (`donorMeetingHost`) is not at fault. A 40-place scan on 2026-01-05 found places with a local contest open for filing, so the test's premise was true only in some drawn places and its place came from the clock.

**Fix.** Pin the test to West Rutland, Vermont (5082375, place seed bab0439bc0a3ea68b20fdb66b5bdc16d1954c78c40a8a6985742879912ec3f88), the contest `contest:seat:gus2025:176640:board:0:2026-03-03`, which is open for filing on 2026-01-05, and the town's richest resident old enough to file. It does no passing over: if the contest is not open it fails with "no contest open for filing at West Rutland, US-VT on 2026-01-05", and if the candidate cannot file or has no host it says so. The room at the pinned place raises money (11 givers), checked against every record the old test checked. It runs in about three seconds of test time with a 60 second limit.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what is measured, set the state honestly with a one-line note, and stop.

**Rules.** No dice. One rule, all 56 places: name each place with its seed. Never loosen an assertion to get green.

**Done when.** A second session runs `npx vitest run src/core2/donor-meeting.test.ts` and sees it pass at the pinned place with the place and seed named in any failure, and sees that the Turner, Maine failure came from a start date with no race open for filing.

**Waits on.** Nothing.

**Files.** src/core2/donor-meeting.test.ts, src/core2/modules/campaigns.ts

**Notes.** Built locally on branch donor-meeting-pin; pushed after #9268 folds. Earlier plan, now done: read `donorMeetingHost` for the ten candidates at Turner, Maine on that seed and write down why each has no host in this item's Notes; then pin the test to named places chosen from data (the pinned-tests skill), keeping a place with no possible host out of its set, and fix the engine if a host was wrongly refused. Filed by hand on the branch of the PR that found it, as the thread rule says.
