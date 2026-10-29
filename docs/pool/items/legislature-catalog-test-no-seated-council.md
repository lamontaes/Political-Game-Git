---
id: legislature-catalog-test-no-seated-council
title: "legislature.test.ts catalog test finds no town with a seated council on some seeds, on main too"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by: claude/political-game-pool-udtiwn
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:22:35.834Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** TODO

**Notes.** TODO Released from idle draft #5217 by the CTO, Oct 26.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: rewrite SMART or close.

Oct 28, 23:25 UTC (wire-office): does not reproduce on main; ready for the CTO to close. The catalog case ("the bill paper's catalog: 18 menus...", src/core2/legislature.test.ts line 815) passes on ten fresh GOLDEN_PATH_SEED values at 22966e18f1: fff79880ab808ba930ef4ed250be8c161f314a44 afe247990766f7fa327ca2e94314e5fd13170466 be076f14d48a398936759b049c3f2d55782eb396 d9b335a59f3367228f30453b843a500e2da1a4c7 486c9f362f7254090a235aac578691159d7b06df 7054bc282aeab8c6b994ea060f8222aa57573f7b 09bc2447360d1e48ca76fc71030248682effcdc5 904835679ee632363860585c7bb2dbb253f4e98c 5801265bf4dfb141ad3d87cb634b44434164097e 8a50e22f8d81a3383415bc506122030c133b07a0. The whole file passed 20 of 20 in six more runs today. The claim by claude/political-game-pool-udtiwn is from Oct 20 with no PR.
