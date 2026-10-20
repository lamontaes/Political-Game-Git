---
id: release-press-leak-owner-note
title: "Remove the owner and date note from the press leak comment"
area: people
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** PR #5163 merged a doc comment in src/core2/modules/press.ts near line 2240 that reads 'owner ruling on favors and leaks Oct 14'. Owner and date notes must not ship in code, as item 8 of the October 20 merge audit says. Rewrite the comment to state the rule itself, that a person who knows of a hidden act chooses whether to give the tip, without the ruling or its date.

**Rules.** Replace, never layer: the comment is rewritten in place and nothing else in the press engine changes, so the leak path behaves exactly as before.

**Done when.** The grep for 'owner ruling' and 'Oct 14' in src/core2/modules/press.ts prints nothing, and src/core2/press-owners.test.ts still passes in a drawn place with its seed named in the PR body; eslint and prettier are clean on the file.

**Files.** src/core2/modules/press.ts

**Notes.** TODO
