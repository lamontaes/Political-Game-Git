---
id: core-shared-readers-asked-of-worlds-without-offices
title: "Seven drives tests throw because the office readers are asked of a world that has no offices or laws"
area: core
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: red-main
pr:
after:
blocked-on:
lead: world
source: "Pins on the crew issue 9747, Nov 17, 2026: the drives.test.ts reds on main come from ROOMS.bodiesOf"
model: fable
effort: medium
root: none
---

**What.** Seven of the 22 cases in `src/core2/drives.test.ts` fail on main with "Module has no registered state." Every pull request that changes that file, or runs it, goes red on them. Nothing a player sees is wrong, because a played world has every module.
Seen: the test file run alone on main 5dedcdfa.

**Cause.** Found in code: `calendars` in src/core2/sitting-closeness.ts and `officeTimeReaders` in src/core2/modules/work.ts are each one list for every world in the process. Once any world opens the state office day (`openOfficeDayState` in src/core2/office-day-state.ts), its rooms calendar and both office-time readers are asked of every later world. `stateOfficeOf` and `stateOfficeHoursToday` in src/core2/office-day-state.ts and `townMeetingHoursToday` in src/core2/modules/world-legislating.ts read the offices and laws modules with no check that the world has them. The legislature's own calendar goes through `servingTermsOf` in src/core2/modules/offices.ts, which answers "none" for such a world.

**Fix.** `stateOfficeOf`, `stateOfficeHoursToday` and `townMeetingHoursToday` answer "none" for a world without the offices or laws module, the guard `servingTermsOf` already has. The player sees nothing new; the test file is left as written and passes.

**Time box.** 1 hour for one session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: no place is named and nothing here depends on one. No dice: a guard for a missing module decides nobody's outcome.

**Done when.** A second session, not the builder, runs `npx vitest run src/core2/drives.test.ts` on main and sees 22 of 22 pass, then opens dev mode's person view for a state legislator in a drawn place it names with its seed (for example Chetopa, Kansas) and sees the day's office hours still shown, and says so with `npm run pool -- seen`.

**Waits on.** Nothing.

**Files.** src/core2/office-day-state.ts, src/core2/modules/world-legislating.ts
