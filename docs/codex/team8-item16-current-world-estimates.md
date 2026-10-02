# Missing reference figures read the current game's records

Before: the state card and Money panel wait for reference files.

After: missing figures can display labeled estimates from the current game's records. Population and turnout have saved inputs. Two-bedroom rent works when leases exist; a fresh opening still has no lease sample. That gap keeps this piece in draft.

## Source findings

Population reads the saved government's population (`src/presentation/current-world-peer-estimates.ts:44`).

Voting reads saved current turnout and distinguishes it from registration and the historical survey (`src/player/OpeningStateVoting.tsx:86`).

Rent reads active two-bedroom monthly leases (`src/presentation/current-world-peer-estimates.ts:138`). Loaded reference rent retains priority (`src/player/EconomicContextPanel.tsx:106`).

Estimate captions identify contributing places or homes, range and spread (`src/presentation/current-world-peer-estimates.ts:184`).

Replaces: waiting-only rendering when those current-game records exist. The projection summarizes supplied values and writes no records (`src/presentation/current-world-peer-estimates.ts:21`).

## Remaining work

The measured fresh opening contained 59 governments, one outcome month and zero leases. Its rent fallback had no sample. This draft does not complete the requirement that missing reference rents always display an estimate. The opening price and bedroom producer request is recorded in [the coordination board](https://github.com/lamontaes/Political-Game-Git/issues/1615#issuecomment-5952555738).

The additive composition with landed #1955 passed 63 checks across the two changed test files. Scoped types (seven roots, 1,298 source files) reported zero diagnostics; changed-file lint passed. The first sandbox attempt stopped before collection with spawnSync git EPERM; the network-enabled retry passed. Browser play, official gates and merge to main remain pending.

The composition preserves the landed latest-figure headlines, CSS and portrait retry/decode cleanup. State-card first-paint fixtures now read controlled saved current-game records across all 56 jurisdictions rather than national constants. Money retains the landed HUD reference fallback when no current lease estimate exists.

## Receiving contract

The shared mean and spread arithmetic matches the pure leaf received from Audit's exact published donor. The original withholding reexport is preserved.

New exports in the projection are the result interface, population estimate, voting estimate, two-bedroom rent estimate and caption formatter.
