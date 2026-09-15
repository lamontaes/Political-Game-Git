# Exact LIFE regression receipts

Runtime source checkpoint: `8f3fc8a15cd77def8d893f4714686db322789a56`.
Subsequent commits correct test fixtures and evidence; they do not change runtime behavior.
Merged #244 remains in the base `4947b7d0bf57be12da8b222f7a8b48d205ed88c0`.

The saved-request, proposal and clock regressions are in
`src/presentation/playtest34-life.test.ts` (17 cases): conditional favor/reload/performance,
unperformed same-person/task callback and due replay, interval commitment conflict,
paid shift and one wage settlement, withdrawal, household/confidence saved terms,
genuine changed privacy, game interruption/cancellation, explicit Accept and legacy
Suggest game, decline/cancel terminal reload, interrupted childhood wait, ten free
lines versus one actual meeting, canonical parent/child speech, and free small
answers versus disclosed reading activity.

Executed checks, with unchanged source fingerprints for each passing receipt:

- At `c2bbc9c3f63ab02ec7fcc29e66c1309ba8d32c81`, 37 passed:
  `npm run test -- src/presentation/playtest34-life.test.ts src/presentation/next24-routine-route.test.ts src/simulation/d33-education-continuity.test.ts src/simulation/education-study-progression.test.ts --maxWorkers=1`.
- The related ten-suite check at that SHA had 173 passed and 10 failed. Six unaffected
  suites contributed 105 passes. Retained failures were superseded by explicit-time
  fixture corrections, not removed assertions.
- At `def933cf4fdfa814e5aade7e92a48da692ab9d10`, all 82 corrected cases passed:
  `npm run test -- src/presentation/adaptive-life.test.ts src/presentation/narrative-life.test.ts src/presentation/formative-context.test.ts src/presentation/campaign-integration.test.ts --maxWorkers=1`.
- Full `npm run lint`, `npm run typecheck`, changed-file Prettier and
  `npm run release:check` passed at `def933cf`.
- Ordinary source replay, deterministic prose grounding, independent packet-only
  grounding and reviewer verification passed. These do not claim visual acceptance.
- The test-only checkpoint `6de4757ada166dbeb75dc9331709a1e6fe91e019` corrects the
  two stale first-session elapsed expectations: planning and Later are free;
  actual Read remains five minutes. Scoped Prettier and ESLint passed; the focused assembled reception below verifies the plan/read case.

The 224 eventual passes across 14 suites combine the identified stages above;
they are not a claim of one full-suite run at the latest SHA. JSON metadata beside
this file preserves exact commands, timestamps, SHAs and source identity.

A's assembled receiver `008279a0ee4797176aaab636c7403a0c252d6805` completed 124 tests,
production build, `validate:art`, `inventory:art` and `qa:art`. Its aggregate command
exited zero, but generation changed three tracked QA artifacts, so the aggregate
receipt does not certify an unchanged source fingerprint. An isolated household
case passed in 247 ms under its unchanged 5000 ms timeout. The earlier broad
browser run was interrupted on unrelated old-lineage cases before LIFE; it is
not LIFE browser evidence. Final focused player-route reception is recorded below.

Final assembled receiver `9dac3e44ab27bbba5a759399a7a096f82b72fb3b` has a clean,
unchanged-source passing `assembled-build.json` receipt. The exact first-session
case “records the plan, keeps it by reading, and survives reload” passed (one
passed, eight skipped), followed by TypeScript, scoped ESLint/Prettier, release
validation, production build and all three art commands. The earlier aggregate
QA generation drift is not reused as this final build certificate. No full
first-session or browser pass is inferred from this focused result.

At assembled `9dac3e44`, the 1200-pixel ordinary conditional-favor browser case
passed pointer agreement, keyboard performance, request/condition reload,
exact 20-minute advance, one terminal event, and repeat unavailability after
reload. Agent inspection of `favor-agreed.png` and `favor-performed.png` confirms
the named requester, canonical mom label, two-paragraph task, wording-only
condition and disclosed duration are readable. Human acceptance is not inferred.
The paired Mom case timed out at the first dialogue locator before proposal or
agreement; `assembled-journeys-initial.json` retains that failed aggregate.
The navigation-only helper correction and successful focused Mom reception are recorded below.

Final Mom browser reception passed at clean assembled test checkpoint
`2b8237a19dd1eceaa43ba96eb186327e0b224349`: one Chromium case in 40.3 seconds,
with the original 180-second budget and assertions. `assembled-mom-final.json`
certifies an unchanged source fingerprint. The only intervening change was a
test helper using the existing “See what happens next” control before initial
conversation and reload. Runtime behavior was unchanged. Pointer proposal,
keyboard same-game acceptance, save/reload, exactly 30 minutes, one linked
performance and terminal action unavailability passed. Agent inspection of
`mom-game-performed.png` confirms Elena Parsons, your mom, the new-game topic,
09:10→09:40 and the performed reply are readable. This is automated and agent
visual evidence; owner human visual/prose acceptance remains pending.
