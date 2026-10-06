# Clerk and night producers now compile with the shared scene source

Before: the clerk and council-night producers were separate from current main and the shared scene blocks.

After: a local composition receives the released producers and shared blocks. The council-night packet now forwards saved reporting beats. This prepares the existing writers for integration; it does not establish ordinary-player clerk filing or a played election night.

## Source and measured checks

Inspected: the composition receives Session 4 source 118609ba0 and Session 13 producers 4fadcaf5c onto main 70dfc3391 plus the saved precinct reporting parts. Two merge conflicts preserve current main's placement trace and slot-role validation. Central scene and knowledge implementations are received from Session 4.

Measured: 12 producer checks pass. Nine shared-scene checks pass, including generated current-person exchanges and their actual recorded words. Five council-night checks also pass after forwarding the saved reports. The eight producer roots have zero typing errors. Receipts are in docs/codex/evidence/session13-clerk-night-receive.

Inspected: electionClerkSceneOffer in src/presentation/election-clerk-scene.ts retains officeKey, officeChoiceKey, dated qualifications/calendar, sourceEntityIds and nullable presenceEventId. Its actions are election-clerk.examine-office and election-clerk.file. Only a still-current office examination supplies knownRecordIds and speakableFacts. fileFromElectionClerkScene rereads the offer and delegates the existing filing writer.

councilElectionNight in src/presentation/election-night-scene.ts reads actual saved contest/result/outcome records and forwards electionNightReports. Candidate participation in the outcome does not establish room attendance. Its return writer adds an idempotent receipt without changing the saved result, clock or control.

## Remaining player route

Session 4's central turn needs to consume the examination/filing actions and record the actual words and knowledge. Election night still needs recorded room participation, TV beats, reactions, speech, Skip and return through those blocks. Current campaign counting also needs the published canonical election repair received before a campaign-night route can establish precinct returns. Early/mail batches require recorded ballot-method evidence.

The owner intro-proof gate still applies to a scene-side merge. No such merge is requested. Filing screenshots, source fixtures and the generated shared-scene checks remain separate from the unfinished two-place election-night proof.

Method: only released source files were received in the existing worktree. No new clone, annual run, invented arrival, future staff closure or global storage policy change was used.
