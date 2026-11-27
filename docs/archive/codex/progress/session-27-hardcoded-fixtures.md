# Session 27 duplicate ticket FIXTURE-01: remove baked-in fixture place and policy dates

**State:** open on current main `f5e3e15`.

[src/simulation/demo.ts:110](https://github.com/lamontaes/Political-Game-Git/blob/bf81afcfd26a751a1445470926bd75da6f10254b/src/simulation/demo.ts) silently supplies `LEXINGTON_DEMO_CONTEXT` when the fixture builder omits context. Require an explicit jurisdiction context at the builder boundary and update its test/CLI callers so no live or developer entry point inherits Lexington accidentally.

[src/presentation/run-c-working-document.ts:593-595](https://github.com/lamontaes/Political-Game-Git/blob/71a9ab5fc83c1176132ffc773781639228706b85/src/presentation/run-c-working-document.ts) writes every fixture policy operation with fixed July 1, 2026 start/maturity and July 1, 2027 end dates. Derive the operation window from explicit input or the owning record's dates, and prove it follows worlds with differing clocks.

**Verified:** the presidential calibration loop in [src/simulation/world-setup/political-start.ts:243-250](https://github.com/lamontaes/Political-Game-Git/blob/bf81afcfd26a751a1445470926bd75da6f10254b/src/simulation/world-setup/political-start.ts) reads `calibrationRow(us-president:<state USPS>)` per state; it does not repeat one fixed state vote. Keep this source-backed per-state calibration behavior.
