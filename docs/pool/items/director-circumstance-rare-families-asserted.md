---
id: director-circumstance-rare-families-asserted
title: "A price change, a known death, a hire and a rival's message call a scene often enough in a played year that the circumstance test can assert them"
area: director
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: design-story-director
lead: director
source: director lead, #6263 CI, Oct 27
checked: fable 2026-11-10
---

**What.** `src/director/circumstance.test.ts` asserts only the families every drawn year carries, because four rows fire once or never in a year of one town. On seeds adf2b240b2d518b4f73a5c107884f60b75c71249 and 28a43cad632afa618a63b16b1fc951c92738e133 over five worlds each, price-moved-street and rent-news-street fired 0 times. death-known-street fired 4 and then 0 times, rival-message 0 and then 1, and new-coworker 4 and then 7. Asserting them made the test pass or fail by the draw, and playing more worlds to find them ran past CI's 45-minute unit job.

**Cause.** Measured: `node --import tsx` with a probe outside the repository that taps every event for one played year of `buildBenchWorld`, Sanctuary, Texas (4865066, `drawPlace` of seed adf2b240b2d518b4f73a5c107884f60b75c71249, purpose circumstances), on main 986f946b. Each row is rare for its own reason. (1) rent-news-street can never fire. It needs a `news.read` carrying `web:housing.rent`, and the town's monthly `outcome-web.month` record (`monthEvent`, src/core2/outcome-news.ts about line 82) writes a measure only when it moved. No link of the outcome web moves `housing.rent`: the only one, new-apartments-to-nearby-rent, is not run (SG-WEB-unread-housing-rent), and SG-WEB-knowing-rent-reader says no engine ties the index to leases. In all 12 months the record carried unemployment, burglary, robbery and others, never rent. (2) price-moved-street is dropped by the log. The year wrote 76 `law.effect-learned` with `priceRuleId`, 3 of them by people the player knows (for example event:law.effect-learned:2025-02-03:person_8f1f82d6784ba98b:law:US-TX:state:us-policy-positions:environment-energy.allow-retail-electric-choice:general:...). Only 2 of the 76 were in the durable log, because `retainLog` in src/core2/state.ts (about line 729) keeps a private record only when it names the player or someone in `focusPersonIds`. `circumstancePicks` in src/director/circumstance.ts (about line 640) skips any record the log does not hold, so an acquaintance's learning can never call the scene. (3) death-known-street, new-coworker, rival-message and lobbyist-hallway follow causes a town makes rarely. They need a death among the ties of someone the player knows, a hire at the player's own employer, a paid message in a contest the player has filed in (`player: public-figure`), and an interest group's case made to a seated player (`player: heard-it`). In a way of playing where the player is not filed or seated, the last two cannot happen at all.

**Fix.** Three parts; no rate is raised. (1) Rent: make the outcome web's `housing.rent` read the housing engine's own rents, the leases' average rent against the place's opening rents, so a month in which rents moved writes `web:housing.rent` and the press can print it. That replaces SG-WEB-knowing-rent-reader; register what stays faked. (2) Price: keep a `law.effect-learned` in the log when it names someone the player knows (`knownIds`), as it is kept for the focus circle, so the circumstance producer can cite it. Check the log's size on `npm run speed:year` stays within the 20 percent bar. (3) The test (src/director/circumstance.test.ts): assert each of the six rows only in the ways of playing whose standing allows its cause (rival-message for a filed player, lobbyist-hallway for a seated one), and print each row's cause records beside its count. Then a 0 names its cause, not the luck of the draw.

**Time box.** 6 hours for one Opus session, for the three parts. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: name, by record, why each is rare. A law's price change may seldom reach a person the player knows (`law.effect-learned` with `priceRuleId`); no printed story may carry the rent web fact; a rival's paid message may need a contested race the filed player seldom enters. No dice: never raise a rate to make a scene fire; fix the cause (the reach, the story kind, the race chosen). Speed: the test stays within one CI unit job.

**Done when.** A second session plays three fresh drawn seeds (buildBenchWorld, played through the player clock, four ways of playing, record ids printed). rent-news-street and price-moved-street each fire at least once in a year where their cause records exist, shown by record id. src/director/circumstance.test.ts asserts each of the six rows in the ways of playing that allow it, prints the cause records for any that stay at 0, and runs within one CI unit job. `npm run speed:year` stays within its bar.

**Waits on.** Nothing.

**Files.** src/director/circumstance.test.ts, src/director/circumstance.ts, src/director/data/circumstances.json, src/core2/state.ts, src/core2/outcome-news.ts, src/core2/modules/outcome-web.ts, src/core2/data/stopgaps/web.json

**Notes.** Counted and printed by the test meanwhile; each was shown by record id in #6263's played years.

Oct 27, 14:05 (director lead): the lobbyist after a lobbying visit to the player (lobbyist-hallway, #6269) joins the four: 0 scenes on seed adf2b240b2d518b4f73a5c107884f60b75c71249, 1 on 28a43cad632afa618a63b16b1fc951c92738e133 and 1 on director-circ-1, so it is counted, not asserted, too.

Nov 11 (cause finder for Fable B): traced two of the rows to their roots with a one-year probe outside the repository. Rent news never happens because nothing moves the town's rent index, and price talk is lost because the log does not keep an acquaintance's private learning. The other four rows are rare by the life the town and the player lead, so the test should assert them where their causes can occur.
