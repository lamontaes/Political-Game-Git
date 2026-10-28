# Backdrop redraws (generated, not yet in the game)

Crisp redraws of midday paintings in `art/backdrops` that looked low-resolution (the owner: "some locations that i feel dont liik 1k/2k res... one of the bedrooms for sure"). Each file has the same name and size as the painting it replaces, and the same layout, furniture and camera, so measured spots still line up: the builder copies it over `art/backdrops/<place>__midday.jpg`.

How they were found: each midday painting was resized to 1280 wide and scored by how much of its detail sits in the finest frequency band against the middle band (an upscaled picture has almost none there). The median painting scores 1.02. The 29 lowest (under 0.86) were redrawn; 23 improved, from 0.53-0.86 to 0.72-1.03 (`scores.json`), and were checked beside their originals at full size. Six did not improve and are left out: convention-hall, election-night-venue, federal-district-courtroom, park, store, tv-studio; they need a new painting rather than a redraw.

Variants made from a soft painting (its morning, night, rain or condition versions) are still soft; they can be redone from the redraw.

Generator: Adobe Firefly, Gemini 3.1 (Nano Banana 2), image edit at 1K; prompts in `prompts.json`.
