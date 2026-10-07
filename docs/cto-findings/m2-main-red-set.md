# Main-red set: privacy-goal-answers, quiet-stretch, reach-out-cadence (M2, Oct 7)

Run on main plus #3046 (c42b6fcbb and earlier). No producer or test was changed.

## reach-out-cadence.test.ts (1 case red)

"does not ring every life on the same day for the same evening" fails at line 79: waits.size is 1. Four seeds all hear from somebody after the same number of days. Three or more do find an ask, so reaching out still happens; the spread across lives is gone. This fits the uniform-personality finding M1 has with the CTO (#2051: every generated person shares one personality and goal), since the cadence reads the two people's traits. Attempted a bisect over M1's window (25a4a08bc green, 6c34438d0 red, about 4,100 commits); most middle commits fail for other reasons, so it did not isolate one commit.

One-place test: life() hard-codes placeKey "nebraska". Whatever is decided, draw the place from all 56 and log place and seed.

## quiet-stretch.test.ts (2 cases red)

"stops on the morning of the posted public meeting" and "offers the meeting due today" fail on their last step: the second go-to is expected to complete the meeting, and the meeting stays "scheduled". Staying is now the finish-meeting command (#2556; ShellWorkspaces.tsx:1241). I tried replacing the second go-to with attend-activity then finish-meeting through submitTimeCommand, and with performVenueActivity: both return the world unchanged. In this setup (Reno, age 34, meeting at 7:00 p.m., player at 6:30 p.m., venueActivities shows no refusal and 75 minutes of wait) projectOrdinaryMeetingScene is undefined after the first go-to, so finish-meeting has no live scene to finish (time-command.ts:232). So this is not a one-line fix: either the first go-to is meant to open the live meeting and does not here, or the test should build its meeting state as live-meeting-flow.test.tsx does. Needs the builder of #2556 or the CTO.

## privacy-goal-answers.test.ts

Does not finish in 15 minutes on main plus #3046 (the run was killed at its limit). Likely the same uniform-personality cause M1 reported; left alone as instructed.
