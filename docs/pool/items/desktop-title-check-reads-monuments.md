---
id: desktop-title-check-reads-monuments
title: "The desktop title check accepts exactly the title monuments the game lists"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** desktop/scripts/smoke-test.mjs allowed only the old title backdrops, so the Mac build failed on us-capitol-exterior (run 42240631046) after the owner's Oct 29 DC monuments ruling.

**Rules.** Read the list from src/bench/title.ts TITLE_MONUMENTS so the two cannot drift; test tooling only.

**Done when.** The smoke test builds its backdrop pattern from TITLE_MONUMENTS and accepts us-capitol-exterior__morning.jpg, white-house-exterior and lincoln-memorial, and rejects a rally stage.

**Files.** desktop/scripts/smoke-test.mjs

**Notes.** TODO
