---
id: dev-mode-views-register-from-their-own-files
title: "Every dev-mode view is added by editing dev-mode.ts, dev-api.ts and the screen that shows it"
area: laws
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by:
pr: #9619
after:
blocked-on:
lead: laws
source: Account lead's ruling, Nov 16, 2026, when five threads (law links, industries, plant closing, layoffs, stores and clinics) each asked to add lines to dev-mode.ts and dev-api.ts for their views
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** The owner's rule of Nov 16 has every trace shown in dev mode, so several threads are adding dev-mode views at once. Each view needed lines in src/bench/dev-api.ts (its route), often src/bench/dev-mode.ts, and the screen that draws it (play.mjs, ui/dev-bill-card.mjs), so five threads would edit the same files at once and the Train would pay for it in conflicts. Seen: dev mode's bill card, the Government tab's dev panels, the Metrics tab and the Calendar, where those views go.

**Cause.** Found in code: `handleDev` in src/bench/dev-api.ts answers only the routes in its own switch, and each dev panel is mounted by name in play.mjs (`devBillsPanel`, `devBribePanel`, `devRunPanel`, `devScenePanel`, `devCampaignPanel`); `DevMode.mark` was private, so a control outside dev-mode.ts could not write the dev-mode change record.

**Fix.** src/bench/dev-views.ts is the one registration point: a file in src/bench/dev-views/ whose default export is `{ name, routes, client, labels }` registers itself on the first dev-mode request; `handleDev` answers its routes after its own and lists the views at GET /api/dev/views. src/bench/ui/dev-views.mjs draws each view's page part (its `slots`) where a screen holds a slot: "bill-card", "panels", "metrics" and "calendar". `DevMode.mark` is public. No view ships with it.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** Replace, never layer: one registration point, and no second dev-mode request handler. Every effect can be triggered from the game's own code in dev mode and traced there: this is how each thread's trace reaches dev mode without a shared edit.

**Done when.** A second session drops a view file in src/bench/dev-views/ and its page part in src/bench/ui/, starts the bench, passes a bill in dev mode in the running game and sees the view's line at the end of the bill card, under the Metrics board and on the Calendar, with no edit to dev-mode.ts, dev-api.ts or play.mjs. Seen: src/bench/dev-views.test.ts at Ridgeville, Alabama (0164656) and a played walk at a drawn place, screenshots in /mnt/project-files/laws/screens/dev-views-*.png.

**Waits on.** Nothing.

**Files.** src/bench/dev-views.ts (new), src/bench/ui/dev-views.mjs (new), src/bench/dev-views.test.ts (new), src/bench/dev-api.ts, src/bench/dev-mode.ts, src/bench/play.mjs, src/bench/ui/dev-bill-card.mjs
