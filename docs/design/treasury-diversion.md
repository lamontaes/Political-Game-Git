# An official moves budget money outside the law

Owner, Nov 10, 2026 (`docs/coordination/OWNER-DECISIONS.md`): "Yes, keep it." An official can move money from one budget line to another outside the law. It is found out the way bribery is, through audits, the press or complaints.

This is the design step for the pool item `gov-treasury-diversion`. It adds no engine and no system.

Owner, Nov 10, on this design: "there shouldn't be a bribe system and an embezzlement system. It should be a crime system." A diversion is a kind of crime. It is a row in the crimes table that exists (`src/core2/modules/corruption.ts`), decided by the same chooser as a bribe, and carried by the same justice path (`src/core2/modules/justice.ts`): report, investigation, charge, plea, trial, sentence. Nothing here adds a second path beside either.

## What the player sees

- **As a mayor, county executive or governor:** a line you care about runs short, and the person who keeps the books tells you another line has room. You can ask the body to amend the budget, move the money quietly, or leave the line short.
- **As anyone:** an official's quiet move comes out months later. A department head whose line was shorted complains, or the year's audit finds it. The paper prints it. People bring it up, and the next election reads it.
- **In dev mode:** the Trace reaches the act, the money, who learned of it and when, and each person's reasons for telling or keeping quiet.

## What exists and is reused

| Need                                                                                 | Where it is today                                                                                                             |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| A decision made from traits, money and ties, with reasons kept                       | `decide` in `corruption.ts` (line 107), the core's one chooser                                                                |
| A crime record both parties hold                                                     | the `crimes` table and `CrimeRecord` in `corruption.ts` (line 62), today only kind `bribe`                                    |
| Someone who knows decides to tell                                                    | the `tell` decision in `onRelationshipChange` in `corruption.ts`, and the `surfaced` table                                    |
| Whoever hears decides to go to the press                                             | `reportToPress` in `corruption.ts` (line 730), the `reported` table and the event `scandal.reported`                          |
| Voters, the paper and scenes read a scandal                                          | `scandalsOf` in `corruption.ts` (line 877) and its readers in `src/core2/modules/voting.ts` and the director                  |
| Moving a line's money by law                                                         | `amendBudget` in `src/core2/modules/budgets.ts` (line 2105)                                                                   |
| An executive asking the body for a change                                            | `proposeAsExecutive` in `src/core2/modules/legislature.ts` (line 3431)                                                        |
| A line's spending counted at the month's close                                       | `chargeLine` (line 536) and `closeTreasuries` (line 1122) in `src/core2/budgets-treasury.ts`                                  |
| What a line can pay its staff                                                        | `publicPayRoom` in `src/core2/budgets-treasury.ts` (line 700)                                                                 |
| The executive's monthly review of their government                                   | `deskReview` in `src/core2/modules/executive.ts` (line 1643)                                                                  |
| A crime reaching a prosecutor through someone who knows                              | `intake` (line 338) and `considerReport` (line 379) in `src/core2/modules/justice.ts`                                         |
| Investigation that follows the money, charge, plea and trial                         | `weighInvestigation` (line 440), `followTheMoney` (line 529) and `chargeDecision` (line 665) in `justice.ts`                  |
| A sentence, a fine or forfeit paid to the treasury, and a seat vacated on conviction | `convict` in `justice.ts` (line 913), today with the bribery range only (`briberyRange`, `src/core2/justice-law.ts` line 211) |

Nothing audits a government's books today. That is the one new record, and it is a yearly row, not an engine.

## The act

A diversion is a `CrimeRecord` of kind `diversion` in the same `crimes` table. It names the official, the government, the line the money left, where it went, the amount and the reasons.

There are two destinations, and one rule for both:

- **To another line of the same government.** The official funds something the body did not approve. The money moves the way a lawful amendment moves it (`amendBudget`), with the crime's id where the measure's id would be, so pay and payments on both lines follow at once.
- **To the official's own money.** The government's account pays the official through the cash journal, and the amount is counted against the line at the close, so the line's real payees get less.

Every dollar is on the journal under a source kind of its own, as a bribe's payment is.

## Why an official does it

Owner, Nov 10: "I would hope that it's not just if they need rent payments that they commit crimes. Some people just commit crimes. You know, personalities. Or maybe they think they can get away with it."

Three reasons, weighed together through the one chooser, the way a bribe is. Nothing rolls.

- **Who they are.** The official's temperament, at the trait engine's weight for this decision. It is the same trait term a bribe's taker has (`temperament` in `decide`, `corruption.ts` line 107). It is a reason by itself: an official with no money trouble and a full budget can still do it.
- **Thinking they can get away with it.** What the official knows of the risk, read from records they have learned of:
  - how long since this government's books were last audited, and whether that audit reported anything;
  - a move of their own, or of a colleague they know about, that passed an audit or a year unnoticed;
  - how small the line is against the whole budget, and whether a department head watches it;
  - how many people keep or read the books;
  - a scandal reported in this government lately, which makes it less likely.
- **Need.** Their own household's money pressure, the same amount a bribe's taker weighs (`pressure` in `corruption.ts`, line 175), or a line they care about that cannot pay what it owes while another has room. Which line they care about comes from their recorded stances and promises.

Each is a sliding amount, never a cutoff. The weights are tunable parameters under one registered stopgap until played worlds calibrate them against real figures on misuse of public funds.

## When they are asked

At each month's close of their own government, an official who controls its lines weighs three options: ask the body for a lawful amendment, move the money quietly, or leave things as they are. Only officials of the governments the player lives under are asked, so this is a handful of decisions a month. The decision is the chooser's, from the reasons above, so most officials never do it, a few do it once the risk looks low, and one who got away with it weighs the next month with that on their record.

The person the player controls is never decided for. The same moment reaches the player as a scene with the same three choices, when a line they care about is short or the keeper of the books points at room elsewhere.

## Who knows, and how it comes out

Only people who learn of it can act on it. Nobody is caught by a roll.

- **From the start:** the official, and the person who keeps the government's books (the clerk or finance post on its payroll). Each holds it as a private knowledge record, as both parties to a bribe do.
- **The complaint.** At the close after the move, the head of the shorted department sees their line paid less than the budget in force says. They learn of the diversion then. So does a council member who sits on the body's budget review, where the body has one on record.
- **The audit.** Once a year, after the fiscal year closes, the auditor of each government the player lives under (the town, the county, the state) reads the year's books. The auditor is a person: the state's elected auditor where the state's law gives them the job, otherwise an outside firm's auditor named in the place's records. The auditor learns of every diversion in the audited year. How often a government of each kind is audited, and by whom, is a per-state table from the states' own audit laws, with a marked estimate where a state's row has not been read.

Each person who learns of it decides whether to tell, with the decision the bribe already uses: their tie to the official, their temperament, and what the move cost them or their department. An auditor who decides to report publishes a finding, which is a public record. Anyone else tells the person they are closest to, who decides whether to take it to the press. Either way the result is the event `scandal.reported`, and everything that reads a bribery scandal reads this one unchanged.

## What it changes in the world

- The shorted line pays less. Its staff, contractors or aid recipients feel it the month it happens, through the engines that already pay from that line.
- The favored line pays more, or the official's household has the money and spends it.
- A reported diversion is a scandal on the official's record, and voters who learn of it weigh it.
- It is carried by the one justice path, as a bribe is. Whoever knows may report it to the prosecutor; an open investigation follows the money on the journal; the official is charged, pleads or is tried, and is sentenced from the state's range for this kind of crime. A fine or forfeit is paid back to the treasury on the journal, and a conviction vacates the seat by the place's forfeiture rule. The justice engine reads the offense from the crime's kind; it stops assuming every crime is a bribe.
- The body can put the money back with an ordinary amendment.

## What is not built

- No new engine, scheduler, table of suspicion or detection chance.
- Nothing outside the player's own town, county and state. Other places' governments are results under the country tier (owner, Nov 10: "it has to perform like a game"), and a diversion there, if it is ever wanted, is a line in that place's results, not a record per official.
- No audit of anything but a government's own lines.
- No second justice path, sentence table or scandal record. The one that carries a bribe carries this.

## The parts

1. **The act and its money** (`gov-treasury-diversion-part-1-the-act-and-its-money`): the record, the three reasons, the three-way choice for officials the player is not, the journal and the lines.
2. **The shorted line and the complaint** (`gov-treasury-diversion-part-2-the-shorted-line-and-the-complaint`): who learns at the close, the decision to tell, the press.
3. **The yearly audit** (`gov-treasury-diversion-part-3-the-yearly-audit`): the audit row, the auditor, the finding. Its per-state table is `research-local-government-audit-rules`.
4. **The player's seat** (`gov-treasury-diversion-part-4-the-players-seat`): the scene for a played executive, and the lines Story writes.
5. **The one justice path takes the crime's kind** (`gov-treasury-diversion-part-5-the-justice-path-takes-the-kind`): report, investigation, charge and sentence read the offense from the crime record, so a diversion is prosecuted the way a bribe is.
