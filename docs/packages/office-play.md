# Office play: the day of an officeholder, local, state and federal

**Owner, Oct 14, 2026.** Three Opus sessions build this at once (LOCAL, STATE, FEDERAL). They are one game: one engine, one rule for stops, one rule for simulate-or-do. Nothing here exists on its own level.

## What to build

**One engine, `src/core2/modules/office-day.ts`** (written by OFFICE-LOCAL; STATE and FEDERAL add rows and their own helper files `office-day-state.ts`, `office-day-federal.ts`, never editing the engine; a needed engine change is asked for in the PR body and LOCAL makes it within the day):

1. **The office is a job.** Every seat, local to federal, is a job record with hours, pay (that place's statute or charter, cited), a workplace and a calendar. The day is spent in it. Pay goes through the same payroll as any job. No officeholder holds cash they were never paid.
2. **The calendar is real.** Meetings, sessions, hearings, committee days, the budget season, the district week, the recess, the State of the State or Union come from data per body (the session calendars in `src/core2/data/`, the council's meeting rule, Congress's calendar), never one day for everything.
3. **Stops are chosen.** The player picks what stops them: the few important things by default (a vote on their own bill, their own hearing, a crisis, election day), everything else runs in the background. The settings are the player's and can change any day. What runs in the background still happens and still counts.
4. **Simulate or do.** Any act of office can be done by the player or simulated: the character does it by the engine's own choice from their traits, views and standing. Simulating never costs the player anything a doing player would not also risk; they live with the result either way. Doing gives control over what is said and chosen, and the consequences of that (a bad answer in a TV interview reaches voters the same way a good one does).
5. **Acts of office in the day's choice catalog** (`src/core2/data/content.json` acts, each with need, effect, duration and who may take it): hold office hours and take casework; attend a meeting, session or hearing; meet a department head, a member, a leader, a donor, a reporter; make fundraising calls; hold a town hall; travel to the district or to a place in the country; give an interview or a speech; sign, veto, appoint, order, pardon, declare where the office has that power (from the offices data, cited). Each act moves money, people or views through an existing engine and leaves a record the director and the press read.
6. **Background with scenes.** What the player does not stop for is simulated and summarized (the journal, the news, the staff note). A few of the background items become scenes when something in them turns (a vote that flips, a reporter's question that lands, a constituent whose case went wrong).

**LOCAL (OFFICE-LOCAL):** the council or board meeting as a scene on the clock with agenda, public comment and the vote; committee seats; the budget season; the stipend; the mayor's or manager's departments (hire and fire heads, propose the budget, declare an emergency, cut a ribbon, the state of the city). Proof: ten days as a council member and ten as a mayor in a random town.

**STATE (OFFICE-STATE):** session days on the state's calendar (with GOV wiring's calendar work, on its branch); committee assignments and hearings; caucus and leadership; the district office; the interim; pay and per diem; the governor's appointments, executive orders, budget proposal, line-item veto where the state has it, emergencies and the Guard, clemency, the State of the State, the legislature's leaders as people. Proof: ten days as a state representative and ten as a governor.

**FEDERAL (OFFICE-FEDERAL):** the Washington week and the district week, chosen by the player; committees and subcommittees; the whip; casework and district projects; town halls; the midterm; the president's cabinet and nominations with confirmation, executive orders, the budget request, the State of the Union, pardons, the daily brief, the sit room at the level a crisis needs, the press, the vice president, a trip to a random town to meet people. Proof: ten days as a U.S. representative and ten as president.

## Rules it must follow

Every rule in `AGENTS.md`. In particular: no dice; sliding scales; one rule for all 56 places with facts in data; an effect is a read; the chain is the acceptance; replace, never layer (the seat screen's four buttons and the desk's two become acts in the day or are deleted); no hand-written player text (the English engine words every act and scene; screens show records and control names); registered stopgaps; speed (a year under two minutes, measured before and after); look before you ask (`docs/coordination/DECISION-REGISTER.md`, `OWNER-DECISIONS.md`); owner decisions flagged, never waited on. The three sessions build through GOV's engines (laws, legislature, executive, elections, offices) and ask GOV in the PR body for engine changes; they never fork them.

## How the owner plays it to know it works

Dev mode, custom start as a sitting officeholder at each level, ten days each. He sets what stops him, simulates one interview and does another, skips a week, flies to a town, and reads the journal and the news afterward. Each PR body carries that play, with seed, place and record ids, and what the character did on its own while he was not stopping.

## Model and effort

Opus, high, one session per level: judgment-heavy design on the critical path (the owner plays this today).
