# SP-02 payday calendar receipt

SP-02 was already present at the checked main head. Payday work runs through
dated future transitions rather than a daily producer. This receipt records
verification only; it makes no simulation behavior change.

## Timing

The checked head was `e591ffc637d1f6db84d2ff920e8662ce123202ed`.

The assigned `npm run speed:years -- --years 3` command is unavailable at this
head because `package.json` has no `speed:years` script. The available focused
calendar proof was run twice in one exclusive shell instead:

| Run                 | Command                                                                        | Seconds | Result         |
| ------------------- | ------------------------------------------------------------------------------ | ------: | -------------- |
| Before verification | `npm exec vitest -- run src/simulation/living-world/town-pay-calendar.test.ts` |  45.253 | 3 tests passed |
| After verification  | `npm exec vitest -- run src/simulation/living-world/town-pay-calendar.test.ts` |  45.595 | 3 tests passed |

The 0.342-second difference is startup noise, not a candidate regression:
the source was identical for both runs. Vitest reported 1.50 seconds and 1.67
seconds in the test body. The proof covers two seeded places selected from the
shared 56-place source, a calendar-only payday, Save/Continue parity, an
off-calendar weekly office payday, cancellation, and idempotent schedule repair.

## Trace

- `ensurePaydaySchedule` records the next shared payday as a future due item.
- `paydayHandler` performs the existing payday work only when that item is due
  and records the next due date.
- The ordinary transition registry registers the payday handler.
- Current world opening creates the first payday schedule after residents and
  local government seats exist.
- No hard-coded place name was added. No random outcome was added.

## Limitation

GitHub issue #2424 could not be updated from this workspace because it has no
Git remote and GitHub CLI authentication is unavailable. The required claim and
READY messages remain external delivery steps.
