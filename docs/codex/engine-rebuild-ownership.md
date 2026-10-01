# Engine rebuild ownership

The rebuild uses one owner for each shared surface. The latest transfers below let teams connect their work while preserving other teams’ changes. Ownership does not establish completed tests, merged code or finished gameplay.

## Original ownership map

Owner-approved September 30, 7:52 p.m. Eastern dispatch. This map supersedes older claims for the named functions after each owner's park checkpoint. Unpublished bytes stay with their current writer until explicitly transferred.

AUDIT/SYSTEMS — OWNS: world.ts (the advance section), time-work.ts, future-transitions.ts, decisions.ts, outcome-web/index.ts (the size draw only), the harness scripts.
TEAM 7 — OWNS: the handler compositions, life-opportunities.ts, time-command.ts, calendar-time-control.ts, and only the decision-call lines at the 37 sites.
TEAM 3 — OWNS: town-pay.ts, the pay parts of job-market.ts, shift pay in life-paths2.ts, minimum-wage.ts, teacher-salary-floor.ts, fairness-pay-law.ts, office-salary.ts, office-pay.ts, resource-income.ts, the withholding call in statutory-tax.ts.
TEAM 6 — OWNS: `public-budgets/*`, tax-policy.ts, tax terms in statutory-tax.ts, state-income-tax-law.ts, federal-top-income-tax-law.ts, federal-outlay-laws.ts, federal-defense-spending.ts, federal-farm-subsidy-law.ts, federal-passenger-rail.ts, federal-data-privacy-law.ts, `cannabis-*.ts`, road-usage-charge.ts, state-tax-service-profiles.ts.
TEAM 4 — OWNS: town-rent.ts, housing-market.ts, home-purchase.ts, cost-of-living.ts, local-economy.ts (Wave 2).
TEAM 1 — OWNS: legislative-clock.ts, member-agenda.ts, council-lawmaking.ts, the filing parts of congress-lawmaking.ts, the driver parts of municipal-ordinance-procedure.ts, local-council-meetings.ts, dc-council-sittings.ts, presentation/legislation-session.ts, automatic-legislation.ts, `legislation-*-families.ts`, legislative-effective-date.ts, measure-numbering.ts, the rule packs.
TEAM 2 — OWNS: governor-bill-decision.ts, presidentialDecision/presidentDesk in congress-lawmaking.ts, the executive section of municipal-ordinance-procedure.ts, chamber-votes.ts, state-governing.ts, chief-justice-vacancy.ts, committee-assignment.ts, supreme-court-appointments.ts, patronage/appointments.ts, enacted-rule-changes.ts, the term-limit, ward, home-rule and statehood files.
TEAM 9 — OWNS: `justice/*`, judiciary/judicial-review.ts, the prosecution scheduling line in press/transitions.ts.
TEAM 5 — OWNS: transit-service.ts, governing/public-program-transit.ts, the school, library and curriculum files, the service-kind handler.
TEAM 8 — OWNS: crisis/health-coverage.ts, enacted-eligibility.ts, the permission records and handler, press/* (Wave 2).

COORDINATOR owns the shared law consequence contract, dispatcher, validation, registry integration, canonical catalog forwarding and final opening dispatch. Audit owns world advance only. Kind owners: pay Team3; tax Team6; price-cost Team4; coverage-eligibility and right-permission Team8; service-delivered Team5; legal-outcome Team9; institution-rule Team2.

## Shared function boundaries

- Team1 owns filing and drivers; Team2 owns executive functions in congress-lawmaking.ts and municipal-ordinance-procedure.ts.
- Team7 owns handler composition and decision-call lines; Team2 owns decision sites6 and37. Team1 retains legislation-session driver logic.
- Team3 owns the statutory-tax withholding call; Team6 owns tax terms.
- Team3 M4 owns employer cash transfer correction; Team4 may take local-economy in Wave2 only after explicit M4 release.
- Team9 retains prosecution scheduling in press/transitions.ts when Team8 begins press Wave2.
- Audit owns time-work and world advance. Team7 supplies composition export; Audit integrates its default callers. Coordinator owns final starting-law dispatch in completeOpeningLife, createNewGameWorld and buildProductionWorld; createWorld stays free of premature dispatch.
- Kind owners publish exports; coordinator alone admits shared registry entries and catalog rows within 15 minutes. No whole-file replacement.

## Explicit narrow releases, September 30 night

- Team 1: state-governing.ts prepareStateIntake filing import/call only, released by Team 2.
- Team 2: legislature-rules.ts optional executive day-basis fields; Congress rule-pack executive fields; municipal executive deadline basis consumption; GoverningOfficeDesk no-organization hiring guard. Team 1 filing and driver ownership stays intact.
- Team 6: public-fiscal.ts settlePublicResourcePayment shared dispatcher import and post-transfer payment hook only.
- Team 5: time-work.ts completeActivity shared dispatcher import and post-completed-state service hook only. Audit keeps date-boundary and clock changes.
- Team 8: types.ts permission-record declaration and optional HistoryStore member; world.ts global history enumeration and permission integrity-validator invocation only. Audit keeps advanceWorld; coordinator keeps opening dispatch. No broader history or serialization redesign is released.
- Team 9: crime/offenders.ts juvenile youngestCharged age-filter and required import only.

These releases authorize bounded edits, not completion or merge. Preserve each other owner's unpublished bytes.

Team 1 additionally owns only the legislative-politics-integrity.ts provision-loop call to the shared lawTerms validator under the approved typed-term validation contract. Team 5 replacement owns extraction of service rows/constants into a data-only module; coordinator owns policy-pack assembly. Coordinator completed the released completeActivity post-state service hook in #1309; Team 5 must not duplicate it.

## Confirmed releases through September 30, 9:55 p.m. Eastern

- Team 2 owns the G9 binding fields on RuleChangeProvisionRecord and the existing enacted-rule-changes.ts writer and validation. Keep ruleChangeProvisions and enactedRuleChangeAt. Bind actual body and place IDs, final provision ID/key and enactment ID; validate final-term agreement. Stamp only an applied consequence. Coordinator retains registry admission.
- Team 1 owns LegislativeProvisionRecord lawTerms and the approved optional lawCategories, their existing writer/integrity validation and final enacted readers. These are different fields from Team 2's RuleChangeProvisionRecord extension. Categorical values must match catalog enumerations.
- Team 6 owns only the drawStateTaxServiceStartingConditions import and append call in world-setup/conditions.ts, and the fixed-seed profile-generation portion of presentation/funded-service-capability.ts nationwideFundedServiceCoverage. Retire those fabricated opening/inventory inputs; preserve saved-profile readers and unrelated presentation behavior.
- Team 3 owns the routine-outcome.ts import and saved-pay-summary append within describeRoutineOutcome. Other prose and routine logic remain with their owners.
- Audit owns only the approved presidential-turnover.ts oath/qualification-to-term-transition call relocation and final opening initializer integration. Use Team 3 initializeOfficeSalaryFlows and Team 4 initializeLivingCostsFlow before final starting-law resolution, preserving the coordinator's terminal dispatch deferral. Team 7 owns monthly scheduling.
- Team 5 continues N1 recorded scene companions and presence. Library decisions are unsupported tonight; no library body, title inventory or challenge producer is authorized. Team 8 retains press ownership until an exact newsroom lookup hunk is released.

These are ownership and scope decisions, not evidence of completed implementation, tests or merges.

## Confirmed narrow releases, September 30, 10:23 p.m. Eastern

- Team 1 owns optional PropositionParameter.allowedValues declaration support, policy parameter cloning and validation, and the final categorical provision reader. Missing allowed values mean unsupported. Team 9 owns only the mandatory-minimum-sentences coverage parameter allowedValues in policy-pack-us-policy-positions.ts and its justice consumer, using the existing raw CrimeOffense kinds. Other catalog rows remain protected.
- Team 4 owns the minimal recorded principal-reduction writer in household-loans.ts and its student-debt adapter. Recorded tuition shortfalls may use the approved existing federal lender and sourced Direct Loan limits and rates; cash-paid tuition never becomes debt. Existing loan writers remain intact.
- Team 6 alone owns the estimatedDeduction fallback hunk in income-tax-withholding.ts: plain average of read states, preserving known deductions. Team 3 retains payroll call sites and shift pay; redundant M1b work was canceled by the CTO at 10:17 p.m.
- Team 8 owns press/media-purchase-payment.ts, its focused test, and the existing press/ownership.ts purchase caller. Extract the existing financial transfer path; no new money writer or generated buyer cash. Team 8 also owns weekly newsroom-generation caller removal. Team 5 needs no press lookup edit. Team 9 retains prosecution and clemency calls.
- Audit owns the identical semantic transition-key validator extraction and re-export plus the future-transitions import required for cold-load repair. Team 7 owns the existing life-opportunities refresh call to Team 3’s salary initializer after a reproduced candidate regression. No second salary producer is released.

These grants describe ownership, not completed proof or permission to merge.

## CTO check-in 9: superseding boundaries

- Team 2 must leave saved rule-change rows untouched. It owns a separate append-only ruleChangeConsequenceBindings record family and only its corresponding WorldHistory, initialization, cloning, serialization and integrity hunks. This supersedes the earlier permission to extend existing saved rows. Actual body relations must come from existing institutions, with no fallback body.
- Team 4 owns only the approved optional principal-reduction fields on LoanTermsRecord, dated and sequenced debt reads, and the tuition-shortfall caller in education-study-progression.ts. Preserve other loan, resource and education writers. Audit notes outstandingDebtAt already supports a historical cutoff; reuse it.
- Team 6 owns the missing-deduction estimate using comparable states ranked by tax structure, region and household income. This supersedes the earlier plain-mean instruction. Known statutory deductions remain intact; new weighting requires CTO review.
- Team 3 owns PAY_REGISTRATION in law-consequences/pay.ts. Coordinator owns registry admission. Saved earned-shift cutoff changes in shared financial records still require the CTO's concrete contract; do not relax transfer validation.
- Team 5 owns remaining service data rows. Coordinator owns federal policy-pack forwarding, preserving existing consequence rows. Missing actual recipients or service records are unsupported, not evidence of delivery.
- Team 9 legal-outcome registration admission awaits the CTO's ruling on saved sentencing-event attribution versus a separate append-only consequence record. G17 defense counsel follows G10 through G13.

These boundaries authorize work, not runtime acceptance or merging.

## Accepted narrow transfers after CTO check-in 12

- Team 1 released the state-legislature-opening.ts required import and post-createWorkRelationships/createOrganizationParticipations hook before the opening event. Team 2 accepted this exact G9 scope. The release was clean at 87a4bdb6e58d7e8a1b482fd2cd89f4423b0dd8b3. Join actual saved seat work relationships to the existing shared legislature body, profile and state. Keep the state-profile guard. Member, name and party generation remain excluded.
- Coordinator retains the shared starting-law numeric reader and dated starting-law data. Team 3 consumes that reader in the pay handler. Team 4 owns the price-cost consumer sourceRecordIds compatibility fix. Worker coverage and statutory exceptions require actual recorded predicates; a standard rate alone does not prove coverage.
- Coordinator remains the sole law-consequence-registry.ts writer. Legal-outcome registration is published separately in PR 1378; Team 9 must not duplicate it. Registration publication is not composed runtime acceptance.
- Audit owns the C8 paired execution and the three unchanged job-offer cases. Team 7 owns its candidate and subsequent repair, with no concurrent duplicate runner. G12 opening/load recovery remains Audit-owned; Team 7 owns the composition only.

These are accepted ownership boundaries, not completion, merge or runtime claims. Team 1's requested G3 shared timing and rule-pack hunks remain pending release and are not granted by this entry.

## Accepted transfers and CTO check-in 14, October 1

- Team 1 owns the released G3 FloorStageRule interval declarations/validator, municipalRulePackFor interval projection, shared floor timing/quorum guards, and only the matching municipal-rule-registry.generated.ts interval fields. Team 2 released the generated fields at 74f8d2360a18f366a5226e244137af1fde8e4452. Preserve all other generated and executive-rule fields. Verify the cited state constitutions before replacing UNKNOWN quorum data.
- Team 3 owns local-economy.ts sorted-due allocation/recording and its previously released pay input. Team 4 released these hunks at 8bd19232025aa7111be194b24421928784bc69b6; projections, revenue amounts and owner draws remain protected. Use the existing resource writer and actual ordered cash.
- Coordinator published the approved optional pay-coverage history array, enumeration entry and integrity call at 729d86cca90d7d276a7e1a41b3aa85260b21385b, atop Team 3 producer 7a268bcf4cd003f2aefa28d6d698cbb2b2e94e94. Team 3 consumes it in PR 1367 and owns the coverage producer. Audit retains the opening hook. Native integration proof is pending. Standard minimum coverage is the default; actual saved facts alone select exceptions, superseding earlier unknown-coverage refusal.
- Team 6 owns the existing cash snapshot and common settlement consumer for Team 9's heldCashBailMinorUnits. Held bail remains physical cash but is not spendable; refunds return it, and forfeiture needs its own saved event. Team 9 retains the actual deposits, refunds and justice producers. No second treasury is authorized.
- Team 8 owns the CTO-approved minimal permit application/issuance producer and existing permission consumer. Applications use the decision engine, actual law-named authority and saved eligibility facts. Missing authority is unsupported. Coverage enrollment likewise requires an actual application; outlet layoffs require actual saved payroll and insufficient cash. Exact overlapping caller hunks still require release.
- Team 7 received the single askToBeTogether nullable-result display hunk from Audit, whose clean people-contacts.ts blob was 139ba6ad524761ca2b9c0545ab84ce275402e1c4. Preserve other contacts and selected yes/no behavior. Audit runs the current-main C9 comparison; no duplicate runner or shared serializer optimization is granted.
- Claude Team 5 owns the transferred service and remaining opinion work. Claude X5 exclusively owns outcome-web link-size research/data. Codex must not edit those link rows or restart its stopped Team 5.

These transfers establish one writer per named surface. They do not establish completed endpoints. All Wave 1 and Wave 2 docket steps must finish before final-main GitHub checks are the last gate; the CTO declares GOAL COMPLETE.

## CTO check-in 15 transfers, October 1

- Audit exclusively owns the narrow mind-integrity.ts validateDecisionContext rank/outcome consistency hunk, alongside its decisions.ts repair. Empty or exactly tied scores remain undecided unless the actor's last visible same-type decision selects an eligible tied option. Remove close-choice draws and alphabetical tie-breaking. Preserve blocked-option, no-available-option and selected-result checks. No broader schema or source-validation transfer.
- Team 9 owns only the state-governing.ts import and private recordDecision post-saved-clemency-decision hook. Team 2 retains all other governing-family code. Confirm and preserve any unpublished overlap before applying the published integration patch. Player and NPC paths must share the saved-decision producer; keep the weekly fallback until boundary proof.
- Claude X5's scope now includes outcome-web measure readers for already-saved facts and approved starting outcome data, one measure per PR, in addition to effect sizing. Missing producers stay explicit; no new producers, link shapes, draw logic or arithmetic rules are authorized. Core files still require CTO approval. This supersedes the earlier size-data-only boundary.

These are ownership grants, not tests, endpoint completion or merge approval.

## Closed caller transfers, October 1, 1:12 a.m. Eastern

- Team 1 owns only the existing numberingSession pass-through input and forward call in municipal-public-work.ts introduceMunicipalOrdinance and municipal-governing.ts introduceProjectedOrdinance, plus the already-released numbering caller/UI hunks. Preserve all other ordinance and executive behavior.
- Team 1 additionally owns tests/e2e/rules-council-ordinance.spec.ts savedRecord/read/replacement fixture hunks. Use the existing BrowserSaveStore inspection and canonical writer for the actual save ID; raw IndexedDB chunk rows are not World payloads. Production serialization, assertions and timeouts remain unchanged. Audit supplied the reader contract; candidate browser acceptance is pending.
- Team 7 owns only the adjacent null guard in src/presentation/childhood.ts playChildhoodMoment, extending its caregiverChoice decision-return ownership. An unresolved caregiver choice returns the original World before chooseFormativeOption. Preserve selected paths and existing no-caregiver/single-option bypasses. The actual local presentation file was clean at ad75e8e377881724246022b8345476de4f1356e4; no broader presentation or clock grant.
- Team 3 owns only life.ts paid-work coverage imports and post-commit hooks in singular/batch work creation and actual activation. Audit and Team 4 released those hunks; generic append/index helpers remain protected. Coverage records must read the committed work and dated facts. The missing-workplace nullable contract still awaits CTO acceptance.
- Audit owns diagnosis of the remaining C9 clock/verification cost. The instrumented schedule/monthly calls totaled 197.429 milliseconds, and salary refresh was not observed. This grants no serializer/history optimization or repeat of the unchanged diagnostic. Team 7 continues its separate C8 caller.

Team 9 now owns only electedExecutiveTermTransitionHandler's actual-entry post-active-write hook/import in src/simulation/executive-work-entry.ts and settleStateExecutiveQualification's late-entry post-active-write hook/import in src/simulation/nationwide-world/state-executive-terms.ts. Team 2 verified both clean at 439d1261bb699909ba7599953a858f2d93691595, identical to main a88eb1286a5415566fa2c6a5dc927a00caf40188. Preserve qualification/alive/status guards, expiry, governing-transition scheduling and the historical late-entry event. Asked-holder identity and weekly fallback remain. Audit retains opening/load integration.

These entries record ownership, not runtime acceptance or merge approval.


## CTO check-ins 17 and 18: October 1

These grants supersede earlier held entries only for the named surfaces. They do not establish merge or runtime acceptance.

- Team 3 preserves every paid job and its evidence even when its workplace is null. The existing pay consumer reads the canonical federal floor in that case and does not infer state or local authority. Stronger applicable state floors remain independent. Coordinator owns the federal and state starting-law numeric data; corrected federal placement is published at 905cb5fbb0011563c9aab189d870de8b81aff02b. Audit owns the terminal opening proof.
- Team 8 received and returned the narrow permit type imports, optional history arrays, world enumeration and integrity call. The permit application candidate was published at 0540910533ca6799b76f8ae5ffa3ca54baf4eb52. This grant does not authorize unrelated shared schema changes or imply actual permit issuance.
- Team 2 owns only the type import and bill-specific Omit annotation in governing/amendment-authors.ts needed by the approved nomination union. Team 1 verified those hunks clean at 881a6bb6fa1a9f0b7289521413e9ca292d0ee5df and identical to main b0affa. Runtime, proposal and author logic remain protected.
- Team 6 owns assertPublicGovernmentIdentity's optional HistoricalCutoff argument and only its municipal organization/profile visibility reader plus required imports. Use the corrected proposed patch at 1e089b47d54a498ed2d1e821815bd4d07d253d1f. Only the historical evidence reader forwards its cutoff; the current account writer retains current validation. No alias, account creation or frozen-recipient rewrite is granted.
- Team 2 owns the approved current-delivery-receipt callback. Read newly saved outturn IDs and source-linked completed matters, reuse existing follow-up logic once, and cover both immediate and delayed delivery. Preserve the blocked due record. No polling interval or new review date is authorized.
- Team 2 owns the appointment initialization-cycle repair: move the existing appointment constants/profile unchanged to a dependency-free leaf, preserve original exports, and keep nomination work separate. No new appointment duration or behavior is authorized.
- Audit owns the one general clock's completion path for scheduled activities of all people, including children without a guardian participating. Standby Claude Team 5 consumes that path for preschool attendance. No second clock is authorized.
- Standby Claude Team 5 supplies sourced crisis-response standing-authority data rows; Team 6 owns integration through the existing appropriation path. Libraries remain unsupported tonight because the required institutions are absent. This is not permission to invent amounts or a new funding engine.
- Team 8 owns the bounded crisis record-parent lookup repair admitting existing resourceFlowTerms, with missing and non-earlier parent rejection preserved. Team 4 supplied its exact failing renewal fixture and retains rent source ownership.

The active coordinator document is 00c. Completion requires the full rebuild docket, every effects-map link running or explicitly unsupported with a reason, passing multi-year behavior checks, and all checks green on final main. CTO heartbeat silence after 60 minutes narrows work to existing rulings; after 120 minutes finish and publish the current piece, then stop for renewed CTO or owner direction. The coordinator never merges.


## October 1, 8:03 a.m. Eastern: A102 narrow transfer

Team 4 released only town-rent.ts evictionCaseFacts counsel/judge binding, trialJudge court/seat/tenure lookup where required, and its judgment consumer to Team 9. Release head: f417d5f2183bc5ec3e2cfa263629321d0528463e. File blob: 0d9e1df512cb9233c76ca6de7be38e5f84fda9cc. Team 4 reported no staged, dirty or unpublished overlap. Lease, price, payment and other eviction logic remain protected.

Audit returned the existing court/seat/holder contract. Team 9 may preserve those actual identities and leave judgment pending without an actual judge or venue. A statute or tenant answer does not establish a lawyer. A new civil-representation record requires CTO disposition; no such schema is granted here. This is an ownership transfer, not proof of implementation.

Team 4 additionally confirmed the adjacent rentEvent judgment-only input and actual court, seat, tenure and judge provenance additions are clean and released at the same f417d5f2183bc5ec3e2cfa263629321d0528463e head. Team 9 owns only those additions. Other event branches, filing, payment and lease behavior stay protected.
