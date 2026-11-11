# Scene web, the executive: pass 1

The domain has 17 rows. Before this pass 2 had no episode (`appointment`, both triggers); after it every row names one. Two runs of `npm run scene-web` by the builder, in places it drew:

- Melville, Rhode Island (4445010), seed `bed8f5a4d1dfd353dd0b2111d141069e897dbd6f`: `address` (4 rows, 12 times) and `staff-news` (3 rows, once) fired.
- White, Georgia (1382468), seed `80df4d1ad9a2a2d8e474221b7e4adfc01cb2ee1e` (the committed report): `bill-signed` 3, `appointment` 1 and 1, `address` 14, `staff-news` 1, `swearing-in` 4 fired; `veto`, `recall` and `desk-bill` did not.

Which rows fire depends on what the drawn town's year held, so a second session sees a different set. Nothing under Missing in the report belongs to this domain.

## Episode links

`appointment` (`economy.board-appointment`, `official-appointed`) is calibrated by the existing packet `appointment-next-in-line`; the packet now names the type, which is how the report links a packet to a type.

## Rows that do not fire in some years, and what each waits on

A row that does not fire is either an event the drawn town's year did not hold or a producer a pool item already owns; each type's owner is named here.

| Type (trigger)                                                    | Waits on                                                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `bill-signed` (`executive-action`)                                | `scene-signing-casts-who-it-reaches` (open) and `scene-executive-order-signed` (open)  |
| `veto` (`executive-action`, `veto-override`)                      | `scene-veto-override-whip` (done); no veto in the drawn years                          |
| `appointment` (`economy.board-appointment`, `official-appointed`) | `scene-appointment-next-in-line` (open); `director-appointment-scene-appointer` (done) |
| `recall` (`recall-petition`, `recall-outcome`)                    | `director-recall-override-scenes` (done); no recall petition in the drawn years        |
| `desk-bill` (`bill-presented`, two rows)                          | `words-desk-bill-scene` (Story) and `tests-officeholder-desk-bill-on-signing-stale`    |
| `swearing-in` (`took-office`)                                     | `words-swearing-in-scene-and-speech` (Story); `director-term-ending-scene` (open)      |

## Lines Story needs

Every line under `data/english/parts/` is Story's. A row has enough lines when its asker and asked roles have three each. The four `address` rows (`president.address`, `governor.address`, `mayor.address`) have only a narrator (4 lines) and no asker or asked lines, so each needs three lines for each of those two roles; they fire through a political conversation, so the lines are the ones a listener says to the speaker and the speaker says back. Every other row in the domain has at least 25 lines per role.
