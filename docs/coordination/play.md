# OPUS-PLAY: What you play

Only OPUS-PLAY writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** The bench, the game screens on the new core, the nightly integration build, store screenshots.
- **Branch:** opus-play (from pool/M0-bench).
- **Model:** Opus, medium: screens and integration on agreed designs.
- **Starts from:** The bench (#3940, branch pool/M0-bench), including the bench fixes that never started.

## What the owner can play now

Nothing yet.

## Checklist

An order of work, not a ceiling: when it's done, keep going into this area's next roadmap items.

- [ ] **The bench on the full stack.** Bring in people, drives and the story director; fix switching residents; while you skip, your character chooses for itself; big moments stop the skip at their own time.
  - Verified by: M0-01 to M0-05 in random places; you play it.
  - Needs: PEOPLE, CORE
- [ ] **Use the art we already have (owner, Oct 12).** Wire the tagged art library into every scene and screen now:
  - backdrops by their tags in `art/backdrops/manifest.json`;
  - people from `art/people-engine/v1` (poses, outfits, expressions);
  - capitols and campuses.
  - First: merge `origin/art/places-batch2` (draft PR #3994, 25 new places: county clerk offices, a registrar, an election warehouse, rally sites, the convention, homes, schools) into your branch, and add their staging spots (where people stand and sit) to `art/backdrops/staging.json` by looking at each picture. Follow the rules in `src/presentation/backdrop-anchors.test.ts`. Say in your status file when it's green so the CTO can merge #3994.
    Pick the best-tagged match for each place and moment (a generic government office for a county clerk is fine). Never wait for a perfect painting. Note any place with no fitting art under "Needs from other sessions" for the CTO's art queue.
  - Verified by: In a random place, every scene you reach shows real art from the library, and none shows a blank or placeholder image.
  - Needs: CTO (imports of generated art not yet in the repo)
- [ ] **A build you play every evening.** Each evening, one build with a short note: what you can do tonight and what changed.
  - Verified by: You play it.
  - Needs: All
- [ ] **Screens for each golden path step.** Person card, day and skip, conversation box with the Lie button, journal, then the filing office, campaigning and election night as GOV lands them; record data and control names only, engine text only.
  - Verified by: Browser checks of each screen, then you play it.
  - Needs: GOV
- [ ] **Store page screenshots.** Real gameplay screenshots for the Steam page by Friday, with capsule art from the art pipeline.
  - Verified by: Your sign-off.
  - Needs: CTO (art)
- [ ] **The opening.** Your opening sequence, from the place's officials and family, with engine words.
  - Verified by: M6-01.
  - Needs: GOV, PEOPLE

## Needs from other sessions

None yet.

## Log

Newest first: one line per event (what changed, the measured result, what's next).
