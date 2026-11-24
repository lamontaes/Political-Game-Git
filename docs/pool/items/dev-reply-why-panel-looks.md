---
id: dev-reply-why-panel-looks
title: "Dev mode's Why these lines panel: record ids do not look like links, and the panel pushes the talk out of view"
area: play
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: dev-mode-why-a-reply-was-offered
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: vote-reasons thread, bench walk at Island Pond, Vermont, Nov 16 (screenshot 3-reporters-call-why-these-lines.png); Account lead, Nov 16 03:13Z
---

**What.** In the running game at Island Pond, Vermont (placeKey 5035725, seed 9144879383429625b93eb5778cf3109a49d7099a0c4451554962a94f2fefaaf0), the reporter's call after a No vote shows the panel under the talk with dev mode on. Its record ids are plain gray text, the same as the words around them, though each opens the Trace box when clicked. The panel lists every fact with every record id in full, so it runs longer than the talk box. The opening lines of the call scroll out of view, and the replies sit at the bottom under about forty lines of ids.
Seen: in the reporter's call on the bench at 1440x900 (screenshot 3-reporters-call-why-these-lines.png in /mnt/project-files/vote-reasons/dev-reply-why/).

**Cause.** Found in code: `replyWhy` in src/bench/ui/dev-reply-why.mjs builds the ids with `idList` from src/bench/ui/dev-view.mjs (class `id`). The panel sits inside `#talk-lines` as an `li.why`, and play.css styles `.id` only inside dev panels outside the talk box. Nothing folds the facts list or puts the panel beside the talk instead of inside it.

**Fix.** Style `.dev-reply-why .id` as the dev panels' ids are styled (underlined and clickable). Fold "What the scene knows" behind its heading (a details element), open on a click. Shorten each id to its kind with the full id on hover, as the Trace box shows it. The panel's labels stay in controls.json `devReplyWhy`.

**Time box.** 1 hour, one Sonnet session at medium.

**Rules.** No hand-written player text: every label comes from controls.json. Screen-to-mock: the talk box's own lines and replies stay where the mock puts them, and the dev panel never covers them.

**Done when.** At the pinned place Island Pond, Vermont, with the walk in /mnt/project-files/vote-reasons/dev-reply-why/reply-why-walk.mjs, the 1440x900 screenshot of the reporter's call shows the asker's opening lines, the replies and the panel's headings on one screen, with ids styled as links. A second session opens the same call in the running game's dev mode and clicks a fact's id to open the Trace box.

**Waits on.** Nothing.

**Files.** src/bench/ui/dev-reply-why.mjs, src/bench/play.css, src/bench/data/controls.json

**Notes.**
