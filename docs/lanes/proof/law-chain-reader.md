# Each state's local tax average stays in its own law chain

Pool item: laws-local-tax-average-own-state. U2 step1 of the existing world-governing plan. This bounded reader does not make other states sit or mark path4 Built/Verified.

The existing resolver now requires the fallback local-sales-tax-average row to belong to the reading chain's state. Its pending-phase filter calls one inTownChain helper with the same membership rule. No legislature, voting, core-state or screen code changes.

## Checks

Goodland, Florida1226775 /50403585a1783cc4, buildBenchWorld with all modules, January20,2025 through January20,2026. Initial two tests PASS26.53s/38.01s command. The final test prefers the actual local-average row when present: two tests PASS25.30s/35.54s command. No test-supplied law or story enters the played world.

The actual local-average row law:US-FL:state:local-sales-tax-average:general:2025-01-01 is read into purchase tax sales-tax:county:12021. The purchase engine records named buyer Monique Ford (person_00e25bb5ef3418b0, household_b53a9245ed8e15b1) paying tax, and the receiving county treasury later pays Taylor Solomon (person_621dee7d45d15fb7) by actual payroll, journal:2025-03-13:11131. The attached JSON gives the source law, tax reader, positive applied amount, collected amount, account, named buyer and payment. This is an existing tax and real spending, not proof of a newly voted law or extra spending caused by the collection.

The pure-input regression puts an effective foreign state's average before the own-state row, checks an expired row, keeps only an own-state future phase, and checks chain jurisdiction IDs. Its supplied rows never enter a played world. Restoring only the original average lookup makes this test FAIL by returning test:foreign-average instead of test:own-average (0.093s tests/9.52s command); the ordinary-year case is deliberately not run during this isolated countercheck. Exact source restored, SHA256 d674ffa907eda162ce96e6ccadf76614577e90ee55f6fa33b8a2c2d014629560, then both positive tests pass. The first wrapper refused an ambiguous string match before editing anything; it was anchored to the exact average declaration before the countercheck ran.

Fresh New Game, changed-file checks and four-year comparison are pending. No Built claim yet. The every-state-and-town parent and its larger U2/U3/U4 work remain unfinished.

Commands use OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" and NODE_OPTIONS=--max-old-space-size=8192. Test: npm exec -- vitest run src/core2/in-town-chain.test.ts --maxWorkers=1 --disableConsoleIntercept --reporter=verbose, GOLDEN_PATH_SEED=50403585a1783cc4. Countercheck adds --testNamePattern "another jurisdiction". Logs are /tmp/lane-2-law-chain-*.

[Played records](law-chain-reader-world.json) · [Countercheck](law-chain-reader-countercheck.json)
