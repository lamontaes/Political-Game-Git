# RULES-3 governing contract

Lift governing and executive KEEP rules into `src/rules/governing/`: term math and limits, executive authority, appointments and confirmations, succession/continuity, budget stakes, program installments and civil-personnel rules at local, state and federal levels. Never modify old engines or RULES-2 branches. Preserve suspected bugs unchanged and register them for the CTO.

Plan: inventory classifier RULE declarations and manual KEEP findings; lift pure rules with explicit record inputs; test independent legacy/new equivalence across all 56 places and three levels; run the local gate; account for every KEEP function with a lift or specific not-liftable reason. Random-place seed and results accompany the tests. World wiring and independent finishing follow this rules lift.

Session: GPT-6 Codex; medium effort requested by repository default; actual runtime effort and usage unavailable. Started approximately 2026-10-11 01:20 UTC. No helpers or finisher send-backs.

Baseline: main `20118081ecd7628aaa9b61ac7151477aae58d689`. Legacy term-calendar tests pass; term-limit suite has one existing failure because its unread-data assertion disagrees with the current sourced corpus (14 passed, 1 failed). Do not fix the old engine or its test here.

Coverage: see `governing-coverage.json`; every classifier RULE and manual audit KEEP is recorded, including false positives and whole functions blocked by old query/writer contracts. Whole succession elects and records a presiding officer; it cannot lift unchanged into a pure rules library. Whole installment settlement posts and schedules; its lapse/cash rule is lifted separately. The appointment and confirmation writers need offices, holders, designation and vote records from core modules; this PR does not fabricate those records. See `governing-stopgaps.json` for inherited term counting, budget thresholds/start-day behavior, management authority, installment precedence and estimated personnel validity.

Golden equivalence: all 56 places; local ordinance, state statute and federal statute delegated-authority inputs; term calendars, term-limit resolution/counts, personnel rules and fiscal-year date boundaries. Fixtures prove pure rules, not ordinary generated-world political play. The test logs report a seeded random watched place. No new core module is wired, so the furthest playable golden-path step does not advance. Independent finisher acceptance remains pending.

Builder checks: 2 focused files / 61 tests passed; full repository typecheck passed; changed-file ESLint and Prettier passed; PR release check passed; zero-dice passed. No old-engine file changed. Time to first hand-off: approximately 13 minutes including environment startup and shared dependency setup; usage unavailable. Review/send-backs: none yet. Model: GPT-6 Codex; repository medium default; runtime effort not exposed.

Watched golden place: US-OR; seed `rules3-governing-golden-2026-10-11`. The stopgap ledger also registers three unlifted legacy findings for the CTO: continuity/confirmation pace, blanket legislator staffing and absent clemency deadlines. Their existing legacy PLACEHOLDER markers remain untouched. Combined RULES-3 hand-off took about 19 minutes; exact served model variant/runtime effort and usage are not exposed.
