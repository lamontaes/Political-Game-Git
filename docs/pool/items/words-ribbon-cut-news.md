---
id: words-ribbon-cut-news
title: "Word the ribbon-cutting: the ceremony scene and its news line for a finished public work"
area: words
kind: feature
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
after: office-cut-a-ribbon-needs-a-record-of
source: added with npm run pool -- add
claimed-at:
standard: 2
model: sonnet
effort: medium
root: design-story-director
lead: words
checked: fable 2026-11-10
---

**What.** TODO

**Cause.** Found in code: the ribbon-cut event is written by src/core2/modules/projects.ts (line 147, kind "ribbon-cut", with the project id, line, government, contractor, owner and amount paid) and worded for the paper (data/english/parts/news.json, line 7278, news.ribbon-cut.a-new-purpose-project-is-finished; data/english/parts/headlines.json), but nothing in src/director names ribbon-cut, so no scene plays it.

**Fix.** Add a ribbon-cut situation type to src/director/data/situation-types.json (its arc in src/director/data/purpose-arcs.json) fired by the ribbon-cut event, casting the officeholder who cut it and carrying the project record id, the purpose and the amount paid as facts. The builder ships the type, its cast, its facts and the test; the scene's lines in data/english/parts/ are Story's under the Nov 10 split of words work, so name the moves the scene needs in the pull request body for Story. The news line is already done.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: every word comes from the English engine's banks, authored as not shippable until graded, with the batch that grades them named. Ask why: each line cites the project record id that earns it. Wire to the world: the scene is cast from the event's own facts (the government, contractor and owner).

**Done when.** A second session, not the builder, plays a year in a drawn place from all 56 (buildBenchWorld, place and seed named) where a public project finishes, and sees the ribbon-cutting scene play for the officeholder with lines naming the project, citing its project record id, beside the news line; a test in src/director names the scene and the record.

**Waits on.** Nothing. The item named in `after:`, office-cut-a-ribbon-needs-a-record-of, is done, and the ribbon-cut event it wrote exists on main.

**Files.** src/core2/modules/projects.ts, src/director/data/situation-types.json, data/english/parts/scene-words.json, data/english/parts/news.json

**Notes.** From PR for office-cut-a-ribbon-needs-a-record-of (claude/political-game-pool-yucp92-yy). The ribbon-cut event (src/core2/modules/projects.ts, kind ribbon-cut, news: true) carries the project id, line, government, contractor, owner and amount paid, and no English bank has words for it. Build one scene and one news line from those facts through the English engine, each line citing the project record id. No hand-written player text.

Looked at Oct 20 (claude/political-game-pool-3xfqef-24), released unbuilt. Two things to settle before a builder takes it. (1) The words line is the Words session's (an Opus session at medium, AGENTS.md "Models, effort and helpers"); a scene and a news line for `ribbon-cut` need parts in the scene and news banks (`data/english/parts/scene-words.json`, `news.json`) mined or authored through that line's process. (2) Authored parts are not shippable until graded: `tests/english-parts-banks.test.ts` can refuse an authored part marked shippable with no good grade (the guard drafted on branch claude/political-game-pool-3xfqef-16, see `words-authored-parts-shippable-sweep`), and flipping the 141 existing ones breaks 20 director tests, so a ribbon-cut line written now would either ship ungraded or stay out of play and be unprovable in a played world until a grading batch grades it. A builder takes this with the Words session, adds the parts as not shippable, and names the batch that grades them; the fact packet (`projects.ts` kind `ribbon-cut`: project id, line, government, contractor, owner, amount paid) is already there to cite.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). A ribbon-cutting scene and news line for a finished public work; no ruling asks for one, the item is an empty TODO behind another unbuilt item, and the town's projects already show in the paper.
