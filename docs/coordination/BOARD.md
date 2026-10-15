# Board (CTO; rewritten Oct 14, 2026, evening; orders added Oct 15, early)

The board says who is building what today and how work moves. Only the CTO writes it. Each session keeps its own status file in this folder, rulings live in the owner-decisions file and the decision register (look there before asking), and sessions never send messages or set triggers: the top of the PR body is the channel.

## Orders from the CTO (Oct 15, early; read at the start of every turn)

**PLAY (screens).** The owner's menu mockups are on main at `docs/ui/mocks/screens-2026-10-14/` (`README.md`, `shots/` for the 19 screens, `page/` to view in a browser). Build the screens to that look and feel, in the register's order (`docs/coordination/DECISION-REGISTER.md`, "Politics opens as a compact hub"), with the owner's caveats:

1. Ignore the thick or odd borders in the shots; they are regeneration artifacts, not the design.
2. Nothing that breaks immersion. No "what she thinks of you", no "Your mayor", no "Met Jan 6" style labels on a person card. A card shows the record as the person would be known: name, relation or office, where they live, their work, how you know them.
3. The person card's "Her story" and "Your record" sections are not a spec; keep them to what the records say, in the English engine's words.
4. The Issues mockup is not approved. Build Issues to the register: the law in force in words, history and votes on click.
5. The newspaper mockups are different looks on purpose. Each outlet gets its own layout from that set; never one look for every paper.
6. The mockup README's decisions stand: the existing Lie scales button, build on the old People web, keep Journal, Travel and Options as they are.
7. Your office does not exist on the Politics hub until the player holds an office. The calendar is an opaque panel with real contrast. Day advances time and never opens a choice list.

One PR per screen, the changed-file gate line and a full-window screenshot in the PR body, pushed once per PR, merged by the CTO on the owner's yes to the screenshot. Bench PRs no longer trigger Mac packaging.

**Cleanup (release).** The release gate is now the client's only: build, typecheck and the release declarations (`.github/workflows/release.yml`, owner, Oct 15). Update `tests/release/release-workflow.test.ts` to three blocking steps, record the three gone zero-dice lines with `npm run zero-dice -- --update`, and finish the unit-suite PR (#4309) on its own branch. Every push to main needs a declaration in `docs/release/changes/`.

**Fixer.** The new list-pick at `src/core2/town-households.ts:45` (from the ported town builder) is replaced by a decision from the actor's reasons, per the no-dice rule.

**Codex.** The figure set (8 poses × 6 bodies with layers, `art/people-engine/v2/`) per the CTO's brief; the chair maps and furniture masks from #4283 stay, the cut-out people go. The play session wires the renderer when the figures land and removes the v1 figures.

## Who is building what (live sessions, this account)

| Session                                    | Branch         | Line of work                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CORE wiring                                | core/*         | every-place runner; moves from causes with officeholders holding their seats; homelessness reads in drives and health; deaths as public records; estates with wills, intestacy and the taxes in force; the Waterford, California standing-obligation crash                                                                                                                                                                 |
| GOV elections                              | gov/*          | candidates from the whole state at every level; counted voters that split; each place deciding its own votes; primaries that count; special elections outside the town; succession; no-candidate seats; dead candidates off the ballot; reporters barred from office; territory and district data (zero-seat legislatures, Idaho, Maryland, Oklahoma); taking office by the law of the place; debates on the right outlet |
| GOV wiring                                 | gov/*          | one national Congress on its calendar; vetoes, failures and roll calls as records; the federal budget rule; measure numbering per body; recalls on the right body; the two "none" laws and the flat $15 floor; estate and inheritance tax law series; bill sections composed from the record with editable terms                                                                                                          |
| WORLD                                      | world/*        | business names; foreclosure for owners; the remaining replacement proof; the player is offered jobs, never hired by the engine                                                                                                                                                                                                                                                                                             |
| Words                                      | words/*        | the director's scenes and conversations per the Oct 14 night rulings (first priority); the opening's context; batch 11 after the director package                                                                                                                                                                                                                                                                          |
| OFFICE-LOCAL, OFFICE-STATE, OFFICE-FEDERAL | office/*       | the officeholder's day at each level on one office-day engine (`docs/packages/office-play.md`)                                                                                                                                                                                                                                                                                                                            |
| PLAY desktop                               | play/*         | the screens to the owner's mockups (above); the seat-slot renderer when the figures land                                                                                                                                                                                                                                                                                                                                  |
| Cleanup                                    | release/*      | the release gate and the unit suite that follows what the game does now                                                                                                                                                                                                                                                                                                                                                  |
| Fixer                                      | fix/*          | bugs the CTO assigns, one per PR                                                                                                                                                                                                                                                                                                                                                                                          |
| Law-link merger                            | codex/law-link | merging main into #4116 until it holds                                                                                                                                                                                                                                                                                                                                                                                    |

The desktop package is the game client alone (owner, Oct 14, night); the release packages it for the Mac and publishes to GitHub Releases, which the app's Check for updates reads; Windows may stay red until early access.

## Packages in force

`docs/packages/office-play.md`, `docs/packages/homelessness.md` (with foreclosure, estates and the taxes), `docs/packages/trace-all-places.md` (the audit shape). Audit reports: `docs/reports/trace-audit-2026-10-14/` (56 places) and the `stress-audit-*-2026-10-14` folders.

## Merge order

A PR merges on its builder's changed-file gate line at the top of the PR body (owner, Oct 14, evening); GitHub's runs are not waited on. A screen merges on the owner's yes to its screenshot. Nobody merges their own PR.

## Open requests between sessions

Written at the top of each PR body under "Needs from"; the CTO relays.

## Open stand-ins

`src/core2/data/stopgaps.json` is the list; the release build refuses while any is open. Owner-decision stopgaps are listed under **OWNER DECISIONS NEEDED** at the top of the PR that holds them and in `OWNER-DECISIONS.md`.

## Pool claims

- 1. Committee markup trades — `pool/committee-markup` (Session D, draft #4328; 19 tests and played-year proof pass).
- 2. Unwired record-only law families — `pool/law-read-dependency` (Session D; blocked by Session A #4331, return last).
- 3. First faked-mechanic engine, central bank appointments — `pool/central-bank-appointments` (Session D, draft #4333; 8 tests and played-year proof pass).

- 3. Next faked-mechanic engine, credit-line stand-in — `pool/credit-line-retirement` (second Session D, claimed October 15, 2026; SG-WORLD-credit-line-stand-in only).

- 3. Business engine faked mechanics — `pool/business-owner-decisions` (second Session D; SG-WORLD-business-counted-owner-choice and SG-WORLD-business-no-successor; earlier jobs, credit deposits and housing engines belong to active Session B work, return to remaining gaps after its unmerged work).

- 3. Outcome web drift — `pool/outcome-causes` (first Session D; SG-WEB-outcome-drift; earlier jobs, credit and housing engines are Session B’s, business is claimed by second Session D, and place-prices is active Session A #4335).

- 3. Campaign door fill-in — `pool/campaign-met-households` (second Session D; SG-PLAY-doors-fill-in; action backend only, no screens. Earlier housing/property-tax/moves overlap Session B, place-prices Session A, and outcome drift first Session D).

- 3. Custom world settings duplication — `pool/shared-world-settings` (second Session D; SG-PLAY-world-settings-copy; share opening settings helpers, no screen design changes. Opening-economy fallback depends on the core opening repair and remains separate).

- 3. Unobserved town-growth macro input — `pool/macro-observed-growth` (second Session D; SG-WORLD-macro-town-growth-neutral; remove invented first-year feedback and retain the missing income-history requirement. Earlier treasury law effects overlap Session A, jobs/prison hiring Session B, press acts Session C).
- 3. Press revenue and staff turnover — `pool/press-records` (first Session D; SG-PEOPLE-press-outlet-revenue and SG-PEOPLE-press-staff-turnover; earlier opening/core and housing/jobs are Session B, settings second D, budget/tax reads Session A; changes to press engine only, no English or director changes).

- 4. Officeholder journal — `pool/journal-record-dependency` (first Session D; blocked by Session C's unmerged office-day act records and Words' journal wording; return last).
- 5. Unit suite record/retirement contracts — `pool/unit-suite` (first Session D; #4309 finance, news, outcome coverage and retired-test contracts only; second Session D owns views ordering, and law/housing defects stay with active owners).
- 5. Green-suite independent views-ordering failure — `pool/green-suite-views` (second Session D; root cause from #4309, src/core2/views-lean.test.ts and its electorate reader. Earlier remaining stopgaps overlap active law/election, jobs/housing/core and press work; office journal depends on Session C office records and Words director work; return to those last).
