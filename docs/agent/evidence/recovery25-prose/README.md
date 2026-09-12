# RECOVERY25 prose browser evidence

Generated from the normal player route on the frozen recovery branch with:

```sh
RECOVERY25_PROSE_PROOF_DIR="/private/tmp/recovery25-prose-proof" \
  PLAYWRIGHT_PORT=4197 \
  npm run test:e2e -- tests/e2e/pt3-school-scene.spec.ts
```

The child and teen files show the school corridor before the decision and the
saved/reloaded continuation after it. The scene deliberately has no borrowed
apartment plate: the visible context label is canonical school context and the
empty background is the honest current art state.

## Captured sequence

- Child, `recovery25-school-child`: Sydney Lane, age 10, sees that the
  projector cart outside the science room is broken and that Kai Owen, a named
  classmate, broke it. The player chooses “Say it was Kai Owen,” saves, returns
  through Continue, and reaches the October 31, 2026 continuation. That screen
  names Kai and the same projector cart.
- Teen, `recovery25-school-teen`: John McConnell, age 16, sees the same authored
  incident alternative with a different classmate, Luna Kim. The player takes
  the blame, saves, returns through Continue, and reaches the January 27, 2027
  continuation. “A year on” names the same projector cart, while the correction
  option names Luna.

The names and incident are deterministic results of these proof seeds, not
fixed prose. Other lives select from the authored incident bank and their own
recorded school peers.
