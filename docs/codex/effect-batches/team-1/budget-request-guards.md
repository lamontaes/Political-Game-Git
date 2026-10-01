# A budget request cannot borrow another session's choice

Before: A decided request from another intake could file a budget bill. A request for more spending could silently produce an unchanged budget.

After: Only the governor's explicit hold-flat decision for the exact session intake can copy adopted spending. A later request cannot claim a bill sourced from an earlier decision. Unsupported changed amounts remain unfiled with a saved reason.

## MERGED

This bounded repair is a draft on `codex/team1-budget-request-guards`, stacked on the unchanged partial request work. Runtime source is `d1114c4c4e2068f91ead458016cc9c745a65a636`; base is `347d8ae96a39643c38bf6e9701401d97b1555caf`. No team merge occurred. Current main lacks this unmerged request bridge, so this is branch proof.

## WHAT EMERGED

DECIDED: Five actual governors explicitly chose hold-flat for their February intake. The writer copied each government's recorded adopted amounts and scheduled the existing bill driver. The choice was controlled by the fixture, not naturally produced by an NPC.

DECIDED: Reese Kelley's separate request to put more into appropriations retained that exact decision. The saved outcome says its changed amounts are unsupported. It did not introduce a flat budget or change authority.

HARDWIRED: `src/simulation/governing/current-services-budget.ts:80` requires the existing session matter key and its saved intake outcome. The same writer at line 255 refuses an existing draft whose source event differs. The bridge at `src/simulation/governing/state-governing.ts:2253` returns the unsupported-amount reason; intake saves it in the existing outcome.

VITAL STATISTICS: The committed-source run passed 34 of 34 cases. Eighteen cover the budget writer and three new guard cases. Sixteen preserve the partial NPC saved-priority behavior. Five sampled annual places and one controlled biennial place are covered. This is not national session coverage.

## 1. Why-chain (five whys, to bedrock)

1. An unchanged budget is filed because its governor explicitly chose hold-flat.
2. That choice belongs to the bill because its actual decision event supplies the source document key.
3. The decision belongs to this intake because the opened matter has the exact existing session key.
4. That key has an actual intake binding because a saved budget outcome names both the matter and intake.
5. The amounts exist because the government's adopted annual record supplies each program line. The chain ends at the person's saved choice and the government's saved authority.

A shared holder is insufficient to borrow another request. Missing choice, intake binding, adopted lines or a seated chamber cannot create a bill. Changed-amount decisions need their own supported requested amounts.

## 2. Research

Audit's October 1, 11:57:22 UTC contract admits these concrete guards. It identifies the existing saved outcome's matter and intake tags as the binding. It distinguishes hold-flat from the request to put more into a program.

This repair introduces no researched rate, date or cost. The ten-dollar source authority in the wrong-choice case is explicitly controlled fixture data. Statutory budget dates, kernel consideration weights and the real stalemate boundary still require decisions.

## 3. Revisions

December choices no longer authorize February session bills. Positive fixtures now execute the actual session intake and record a fresh choice. The distinct second-year adoption is supplied before that choice files its immutable draft.

A February and March request under the same holder remain distinct. Reusing the original draft succeeds only for its own source event. Repeats and canonical save/continue preserve the original history. The existing game-calendar dates and thirty-day desk window remain unchanged and are not asserted to be statutory.

## 4. What gets built, in numbered parts

1. Match the complete session matter key and saved budget-intake outcome through one shared reader.
2. Require that binding in decided and pending intake selection and in the public request bridge.
3. Allow only the explicit hold-flat decision into the unchanged current-services writer.
4. Validate the existing draft's source document against the actual request event on reuse.
5. Add wrong-choice, another-intake pending, wrong-intake decided and source-mismatched reuse coverage.
6. Preserve annual and both-year biennial lines, departed-holder lapse, existing scheduling and enacted authority tests.

No new schema, filer, scheduler, defaults or calibration mapping was added. Other governing families and the previously released executive branch were preserved.

## 5. Simulated, records, world pieces, checks

SIMULATED: The fixture's actual controlled officeholder records an available decision through the existing writer. NPC scoring through the common kernel is still incomplete.

RECORDS: Existing matter, outcome, measure, provision and institution-step records supply the binding. The refusal retains the selected choice and records why no bill was filed. It does not fabricate a stalemate or payment.

WORLD PIECES: The current holder, exact intake matter, saved intake outcome, actual decision, adopted program lines and seated chamber must exist. A reused draft must name the same request event.

CHECKS: Five strict roots report zero scoped and imported errors. Lint, formatting, whitespace and the own declaration parser pass. The release gate retains an unchanged malformed declaration; zero-dice retains five stale removals with zero new findings. Spelling at the runtime source reports 112 findings, each word present in the same named base file. No shared allowlist or inherited report was repaired.

## 6. Proof run

Seed `team1-current-services-budget-20261001` samples Utah's Reese Kelley, Missouri's Dakota Park, Mississippi's Adrian McGee, Louisiana's Lance Sanchez and West Virginia's Avery Farmer. Indiana's Jasmine Maxwell supplies the controlled biennial case.

The final run executed both focused files at the committed source and passed 34 cases in 25.56 seconds. The raw earlier failures are preserved: the old fixture canceled an already executed intake; the new March fixture initially omitted the existing political-reflection handler and then used the wrong registry shape. These were fixture errors and were corrected without altering production time guards or assertions.

The three new guard cases verify unchanged authority after an unsupported choice, two pending requests for the same holder, and refusal of wrong-intake and wrong-source reuse. Repeat and canonical reload pass. The original controlled enacted-authority case still writes final appropriation records without transferring cash.

Browser, speed, whole-suite, nationwide year and final-main composition were not run. The retained two-year save was untouched. Natural preference formation, changed requested amounts, statutory timing and stalemate remain unproved.

## 7. Worked example

On February 15, Reese Kelley explicitly holds Utah's spending flat. The request decision is `event_3d320184ab774562`; its bill is `legislative-measure_81b1b18b40f593bd`. The recorded schools line is $731,016,100.00, copied from the government's adoption. No cash payment occurs.

On March 15, the same governor receives a different intake matter. A new hold-flat decision is `event_f7b9229a231af30b`. The existing bill names the February decision, so the March attempt is refused. Its earlier provisions remain unchanged through save/continue.

A separate controlled February case chooses more for appropriations against a ten-dollar source authority. That choice is saved, but unsupported changed amounts do not become a flat bill.

Method: Only the owned budget writer, intake bridge, focused fixture and release declaration changed. Evidence and source hashes are in `budget-request-guard-proof/`. Current main was fetched before publication; it has no subsequent edits in the owned state intake source since the integrated baseline. The guard is stacked on the partial request work. The owner prohibits helpers, so the report received a self-review against civic-reports and feature-walkthrough. Next is exact-head review while Audit and CTO resolve kernel considerations, statutory dates, changed amounts and stalemate semantics.
