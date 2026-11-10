# An official moves budget money outside the law

Owner, Nov 10, 2026 (`docs/coordination/OWNER-DECISIONS.md`): "Yes, keep it." An official can move money from one budget line to another outside the law. It is found out the way bribery is, through audits, the press or complaints.

This is the design step for the pool item `gov-treasury-diversion`. It adds no engine. It is a second kind of act in the corruption engine that exists (`src/core2/modules/corruption.ts`), with its money on the treasury's books and its discovery through people who learn of it.

## What the player sees

- **As a mayor, county executive or governor:** a line you care about runs short, and the person who keeps the books tells you another line has room. You can ask the body to amend the budget, move the money quietly, or leave the line short.
- **As anyone:** an official's quiet move comes out months later. A department head whose line was shorted complains, or the year's audit finds it. The paper prints it. People bring it up, and the next election reads it.
- **In dev mode:** the Trace reaches the act, the money, who learned of it and when, and each person's reasons for telling or keeping quiet.

## What exists and is reused

| Need                                                           | Where it is today                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A decision made from traits, money and ties, with reasons kept | `decide` in `corruption.ts` (line 107), the core's one chooser                                               |
| A crime record both parties hold                               | the `crimes` table and `CrimeRecord` in `corruption.ts` (line 62), today only kind `bribe`                   |
| Someone who knows decides to tell                              | the `tell` decision in `onRelationshipChange` in `corruption.ts`, and the `surfaced` table                   |
| Whoever hears decides to go to the press                       | `reportToPress` in `corruption.ts` (line 730), the `reported` table and the event `scandal.reported`         |
| Voters, the paper and scenes read a scandal                    | `scandalsOf` in `corruption.ts` (line 877) and its readers in `src/core2/modules/voting.ts` and the director |
| Moving a line's money by law                                   | `amendBudget` in `src/core2/modules/budgets.ts` (line 2105)                                                  |
| An executive asking the body for a change                      | `proposeAsExecutive` in `src/core2/modules/legislature.ts` (line 3431)                                       |
| A line's spending counted at the month's close                 | `chargeLine` (line 536) and `closeTreasuries` (line 1122) in `src/core2/budgets-treasury.ts`                 |
| What a line can pay its staff                                  | `publicPayRoom` in `src/core2/budgets-treasury.ts` (line 700)                                                |
| The executive's monthly review of their government             | `deskReview` in `src/core2/modules/executive.ts` (line 1643)                                                 |

Nothing audits a government's books today. That is the one new record, and it is a yearly row, not an engine.

## The act

A diversion is a `CrimeRecord` of kind `diversion` in the same `crimes` table. It names the official, the government, the line the money left, where it went, the amount and the reasons.

There are two destinations, and one rule for both:

- **To another line of the same government.** The official funds something the body did not approve. The money moves the way a lawful amendment moves it (`amendBudget`), with the crime's id where the measure's id would be, so pay and payments on both lines follow at once.
- **To the official's own money.** The government's account pays the official through the cash journal, and the amount is counted against the line at the close, so the line's real payees get less.

Every dollar is on the journal under a source kind of its own, as a bribe's payment is.

## When an official considers it

Nothing rolls and nothing runs on a monthly chance. An official considers a diversion when a record gives them a reason:

- **A line they care about is short.** At a month's close, a line cannot cover what it owes while another line of the same government has room. Which line the official cares about comes from their recorded stances and promises.
- **Their own household is in money trouble.** A missed loan payment (the event `credit.payment-missed`) or an eviction filing (`housing.eviction`) is on record for the official's household. How hard it presses is the money pressure a bribe's taker already weighs (`pressure` in `corruption.ts`, line 175).

The official then chooses among what the law and the books allow, through the one chooser:

1. **Ask the body.** A lawful amendment goes to the council or legislature as a bill.
2. **Move it quietly.** The diversion.
3. **Leave it.**

What they weigh: how short the line or the household is, how much room the other line has, how strongly they hold the stance or promise, their temperament, and who would see it. The more people who keep or read the books, and the sooner the next audit, the less the quiet move pulls. These are sliding amounts, never cutoffs. The weights are tunable parameters under a registered stopgap until a year of played worlds calibrates them against real figures on misuse of public funds.

The person the player controls is never decided for. The same moment reaches the player as a scene with the same three choices.

## Who knows, and how it comes out

Only people who learn of it can act on it. Nobody is caught by a roll.

- **From the start:** the official, and the person who keeps the government's books (the clerk or finance post on its payroll). Each holds it as a private knowledge record, as both parties to a bribe do.
- **The complaint.** At the close after the move, the head of the shorted department sees their line paid less than the budget in force says. They learn of the diversion then. So does a council member who sits on the body's budget review, where the body has one on record.
- **The audit.** Once a year, after the fiscal year closes, the auditor of each government the player lives under (the town, the county, the state) reads the year's books. The auditor is a person: the state's elected auditor where the state's law gives them the job, otherwise an outside firm's auditor named in the place's records. The auditor learns of every diversion in the audited year. How often a government of each kind is audited, and by whom, is a per-state table from the states' own audit laws, with a marked estimate where a state's row has not been read.

Each person who learns of it decides whether to tell, with the decision the bribe already uses: their tie to the official, their temperament, and what the move cost them or their department. An auditor who decides to report publishes a finding, which is a public record. Anyone else tells the person they are closest to, who decides whether to take it to the press. Either way the result is the event `scandal.reported`, and everything that reads a bribery scandal reads this one unchanged.

## What it changes in the world

- The shorted line pays less. Its staff, contractors or aid recipients feel it the month it happens, through the engines that already pay from that line.
- The favored line pays more, or the official's household has the money and spends it.
- A reported diversion is a scandal on the official's record. Voters who learn of it weigh it. A criminal case waits for the justice engine's incident producer (`gov-justice-incident-producer`) and is not part of this design.
- The body can put the money back with an ordinary amendment.

## What is not built

- No new engine, scheduler, table of suspicion or detection chance.
- Nothing outside the player's own town, county and state. Other places' governments are results under the country tier (owner, Nov 10: "it has to perform like a game"), and a diversion there, if it is ever wanted, is a line in that place's results, not a record per official.
- No audit of anything but a government's own lines.
- No repayment order, removal from office or prosecution. Those are other items once the justice engine exists.

## The parts

1. **The act and its money** (`gov-treasury-diversion-part-1-the-act-and-its-money`): the record, the two causes, the three-way choice for officials the player is not, the journal and the lines.
2. **The shorted line and the complaint** (`gov-treasury-diversion-part-2-the-shorted-line-and-the-complaint`): who learns at the close, the decision to tell, the press.
3. **The yearly audit** (`gov-treasury-diversion-part-3-the-yearly-audit`): the audit row, the auditor, the finding. Its per-state table is `research-local-government-audit-rules`.
4. **The player's seat** (`gov-treasury-diversion-part-4-the-players-seat`): the scene for a played executive, and the lines Story writes.
