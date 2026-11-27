# Lawmaking: legislatures, councils and laws, read at the code (Nov 27, 2026, about 2:15 a.m.)

Decided by the CTO under the owner's full ownership of the refactor (Nov 27). This is how a bill becomes law and what the law then does, plus justice (courts, police, crime), which the laws family holds today.

**What was read:**

- The bodies family (16 files, 17,015 lines) and the laws family (59 files, 23,580 lines), from the derived rows. Main at 8e1fa6be holds the same code.
- The all-files passes and Core's guard baseline (#10690).
- Code read at main at the lines cited.
- **This map changes nothing a player sees.**

## What it is, and the split

**Lawmaking** is:

- **the bodies:** the played legislature, other places' legislatures, councils' meetings and leadership;
- **the law engine:** laws in force at every level, and what each law reaches, through the engine that owns the thing it changes;
- **the outcome web:** how a place's areas move one another; laws reach through it. (The all-maps review checks whether it belongs with World.)

**Justice leaves the laws family as its own engine, `justice`:** the justice engine, public safety, crime, corruption, police patrol, the federal courts and the justice law files. That's 13 files, 6,813 lines, read 24 times by others, against the law engine's 38 files read 172 times. A modder can replace courts and crime without touching how laws pass. As with Offices, the doors come first and the split after, so no baseline rises.

## Verdict

**Sound where it counts:**

- One vote machinery: other places' legislatures and councils' meetings vote through the legislature's own `holdVote`, `voteKeyOf` and `members`, and enact through the laws engine's `enactLaw`.
- One rule for which law applies on a date, at every level (laws-in-force.ts:1-7).
- Laws reach through the engines that own what they change, by handlers registered with one host (host.ts:1-8).

**The problems:**

- two stores for one record;
- 20 side registries, half of them in one file;
- an 8,598-line legislature file;
- generated data kept as code;
- trait effects nothing reads;
- two tools in the game folder.

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Where (read)                                 | Fix                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LW1 | **The split (above).** Between the halves: justice imports the law engine 7 times, the law engine imports justice 4, and justice and the outcome web import each other 6 and 1.                                                                                                                                                                                                                                                                                                                                                                                                                                     | derived imports by sub-area                  | Two families: `laws` and `justice`. Doors first, readers onto them, then the split, proved by the families guard and Core's engine-tables guard with no count going up.                               |
| LW2 | **Two stores for one record.** Group A (labor, business, housing, justice, rights, technology, government) and group B (infrastructure, health, education, taxes, assistance, energy, agriculture, parks) each keep their own module of "a law's reach on a person". They're split only by policy area, and the host joins them: "Every law's reach on one person's record... from both law-reach stores" (host.ts:257-265; group-b-store.ts:1-14). applied.ts is a different record: who a law was applied to when an engine used it (applied.ts:1-8).                                                             | as listed                                    | **One reach store, with the policy area as a field.** Both groups write it; `reachOn` reads one table. Proof: each person's reach rows are identical before and after on three seeds.                 |
| LW3 | **20 side registries:** 10 in legislature.ts (`registerLegislatureHooks`, called by bodies, elections and executive; `registerCommitteeWait`, `registerBudgetMeeting`, `registerMeetingAgendaReader`, `registerHearingWitnessProvider`, `registerCommitteeRosterProvider`, `registerFloorCalendarer`, `registerSittingReader`, `registerFloorDateReader`, `registerWeeklyFloorReader`); 3 in world-legislating.ts; 5 in law reach (`registerPolicyHandler`, `registerLawReach`, `registerGroupA`, `registerGroupB`, `registerVotingMonthlyProgram`); `registerBribeScope` (corruption.ts); `registerPricesWebGaps`. | all-files pass                               | Onto Core item 10's hook. The law host's handler-by-key is the model for "a module carries its handlers".                                                                                             |
| LW4 | **legislature.ts is 8,598 lines.** Its long functions, measured to the first closing brace: `councilBudget` :1382 (223), `floorAmendmentsRun` :5810 (210), `committeeStage` :5488 (198), `enact` :7490 (179), `chamberVote` :5060 (121), `countVote` :6411 (119). In law reach: `runPolicy` group-b.ts:423 (460), `lawReach` applied.ts:352 (247), `incomeTaxAct` group-b-money.ts:2238 (205).                                                                                                                                                                                                                      | derived rows                                 | Split legislature.ts by concern (the council's budget, committees, the floor, counting and enacting, the desk) behind its entry. Long functions become named steps. Structure only, digest identical. |
| LW5 | **Generated data kept as code.** bill-numbering-styles.generated.ts (1,209 lines) is generated from data/research/bill-samples, bill-numbering-starts.json and the state legislatures corpus (:1-4).                                                                                                                                                                                                                                                                                                                                                                                                                | as listed                                    | A data file the game imports directly, as People's P3 does. The generator retires; any lock becomes a test.                                                                                           |
| LW6 | **Trait effects nothing reads.** legislature-trait-pack.ts declares effects for `legislation.bargaining.answer-request` and `answer-offer` (:97-128). Neither id is in the live decision table, and their reader went with People's #10697. Its traits are live, read by the opening's trait table.                                                                                                                                                                                                                                                                                                                 | as listed; data/content/trait-decisions.json | Delete the effects list and keep the traits (People's P2 rule: replaced means deleted).                                                                                                               |
| LW7 | **Not game in the game folder:** justice-chain.ts (120, "for a proof run or a developer screen", but no game file imports it) and session-law-audit.ts (87, "for the tests and checks").                                                                                                                                                                                                                                                                                                                                                                                                                            | importers, headers                           | Core item 2. If dev mode should show justice chains, that's a Screens item through justice's door.                                                                                                    |
| LW8 | **Tables opened by hand** (Core's baseline): laws' tables by others 51 times (screens 20, director 8, news 7); bodies' by others 62 (screens 26, director 16, executive 10). Laws opens others' 28 times, and bodies 43 (executive 24).                                                                                                                                                                                                                                                                                                                                                                             | Core's baseline                              | Doors from this session for laws, bodies and justice. Each consumer switches its own files (screens, Story, news, offices). Core item 1's baseline only shrinks.                                      |

**Checked and fine:**

- **The legislator's day** (governing, in the offices map) calls this engine's votes, floor and committees. Nothing is copied.
- **65 registered stand-ins** in these files, for the Stand-ins session.

## Seams with the other assignments

| Seam                                                                                                                                                                         | Who builds it                                                                                                                            | When             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| The line with Offices                                                                                                                                                        | The legislator's day (session days, committee days, floor holds) is governing's. Bills, votes, committees and the floor are Lawmaking's. | As stated        |
| Law effects on money (wage-floor.ts, paid-leave.ts, social-security-law.ts, right-to-work-dues.ts, laws-death-taxes.ts, public-pay-floor.ts, group-b-money's `incomeTaxAct`) | They stay laws' (the law side). The money moves through the jobs and budgets engines; the Economy map sets the doors.                    | Economy map      |
| People's household income (P1)                                                                                                                                               | Its benefit parts read laws' readers (assistance, SSI, veterans). Those are laws' doors.                                                 | As People builds |
| Elections' group-a-voting reach-ins (5)                                                                                                                                      | Through laws' door. Elections switches.                                                                                                  | Lawmaking first  |
| The director's (Story's) and the screens' reads                                                                                                                              | Each switches its own files when Lawmaking's doors land.                                                                                 | Lawmaking first  |
| families.json (the justice split)                                                                                                                                            | Lawmaking's own branch, after the others'.                                                                                               | In order         |

## Adjustments made to the other assignments

1. **Core item 2:** also justice-chain.ts and session-law-audit.ts (LW7).

## The Lawmaking assignment

**Start** when "CTO: GO Lawmaking" is posted. Branch from the branch that line names (train/nov27-a until it lands, then main).

**Items, safest first:**

1. **Delete the unread trait effects (LW6),** keeping the traits.
2. **Generated data as a data file (LW5).**
3. **Doors (LW8):** laws, bodies and justice each get the read doors their consumers open tables for today. Post them, so each consumer switches its own files.
4. **One reach store (LW2),** proved by identical reach rows on three seeds.
5. **The justice split (LW1),** doors first, proved by the guards with no count up.
6. **legislature.ts split by concern, and long functions as named steps (LW4),** structure only.
7. **The side registries onto Core's hook (LW3),** after Core item 10.

**Rules:**

- Structure only. The fixed-seed records digest is identical (LW2's proof is its reach rows), and `npm run typecheck` is clean.
- No new systems and no new registry.
- Never loosen a check.
- Never edit bank lines.
- Wide moves are re-runnable scripts.
- Use the Fable advisor liberally; it doesn't use Fable usage.

**Done when** 1 to 7 are each built, or listed with why.
