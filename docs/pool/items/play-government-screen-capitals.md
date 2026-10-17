---
id: play-government-screen-capitals
title: "The Government screen prints a local government in capitals (COUNTY OF PIKE)"
area: play
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/government-screen-capitals
pr: #4945
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T16:30:59.320Z
---

**What.** An office's government name was the Census listing's own shouted name (`COUNTY OF WALLACE`, `CITY OF SHARON SPRINGS`), so the Government screen, a body's name and the county vote lookup all used capitals. The local offices now carry the display name from `governmentUnitDisplayName` ("Wallace County", "City of Sharon Springs"), and the body names built from it follow.

**Rules.** Replace, never layer: the name is fixed where the office is made, not re-cased on each screen.

**Done when.** In a played world in a drawn place no local office's government name is all capitals (`src/core2/offices-local-names.test.ts`).

**Files.** src/core2/offices-local.ts

**Notes.** Seen in Sharon Springs, Kansas, Fairfield (Connecticut), Chase Crossing, Virginia and Colony, Alabama. A side effect: `past-elections.ts` looks a county's 2024 vote up by `<state>|<government name>`, whose keys are display names ("AL|Cullman County"), so the lookup could not match a shouted name and fell back to the town's own ballots; it now matches. The state's own seats still print the key (`US-KS`) as their government; that is a separate small item. `properName` in src/director/words.ts re-cases a shouted name inside a longer one and is now rarely needed for these; left alone since other record names use it.
