---
name: browser-visual-acceptance
description: >
  Checks Our Civic Duty's play and developer screens in a real browser on the
  bench: a drawn place, real pointer and keyboard use, and screenshots in the
  PR. Use for UI, interaction, responsive, scene, pose, or art review that
  needs a real browser; do not use for nonvisual unit-only changes or treat a
  passing script as visual acceptance.
---

# Browser and visual acceptance

Read `.agents/rules/visual-acceptance.md` and `.agents/workflows/pg-visual-review.md` first.

## Run it

1. In a cloud environment, start the bench with `npm run bench`, which runs `src/bench/server.ts` on port 3000 (`BENCH_PORT` overrides it). Play is at `http://localhost:3000/play`, and Dev mode is beside it.
2. Start a new game with the Place field empty, so the place is drawn from all 56. Write the place and seed the title screen shows.
3. Run the browser check for the screen you changed, or copy the nearest one: `node src/bench/<screen>.browser.mjs`, with `BENCH_BROWSER` pointing at Chromium. There are checks for calendar, campaign, character, jobs, money, news, options, party, people, person-card, politics, sheets and travel, and `no-scroll` covers every sheet. Add a check for a new screen in the same pattern.
4. Look at it yourself as well. Use representative window sizes, and actually click and use the keyboard on every visible control you changed. Check:
   - fit and scrolling (main screens don't scroll);
   - contact and overlap of people and props;
   - sharpness;
   - leftover overlays;
   - hit areas matching what's drawn.
5. Put the screenshots in the PR body with the place and seed. Name every visible problem: green automation never overrides a visible failure.

## Stop condition

Stop on a visible failure, a control that pointer or keyboard can't reach, an unexplained timeout, or a page error in the console. Report it in the PR body with the screenshot, and file a pool item if it isn't yours to fix.
