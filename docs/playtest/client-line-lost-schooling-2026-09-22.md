# The client line lost the player's schooling, and old saves lost their jobs too

**Where this is: `codex/client-content-delivery`, the client integration branch.
It is NOT on `main`.** Main at `43a9798b`, the head carrying 0.4.0, still gives a
new character four education enrollments on the same seed. The build the owner
plays from main is not affected by anything below. This is a branch problem, and
it becomes his problem only if the client line is merged as it stands.

Measured 2026-09-22 11:45Z, Node 22.22.2, by serializing the same opening world
at four heads and diffing them. Not a bisect: the diff names what changed rather
than confirming that something did.

## What raised it

`src/presentation/world46-opening.test.ts` asserts that a **legacy** replay
descriptor — one saved before the WORLD46 opening version existed — still
rebuilds, byte for byte, the world `main` at `fed321f7` built. On
`codex/client-content-delivery` at `70fa13a7` that assertion fails:

```
expected '7b8910aa2d4c8adf8b2667dc13414a582d89a221d7f816dae2cc842887eac35d'
to be   '446fc2516699d0a28d87d7a6e3268f11c7d8be919a58c48ced817575dc48bf55'
```

A moved hash looks like a stale constant. It is not one.

## What actually changed

Kentucky, seed `world46-legacy-a`, `startAge: 30`,
`depth: "summarize-earlier-life"`, legacy descriptor, `fed321f7` → `70fa13a7`:

| record                      | fed321f7 | 70fa13a7 |
| --------------------------- | -------- | -------- |
| education enrollments       | 4        | **0**    |
| education enrollment states | 7        | **0**    |
| work roles                  | 2        | **0**    |
| work statuses               | 3        | **0**    |
| work relationships          | 2        | **0**    |
| life commitments            | 1        | **0**    |
| memories                    | 1        | **0**    |
| appraisals                  | 1        | **0**    |
| organizations               | 18       | 13       |
| people                      | 544      | 543      |

The missing person is the `life-context-v1:production:earlier-life:teacher`.
Jurisdictions, every catalog, `control` and `setupPriors` are byte-identical, so
this is not a serialization or ordering change. Every generated name differs,
which is the seeded draw diverging early rather than fifty separate changes.

**In the player's terms: a thirty-year-old opened from an old save on the client
line has no schooling and no job history at all.**

## It is not only old saves

The same measurement on a _current_ descriptor, same seed and place:

| head                                                    | enrollments | work roles | people |
| ------------------------------------------------------- | ----------- | ---------- | ------ |
| `fed321f7`                                              | 4           | 2          | 544    |
| `70fa13a7` (client line)                                | **0**       | 6          | 558    |
| `5750cf38` (client line, last commit before 2026-09-22) | **0**       | 6          | 558    |
| `43a9798b` (main, with 0.4.0)                           | 4           | 8          | 558    |

So the education loss is on **both** paths on the client line and on **neither**
path on main. A newly created character on the client line has no recorded
schooling either. Only the legacy path additionally loses work.

## What this is not

It is not tonight's work. At `5750cf38`, the last client-line commit before
2026-09-22, the counts are already 0 enrollments — identical to `70fa13a7`. None
of the merges into #278 tonight caused it.

## Open, and needing the owner

**Which commit did it is not established.** The client line carries dozens of
candidates since `fed321f7` — WORLD47's mortality-from-birth change, GOVERNING's
shared write path, the PEOPLE B1/B2 seam all touch the opening. Bisecting is a
twenty-second run per step and was not finished in this window.

**Do not regenerate `FED321F7_LEGACY`.** Updating those two constants makes the
test agree that a character's education and employment vanished. The number is
doing the job it was written for. Whoever owns the client line's opening changes
needs to say whether losing enrollments was intended before anything is refreshed.

## The transferable part

A golden hash reports a change in _what the game does_ wearing the costume of a
constant that needs refreshing. The cheapest way to tell the two apart is not a
bisect but a diff of the two artifacts the hash summarizes: it took two dumps
and one diff to turn "the hash moved" into "the player lost their schooling".
Same shape as the `nationwide-rule-coverage` Alaska row.
