---
id: tests-donor-meeting-no-host-at-turner-maine
title: "The donor-meeting test draws its place from the clock and no candidate has a host in some places (Turner, Maine on a named seed)"
area: gov
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: wire-office
model: sonnet
effort: medium
root: none
source: found by the Account lead's gate of the I Liyang fix, Nov 14, 2026
---

**What.** `src/core2/donor-meeting.test.ts` "asks each person in the host's room for money and names every gift" fails on the pushed train, with and without the I Liyang change, with GOLDEN_PATH_SEED=598046547d276dc32779bfc36706a9edcf70f8e6b592e02be6099c19b4c2e507: "no candidate had a host: Turner, Maine, US-ME (2377765), place seed f960399f48c0a61fa37ee8b9a4fa3052919505036b9e6e52e33653bb72efdf61: expected 0 to be greater than 0". Without a seed the test hashes the clock (`donor-meeting:${Date.now()}`), so it passes or fails by when it runs. Seen: the failure reproduces in about three seconds with the command `GOLDEN_PATH_SEED=598046547d276dc32779bfc36706a9edcf70f8e6b592e02be6099c19b4c2e507 npx vitest run src/core2/donor-meeting.test.ts`.

**Cause.** Needs cause. Measured: on the train at b4c11bc5b5 plus later folds, the seed above draws Turner, Maine and none of the ten candidates the test tries has a host for a donor meeting (`donorMeetingHost` returns nothing). Two readings, neither traced: the town has no resident the candidates know well enough to host, which is a place the test should pass over and name, or a host rule in src/core2/modules/campaigns.ts excludes them wrongly.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what is measured, set the state honestly with a one-line note, and stop.

**Rules.** No dice. One rule, all 56 places: name each place with its seed. Never loosen an assertion to get green.

**Done when.** A second session runs the test with the seed above and with the pinned seed and sees it pass, with each place and seed named in the output, or reads in the Notes why Turner, Maine has no host.

**Waits on.** Nothing.

**Files.** src/core2/donor-meeting.test.ts, src/core2/modules/campaigns.ts

**Notes.** First step, no code change: read `donorMeetingHost` for the ten candidates at Turner, Maine on that seed and write down why each has no host in this item's Notes; then pin the test to named places chosen from data (the pinned-tests skill), keeping a place with no possible host out of its set, and fix the engine if a host was wrongly refused. Filed by hand on the branch of the PR that found it, as the thread rule says.
