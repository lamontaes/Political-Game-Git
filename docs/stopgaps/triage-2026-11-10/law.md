# Stand-ins in law.json, checked (Nov 10, 2026)

Nine open stand-ins in `src/core2/data/stopgaps/law.json`.

**Still true?** Still faked: 6. Already replaced: 0. Partly replaced: 3 (outcome link, enforcement readers, held-bill reasons). Could not tell: 0.

**What closes them.** Code: 4 (youth firearm harm, enforcement readers, named offender acts, age-check teen distress). Research: 3 (outcome link, no schedule, government heir). Data: 0. Design: 0. Owner call: 0. One row (estates counted people) closes by code or may stay. Rows that wait on the crime system: 1 (named offender acts).

**New pool items:** 2 (`research-death-tax-adopted-schedules`, `law-youth-firearm-injury-death`). Live items cover 2 rows. Four rows get no item.

| Stand-in                                   | Still true?                                        | What closes it                        | Pool item                                            | Size   | May stay at early access?      | In plain words                                                                                                                    |
| ------------------------------------------ | -------------------------------------------------- | ------------------------------------- | ---------------------------------------------------- | ------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| SG-LAW-outcome-link-unresearched           | Partly replaced (27 laws down to 1)                | research                              | laws-outcome-links-unresearched (open)               | small  | Yes, as a marked estimate      | One local law, letting a town set its own minimum wage, changes nothing in the wider world yet because no study sizes its effect. |
| SG-LAW-justice-youth-firearm-harm          | Still faked                                        | code                                  | law-youth-firearm-injury-death (new)                 | medium | Yes, count only                | Gun laws change how many young people the town should lose, but no named young person ever dies of it.                            |
| SG-LAW-justice-enforcement-outcome-readers | Partly replaced (jobs read it; schools do not)     | code, shared with the school stand-in | none (waits on SG-SCHOOL-hispanic-enrollment's list) | small  | Yes                            | Immigration enforcement now moves who gets hired, but schools do not yet notice fewer Hispanic students.                          |
| SG-LAW-justice-named-offender-acts         | Still faked                                        | code                                  | waits on the crime system                            | large  | Yes                            | Ordinary arrests happen to an unnamed batch of people, never to a named resident.                                                 |
| SG-LAW-estates-counted-people              | Still faked                                        | code                                  | none                                                 | medium | Yes, as a marked estimate      | When a background resident dies, their heirs are guessed from ages, so a sibling can be taxed like a spouse.                      |
| SG-LAW-death-tax-no-schedule               | Still faked                                        | research                              | research-death-tax-adopted-schedules (new)           | small  | Yes                            | A state that adopts a death tax by a bill taxes every dollar, with no exemption and no kinds of heirs.                            |
| SG-LAW-government-heir-exempt-assumed      | Still faked                                        | research                              | research-death-tax-adopted-schedules (new)           | small  | Yes                            | When the state itself inherits an estate, we assume it owes no tax unless the law says so.                                        |
| SG-LAW-held-bill-chair-reasons-unread      | Partly replaced (bill ending and dev mode read it) | code                                  | laws-hold-record-names-the-sponsor (open)            | small  | Yes                            | When a chair sits on a bill, the reasons are kept, but no scene or news story says why the bill died.                             |
| SG-LAW-age-check-teen-distress             | Still faked                                        | code                                  | none                                                 | large  | Yes, already a marked estimate | The social media age check eases every teen's stress by the same amount, because no teen has a mood or depression record.         |

## Evidence

- SG-LAW-outcome-link-unresearched: read `src/core2/data/laws/outcome-research-gaps.json:1-12` (one law left); pool item `laws-outcome-links-unresearched` is open and names it. Row text rewritten.
- SG-LAW-justice-youth-firearm-harm: read `src/core2/public-safety.ts:1930-1960` (marker at 1944; only `lawApplied` "read" calls, no death booked). Line fixed in the register. New item filed.
- SG-LAW-justice-enforcement-outcome-readers: read `src/core2/public-safety.ts:1465-1480` (marker 1472); `src/core2/jobs-web.ts:231-243, 303` (`enforcementMoves` reads UNDOCUMENTED and US_BORN when hiring); `src/core2/school-outcomes.ts:447` (school reader missing, SG-SCHOOL-hispanic-enrollment). The jobs reader's author and commit not traced (git log -S found only the squashed release commit 09a28996). Row rewritten.
- SG-LAW-justice-named-offender-acts: read `src/core2/public-safety.ts:850-860` (marker 855, batch not named). Item `justice-one-crime-system-part-1-a-named-persons-offense` is blocked on the crime system.
- SG-LAW-estates-counted-people: read `src/core2/estates.ts:418-440` (`countedRelation` still age-based; `kin` in `src/core2/counted-groups.ts:111` is unkinded pairs). Pool items `core-counted-estates`, `core-counted-death-relations` are done and did not change this. Line fixed.
- SG-LAW-death-tax-no-schedule: read `src/core2/laws-death-taxes.ts:48-55` (`flatSchedule`, exemption 0). Item `laws-death-tax-rate-only-terms` (done) only fixed a crash.
- SG-LAW-government-heir-exempt-assumed: read `src/core2/laws-death-taxes.ts:165-200` (assumed exempt when the term is missing or carries a reading); `src/core2/laws-death-taxes.test.ts:159`.
- SG-LAW-held-bill-chair-reasons-unread: read `src/core2/modules/legislature.ts:4285-4310` (marker 4303) and `6785-6810` (the bill's ending and `src/bench/dev-mode.ts:1169` read the reasons; no scene or story). Item `laws-hold-record-names-the-sponsor` (open) names the press line and scene reply. Line and text fixed.
- SG-LAW-age-check-teen-distress: read `src/core2/resting-stress.ts:55-72` (factor on health.youth-major-depressive-episode scales the youth gap; no depression record in `src/core2`). Item `laws-social-media-age-check-estimated-link` (done) made it a marked estimate. A depression condition per teen is a later health build, not required at early access.

No rows were marked resolved. Register edits: text rewritten on three rows, line numbers fixed on seven. The markers in code are untouched.

## Questions for the owner

None.

## Reuse check (owner, Nov 10: one money system)

Every new item names the existing function it changes and adds no second payment, tax or ledger path: the new items change the existing death path in health.ts and the existing flatSchedule in laws-death-taxes.ts as data; no second death writer or tax path.
