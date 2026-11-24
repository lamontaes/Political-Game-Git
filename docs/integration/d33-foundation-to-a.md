# FOUNDATION receiver — local, unpublished

Final runtime source: `c82a65a12c20f872c24a2fef68f8b06c5853c236`, above initial
draft `8ec348e4aacd9411bfef5ccd227c6a0c6861ad35`, based on public
main `0f81acb6fa430c540a61a884cf4ff4ca850307f0`.
Checkout: `/private/tmp/pg-d33-foundation`, `codex/d33-foundation`.

## Exact current-root mount

Keep A's current `PlayerGame`, C focus/quiet controls, J creation, and X leaves.
Import `ContentPackWorkspace` from `./ContentPackWorkspace`. In the existing
`case "options"` workspace, preserve every current child and append:

```tsx
<ContentPackWorkspace world={session.world} onWorldChange={onWorldChange} />
```

The verified base mount was `OptionsWorkspace state={shell} dispatch={dispatch}`
inside `frame("Options", "options-workspace", ...)`; wrap those children in a
fragment as necessary. Use the existing callback, which publishes the new World
through A's durable-save path. Do not put pack content in shell preference state.
No automatic import and no new permanently visible panel.

Ordinary route after mount: start a disposable adult life in an explicit
locality, enter life, menu → Options → Import content pack; select
`examples/content-packs/community-timing.json` and then
`examples/content-packs/community-encounter.json`. Return home and use the
ordinary scene choices until the window-box encounter appears. Its choices each
take 12 minutes and record different ordinary aftermath; no purchase occurs.
Keep, title, reopen. Copy/edit versions and duration to 17 in both example files,
then import in a distinct life to prove new authored values without changing
the first life. This remains pending browser acceptance until A mounts the leaf.

## Source receipts and holds

Received in full: current D33 FOUNDATION/research/RECEIVE-NOW, settled D33, current
board, shared/applicable owner sections and T's latest full receiver handoff.
Native contract notices went to N/S/M/K/F/T/D on their existing task IDs.
A relayed N/S/F/T/D acknowledgments from those tasks: no scene-pack overlap;
S specifically required older-reader refusal, now supplied by format 16;
N's optional national record integrity remains its separate adapter; T's exact
production admission is already repaired at its local026c7a39; F grants no cash
or office authority from labels; D retains its live accepted-terms work.
Those are interface acknowledgments, not acceptance of this source.

No T/F/S unpublished source, N/K return, B/V private artwork or save was copied
into this branch. T's combined-source publication hold remains. No public push,
board edit, installed-app replacement or profile change was made here.

The source map and remaining cross-cutting migration scope are in
`docs/plans/completed/d33-foundation.md` and
`docs/systems/runtime-content-packs.md`. No shared election/term adapter is
claimed by this scene increment. N/S/M/K retain those actual writers and the
two-context proof; T/F retain paid ordinary production composition.

## Checks

74 focused tests across four files passed on draft8ec. Scoped ESLint then found
three style errors (inline type import, unused test binding, control-character
regex). These were corrected without changing the data contract. All ten pack
tests passed again, and the final source tree passed typecheck and scoped lint.
The test file uses external JSON files, ordinary scene writers, changed
12/17-minute values, independent lives, exact save/reopen, format15 preservation,
format16 refusal guards, missing/duplicate/cyclic/incompatible dependencies,
unsupported privileged fields and portable refusal before any store call.

Final runtime `c82a65a12c20f872c24a2fef68f8b06c5853c236` passed **74/74** tests
in four files, no skips (11.38 seconds), one worker:

```text
vitest run src/presentation/content-pack-import.test.ts
  src/presentation/pt3-first-session.test.ts
  src/presentation/opening-life-boundaries.test.ts
  src/presentation/browser-world-repository.test.ts --maxWorkers=1
```

`npm run typecheck`, scoped ESLint, `npm run validate:art`,
`npm run inventory:art` and `npm run qa:art` passed on the same final runtime
content. Inventory: 1,886 items with existing duplicate-hash warnings. Contact
sheet and QA report were generated; no art source changed. The initial attempted
`--minWorkers` option was unsupported by installed Vitest4.1.1 and ran no tests;
the supported command above passed. The existing Vite native-config forward
compatibility warning remains unrelated and unchanged.

The physical-host slot was explicitly released to A after process completion.
This receipt/plan completion changes documentation only. No full validation,
production build, browser file-picker interaction, installed proof or human
visual acceptance has been run for this return.

Unread acknowledgment: M and K's new pack-specific notices were posted, but no
pack-specific read receipt has been returned to this worker. Their earlier lane
ownership acknowledgments remain distinct; neither unaffected lane blocks this
scene return.
