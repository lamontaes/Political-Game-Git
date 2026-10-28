# Backdrop variants (generated, not yet in the game)

Paintings generated for `docs/art/WANTED.md`, named like `art/backdrops`: `<place>__<variant>.jpg`, at the same size as that place's midday painting. Each is a Firefly edit of the existing painting with the layout kept (same walls, furniture and camera), so any mannequin spots measured on the place carry over. The builder moves a file into `art/backdrops` and adds it to the backdrop index, then strikes the WANTED row.

- `lived-in`: the same room untidy the way real homes are (jacket on a chair, shoes by the door, mail, dishes, laundry). Seats and the floor in front of them kept clear.
- `rundown`: an apartment the landlord neglects (water-stained ceiling, peeling paint, taped window, stained floor, trash bags). Seats and floor kept clear.
- `morning`, `night`, `rain`: light and weather only.

Generator: Adobe Firefly, Gemini 3.1 (Nano Banana 2), image edit at 1K; prompts in `prompts.json`.
