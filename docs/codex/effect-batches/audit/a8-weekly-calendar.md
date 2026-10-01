# Saved weekly jobs pay through the ordinary clock

Saved weekly job contracts now schedule their next payment on the existing world calendar. The due handler delegates to the existing payment writer. Opening, later hire and activation fixtures pay without a presentation refresh, and Continue preserves the same payment. The proof retains unpaid overdue contracts rather than backdating them. Publication remains a draft with explicit producer and core dependencies.

## Before

Team3 reported the original missing-payment fixture in docs/codex/effect-batches/team-3/a8-clock-prerequisite-r1.txt. This is producer-reported baseline evidence, not a new Audit baseline run. Measured: the first adapter candidate failed the existing sorted-reference guard (/tmp/audit-a8-50b-clock-runtime.log:15). Measured: complete default handlers exposed an import-cycle failure before collection (/tmp/audit-a8-2da-clock-runtime.log:14). Those failed receipts remain preserved.

## After

Measured source: at executed candidate 9d203d42ead24af4934769f020aeaa643ec709ad, weekly-job-pay-transitions.ts:39 reads the actual saved job flow, worker and employer. Its :64 derives the next date from the same seven-day cadence used by the existing writer. Its :75 puts only actual person and organization IDs in entities. The work and flow references remain simulated provenance at :79.

Measured source: weekly-job-pay-transitions.ts:123 delegates only to settleSavedWeeklyJobPay. Its :126–147 validates the exact period outcome and reports its recorded status and amount. That producer validates the saved work/flow/date and retains all original period math, legal resolution and transfer guards. The adapter validates the resulting period record and records the writer's actual status. It creates no payment amount or law term.

Measured source: job-market.ts:1473 schedules after actual hire compensation is saved. Its payWeekly return schedules a newly created flow while retaining the existing-flow early return. life.ts:1265 schedules current-date activation after saved work status and coverage. world.ts:1404 and time-work.ts:1118 prepare existing contracts and carry the complete composer, preserving caller-handler precedence.

Measured source: future-transition-registry.ts:12 preserves the registry implementation and routine-hook-members.ts:5 preserves one WeakMap. The subsequent runtime passed the formerly failing graph (/tmp/audit-a8-clock-runtime.log:10). It moves the unchanged constructor/composer, semantic validator and single routine WeakMap into pure modules. No regular queue, overlap, key validation or payment behavior is rewritten.

## Worked receipt

Measured receipt /tmp/audit-a8-final-runtime.log:9: in the controlled Omaha fixture, Ella Gaines started through an actual saved application and offer on January 17, 2026. Her saved work is work-relationship_2e79db344039fbef; compensation is resource-flow_0aaf4f4186828865. The actual employer is organization_520c64e09a915d13. Measured fixture: scripts/engine-proof/weekly-job-pay-routes.test.ts:63 creates the employer; :77 creates its $100,000 cash position; :220 supplies staff pay. The fixture does not claim natural employer wealth or an autonomous hiring choice.

Measured: /tmp/audit-a8-final-runtime.log:9 records the $646 January 24, 2026 transfer. weekly-job-pay-routes.test.ts:274 asserts one completed outcome. That equals the saved weekly terms. Measured assertions: weekly-job-pay-routes.test.ts:268 reloads the pre-payment world, and :280 verifies the same serialized result. Its :283 refuses starting the already started application; :284 preserves calendar identity. The original Team3 clock case separately retains its exact period, completed status, reload equality and settlement repeat assertions.

Measured assertions: weekly-job-pay-routes.test.ts:158 requires exactly $400 for the opening at :171 and activation at :200, under their explicit saved terms. Measured assertions: weekly-job-pay-routes.test.ts:300 verifies an overdue, unscheduled historical contract stays without a due item or payment after Continue and another day. That limitation needs a separately approved recovery contract; this adapter does not silently skip the missing period.

## Scope and dependencies

This is A8 plus the already owned C7 pure import prerequisite. Measured diff /tmp/audit-a8-owned-diff.txt:14: thirteen owned paths differ from proof union base 6eb61e89785835a47249cdaf41700c77d83298e0. The candidate is additive main 81a950745174018598e87923da30469f86f6f0a8 plus Team3 producer 5131c40cb818d10e3f7b999d6656a15f04740adb. Its larger main-to-branch diff inherits held pay/foundation work; those changes are dependencies, not new Audit ownership.

The presentation retirement patch is UNAPPLIED. Team3 keeps the sole payment writer and terms. Audit changes only its released scheduling hooks, dated adapter, complete composer, clock preparation and pure registry prerequisite. No generic resource hook, recovery, new dice, level or amount is added. No all 56, natural world, long-year, browser, 400-day parity or whole-rebuild acceptance is claimed. CTO core review and current-main integration remain necessary.

## Executed checks

Measured /tmp/audit-a8-final-runtime.log:12 counts and :14 duration: exact candidate 9d203d42 ran two selected test files, 5 PASS / 10 SKIP, 28.39 seconds, exit 0, observed from tool session47951 terminal result. Four owned route cases and the unchanged Team3 clock case ran under existing 30-second test limits. Command: npm run storage -- run test -- npx --no-install vitest run --config /tmp/audit-a8.config.mts scripts/engine-proof/weekly-job-pay-proof.test.ts scripts/engine-proof/weekly-job-pay-routes.test.ts -t 'A8 saved job contract pays from the actual clock before a presentation refresh|A8 saved weekly jobs' --silent=false. Storage guard and inherited deep transition checks remained enabled.

Measured /tmp/audit-a8-types.log:1: strict compiler check: 13 roots, 1,145 source files, 928 Git-backed files, zero diagnostics. Measured /tmp/audit-a8-static.log:1–13: all thirteen owned paths pass formatting; twelve TypeScript paths pass lint. The release parser passes at /tmp/audit-a8-static.log:14. The owned whitespace command exited zero with no output. Exact runtime and type evidence use a frozen Git loader/compiler host with installed tooling and an owned discovery adapter, not a clean native current-main checkout.

Evidence: /tmp/audit-a8-final-runtime.log, /tmp/audit-a8-types.log, /tmp/audit-a8-static.log, /tmp/audit-a8-loaded.jsonl and /tmp/audit-a8-manifest.json. Earlier failure logs remain separately named. Shared physical production files, HEAD and index were preserved. No merge occurred.
