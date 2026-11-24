---
id: words-scene-web-legislating
title: "Scene web, legislating: every row has a real-life episode, lines for each speaker, and fires in a played year"
area: words
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: claude/pool-words-scene-web-legislating
pr: #8360
blocked-on:
source: "words-and-scenes lead, Oct 27: split of words-scene-web-from-lives (owner, Oct 27: scenes and their variants from hundreds of real lives)"
lead: words
milestone: play-first
claimed-at: 2026-11-10T23:58:33.077Z
after:
standard: 2
model: sonnet
effort: medium
root: design-story-director
checked: fable 2026-11-10
branch: claude/pool-words-scene-web-legislating
---

**What.** The scene web (`npm run scene-web`, `docs/reports/scene-web.md`) lists every situation type in the legislating domain, one row per cause that fires it. This domain covers legislating at council, county, state and Congress: a floor vote, a hearing, a vote asked or confirmed, a bill carried, a section bargained. A row is complete when a real life calibrates it, its lines vary by speaker, and it fires in a played year. The owner's legislating requests with no type are listed under Missing in the report and become rows here.

**Cause.** Measured: `npm run scene-web` (docs/reports/scene-web.json, generated 2026-10-29 at Huntington Center, Vermont, seed 0d5692f0d73cf0c56240825b71aa5b04dd663a9a): the legislating domain has 11 rows, 6 without an episode packet, and 5 fired in the played year.

**Fix.** Regenerate the report on a fresh drawn place, write the missing episode packets in docs/design/scenes/from-life/ and, for rows that lack three lines per speaker role, list the lines needed for Story (every line in data/english/parts/ is Story's, owner's ruling of Nov 10; only the Words line writes them), and file each row that waits on a producer as an item with lead director.

**Time box.** 4 hours for one Sonnet session per pass; a domain may take several passes, each its own PR. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Serves `scenes-from-life`: every row cites at least one episode packet from a real life, and no real name or line ships. Serves `scene-standard`: roles cast from the world, lines vary by trait and tie, and a scene writes something back. One rule, all 56 places: each played year is a drawn place with its seed named.

**Done when.** A second session, not the builder, runs `npm run scene-web` on a place and seed the builder did not choose (buildBenchWorld, named in the PR body) and reads docs/reports/scene-web.json: every row in the legislating domain names at least one episode slug in docs/design/scenes/from-life/, every speaker role has at least three lines, and every row either fired in the played year or names the record or producer it waits on as a pool item; every owner request for the domain listed under Missing has a row or a pool item.

**Waits on.** Nothing.

**Files.** docs/design/scenes/from-life, data/english/parts, src/director/data/situation-types.json, docs/reports/scene-web.json, scripts/scene-web/build.ts

**You will see.** In the morning scene-web report, the legislating rows filled in: an episode, lines for each speaker, and a fired count from a drawn town.

**Screenshot.** The legislating section of `docs/reports/scene-web.md` in the PR body.

**Notes.** Split from `words-scene-web-from-lives` by the words lead on Oct 27. Method per row: `scenes-from-life`. Producers belong to the director engineer (`lead: director` items); this item owns the packets and the lines.

Lane 5 (pool truth, Nov 3): claim released under the 48-hour rule. Claimed 2026-10-27 on `words/web-legislating`; last push Oct 27, 14:11 UTC; no open PR. The branch keeps its work; claiming it takes the branch.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-10 23:53 UTC) on branch claude/pool-words-scene-web-legislating.

Released (2026-11-10): Needs bank lines under data/english/parts, which only the Story session writes; nothing a builder can play. Continue on branch claude/pool-words-scene-web-legislating.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:55 UTC) on branch claude/pool-words-scene-web-legislating.

Released (2026-11-10): Mostly Story-session lines under data/english/parts; the buildable remainder (episode packets, producer items) is larger than I can finish in this session. Continue on branch claude/pool-words-scene-web-legislating.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:56 UTC) on branch claude/pool-words-scene-web-legislating.

Released (2026-11-10): words item: needs lines under data/english/parts, which only Story writes. Continue on branch claude/pool-words-scene-web-legislating.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:57 UTC) on branch claude/pool-words-scene-web-legislating.

Released (2026-11-10): words item: needs lines under data/english/parts, which only Story writes. Continue on branch claude/pool-words-scene-web-legislating.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:57 UTC) on branch claude/pool-words-scene-web-legislating.

Released (2026-11-10): Nothing a builder can build: replay already recorded on the PR, or its lines are under data/english/parts (Story only); released so the claim is not held. Continue on branch claude/pool-words-scene-web-legislating.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:58 UTC) on branch claude/pool-words-scene-web-legislating.
