---
id: tests-counted-births-web-factor-mock-lost
title: "The counted-births web-factor test holds no factor on the train (the mock is lost to an import cycle) and a random place can show no ratio"
area: core
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: none
source: found by the Account lead's carry of the counted-deaths fix, Nov 14, 2026
---

**What.** `src/core2/births-counted-web-factor.test.ts` fails on the pushed train with "expected 1.03 to be 1" at every place and seed it draws (WEB_BIRTHS_SEED=eee2ffc869e5406c at Mound, Louisiana; aaaa at Beaver Valley, Arizona; bbbb at Black Sands, Hawaii), with or without the counted-deaths change. A second fault shows only on some seeds: with WEB_BIRTHS_SEED=eee2ffc869e5406c after the first is fixed, "expected NaN to be greater than 0.45", because a place that expects no birth in its first month has no ratio. Seen: both are reproducible with the commands above on the pushed train; no screen is needed.

**Cause.** Found in code: the test replaces `outcomeWebFactor` and `webFactorFor` with `vi.mock(path, async (original) => ({ ...(await original()), outcomeWebFactor: () => held.factor }))`. Building that factory loads the real outcome-web module, whose imports reach src/core2/births-counted.ts (through world-metrics and the renewal module), and births-counted binds the real function while the mock is still being built. Measured on the train at b4c11bc5b5: a log inside births-counted.ts printed the real `function outcomeWebFactor(api, placeId, measure)` and the mock's own log line never printed, so the factor read each month was the web's real 1.03 for a held factor of 1 and of 0.5. The second fault is `expected.births` of 0 in a place whose first month holds no counted woman likely to give birth, so the ratio is 0 over 0.

**Fix.** In the test only. Mock both modules in spy mode (`vi.mock(path, { spy: true })`) and set the held factor with `vi.mocked(fn).mockImplementation`, which replaces the function where it stands whatever order the modules loaded in. Pin the place by a fixed seed and draw up to eight places (the drawn-place-tests skill): a place whose first month expects no birth is passed over and named with why, and the first that does is checked, keeping the same assertions (factor held at 1 and at one half, births expected in the ratio of 0.45 to 0.5).

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice. One rule, all 56 places: name each drawn place with its seed. Never loosen an assertion to get green.

**Done when.** A second session runs `npx vitest run src/core2/births-counted-web-factor.test.ts` on the train head with the pinned seed and with WEB_BIRTHS_SEED=eee2ffc869e5406c, sees it pass, names the place and seed in its output line, and finds the line says which places it passed over; a second session also sees in the running game (dev mode, a drawn place, a seed nobody chose, one month of play) that the counts row's web factor on births is the place's own web value, not a held one.

**Waits on.** Nothing.

**Files.** src/core2/births-counted-web-factor.test.ts

**Notes.** Filed by hand on the branch of the PR that fixes it, as the thread rule says.
