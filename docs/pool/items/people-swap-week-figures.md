---
id: people-swap-week-figures
title: "Take the pasted faces out of play: draw people from this week's wardrobe figures until the redesigned set lands"
area: art
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr:
blocked-on:
source: CTO, from the owner's Oct 28 play session
claimed-at:
---

**What.** The owner, Oct 28, 11:45 a.m. EDT, after playing 0.61.2 (8dbfff2): "these faces are horrifying. I mean, I had to quit the game because it made me so uncomfortable." And: "Not only the faces, but notice the clipping, the dude's collar, why is everybody's ankle showing? ... this actually isn't the figures that I approved." Asked what should happen until redesigned people are ready, he picked: swap in this week's people.

Today people are the Codex v2 figures (`art/people-engine/v2/figures`), with a separate face picture laid on top (people-faces, #6435) and hair scaled over from other figures. This item:

1. Removes the face layer and the hair-from-another-figure scaling from play.
2. Draws people from the wardrobe on branch `claude/people-rooms-art` (`art/people-engine/v2/wardrobe/<pose>/<figure>/`). Each `body.png` has its own painted face, and the hair, shirt, jacket, tie, pants and shoes pieces were painted on that body. Follow `docs/art/HANDOFF.md`, "Stacking a person" and "Wiring the character creator".
3. Places people in rooms by the HANDOFF spot rules (pose from the spot's tags, sizing, what hides a person).

**Rules.** No face is ever drawn separately, scaled or moved (owner ruling, Oct 28). Replace, never layer: the v2 figure picker, the face layer and the hair scaling leave play in the same change; the art files stay in the repository. Every piece is drawn at the figure's box, with no per-piece moving or scaling.

**Time box.** One session, about 4 hours.

**Done when.** In the bench's played world, in the home kitchen with a seed, a browser screenshot of the play screen shows people with no separate face layer, trousers reaching the shoes, whole collars, and no arm or body passing through the table. A test fails if `src/bench` draws a file from `art/people-engine/v2/faces-on-figures`.

**Files.** `src/bench/appearance.ts`, `src/bench/figure-hair.ts`, `src/bench/whole-figures.ts`, `art/people-engine/v2/wardrobe` (on `claude/people-rooms-art`: merge it into the work branch first).

**Notes.** The CTO is making a redesigned set in the next 1–2 days: whole people drawn with their faces, with clothes and hair split off by the model and each piece's exact position given. It replaces this set. Keep the drawing path generic (a body plus ordered pieces at a box) so the new set drops in.

Done (CTO, Oct 30 07:15, at the people session's word, checked): people pack v3 and then v4 replaced the v2 figures, the separate face layer and the borrowed hair; `src/bench/people-pack.test.ts` fails if any `art/people-engine/v2` file is referenced or packaged.
