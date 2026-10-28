# Backdrop redraws (generated, not yet in the game)

Crisp redraws of midday paintings in `art/backdrops` that looked low-resolution (the owner: "some locations that i feel dont look 1k/2k res... one of the bedrooms for sure"). Each file has the same name and size as the painting it replaces, and the same layout, furniture and camera, so measured spots still line up: the builder copies it over `art/backdrops/<place>__midday.jpg`.

How they were found: each midday painting was resized to 1280 wide and scored by how much of its detail sits in the finest frequency band against the middle band (an upscaled picture has almost none there). The median painting scores 1.02; these scored 0.53 to 0.76 and score 0.72 to 1.03 redrawn (`scores.json`). Each was checked beside its original at full size; `store` did not improve and was left out.

Variants made from a soft painting (its morning, night, rain or condition versions) are still soft; they can be redone from the redraw.

Generator: Adobe Firefly, Gemini 3.1 (Nano Banana 2), image edit at 1K; prompts in `prompts.json`.
