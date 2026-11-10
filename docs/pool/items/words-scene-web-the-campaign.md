---
id: words-scene-web-the-campaign
title: "Scene web, the campaign: every row has a real-life episode, lines for each speaker, and fires in a played year"
area: words
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "words-and-scenes lead, Oct 27: split of words-scene-web-from-lives (owner, Oct 27: scenes and their variants from hundreds of real lives)"
lead: words
milestone: play-first
claimed-at:
after:
standard: 2
model: sonnet
effort: medium
root: design-story-director
---

**What.** The scene web (`npm run scene-web`, `docs/reports/scene-web.md`) lists every situation type in the the campaign domain, one row per cause that fires it. This domain covers a campaign's season: filing, a rally, the party's ask, an opponent's event, the speech and the people after it. A row is complete when a real life calibrates it, its lines vary by speaker, and it fires in a played year. The owner's the campaign requests with no type are listed under Missing in the report and become rows here.

**Cause.** Measured: `npm run scene-web` (docs/reports/scene-web.json, generated 2026-10-29 at Huntington Center, Vermont, seed 0d5692f0d73cf0c56240825b71aa5b04dd663a9a): the the campaign domain has 8 rows, 3 without an episode packet, and 3 fired in the played year.

**Fix.** Regenerate the report on a fresh drawn place, write the missing episode packets in docs/design/scenes/from-life/ and lines for rows that lack three per speaker role, and file each row that waits on a producer as an item with lead director.

**Time box.** 4 hours for one Sonnet session per pass; a domain may take several passes, each its own PR. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Serves `scenes-from-life`: every row cites at least one episode packet from a real life, and no real name or line ships. Serves `scene-standard`: roles cast from the world, lines vary by trait and tie, and a scene writes something back. One rule, all 56 places: each played year is a drawn place with its seed named.

**Done when.** A second session, not the builder, runs `npm run scene-web` on a place and seed the builder did not choose (buildBenchWorld, named in the PR body) and reads docs/reports/scene-web.json: every row in the the campaign domain names at least one episode slug in docs/design/scenes/from-life/, every speaker role has at least three lines, and every row either fired in the played year or names the record or producer it waits on as a pool item; every owner request for the domain listed under Missing has a row or a pool item.

**Waits on.** Nothing.

**Files.** docs/design/scenes/from-life, data/english/parts, src/director/data/situation-types.json, docs/reports/scene-web.json, scripts/scene-web/build.ts

**You will see.** In the morning scene-web report, the the campaign rows filled in: an episode, lines for each speaker, and a fired count from a drawn town.

**Screenshot.** The the campaign section of `docs/reports/scene-web.md` in the PR body.

**Notes.** Split from `words-scene-web-from-lives` by the words lead on Oct 27. Method per row: `scenes-from-life`. Producers belong to the director engineer (`lead: director` items); this item owns the packets and the lines.

Lane 5 (pool truth, Nov 3): claim released under the 48-hour rule. Claimed 2026-10-27 on `words/web-campaign`; last push Oct 27, 16:01 UTC; no open PR. The branch keeps its work; claiming it takes the branch.
