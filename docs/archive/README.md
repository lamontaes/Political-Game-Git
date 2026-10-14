# Archive of old hand-offs, progress logs and completion reports

These notes record how the old player app and the first port were built. Nothing in the game, its tests or its tooling reads them. Decisions they record that still hold are in `docs/coordination/DECISION-REGISTER.md` and `docs/coordination/OWNER-DECISIONS.md`; read those first. Files keep their old paths under `docs/archive/`, so a link like `docs/codex/progress/session-88.md` is now `docs/archive/codex/progress/session-88.md`.

| Folder                          | Files | What it holds                                                                                |
| ------------------------------- | ----- | -------------------------------------------------------------------------------------------- |
| `(top level)`                   | 17    | Completion reports, audits and browser-suite notes from the old player app (September 2026). |
| `agent`                         | 1     | Claude agent hand-off notes.                                                                 |
| `agent/history`                 | 2     | Claude agent history notes.                                                                  |
| `codex/assignments`             | 61    | Codex work assignments.                                                                      |
| `codex/handbacks`               | 71    | Codex hand-backs to the coordinator.                                                         |
| `codex/handoff`                 | 12    | Codex hand-off packets.                                                                      |
| `codex/handoff/session-49/bg01` | 2     |                                                                                              |
| `codex/handoff/tools`           | 7     |                                                                                              |
| `codex/progress`                | 72    | Codex session progress logs.                                                                 |
| `handoffs`                      | 30    | Hand-off notes and patches between old-app sessions.                                         |

## (top level)

- [60A-narrative-graphics-content-and-life-flow-repair-completion.md](60A-narrative-graphics-content-and-life-flow-repair-completion.md): 60A — PR #81 Narrative, Graphics, Content and Life-Flow Repair — Completion
- [60B-full-visual-ui-and-graphics-coverage-audit.md](60B-full-visual-ui-and-graphics-coverage-audit.md): 60B — FULL VISUAL, UI AND GRAPHICS COVERAGE AUDIT
- [60C-full-dialogue-conversation-branching-and-copy-audit.md](60C-full-dialogue-conversation-branching-and-copy-audit.md): 60C — FULL DIALOGUE, CONVERSATION, BRANCHING AND COPY AUDIT
- [60D-our-civic-duty-engine-and-systems-field-guide.md](60D-our-civic-duty-engine-and-systems-field-guide.md): 60D — OUR CIVIC DUTY
- [70A-dialogue-reachability-npc-autonomy-and-life-continuity-completion.md](70A-dialogue-reachability-npc-autonomy-and-life-continuity-completion.md): 70A — PR #87 Dialogue Reachability, NPC Autonomy and Life Continuity — Completion
- [72A-human-play-conditional-fail-and-character-context-repair-completion.md](72A-human-play-conditional-fail-and-character-context-repair-completion.md): 72A — PR #87 Human Play CONDITIONAL FAIL and Character Context Repair — Completion
- [74-gemini-visual-generation-and-revision-one-stop-prompt-pack.md](74-gemini-visual-generation-and-revision-one-stop-prompt-pack.md): 74 — GEMINI VISUAL GENERATION AND REVISION — ONE-STOP PROMPT PACK
- [76a-visual-reference-measurement-and-generation-spec.md](76a-visual-reference-measurement-and-generation-spec.md): 76A — Visual Reference Measurement and Generation Spec
- [76b-post86-mass-visual-generation-command-center-completion.md](76b-post86-mass-visual-generation-command-center-completion.md): 76B — Post-#86 Mass Visual Generation Command Center — Completion Report
- [77A-pr87-second-human-play-fail-presentation-repair-completion.md](77A-pr87-second-human-play-fail-presentation-repair-completion.md): 77A — PR #87 Second Human Play FAIL and Presentation Repair — Completion
- [77A-unified-visual-authoring-engine-convergence-audit.md](77A-unified-visual-authoring-engine-convergence-audit.md): 77A — Unified Visual Authoring Engine: Convergence Audit and First Slice
- [88A-post-pr87-player-presentation-completion.md](88A-post-pr87-player-presentation-completion.md): 88A — Post-#87 Player Presentation and Formative-Life Pass — Completion
- [92b-existing-visual-asset-ingestion-and-production-release-reconciliation-completion.md](92b-existing-visual-asset-ingestion-and-production-release-reconciliation-completion.md): 92B — Existing Visual Asset Ingestion + Production-Release Reconciliation — Completion Report
- [95-wave-a-morphology-and-recent-drive-ingestion.md](95-wave-a-morphology-and-recent-drive-ingestion.md): PR #95 Wave-A morphology and recent-Drive cargo
- [BROWSER-SUITE-CASE-LIST.md](BROWSER-SUITE-CASE-LIST.md): The browser suite's 104, named
- [BROWSER-SUITE-FLOOR.md](BROWSER-SUITE-FLOOR.md): The browser suite's floor
- [player-facing-text-findings-2026-09-22.md](player-facing-text-findings-2026-09-22.md): Player-facing text: three findings from the Springfield walk

## agent

- [econ-context2-ui-core-handoff.md](agent/econ-context2-ui-core-handoff.md): ECON-CONTEXT2 → UI-core handoff

## agent/history

- [README.md](agent/history/README.md): Agent History
- [old-work-recovery1.md](agent/history/old-work-recovery1.md): OLD-WORK-RECOVERY1 preservation and disposition packet

## codex/assignments

- [00-STANDING-RULES.md](codex/assignments/00-STANDING-RULES.md): Standing rule (owner, Oct 5)
- [ASSIGNMENT-MAP.md](codex/assignments/ASSIGNMENT-MAP.md): Assignment map
- [BUGS.md](codex/assignments/BUGS.md): BUGS: every known bug as a pool item
- [INTERFACES.md](codex/assignments/INTERFACES.md): INTERFACES: exported seams per owning session
- [POOL-staleness-2026-10-07.md](codex/assignments/POOL-staleness-2026-10-07.md): POOL.md staleness list (October 7, 2026)
- [POOL.md](codex/assignments/POOL.md): POOL: the one work pool
- [ROADMAP-GAPS.md](codex/assignments/ROADMAP-GAPS.md): Roadmap gaps: everything no assignment doc covers in full (Oct 6, 2026)
- [b01-petition-signatures.md](codex/assignments/b01-petition-signatures.md): B01 Petition signatures, where the place requires them
- [b02-campaign-money-and-helpers.md](codex/assignments/b02-campaign-money-and-helpers.md): B02 Campaign money and helpers, scaled to the place
- [b03-election-night-scene.md](codex/assignments/b03-election-night-scene.md): Election night with your people, precinct by precinct (bank id b03, phase P1 council journey; unlocks "campaigns by meeting people -> election night -> council")
- [b04-what-a-loss-carries-forward.md](codex/assignments/b04-what-a-loss-carries-forward.md): Losing: what carries forward depends on what you built (bank id b04, phase P1 council journey; unlocks "next election runs on the record" after a loss)
- [b05-council-meetings-what-plays.md](codex/assignments/b05-council-meetings-what-plays.md): B05 Council meetings: only what matters plays
- [b06-constituents.md](codex/assignments/b06-constituents.md): B06 Constituents: how your office handles them
- [b07-what-people-think-of-you.md](codex/assignments/b07-what-people-think-of-you.md): What people think of you: word of mouth, the paper, real polls (bank id b07, phase P1 council journey; unlocks "people bring up your vote" and "next election runs on the record")
- [b08-vote-bargaining.md](codex/assignments/b08-vote-bargaining.md): Vote bargaining at the council table (bank id b08, phase P4 build; first used in the council journey step "negotiates -> vote as a played moment")
- [b09-poison-pills-riders-attack-ads.md](codex/assignments/b09-poison-pills-riders-attack-ads.md): Poison pills, riders and attack ads that read your vote at its worst (bank id b09, phase P4 build; unlocks the legislative amendment fight and the election-on-your-record ads)
- [b10-committees-chairs-leadership.md](codex/assignments/b10-committees-chairs-leadership.md): Committee seats, chairs and leadership races (bank id b10, phase P4 build, in 1.0; unlocks chair power and the party-leadership path)
- [b11-capital-or-home-week.md](codex/assignments/b11-capital-or-home-week.md): Where you spend the week: capital or home (bank id b11, phase P4 build; unlocks who you meet as a legislator and the "never see him anymore" reading)
- [b12-minority-party-tools.md](codex/assignments/b12-minority-party-tools.md): Minority-party tools: delay, filibuster, amendments, messaging votes, deals with moderates (bank id b12, phase P4 build; unlocks playing the minority and the computer-run minority)
- [b13-judge-play.md](codex/assignments/b13-judge-play.md): Playing as a judge: cases as scenes, rulings within the law and your outlook (bank id b13, phase P4 build; unlocks the judicial path of the 1.0 office ladder and the "courts strike down laws" half of governing)
- [b14-corruption.md](codex/assignments/b14-corruption.md): B14 Corruption: any real kind, found out only through people and records
- [b15-investigations-oppo-research.md](codex/assignments/b15-investigations-oppo-research.md): Investigations and opposition research: who finds what, and whether they care (bank id b15, phase P5 build; extends b14 corruption and b26 scandals; unlocks "next election runs on the record" for dug-up pasts)
- [b16-redistricting-vra.md](codex/assignments/b16-redistricting-vra.md): Redistricting: pick from ready-made plans and bargain, under the Voting Rights Act (bank id b16, phase P4 build; unlocks the census-year cycle and "courts strike down maps")
- [b17-executive-orders-regulations.md](codex/assignments/b17-executive-orders-regulations.md): Executive orders, regulations, enforcement and the bully pulpit (bank id b17, phase P4 build; unlocks every non-bill route for mayor, governor and President)
- [b18-citizen-actions.md](codex/assignments/b18-citizen-actions.md): Citizen actions: vote, speak, petition, organize, write (bank id b18, phase P2 build; all in 1.0; unlocks "a quiet town grows a neighborhood association, a recall fight or a ballot question" and the pre-office life)
- [b19-death-look-back.md](codex/assignments/b19-death-look-back.md): B19 Death look-back: your life read back in your voice, then the record
- [b20-elder-statesman-and-movement-succession.md](codex/assignments/b20-elder-statesman-and-movement-succession.md): Career to elder statesman; movements and standing groups passing to a successor (bank id b20, phases: two tracks to President (career) + living world (movements))
- [b21-family-partner-and-kids.md](codex/assignments/b21-family-partner-and-kids.md): B21 Family: meet a partner through the world, a few moments with your kids
- [b22-economy-by-office-and-news-from-elsewhere.md](codex/assignments/b22-economy-by-office-and-news-from-elsewhere.md): Economy screens scale with office; other places' politics reaches you through the news (bank id b22, phases: equip and inform / living world)
- [b23-real-local-names.md](codex/assignments/b23-real-local-names.md): B23 Local names: real public bodies, hospitals, colleges and banks; generated private businesses
- [b24-every-pose-every-view-place-library.md](codex/assignments/b24-every-pose-every-view-place-library.md): Every pose in every view, and the full place library, built all at once from shared parts and tags (bank id b24, phase equip and inform; Session 11 owns it)
- [b25-optional-difficulty-settings.md](codex/assignments/b25-optional-difficulty-settings.md): Optional difficulty settings on top of the adaptive (Pennywise) challenge (bank id b25, phase ship 1.0: after the 1.0 core, last)
- [b26-scandals-and-press-record.md](codex/assignments/b26-scandals-and-press-record.md): B26 Scandals and your press record: the reporter who knows you
- [b27-living-economy.md](codex/assignments/b27-living-economy.md): Living economy: prices, rent and household bills from the market and the law (bank id b27, Session 51)
- [b28-businesses-real-books.md](codex/assignments/b28-businesses-real-books.md): Businesses keep real books from real sales; employers pay from cash; businesses change hands (bank id b28, Session 52)
- [b29-world-keeps-governing.md](codex/assignments/b29-world-keeps-governing.md): The world keeps governing: bills pass without the player, in every term, with real bill numbers (bank id b29, Session 53)
- [b30-named-world.md](codex/assignments/b30-named-world.md): The named world: colleges as real places, every named person is a person, news read by habit (bank id b30, Session 54)
- [b31-mods-and-updater.md](codex/assignments/b31-mods-and-updater.md): Mods change content and rules without touching the engine; the permanent Mac app updates itself; secrets stay out of the repo (bank id b31, Session 55)
- [b32-one-legislative-engine.md](codex/assignments/b32-one-legislative-engine.md): One legislative engine: council, state legislature and Congress through the same machinery, and every rule changeable by law (bank id b32, Session 56)
- [b33-opening-questions-and-first-day.md](codex/assignments/b33-opening-questions-and-first-day.md): The opening: questions that put you in power, a quiet first day, a light childhood, and the Creator's county and population (bank id b33, phase P1 council journey, unlocks the golden path "18 -> clerk -> council")
- [b34-clerk-filing-primaries-and-nominations.md](codex/assignments/b34-clerk-filing-primaries-and-nominations.md): The clerk's filing conversation, primaries and party nominations as played scenes (bank id b34, phase P1 council journey / P4 ladder; unlocks "files at the clerk's" and the ladder to President)
- [b35-statehouse-session-play.md](codex/assignments/b35-statehouse-session-play.md): The statehouse session as the player lives it: calendar, hearings, floor sitting, other chamber, governor's desk (bank id b35, phase P4 every office, unlocks state legislator play in all 56 jurisdictions)
- [b36-congress-conference-and-the-veto-scene.md](codex/assignments/b36-congress-conference-and-the-veto-scene.md): Congress as played: conference, the enrolled bill, the veto scene and the override vote (bank id b36, phase P4 every office, unlocks Congress to President play and the same desk-to-override scene in every statehouse)
- [b37-appointments-confirmed-in-scenes-and-your-staff.md](codex/assignments/b37-appointments-confirmed-in-scenes-and-your-staff.md): Appointments confirmed in scenes, and the people who work for you (bank id b37, phase P4 every office, unlocks "appointed to office by someone who knows and trusts you", cabinet and staff as real people)
- [b38-budgets-with-staff-and-the-fiscal-year.md](codex/assignments/b38-budgets-with-staff-and-the-fiscal-year.md): Budgets with staff and the fiscal year (bank id b38, phase P4 every office, unlocks the governor, mayor and President budget season)
- [b39-state-and-federal-bench-the-judge-ladder.md](codex/assignments/b39-state-and-federal-bench-the-judge-ladder.md): The judge ladder: state and federal benches above the trial court (bank id b39, phase P4 every office, unlocks the judicial path of the 1.0 ladder and "courts strike down laws" at every level)
- [b40-newspaper-and-tv-live-surfaces.md](codex/assignments/b40-newspaper-and-tv-live-surfaces.md): The newspaper and the TV as live surfaces (bank id b40, phase P3 looks / P2 equip and inform; unlocks "the news looks like real newspapers", "screens tagged in every place", election-night TV)
- [b41-journal-as-life-story.md](codex/assignments/b41-journal-as-life-story.md): The live Journal as your life story, written as you go (bank id b41, phase P3 (G56/G131), unlocks a Journal worth opening at every age and office, and the chapters b19 reads back at death)
- [b42-steam-screenshots-from-played-runs.md](codex/assignments/b42-steam-screenshots-from-played-runs.md): Steam store page made from played runs: screenshots, capsule art, trailer cut, store text, requirements, Coming Soon (bank id b42, phase P3/P6 gaps G59/G60/G61/G132, unlocks the Coming Soon page about Oct 15 and the 1.0 launch)
- [b43-mod-packs-people-can-author.md](codex/assignments/b43-mod-packs-people-can-author.md): Mod packs people can actually author: a sample pack, an authoring guide, the in-game mod list, a Workshop-ready folder (bank id b43, phase P6 "Ship it", gap G133, unlocks Steam-era community content)
- [b44-governor-desk-beyond-bills.md](codex/assignments/b44-governor-desk-beyond-bills.md): The governor's desk beyond bills: clemency, the State of the State, special sessions, emergency declarations as played scenes (bank id b44, phase P4 gap G134, unlocks a governor with real work in all 56 jurisdictions)
- [b45-inauguration-swearing-in-transition.md](codex/assignments/b45-inauguration-swearing-in-transition.md): Inauguration, swearing-in and transition as played scenes for every office (bank id b45, phase P4 every office, unlocks "win, take the right seat" from council to President)
- [b46-impeachment-and-removal.md](codex/assignments/b46-impeachment-and-removal.md): Impeachment and removal as scenes: House investigation and articles, Senate trial, and the state and local equivalents (bank id b46, phase P4 every office, gap G136, unlocks "a governor, a judge or a mayor can be removed by the people who sit above them" at every level)
- [b47-vice-president-succession-and-25th.md](codex/assignments/b47-vice-president-succession-and-25th.md): Vice President, succession and the 25th Amendment as played moments (bank id b47, phase P4/P5 (G137), unlocks a vacancy that starts from a dark event or a death playing out as scenes: the oath, the nominee, the confirmation, the acting president, the governor's successor)
- [b48-party-leadership.md](codex/assignments/b48-party-leadership.md): Party leadership: state and national committee chairs, platform fights, rules votes (bank id b48, phase P4 ladder, unlocks "run the party" as a career and the party side of the convention)
- [b49-county-and-city-executive.md](codex/assignments/b49-county-and-city-executive.md): County and city executives as played desks: county executive, commission chair, city manager, strong and weak mayor, school board (bank id b49, phase P4, G139, unlocks every local executive in all 50 states, D.C. and the territories through the one executive engine)
- [landing-rows-approved.md](codex/assignments/landing-rows-approved.md): The approved landing rows (Outcome Web Proposal, Oct 5 6:45 p.m.; owner approved parts 1–7 and all 36 for 1.0)
- [landing-rows.md](codex/assignments/landing-rows.md): The landing rows: per-measure table for all 56 place measures
- [placeholders.md](codex/assignments/placeholders.md): Placeholders 2026-10-06
- [pool-audit-repairs.md](codex/assignments/pool-audit-repairs.md): Pool: Sept 30 audit repairs, by area
- [pool-traits.md](codex/assignments/pool-traits.md): Pool: personality wired everywhere (T1–T12)

## codex/handbacks

- [09-routing.md](codex/handbacks/09-routing.md): Every September 29 playtest item has an owner
- [merge-a11-session-calendar.md](codex/handbacks/merge-a11-session-calendar.md): A11: one session calendar, first bounded half
- [team-1-continuous-claims.md](codex/handbacks/team-1-continuous-claims.md): Shared hunks needed for continuous principle strength
- [team-1-continuous-strength.json](codex/handbacks/team-1-continuous-strength.json)
- [team-1-continuous-strength.md](codex/handbacks/team-1-continuous-strength.md): Strength now reaches decisions; individual variation remains held
- [team-1-officeholder-life.md](codex/handbacks/team-1-officeholder-life.md): Officeholder life formation is independent of the held laws
- [team-1-principle-example.json](codex/handbacks/team-1-principle-example.json)
- [team-1-principle-month.json](codex/handbacks/team-1-principle-month.json)
- [team-1-principle-month.md](codex/handbacks/team-1-principle-month.md): Team 1: same-seed principle month — held
- [team-1-transfer-evidence.json](codex/handbacks/team-1-transfer-evidence.json)
- [team-1-why-chains.md](codex/handbacks/team-1-why-chains.md): Life records still become beliefs through authored shortcuts
- [team-2-georgia-all-catalog-weight-comparison.csv](codex/handbacks/team-2-georgia-all-catalog-weight-comparison.csv)
- [team-2-georgia-all-catalog-weight-comparison.json](codex/handbacks/team-2-georgia-all-catalog-weight-comparison.json)
- [team-2-georgia-all-catalog-weight-comparison.md](codex/handbacks/team-2-georgia-all-catalog-weight-comparison.md): Weighted law arguments changed 76 Georgia House decisions
- [team-2-georgia-weight-comparison.json](codex/handbacks/team-2-georgia-weight-comparison.json)
- [team-2-georgia-weight-comparison.md](codex/handbacks/team-2-georgia-weight-comparison.md): Georgia House votes kept their direction when argument weights changed
- [team-2-government-stamp-batch.md](codex/handbacks/team-2-government-stamp-batch.md): Government events retain their governing law
- [team-2-law-effect-stamp.md](codex/handbacks/team-2-law-effect-stamp.md): Shared law-effect stamp
- [team-2-weighted-principle-consumer.md](codex/handbacks/team-2-weighted-principle-consumer.md): Law arguments change the reason a lawmaker gives for a vote
- [team-4-a56-recorded-bedrooms.md](codex/handbacks/team-4-a56-recorded-bedrooms.md): First leases use household size for bedrooms
- [team-4-a58-main-callers.md](codex/handbacks/team-4-a58-main-callers.md): Opening and life refresh share the town's recorded employers
- [team-4-cannabis-retail-mechanism.md](codex/handbacks/team-4-cannabis-retail-mechanism.md): Cannabis revenue needs a legal-sales base
- [team-4-cannabis-revenue-loss.md](codex/handbacks/team-4-cannabis-revenue-loss.md): State budgets record the cost of ending legal cannabis sales
- [team-4-cannabis-zero-base-consequence.md](codex/handbacks/team-4-cannabis-zero-base-consequence.md): Cannabis revenue reaches a budget that started at zero
- [team-4-cloud-continuation.md](codex/handbacks/team-4-cloud-continuation.md): Team 4 — cloud continuation for monthly speed
- [team-4-cloud-speed.md](codex/handbacks/team-4-cloud-speed.md): The cloud month is faster, but still above fifteen seconds
- [team-4-common-consequence-inputs.md](codex/handbacks/team-4-common-consequence-inputs.md): Housing law inputs retain their missing bindings
- [team-4-housing-law-stamp-batch.md](codex/handbacks/team-4-housing-law-stamp-batch.md): Tenant records retain the housing laws that acted on them
- [team-4-life-helper-indexes.md](codex/handbacks/team-4-life-helper-indexes.md): Life-record indexes reduced the watched month
- [team-4-m10-native-lease-dispatch.md](codex/handbacks/team-4-m10-native-lease-dispatch.md): 1. Why-chain to bedrock
- [team-4-m10-scheduled-rent.md](codex/handbacks/team-4-m10-scheduled-rent.md): Scheduled rent proof handback
- [team-4-named-holders-runaway.md](codex/handbacks/team-4-named-holders-runaway.md): Named officeholder tests now finish in seconds
- [team-4-self-starter-copies.md](codex/handbacks/team-4-self-starter-copies.md): Self-starter record copies reduced the cloud month to twenty-four seconds
- [team-4-state-intake.md](codex/handbacks/team-4-state-intake.md): State intake is faster when the copy transaction ends before decisions
- [team-4-x7-saved-aid-facts.md](codex/handbacks/team-4-x7-saved-aid-facts.md): 1. Why-chain
- [team-4.md](codex/handbacks/team-4.md): The watched world still takes minutes to advance
- [team-5-bedrock-numbers.md](codex/handbacks/team-5-bedrock-numbers.md): Pressure and news still depend on placeholder numbers
- [team-5-day-note-foreground.md](codex/handbacks/team-5-day-note-foreground.md): Daily notes wait behind meetings and person records
- [team-5-direct-law-ranges.md](codex/handbacks/team-5-direct-law-ranges.md): Estimated teacher floors and tuition growth now vary by world and state
- [team-5-law-traces.md](codex/handbacks/team-5-law-traces.md): Education and civil laws have several effects that stop short of people
- [team-5-live-meeting-flow.md](codex/handbacks/team-5-live-meeting-flow.md): Starting a public meeting opens the room
- [team-5-opening-work-location.md](codex/handbacks/team-5-opening-work-location.md): The first morning follows the player's work schedule
- [team-5-school-facility-law-traces.md](codex/handbacks/team-5-school-facility-law-traces.md): School facility laws record duties before any school repair is demonstrated
- [team-5-story-day-mount.md](codex/handbacks/team-5-story-day-mount.md): The day reads the people present and checks meeting choices again
- [team-5-teacher-five-state-receipt.json](codex/handbacks/team-5-teacher-five-state-receipt.json)
- [team-5-teacher-stamp-main.md](codex/handbacks/team-5-teacher-stamp-main.md): Six teachers received stamped raises in three watched states
- [team-5.md](codex/handbacks/team-5.md): Team 5 is in the cloud; news-habit research still has gaps
- [team-6-cannabis-revenue-reader.md](codex/handbacks/team-6-cannabis-revenue-reader.md): Cannabis adoption needs an amount when the opening tax base is zero
- [team-6-consequence-conversion.md](codex/handbacks/team-6-consequence-conversion.md): Transport law inputs retain actual costs and expose missing bindings
- [team-6-ntd-rural-cost.md](codex/handbacks/team-6-ntd-rural-cost.md): Transit golden-rule repair checkpoint
- [team-6-read-law-stamps.md](codex/handbacks/team-6-read-law-stamps.md): Mileage attribution checkpoint is preserved for the shared law path
- [team-6-transit-audit-evidence.md](codex/handbacks/team-6-transit-audit-evidence.md): Transit payments need a canonical audit join
- [team-6-transit-metric-stamps.md](codex/handbacks/team-6-transit-metric-stamps.md): Transit metric provenance checkpoint
- [team-7-remove-here-panel.md](codex/handbacks/team-7-remove-here-panel.md): Remove the room's duplicate people list
- [team-8-age-verification-budget-cost.md](codex/handbacks/team-8-age-verification-budget-cost.md): State enforcement costs retain their governing law
- [team-8-cloud-build-repair.md](codex/handbacks/team-8-cloud-build-repair.md): The cloud build accepts the existing furniture clipping data
- [team-8-conversation-audit.md](codex/handbacks/team-8-conversation-audit.md): Conversation audit records what each offered choice actually writes
- [team-8-evidence-manifest.json](codex/handbacks/team-8-evidence-manifest.json)
- [team-8-health-coverage-stamp.md](codex/handbacks/team-8-health-coverage-stamp.md): Coverage changes retain the law that governed them
- [team-8-health-law-stamp-batch.md](codex/handbacks/team-8-health-law-stamp-batch.md): Consumer privacy costs retain their governing law
- [team-8-law-news-provenance.md](codex/handbacks/team-8-law-news-provenance.md): Recorded coverage changes reach resident law news
- [team-8-opening-english.md](codex/handbacks/team-8-opening-english.md): The opening tells your school years in a paragraph
- [team-8-opening-family.md](codex/handbacks/team-8-opening-family.md): The family card shows the saved parents in the home region
- [team-8-opening-legislature.md](codex/handbacks/team-8-opening-legislature.md): Your recorded state representatives stand on the opening card
- [team-8-school-honorees.md](codex/handbacks/team-8-school-honorees.md): New school honorees use historical naming patterns
- [team-8-story-resolver-contract.md](codex/handbacks/team-8-story-resolver-contract.md): Scene choices retain the records that put people there
- [team-8-work-history-english.md](codex/handbacks/team-8-work-history-english.md): Work history states the job starts actually on record
- [team-8.md](codex/handbacks/team-8.md): Jobs describes the list it can actually show
- [team-9-bill-numbers.md](codex/handbacks/team-9-bill-numbers.md): Bill-number sources expose sequence and session gaps
- [team-9-transfer-wip.md](codex/handbacks/team-9-transfer-wip.md): Team9 transfer checkpoint — WIP, stopped for account handoff
- [team2-saved-stamp-collector.md](codex/handbacks/team2-saved-stamp-collector.md): Nested stamped costs were outside the audit reader

## codex/handoff

- [CLAUDE-MEMORY-EXPORT-2026-10-02.md](codex/handoff/CLAUDE-MEMORY-EXPORT-2026-10-02.md): Claude CTO memory notes (all of them), exported Oct 2 2026 for Codex
- [HANDOFF-TO-CODEX-2026-10-02.md](codex/handoff/HANDOFF-TO-CODEX-2026-10-02.md): Handoff: Claude CTO to Codex (weekend of Oct 2–4, 2026)
- [followups-2026-10-02.md](codex/handoff/followups-2026-10-02.md): Follow-ups (small stuff, noted, not blocking) — Oct 2
- [session11-campus-compatibility.md](codex/handoff/session11-campus-compatibility.md): Session 11 campus compatibility — partial code handoff
- [session11-hair-face-window.md](codex/handoff/session11-hair-face-window.md): Afro hair covers part of the painted face
- [session11-intro-placement-api.md](codex/handoff/session11-intro-placement-api.md): Intro proof reads the spot the engine actually selected
- [skill-cloud-brief.md](codex/handoff/skill-cloud-brief.md): Brief a team (Lamontae: "bounded, specific, fleshed out ... work smarter")
- [skill-cto-gate-merge.md](codex/handoff/skill-cto-gate-merge.md): Gate and merge a PR (Claude CTO)
- [skill-feature-walkthrough.md](codex/handoff/skill-feature-walkthrough.md): Feature walkthrough (Lamontae's gold standard, Sept 30 2026)
- [skill-firefly-art.md](codex/handoff/skill-firefly-art.md): Firefly art pipeline (Claude CTO, approves art himself)
- [skill-lanes-doc.md](codex/handoff/skill-lanes-doc.md): The 03 lanes doc (the only channel with the teams)
- [skill-owner-report.md](codex/handoff/skill-owner-report.md): Reporting to Lamontae

## codex/handoff/session-49/bg01

- [branch.png](codex/handoff/session-49/bg01/branch.png)
- [main.png](codex/handoff/session-49/bg01/main.png)

## codex/handoff/tools

- [approve.sh](codex/handoff/tools/approve.sh)
- [audit_count.py](codex/handoff/tools/audit_count.py)
- [audit_progress.py](codex/handoff/tools/audit_progress.py)
- [design_check.py](codex/handoff/tools/design_check.py)
- [fix_note.sh](codex/handoff/tools/fix_note.sh)
- [ledger.py](codex/handoff/tools/ledger.py)
- [merge.sh](codex/handoff/tools/merge.sh)

## codex/progress

- [p2-1705.md](codex/progress/p2-1705.md): P2 rules sweep — current handoff
- [session-100.md](codex/progress/session-100.md): Session 100 resume marker
- [session-101.md](codex/progress/session-101.md): Session 101 resume marker
- [session-102.md](codex/progress/session-102.md): Session 102 progress
- [session-103.md](codex/progress/session-103.md): Session 103 resume marker
- [session-104.md](codex/progress/session-104.md): Session 104 progress
- [session-106.md](codex/progress/session-106.md): Session 106 progress
- [session-107-sp-02-profile.md](codex/progress/session-107-sp-02-profile.md): SP-02 payday calendar receipt
- [session-107.md](codex/progress/session-107.md): Session 107 resume marker
- [session-108.md](codex/progress/session-108.md): Session 108 progress
- [session-11.md](codex/progress/session-11.md): Session 11 resume marker
- [session-110.md](codex/progress/session-110.md): Usage-limit handoff — October 6, 2026, 17:55 UTC
- [session-127.md](codex/progress/session-127.md): Session 127: Native coverage records the remaining art gaps
- [session-13.md](codex/progress/session-13.md): P1 / Recorded election-law effects / Session 13
- [session-132.md](codex/progress/session-132.md): Session 132 restart handoff
- [session-2.md](codex/progress/session-2.md): Session 2 progress
- [session-20.md](codex/progress/session-20.md): Session 20 progress
- [session-23.md](codex/progress/session-23.md): Session 23 executive track
- [session-24.md](codex/progress/session-24.md): Session 24 progress
- [session-27-dupe-03-ticket.md](codex/progress/session-27-dupe-03-ticket.md): Session 27 duplicate ticket DUPE-03: one procedure engine for moving bills
- [session-27-dupe-05-ticket.md](codex/progress/session-27-dupe-05-ticket.md): Session 27 duplicate ticket DUPE-05: one future handler registry
- [session-27-dupe-07-ticket.md](codex/progress/session-27-dupe-07-ticket.md): Session 27 duplicate ticket DUPE-07: campaign contribution rules and winner seating
- [session-27-duplicates.md](codex/progress/session-27-duplicates.md): Session 27 duplicate work tickets
- [session-27-hardcoded-fixtures.md](codex/progress/session-27-hardcoded-fixtures.md): Session 27 duplicate ticket FIXTURE-01: remove baked-in fixture place and policy dates
- [session-27.md](codex/progress/session-27.md): Session 27 progress — B02 part 2
- [session-29.md](codex/progress/session-29.md): Session 29: LW-09
- [session-34-bg-05-branch.png](codex/progress/session-34-bg-05-branch.png)
- [session-34-bg-05-main.png](codex/progress/session-34-bg-05-main.png)
- [session-35.md](codex/progress/session-35.md): Session 35 progress
- [session-40.md](codex/progress/session-40.md): Session 40 resume marker — LW-03
- [session-42.md](codex/progress/session-42.md): Session 42 resume marker
- [session-46-b18-p6.md](codex/progress/session-46-b18-p6.md): Session 46 B18 part 6 — Letters, calls and email
- [session-47.md](codex/progress/session-47.md): Session 47 resume marker
- [session-48-lw01.md](codex/progress/session-48-lw01.md): Session 48 — LW-01 government operations
- [session-48-sp-a.md](codex/progress/session-48-sp-a.md): Session 48 — SP-A routine outcome description
- [session-48.md](codex/progress/session-48.md): Session 48 — b22-p6 publication reach
- [session-51-b27-p4.md](codex/progress/session-51-b27-p4.md): Session 51 b27-p4 resume marker
- [session-51.md](codex/progress/session-51.md): Session 51 resume marker
- [session-52.md](codex/progress/session-52.md): Session 52 resume marker
- [session-54.md](codex/progress/session-54.md): Session 54 resume marker
- [session-55.md](codex/progress/session-55.md): Session 55 — Oct 7
- [session-56.md](codex/progress/session-56.md): Session 56 progress: T3 and T6 in review; T4 merged
- [session-57.md](codex/progress/session-57.md): Session 57 progress
- [session-6.md](codex/progress/session-6.md): Session 6 progress
- [session-69.md](codex/progress/session-69.md): Session 69 resume marker
- [session-70.md](codex/progress/session-70.md): Session 70 — LW-14
- [session-71.md](codex/progress/session-71.md): Session 71 progress
- [session-72.md](codex/progress/session-72.md): Session 72 could not safely claim a law batch
- [session-73.md](codex/progress/session-73.md): Session 73 resume marker
- [session-74.md](codex/progress/session-74.md): Session 74 progress
- [session-75.md](codex/progress/session-75.md): Session 75 resume marker
- [session-77.md](codex/progress/session-77.md): Session 77 progress
- [session-78.md](codex/progress/session-78.md): Session 78 resume marker
- [session-79.md](codex/progress/session-79.md): Session 79 resume marker
- [session-80.md](codex/progress/session-80.md): A meticulous person now carries unfinished details into a career choice
- [session-81.md](codex/progress/session-81.md): Session 81 progress
- [session-82.md](codex/progress/session-82.md): Session 82 progress
- [session-83.md](codex/progress/session-83.md): Session 83 progress
- [session-84.md](codex/progress/session-84.md): Session 84 progress
- [session-85.md](codex/progress/session-85.md): Thrill seeking now affects another-term decisions
- [session-86.md](codex/progress/session-86.md): Session 86 progress
- [session-87.md](codex/progress/session-87.md): Session 87 progress
- [session-88.md](codex/progress/session-88.md): Session 88 progress
- [session-89.md](codex/progress/session-89.md): Session 89 — b05-p1
- [session-91.md](codex/progress/session-91.md): Session 91 resume marker
- [session-92.md](codex/progress/session-92.md): Session 92 resume marker
- [session-93.md](codex/progress/session-93.md): Session 93 progress
- [session-94.md](codex/progress/session-94.md): Session 94 progress
- [session-95.md](codex/progress/session-95.md): Session 95 resume marker
- [session-96.md](codex/progress/session-96.md): Session 96 progress
- [session-97.md](codex/progress/session-97.md): Session 97 progress
- [session-99.md](codex/progress/session-99.md): Session 99 — BG-08

## handoffs

- [alive43-w-increment-1.md](handoffs/alive43-w-increment-1.md): ALIVE43 ROLE W → LAND and L — increment 1 (W1)
- [alive43-w-increment-2.md](handoffs/alive43-w-increment-2.md): ALIVE43 ROLE W → LAND and L — increment 2 (W2)
- [alive43-w-increment-3.md](handoffs/alive43-w-increment-3.md): ALIVE43 ROLE W → LAND and L — increment 3 (W3, first families)
- [civil-authority13-normal-route.spec.ts.txt](handoffs/civil-authority13-normal-route.spec.ts.txt)
- [civil-authority13-start-token-union.patch](handoffs/civil-authority13-start-token-union.patch)
- [civil-authority13-ui-registration.patch](handoffs/civil-authority13-ui-registration.patch)
- [civil-authority13.md](handoffs/civil-authority13.md): CIVIL-AUTHORITY13: supported public-personnel decisions
- [civil-work7-normal-route.spec.ts.txt](handoffs/civil-work7-normal-route.spec.ts.txt)
- [civil-work7-ui-registration.patch](handoffs/civil-work7-ui-registration.patch)
- [civil-work7.md](handoffs/civil-work7.md): CIVIL-WORK7 — source/consumer checkpoint, not personnel journey acceptance
- [codex-wire-last-ten-laws.md](handoffs/codex-wire-last-ten-laws.md): Codex handoff: wire the last ten laws, then prove all 92 (September 29, 2026)
- [delivery28-budget-additional-proof.patch](handoffs/delivery28-budget-additional-proof.patch)
- [delivery28-budget-current-politics-mount.patch](handoffs/delivery28-budget-current-politics-mount.patch)
- [director42-role-b-dehardwire.md](handoffs/director42-role-b-dehardwire.md): DIRECTOR42 ROLE B — DEHARDWIRE: opening handshake and first increment
- [director42-role-b-increment-2.md](handoffs/director42-role-b-increment-2.md): DIRECTOR42 ROLE B — increment 2: composed onto #255
- [director42-role-b-increment-3.md](handoffs/director42-role-b-increment-3.md): DIRECTOR42 ROLE B — increment 3: a place is named from the catalog
- [director42-role-b-increment-4.md](handoffs/director42-role-b-increment-4.md): DIRECTOR42 ROLE B — increment 4: residual 3, as far as it can go without LAND's artifacts
- [director42-role-b-to-alive43-w-receipt.md](handoffs/director42-role-b-to-alive43-w-receipt.md): ROLE B → ALIVE43 ROLE W — ownership receipt
- [director42-role-c-handshake.md](handoffs/director42-role-c-handshake.md): DIRECTOR42 ROLE C — PLAYER PURE: opening handshake
- [modular-legislation-2026-09-22.md](handoffs/modular-legislation-2026-09-22.md): Modular legislation lane — night of 2026-09-22
- [people-and-life-2026-09-22.md](handoffs/people-and-life-2026-09-22.md): People and life, overnight 2026-09-21 into 2026-09-22
- [playtest34-n.md](handoffs/playtest34-n.md): PLAYTEST34-N local continuation
- [recovery25-budget-politics-mount.patch](handoffs/recovery25-budget-politics-mount.patch)
- [recovery25-budget.md](handoffs/recovery25-budget.md): RECOVERY25 Budget → A
- [recovery25-civil-current-registration.patch](handoffs/recovery25-civil-current-registration.patch)
- [recovery25-civil.md](handoffs/recovery25-civil.md): RECOVERY25 CIVIL integrator handoff
- [rest37-n-to-s-term-reader.patch](handoffs/rest37-n-to-s-term-reader.patch)
- [room-papers-mount-2026-09-22.md](handoffs/room-papers-mount-2026-09-22.md): Mounting the waiting list on the room's papers
- [systems30-n-root-adapter.patch](handoffs/systems30-n-root-adapter.patch)
- [systems30-n.md](handoffs/systems30-n.md): S30-N frozen return
