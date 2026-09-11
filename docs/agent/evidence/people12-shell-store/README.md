# The preview was still writing into ordinary saves, through the hook

Chromium 141.0.7390.37 at `/opt/pw-browsers/chromium`, named explicitly because
`@playwright/test` here resolves a build this container does not have and cannot
download. Not comparable with runs on the project's own harness.

## What was wrong

`src/player/useShell.ts` constructed `new BrowserShellStateStore()` with no
database name. That hook is the writer that actually persists pins,
preferences, the journal and wardrobe choices — so however carefully the art
preview was given its own database everywhere else, the writer that mattered
kept writing candidate choices into the ordinary player's save.

Namespacing a second construction in `PlayerGame` did not reach it. Neither did
`tests/preview-store-isolation.test.ts`: those build correctly named store
instances by hand and prove two databases stay apart, which was true and was
never the broken part. A test that never runs the faulty line cannot fail on it.

`loadedSlot` was the other half. It remembered which SLOT had been read, not
which record — so switching to a differently-named store for the same slot left
the old certification standing, the read was skipped, and the write fired
immediately, carrying whatever was in memory from the other database into this
one.

## The fix

`useShell` takes the store as a required parameter — there is no default to
fall back to, so every caller has to say which persistence it means — and
`PlayerGame` passes the single store it already built. Two stores for one set of
records became one. The read/write certification is now keyed by
`databaseName::saveId`, so a mode change cannot certify a different database.

## The proof, in the mounted game

`isolation.txt`, from `scripts/dev-lab/shell-store-isolation.mjs`. It plays an
ordinary life, pins somebody, writes a journal ambition, saves; opens the same
life in candidate mode, dresses the person and writes a different ambition,
saves; then reopens the ordinary save and reads **both** IndexedDB databases out
of the page.

```
ordinary db  ambition "Ordinary ambition, written on production art."  wardrobes {}
preview db   ambition "Candidate ambition, written in the art preview." wardrobes {person_…: pg-top-001}

ordinary records unchanged by the preview: true
preview kept its own records:              true
```

The ordinary lane offers no wardrobe choice at all, which is correct: every
released production component is fixture art, so there is nothing approved to
put on anybody. That is the production refusal, not a failure of the run.

## The control

`control-reverted-hook.txt`. The hook was reverted to its pre-fix construction —
ignoring the supplied store and building the default one — and nothing else was
changed. The candidate session's record then appears **inside the ordinary
database**:

```
ordinary db  [ …"Ordinary ambition, written on production art."…,
               …"Candidate ambition, written in the art preview.", wardrobes {…: pg-top-001} ]

ordinary records unchanged by the preview: false
```

The file was restored immediately afterwards and the run repeated clean.
