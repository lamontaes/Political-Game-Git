# None of the twelve quiet engines is waiting on the owner

**Lead.** You don't need to decide anything to get these twelve engines working. None waits on a ruling from you. Two loosely related questions are open, and neither stops an engine. The biggest finding is a calendar mistake. Mississippi towns vote in 2021, 2025 and 2029, but the game puts their elections in 2024 and 2028. So the town we played held no election all year, and voting, interviews, debates and swearing-in stayed silent. The table below gives each engine's cause and smallest fix.

## The run

We played Amory, Mississippi, for one game year, January 20, 2025 to January 20, 2026. It was drawn at random from all 56 places, with seed `4632cb65…d193` taken from the clock. The world was the one you play, with every engine installed and 1,720 full people. The year took 66 seconds. Each row below is measured: the calls into the engine, and its tables at the start and end of the year.

| Engine            | Was it called?                           | Did its records change?                               |
| ----------------- | ---------------------------------------- | ----------------------------------------------------- |
| Ballot measures   | No                                       | No (0 measures)                                       |
| Interest groups   | Yes, through the legislature's vote      | Yes: 6 groups, 240 lobbying meetings, 0 dues payments |
| Recalls           | Yes: 30 laws taking effect, 11 deadlines | Yes: 7 recall petitions                               |
| Constituent cases | Yes: 12 office hours, 2 follow-ups       | Yes: 2 cases                                          |
| Corruption        | Yes: 17,419 relationship changes         | No (0 bribes)                                         |
| Beliefs (lies)    | Yes: 17,419 relationship changes         | No (0 false beliefs)                                  |
| Law effects       | Yes: 30 laws, 42 budget changes          | No (0 people reached)                                 |
| Races elsewhere   | No                                       | No (0 races)                                          |
| Voting            | Yes: 2 filing deadlines                  | No (0 ballots)                                        |
| Press             | Yes: 52 weekly checks                    | No (4 outlets, 0 interviews)                          |
| Meetings          | Yes: 52 weekly checks, and before votes  | Yes: 153 public comments; 0 town halls, 0 debates     |
| Officials         | Through other engines                    | Yes: 3 more officials on record, 2 challengers filed  |

The golden-path test's "every module" check judges a module by its records only. In this town it would call seven of these broken: ballot measures, corruption, beliefs, law effects, races elsewhere, voting and press.

## What each engine is waiting for

Every claim below was read in the code (inferred from the code unless it is a census number, which is measured). Verdicts: WORKS, RUNS-BUT-UNREAD, WAITS-ON-CAUSE, WAITS-ON-OWNER, NO-CALLER, HOLLOW.

| Engine            | Verdict                                                           | Why it was quiet, in plain words                                                                                                                                                                                                                    | Who reads what it writes                                                                    | Smallest fix, or delete                                                                                     |
| ----------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Ballot measures   | WAITS-ON-CAUSE                                                    | Mississippi has no citizen ballot measures: its process has been dead since a 2021 court ruling. The 17 measures in the data are in 11 other states, all voting June 2026 or later.                                                                 | The law in force, when a measure passes.                                                    | None. Check it in a measure state over a year that includes November 2026.                                  |
| Interest groups   | WORKS for residents; WAITS-ON-CAUSE for employers                 | Residents formed 6 groups on council questions and lobbied 240 times. Employers organize only against a bill that changes the minimum-wage amount, and only the player can write one.                                                               | Lobbying moves each member's vote.                                                          | Let the world's legislatures bring a wage-amount bill when the wage floor falls behind local pay.           |
| Recalls           | WORKS                                                             | 7 recall petitions were filed. The 2 we examined followed a council ordinance of March 6, 2025, and both removed the member, by 387 votes to 309.                                                                                                   | Offices (the seat is vacated) and the news.                                                 | Report the vote tally. The government session should check 7 petitions in a year against real recall rates. |
| Constituent cases | RUNS-BUT-UNREAD                                                   | 2 out-of-work residents came in; staff turned both away. Nothing shows the open cases, so no official, and no player, ever decides one.                                                                                                             | Voters' and campaigns' impressions of the official. The case list itself is read by nobody. | A case list on the official's screen that lets them take or hand off a case.                                |
| Corruption        | NO-CALLER                                                         | Nothing in the game ever offers a bribe. The offer, the decision to take it and the later telling are all built; nothing starts them.                                                                                                               | Voters' view of a candidate's scandals.                                                     | Have someone who stands to lose money on an official's decision weigh offering that official a bribe.       |
| Beliefs (lies)    | WAITS-ON-CAUSE                                                    | Only the player can tell a lie, in a conversation. Nobody talked in this run.                                                                                                                                                                       | Only itself, plus what the hearer knows.                                                    | None. Check it with a played conversation.                                                                  |
| Law effects       | WAITS-ON-CAUSE                                                    | Only 5 policy questions have a listed effect on people. None of the 5 was in force in Amory (measured: no person was reached at the opening). The ordinance the council passed (working with federal immigration enforcement) has no listed effect. | The person card and the changes screen in the bench. No other engine.                       | List an effect for every question a council can pass, read by the engine that enforces it.                  |
| Races elsewhere   | WAITS-ON-CAUSE                                                    | The next general election is November 3, 2026, and Mississippi's legislature is next elected in 2027. Governors and other states' legislatures are never elected by this engine at all.                                                             | Congress's party balance, once a race flips a seat.                                         | None for the quiet year. Add governors and other states' legislatures.                                      |
| Voting            | WAITS-ON-CAUSE, with a defect                                     | Amory's June 2025 town election was never put on the calendar. The game's four-year rule picks 2024 and 2028. Mississippi's law, quoted in our own data, says 2021, 2025 and 2029.                                                                  | Election results seat the winners.                                                          | Store each state's starting year in its election data instead of assuming years divisible by four.          |
| Press             | WAITS-ON-CAUSE                                                    | Outlets invite candidates in the six weeks before an election, and there was none (the voting defect). The player can't ask for an interview: nothing calls that.                                                                                   | The news and campaign ad buying.                                                            | The voting fix. Then delete the news engine's own made-up outlet and use the press's outlets.               |
| Meetings          | Public comment WORKS; debates WAIT-ON-CAUSE; town halls NO-CALLER | Debates need an election two weeks out with two candidates. Town races never get a second candidate, because only the incumbent files for one. Nothing ever calls a town hall.                                                                      | Public comment moves members' votes; debates and town halls would reach the news.           | Make "hold a town hall" something officials and candidates can choose.                                      |
| Officials         | WAITS-ON-CAUSE                                                    | No one won an election in the year, so no one was sworn in. Everything else works: the officials it keeps are read by the legislatures and the voting record.                                                                                       | The legislatures, lawmaking elsewhere and the voting record.                                | None; the voting fix gives it a swearing-in.                                                                |

Counts, 12 engines: 2 work, 7 wait on a cause (one of them because of a defect), 1 runs unread, 1 has no caller, and 1 (meetings) is split three ways. None waits on the owner and none is hollow.

### The evidence, one line per finding

- The four-year rule is `inYear: (y) => y % 4 === 0` for June town elections (`src/core2/elections-calendar.ts:253`). Mississippi is the only state on that rule. Its row cites "every 4 years, e.g. 2021, 2025, 2029" (`data/municipal-elections/92O-national-state-baseline.json:1637`). Inferred from the code.
- The old core has the same rule (`src/simulation/living-world/local-elections.ts:229`).
- Alabama's August rule agrees with its own citation (2020, 2024, 2028). But a second data file says Alabama's next town filing is 2029 (`data/research/elections/filing-requirements.json:342`). One of the two is wrong.
- The town stand-in files only the incumbent, so town races get no challenger (`src/core2/modules/voting.ts:646`). That is the registered stopgap SG-GOV-who-runs-stand-in.
- `considerBribe` is called only by its test (`src/core2/corruption.test.ts:52`). Inferred from the code.
- `holdTownHall` has no caller outside its own file (`src/core2/modules/meetings.ts:381`). Inferred from the code.
- The law-effects records are read by the bench's person card (`src/bench/card.ts:110`) and changes screen (`src/bench/changes.ts:45`). Inferred from the code.
- The open case list has no reader (`src/core2/modules/constituent-cases.ts`, `handleCase` and `casesFor` have no caller outside tests).
- A lie is written only inside the player's conversation (`src/director/conversation.ts:883`), reached from the bench's talk routes (`src/bench/server.ts:274`, `:283`).
- The news engine stores every public event as a story and keeps its own outlet per place (`src/core2/modules/news.ts:337-352`).

## Owner decisions needed

**None of these twelve engines waits on you.** Six of them carry your dated rulings in `docs/packages/M3-world-of-governing.md` (lines 74 to 106). The other six (beliefs, law effects, voting, press, meetings, officials) have no open question to you in the status files, plans or work orders:

- Interest groups: "Organized interests form from who loses money (Sept 26)." "Lobbying is valid play (Sept 22)."
- Constituent cases: "Simple in early access (Oct 10)." "You decide how your office handles them; most resolve in the background (Oct 5)."
- Corruption: "Basic in early access: bribes and favors, records that surface later; investigations and prosecutions after (Oct 10)." "A bribe is a recorded crime (Oct 5)."
- Ballot measures and recalls: "Ballot measures and recalls run in the world only in early access (Oct 10)."
- Races elsewhere: "State and federal governments act on the golden path (Oct 10)."
- Ties in an election, ruled October 14: "Ties: follow the law of the place; where it says lot, a recorded lot from the world's generator."

Two open questions sit near these engines. Neither stops one.

1. **An empty race.** When nobody files for a seat, should the ballot allow write-ins, or should the seat fall vacant? The question was raised on October 14 in the body of the electorate pull request (#4154), where a played world had two races with no one on the ballot. It bears on voting, debates and the press. The CTO's reading: follow the law of the place, the way you ruled on ties ("follow the law of the place"). Where the law lets the holder stay until a successor is chosen, they stay. Where it fills the seat by appointment, it is appointed.
2. **A crime engine.** Should crime from people's own circumstances (theft, larceny, reoffending) be built before early access? The core session asked in `docs/archive/2026-10-23/coordination/core.md:164`: "Should I build that before early access? Until you rule, I'm building nothing." It does not hold up corruption, which you already approved. The CTO's reading: no, not before early access. You moved courts and investigations after early access (October 10). You also said on October 14 that a mechanic exists only when the golden path needs it, _The Political Process_ has it, or you asked for it by name. Crime meets none of the three today.

## What to delete or correct

- **Delete** the news engine's own made-up outlet per place. Replace it with the press's outlets. Its stopgap SG-P15-news-habits already names that replacement.
- **Correct** the tie stopgap SG-GOV-tie-by-lot and the open tie question in `docs/archive/2026-10-23/coordination/gov.md:67`. Both say you haven't ruled on lots; you ruled on October 14.
- **Correct** `docs/archive/2026-10-23/coordination/gov.md:25`. It says 17 measures in 13 states; the data has 11 states.
- **Correct** the golden-path test's note that races elsewhere fill state and federal terms (`tests/golden-path/played-world.node-test.ts:117`). That holds only in a year with a November general election.
- No engine is hollow, and none duplicates another engine, so none should be deleted.

## What happens next

All fixes go to the sessions that own the engines; this audit changed no game code.

- **Government session:** the four-year election rule (Mississippi), the Alabama year conflict, the vote tally for recalls, governors and other states' legislatures, the case list, the town hall as a choice, and a wage-amount bill from a cause.
- **People session:** a first bribe from someone who stands to lose money; the news outlet replaced by the press's.
- **Play session:** the case list and an interview request on the player's screens.
- **Fixer:** the three corrections above.

A repeat run in a place with a 2025 town election, or over a year that includes November 2026, would show the election engines working. This audit did not run one.

## Method and cost

- Built on `main` at commit `fd3574c9`, in a cloud session on October 14, 2026, from 04:15 to 04:50 UTC.
- The CTO's session (Opus) ran the census, wrote the briefs, did 3 spot checks and wrote this report. Its usage is not visible from inside the session.
- 12 Haiku tracers, one per engine, ran side by side, read-only. Together they used 1,328,641 tokens and 1,549 seconds of agent time. The longest took 256 seconds.
- 1 Sonnet verifier checked every claim and then reviewed this report, read-only: 231,058 tokens, 477 seconds in all. It changed no verdict.
- The CTO's spot checks: 2 of 3 tracer claims held. The third, that nothing reads the law-effects records, was wrong; the bench's screens read them.
- The verifier also corrected 2 more claims of substance (a council ordinance took effect in play; the news engine stores every public event) and several line numbers. The tally of 3 officials rows was not matched to specific seatings.
- The verifier read this report against the reporting standard; its findings were repaired before publishing.
- The condensed tracer reports are in `traces.md` in this folder.
