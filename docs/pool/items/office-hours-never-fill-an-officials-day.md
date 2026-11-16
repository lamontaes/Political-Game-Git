---
id: office-hours-never-fill-an-officials-day
title: "An official's sittings, committee meetings and office hours never take up their day, so every legislator has the whole day free"
area: office
kind: bug
priority: 1
size: M
status: claimed
standard: 2
claimed-by: claude/project-thread-csmftn-officehours
pr:
after: legislature-colleague-ties-stay-slight
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Found by the lying thread, Nov 15 2026, checking whether a visit's hours are charged to its host (people-free-company-goes-to-one-tie); the Account lead put it first
---

**What.** Officials who hold their office as their job are seated in a salaried post with no shift hours (src/core2/modules/official-pay.ts, `startSalariedPost` with `hoursDaily: 0`). Their sittings, committee meetings, caucuses and office hours never record minutes in the work clock (`core.work.timeByPerson`). So `discretionaryHours` gives each of them 15.3 free hours every day, sitting days included. At 4846968 (Texas) seed 8647-mason, Feb 3 and 4, 2025: 77 and 83 of the 99 ordinary job holders had work minutes on the day, and none of the 746 `job:office:` holders did. Senator 022 and the player, at seat 016, show work minutes 0 on every weekday of the session. With the host's evening charged (people-free-company-goes-to-one-tie part 1), 022 still hosted 5 or 6 colleagues on Feb 5, 7, 11 and 13, about 10 hours of company on days the senate sat. Seen: colleagues drop by all evening after sitting in session all day, and nobody is ever too busy to see anyone.

**Cause.** Found in code: src/core2/modules/official-pay.ts gives the post no hours, and the office's time lives in the sitting calendars (`world-legislating.ts` `SITTING_CALENDAR`, `office-day-state.ts` `ROOMS`) and the office day's acts. The closeness readers read those calendars, but the work clock does not. The salaried post has no hours, so attendance never charges the day.

**Fix.** Charge an official's day from their own office records, in the place ordinary jobs charge work minutes, with no second clock. A floor or session day is `legislatureSessionDayHours`. A committee or caucus day is `meetingHours`. A town body's meeting is `sittingHours`. A day the office day records the member as away is charged nothing. An office with no meeting record is charged its job's own hours, as any salaried post. Check the player's floor day against the hold that stops their clock (office-day.ts `holdPlayerAt`), so the time is not counted twice.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice. One engine: the work clock reads the bodies' own calendars. Speed: one read per official per day, from the kept calendar, with no world scan. Day one in motion: officials are busy from the first sitting day.

**Done when.** A pinned test at 4846968 seed 8647-mason, seen red on today's code, shows a senator with fewer free hours on a floor day than on a district day or a weekend, and 0 work minutes on a day they are recorded away. The Feb 1 to 14 visit figures are re-measured: the top share, 022's visits and the visits to the player. A drawn place's legislator shows the same over one session week, naming the place and seed. Year 1 is timed at three places, twice a side. A second session sees in dev mode on main a legislator's day that is full on a session day.

**Waits on.** Nothing.

**Files.** src/core2/modules/work.ts, src/core2/work-state.ts, src/core2/state.ts, src/core2/types.ts, src/core2/office-day-state.ts, src/core2/modules/world-legislating.ts, src/core2/modules/office-day.ts, src/core2/data/office-day/state-parameters.json, src/core2/office-hours-day.test.ts (new)
