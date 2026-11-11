# Roots: the design or root cause an item belongs to

An item at the standard (`standard: 2`, `.agents/rules/pool-item-standard.md`) names one of these ids in its `root:` field, or `none` when it belongs to no design and no root cause (a stray bug). One line each: the id, one plain sentence, the document it comes from. `npm run pool -- --check` refuses a root that is not listed here. Add a line here in the same pull request as the first item that needs it.

The ten root causes come from the Fable audit of Nov 9, 2026 (`docs/audits/fable-vision-2026-11-09.md` on branch `audit/fable-vision`), numbered as it ranks them.

## Root causes (the audit)

- `rc1-world-outside-town`: the world outside the player's town is equations and tables, not people run by the same engines. Audit, root cause 1; design `docs/design/country-tier.md`.
- `rc2-done-from-records`: "done" is measured in records and builders' own tests, not from the player's chair. Audit, root cause 2; rule `.agents/skills/seen-in-game/SKILL.md`.
- `rc3-thin-life-record`: a life keeps too little of what happened between people, so the journal, cards and scenes have nothing specific to say. Audit, root cause 3; design `docs/design/life-record.md`.
- `rc4-hand-written-words`: the words are a pile of hand-written lines picked by weights, and the owner's notes never become rules. Audit, root cause 4; design `docs/design/words-machine.md`.
- `rc5-full-detail-every-day`: everything is played at full detail every day and kept forever, with one clock speed, which is the speed and memory problem. Audit, root cause 5; design `docs/design/country-tier.md`.
- `rc6-scenes-repeat`: a scene plays because something matches and plays again whenever that recurs, with no test that it belongs in this person's story now. Audit, root cause 6; design `docs/design/story-director.md`.
- `rc7-player-cannot-drive`: the player can watch and react but cannot propose, repeal, call a meeting or run a campaign trail. Audit, root cause 7; design `docs/design/legislative-content-menus-v1.md`.
- `rc8-law-judged-by-paperwork`: a law counts as working when a note says it reached someone, not when a person's life or a dollar changed. Audit, root cause 8; rule `.agents/skills/wiring-audit/SKILL.md`.
- `rc9-place-facts-one-default`: place facts are one default stretched over 56 places (election days, town bodies, primaries). Audit, root cause 9; rule `.agents/rules/standing-skills/one-rule-all-places/SKILL.md`.
- `rc10-screens-keep-own-facts`: screens were copied in as layouts that each keep their own copy of the facts, with old looks left beside new ones. Audit, root cause 10; design `docs/design/screens/principles-2026-10-27.md`.

## Designs (docs/design)

- `design-country-tier`: every state becomes people and firms kept as counts with a treasury, stepped monthly by the town's rules, and nothing outside view is played day by day. `docs/design/country-tier.md`.
- `design-life-record`: each person keeps one short list of what they went through, written by the running engines and read by every screen. `docs/design/life-record.md`.
- `design-words-machine`: every note the owner gives becomes a rule a program tests over every line, and failing lines are pulled and rewritten. `docs/design/words-machine.md`.
- `design-story-director`: records that change a life become scored moments, threads and playable scenes, with no hand-written scene. `docs/design/story-director.md`.
- `design-director-on-core2`: the story director reads the new core, and what moves a person becomes a moment. `docs/design/director-on-core2.md`.
- `design-one-model-two-tiers`: full people where they matter and counted groups everywhere else, read by every engine with the same rule. `docs/design/one-model-two-tiers.md`.
- `design-electorate-one-model`: everyone the world does not name votes through one engine, from their own record, with reasons kept. `docs/design/electorate-one-model.md`.
- `design-bill-catalog`: the accepted catalog of bills the legislature can take up. `docs/design/legislative-content-menus-v1.md`.
- `design-screen-principles`: the checkable rules every menu screen is built to. `docs/design/screens/principles-2026-10-27.md`.
- `design-guards`: each standing owner rule is held over the whole tree by a named guard on every change. `docs/design/guards.md`.
- `design-old-core-retirement`: the new game stops reaching into the old engine for its opening town, so what is left of it can be deleted. `docs/design/old-core-retirement-map.md`.
- `design-movements-and-unrest`: protests, strikes and movements arise from conditions and reach officials. `docs/design/proposals/movements-and-unrest-2026-10-14.md`.
