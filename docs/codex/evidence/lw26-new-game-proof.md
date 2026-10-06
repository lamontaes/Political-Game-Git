# LW-26 random-place new-game proof

Command: `npx vitest run --config .codex-vitest.config.ts src/simulation/law-consequences/modules/lw26-environment-landings/index.test.ts -t 'prints a named exposure chain' --reporter=verbose`

Output from a fresh generated game:

```text
LW-26 new-game proof — seed: lw26-random-place-1791290886255; month: 2026-01-01; place: Yosemite Lakes, California; law: starting-law:US-CA:us-policy-positions:environment-energy.bottle-deposit; effect: env.litter=100; person: Sage Ramsey (person_c412e5597a2f3cb3); cause: place-outcome_9aaa55f20b5d0a9f
```

The test confirms the named person's saved exposure points to this exact monthly place-measure record as its cause.
