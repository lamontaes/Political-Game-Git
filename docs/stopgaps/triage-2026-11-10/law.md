# Stand-ins in law.json, checked (Nov 10, 2026)

Nine open stand-ins in `src/core2/data/stopgaps/law.json`. Test applied to each (owner, Nov 10, "too in depth"): where does the player see or feel it on the golden path, or in something he has ruled?

**Totals.** Kept: 1 (the held-bill reasons, seen as the sponsor's scene and the paper's line when his ordinance dies in committee). Waits on the crime system: 1 (not dropped). Dropped: 7 ("dropped: too in depth (owner, Nov 10)"), of which 1 is borderline. Already replaced: 0. Still true when read: 6 still faked, 3 partly replaced.

**New pool items:** 0 (the two I had filed were deleted with their dropped rows). Live items covering kept rows: `laws-hold-record-names-the-sponsor`. Reuse check: `laws-outcome-links-unresearched` covers a row now dropped; the lead may close it.

| Stand-in                                   | Still true?                                        | Verdict                   | Where the player sees it                                                                    | Pool item                                                    | Size   | In plain words                                                                                    |
| ------------------------------------------ | -------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------- |
| SG-LAW-outcome-link-unresearched           | Partly replaced (27 laws down to 1)                | dropped                   | Nowhere: one local minimum wage law moves a world measure no screen shows                   | none (live item laws-outcome-links-unresearched is now moot) | small  | One local law, letting a town set its own minimum wage, changes nothing in the wider world yet.   |
| SG-LAW-justice-youth-firearm-harm          | Still faked                                        | dropped, borderline       | Only a count recorded as "read"; no screen or paper shows it                                | none                                                         | medium | Gun laws change how many young people the town should lose, but no named young person dies of it. |
| SG-LAW-justice-enforcement-outcome-readers | Partly replaced (jobs read it; schools do not)     | dropped                   | Nowhere: a school enrollment measure nothing displays                                       | none                                                         | small  | Immigration enforcement moves hiring, but schools do not notice fewer Hispanic students.          |
| SG-LAW-justice-named-offender-acts         | Still faked                                        | waits on the crime system | Arrests of named residents, once the crime system exists                                    | none                                                         | large  | Ordinary arrests happen to an unnamed batch, never to a named resident.                           |
| SG-LAW-estates-counted-people              | Still faked                                        | dropped                   | Nowhere: a background resident's estate tax, unseen                                         | none                                                         | medium | When a background resident dies, heirs are guessed from ages.                                     |
| SG-LAW-death-tax-no-schedule               | Still faked                                        | dropped                   | Nowhere the player reaches at early access                                                  | none                                                         | small  | A state that adopts a death tax by a bill taxes every dollar, no exemption.                       |
| SG-LAW-government-heir-exempt-assumed      | Still faked                                        | dropped                   | Nowhere                                                                                     | none                                                         | small  | When the state itself inherits an estate, we assume it owes no tax.                               |
| SG-LAW-held-bill-chair-reasons-unread      | Partly replaced (bill ending and dev mode read it) | kept                      | His ordinance dies in committee: the sponsor's scene asking the chair, and the paper's line | laws-hold-record-names-the-sponsor (open)                    | small  | When a chair sits on a bill, no scene or news story says why it died.                             |
| SG-LAW-age-check-teen-distress             | Still faked                                        | dropped                   | Nowhere: a stress baseline nobody reads                                                     | none                                                         | large  | The social media age check eases every teen's stress by the same amount.                          |

## Borderline, for the owner

- SG-LAW-justice-youth-firearm-harm: a named teen dying of a firearm injury would show in the journal and paper after a gun-safety ordinance; dropped by default.

## Evidence

- SG-LAW-outcome-link-unresearched: `src/core2/data/laws/outcome-research-gaps.json:1-12` (one law left).
- SG-LAW-justice-youth-firearm-harm: `src/core2/public-safety.ts:1930-1960` (marker 1944; only `lawApplied` "read" calls).
- SG-LAW-justice-enforcement-outcome-readers: `src/core2/public-safety.ts:1465-1480`; `src/core2/jobs-web.ts:231-243, 303` (jobs read it); `src/core2/school-outcomes.ts:447` (school reader missing).
- SG-LAW-justice-named-offender-acts: `src/core2/public-safety.ts:850-860`; blocked item `justice-one-crime-system-part-1-a-named-persons-offense`.
- SG-LAW-estates-counted-people: `src/core2/estates.ts:418-440` (`countedRelation` age-based).
- SG-LAW-death-tax-no-schedule: `src/core2/laws-death-taxes.ts:48-55` (`flatSchedule`).
- SG-LAW-government-heir-exempt-assumed: `src/core2/laws-death-taxes.ts:165-200`.
- SG-LAW-held-bill-chair-reasons-unread: `src/core2/modules/legislature.ts:4285-4310` and `6785-6810`; `src/bench/dev-mode.ts:1169`.
- SG-LAW-age-check-teen-distress: `src/core2/resting-stress.ts:55-72`.

Register edits: seven rows closed as dropped; held-bill row text rewritten; line numbers fixed. Markers in code untouched.

## Questions for the owner

None.
