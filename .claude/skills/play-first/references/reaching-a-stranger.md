# Play first: reaching a stranger in the running game

Part of the `play-first` skill. How a check reaches someone the player has not met.

## Reaching a stranger in the running game (Nov 8, Small fixes)

- Time inside a day moves only through acts that spend hours (`player.ts spend`, a campaign outing, a filing visit, a counter wait) and dev mode's Jump to hour (`POST /api/dev/hour {hour}`, in the Run until panel); Day and Week land on 7:00, before shifts.
- A person present in a room is clickable only if their room has a mannequin plate; click the `.figure[role=button]` element, not `#people > *` (each figure also has a shadow).
- Replay a world with `BENCH_SEED` and `BENCH_PLACEKEY` on `/api/newlife` (a route override in the browser check); the people present at a place differ by seed, so keep the seed that showed the case.
- **Scene mode hides the rail and the card (#7956, Nov 9).** While a desk, meeting, election day, its returns or the ballot is open, `#game.cinema` hides `#rings` and `#card`; a browser check that waits on a rail tab, a Travel tile or `#continue` hangs ("element is not visible"). Answer the panel first, or give the click a short timeout and let the loop meet it next turn (see `legislation-screens`).
