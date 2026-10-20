---
id: words-ribbon-cut-news
title: "Word the ribbon-cutting: the ceremony scene and its news line for a finished public work"
area: words
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: office-cut-a-ribbon-needs-a-record-of
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** From PR for office-cut-a-ribbon-needs-a-record-of (claude/political-game-pool-yucp92-yy). The ribbon-cut event (src/core2/modules/projects.ts, kind ribbon-cut, news: true) carries the project id, line, government, contractor, owner and amount paid, and no English bank has words for it. Build one scene and one news line from those facts through the English engine, each line citing the project record id. No hand-written player text.

Looked at Oct 20 (claude/political-game-pool-3xfqef-24), released unbuilt. Two things to settle before a builder takes it. (1) The words line is the Words session's (an Opus session at medium, AGENTS.md "Models, effort and helpers"); a scene and a news line for `ribbon-cut` need parts in the scene and news banks (`data/english/parts/scene-words.json`, `news.json`) mined or authored through that line's process. (2) Authored parts are not shippable until graded: `tests/english-parts-banks.test.ts` can refuse an authored part marked shippable with no good grade (the guard drafted on branch claude/political-game-pool-3xfqef-16, see `words-authored-parts-shippable-sweep`), and flipping the 141 existing ones breaks 20 director tests, so a ribbon-cut line written now would either ship ungraded or stay out of play and be unprovable in a played world until a grading batch grades it. A builder takes this with the Words session, adds the parts as not shippable, and names the batch that grades them; the fact packet (`projects.ts` kind `ribbon-cut`: project id, line, government, contractor, owner, amount paid) is already there to cite.
