# Session 27 duplicate ticket FIXTURE-01: remove baked-in fixture place and policy dates

**State:** open on current main `f5e3e15`.

`src/simulation/demo.ts:110` silently supplies `LEXINGTON_DEMO_CONTEXT` when the fixture builder omits context. Require an explicit jurisdiction context at the builder boundary and update its test/CLI callers so no live or developer entry point inherits Lexington accidentally.

`src/presentation/run-c-working-document.ts:593-595` writes every fixture policy operation with fixed July 1, 2026 start/maturity and July 1, 2027 end dates. Derive the operation window from explicit input or the owning record's dates, and prove it follows worlds with differing clocks.

**Verified:** the presidential calibration loop in `src/simulation/world-setup/political-start.ts:243-250` reads `calibrationRow(us-president:<state USPS>)` per state; it does not repeat one fixed state vote. Keep this source-backed per-state calibration behavior.
