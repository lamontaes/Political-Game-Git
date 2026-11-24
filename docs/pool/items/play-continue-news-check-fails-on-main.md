---
id: play-continue-news-check-fails-on-main
title: "continue-news.browser.mjs fails on main: the opening record no longer keeps the place's unemployment line"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
---

**What.** src/bench/continue-news.browser.mjs fails on clean main with 'kept in the opening record: <place> unemployment at <rate>' in every drawn place tried (Se'etaga, American Samoa; Harrington Park, New Jersey; Levelock, Alaska). The fresh reader and the continued reader both show the same rates, so the assertion that the opening record keeps the line no longer matches what the record holds. Found by Merger 2 on Oct 27 while gating a pull request; Merger 4 saw it still failing on clean main twice on fresh draws (Waynesboro unemployment at 4.1 and Warwick unemployment at 2.5), though it had passed on an earlier run the same day, so something merged since broke it.

**Cause.** Found in code: src/bench/continue-news.browser.mjs (lines 92 to 109) builds the sentences the reader may show from the kept opening's `news` (`/api/opening`), but the opening record no longer carries any news. `openingFrames` (src/bench/opening.ts) returns only `speaker` and `home`, and `/api/opening` (src/bench/handler.ts line 1934) sends just that. The reader reads its stories from `/api/news` through `nightsNews` (src/bench/play.mjs line 283), both for a new life (line 6199) and after Continue (line 5498). So `kept.news.stories` is undefined, the check's `recorded` set is empty, and the first sentence the reader shows fails line 112. Measured on main b957363c: Park River, North Dakota, seed a799f6ca-b176-4fb7-8f5b-85584db457aa: the fresh and continued readers both showed 'State unemployment tax rate took effect on January 1, 2025.' and 'Unemployment weekly maximum took effect on January 1, 2025.', and `/api/opening?id=person_de8c00614a3bfa27` returned only the keys `speaker` and `home`. The game behaves as the check's first half wants: Continue shows the same rates as the fresh reader.

**Fix.** Change the check, not the game. In src/bench/continue-news.browser.mjs, wait for the `/api/news` response that Continue triggers (instead of `/api/opening`), and build `recorded` from it the way the reader does: keep the rows with `fresh !== false` and a headline or lede (play.mjs `nightsNews`), then for the lead story its `paragraphs`, else its `broadcast` texts and its `lede` when it differs from the headline (src/bench/ui/newspaper.mjs `readerBody`), plus each later story's headline. Keep both rate assertions as they are. Correct the stale comment in src/bench/play.mjs (line 6197, 'read from the kept opening'): the paper is read from the news route while the date is still the opening's.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: reproduce in a drawn place and name the place and seed. Never skip or narrow the check to get green.

**Done when.** A second session runs node src/bench/continue-news.browser.mjs in a drawn place (place and seed named) and sees it pass, with the cause of the change found by file and line and the check or the opening record corrected to match, shown by the check failing before and passing after.

**Waits on.** Nothing.

**Files.** src/bench/continue-news.browser.mjs, src/bench/play.mjs, src/bench/ui/newspaper.mjs, src/bench/opening.ts, src/bench/handler.ts

**Notes.** Merger 4, Oct 27: still failing on clean origin/main at the time of the #6284 merge, twice on fresh draws ("kept in the opening record: Waynesboro unemployment at 4.1" and "Warwick unemployment at 2.5"); it passed twice on #6234 earlier the same day, so something merged since broke it.

**Notes (re-run, 2026-11-11, main 79d23fa596).** Bench started with `npm run bench`; `BENCH_BROWSER=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome node src/bench/continue-news.browser.mjs`, two fresh draws. Run 1 (Belcher, Louisiana, seed f3d5d7e8-760d-4533-b912-6df78df71481): still red, line 112: "kept in the opening record: State unemployment tax rate took effect on January 1, 2025." (the fresh and continued readers show the same two sentences). Run 2 (place and seed not printed): the page threw "Cannot read properties of undefined (reading 'map')" and the news reader never opened (`waitFor` timeout at line 21). Still red.

Cause found (Nov 11, 2026, cause finder for Fable B): ran the unchanged check on a fresh bench on main b957363c (Park River, North Dakota, seed a799f6ca-b176-4fb7-8f5b-85584db457aa): red at line 112 with the same two sentences in both readers. Then read `/api/opening` for that life: no `news` key. The page error 'Cannot read properties of undefined (reading map)' from the Nov 11 re-run did not show; play-news-reader-lead-without-text-crashes holds that one.
