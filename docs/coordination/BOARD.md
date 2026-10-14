# Board (CTO; rewritten Oct 14, 2026, evening)

The board says who is building what today and how work moves. Only the CTO writes it. Each session keeps its own status file in this folder, rulings live in the owner-decisions file and the decision register (look there before asking), and sessions never send messages or set triggers: the top of the PR body is the channel.

## Who is building what (live sessions, this account)

| Session                                    | Branch         | Line of work                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CORE wiring                                | core/*         | every-place runner; moves from causes with officeholders holding their seats; homelessness reads in drives and health; deaths as public records; estates with wills, intestacy and the taxes in force                                                                                                                                                                                                                     |
| GOV elections                              | gov/*          | candidates from the whole state at every level; counted voters that split; each place deciding its own votes; primaries that count; special elections outside the town; succession; no-candidate seats; dead candidates off the ballot; reporters barred from office; territory and district data (zero-seat legislatures, Idaho, Maryland, Oklahoma); taking office by the law of the place; debates on the right outlet |
| GOV wiring                                 | gov/*          | one national Congress on its calendar; vetoes, failures and roll calls as records; the federal budget rule; measure numbering per body; recalls on the right body; the two "none" laws and the flat $15 floor; estate and inheritance tax law series; bill sections composed from the record with editable terms                                                                                                          |
| WORLD                                      | world/*        | business names; foreclosure for owners; the remaining replacement proof                                                                                                                                                                                                                                                                                                                                                   |
| Words                                      | words/*        | batch 9 and onward with the guard reading grades; the journal as a memoir with procedural revisions; the director's scenes (first priority, owner, Oct 14)                                                                                                                                                                                                                                                                |
| OFFICE-LOCAL, OFFICE-STATE, OFFICE-FEDERAL | office/*       | the officeholder's day at each level on one office-day engine (`docs/packages/office-play.md`)                                                                                                                                                                                                                                                                                                                            |
| PLAY desktop                               | play/*         | Kit 13 reconciliation; dev-mode why panels                                                                                                                                                                                                                                                                                                                                                                                |
| Fixer                                      | fix/*          | bugs the CTO assigns, one per PR                                                                                                                                                                                                                                                                                                                                                                                          |
| Law-link merger                            | codex/law-link | merging main into #4116 until it holds                                                                                                                                                                                                                                                                                                                                                                                    |

The desktop package (the app plays in-process, releases publish installers, Check for Updates installs on the Mac) is the CTO's own agent's PR; Windows may stay red until early access (owner, Oct 14).

## Packages in force

`docs/packages/office-play.md`, `docs/packages/homelessness.md` (with foreclosure, estates and the taxes), `docs/packages/trace-all-places.md` (the audit shape). Audit reports: `docs/reports/trace-audit-2026-10-14/` (56 places) and the `stress-audit-*-2026-10-14` folders.

## Merge order

Green and mergeable merges in the order it lands; a PR red only because main drew a failing place waits for the fix on main, then merges main and pushes. Nobody merges their own PR.

## Open requests between sessions

Written at the top of each PR body under "Needs from"; the CTO relays.

## Open stand-ins

`src/core2/data/stopgaps.json` is the list; the release build refuses while any is open. Owner-decision stopgaps are listed under **OWNER DECISIONS NEEDED** at the top of the PR that holds them and in `OWNER-DECISIONS.md`.
