# A past arrest is said as an arrest

Bench at 1440x900: a new life, "Who I am", then the card of each person closest to the player (`scripts/play-walks/cards.mjs`). Before is main at fb9f5fb9d4; after is this branch.

Ruling: Fable A on the crew line, Nov 13: "say what the record holds ... A record of kind `arrested-before` is an arrest. '{who} was arrested in {year}.' is what it says. 'Accused of a crime' claims a charge the record does not hold. 'Was accused of...' stays for the justice engine's own charge records, and there it names the offense from the record."

| Place (bench seed), card                                          | Before                                                                  | After                                                         |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| Lake Park, Iowa (`aa04a056…1b35`), Eric Fitzgerald                | He was accused of a crime in 2006.                                      | He was arrested in 2006.                                      |
| Umatac, Guam (`e60fc3aa…90f8`), Patrick Jackson and Logan Jackson | He was accused of a crime in 1990. / He was accused of a crime in 2022. | He was arrested in 1990. / He was arrested in 2022.           |
| Millerton, Pennsylvania (`16f324fb…f156`), Joseph Mitchell        | He was accused of a crime in 1986. He was convicted of a crime in 1987. | He was arrested in 1986. He was convicted of a crime in 1987. |

Full seeds: `aa04a056f92f72ead273b91e08278873c856a922cdc2830624ba9e9fcb8a1b35`, `e60fc3aab8f1b892fc14dd7769dc9ca0a0ea8d0e58cb552ad78e61fcee7c90f8`, `16f324fbf62a3b2128d591bb548da26dca3d949ddb7172f7eedf586c751af156`.

The same in the card test's ten lives (`card-history-ways.test.ts`, seed `cf5b11a19ad604071e94`): every one of the nine past arrests now reads "was arrested in {year}" (Victor, Idaho; Plainview, Arkansas; Potomac Park, Maryland, the player's own "I was arrested in 2023."; Pemberton Heights, New Jersey; Cundiyo, New Mexico).

Still "a crime": a past conviction (`convicted-before`) holds no offense either. The offense on a past record is the past module's to add (Fable A's ruling, to the life records builder).
