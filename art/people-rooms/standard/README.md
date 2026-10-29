# The standard: rooms, mannequins and people (owner, Oct 29)

Owner, Oct 29: every pose at five angles (front, three-quarter left and right, back three-quarter left and right; never mirrored), two shots per place (wide and medium) with the same eye-level camera and horizon (40% of the height), Firefly paints each room with green mannequins first and an edit removes them. "Just make sure these people don't look like superheroes."

- `mqlib/` — the mannequin pose library: stand, talk, fold, clap, walk, lectern, sit, sitdesk, couch. Each sheet has the 8-angle layout (top row back three-quarter left, back, back three-quarter right; middle profiles; bottom row front three-quarter left, front, front three-quarter right); the five used angles are read by `tools/template.py library()`. `overrides.json` swaps cells drawn facing the other way (lectern's three-quarter pair).
- `templates/` — the layout Firefly paints from: a gray room box on the standard horizon, brown blocks for desks (top at a seated mannequin's waist), tan blocks for seats (top at its hips), and the library mannequins at the grid spots.
- `plates/<shot>.plate.png` (with mannequins, data only, never drawn), `<shot>.empty.png` (the backdrop) and `<shot>.mannequins.json`: same spot fields as `../mannequin-plates` plus `angle`, `packPoses` (v3 poses that fit until pack v4 draws people on the library poses), `camera.horizon` and `pictures` (frame boxes the game fills with the room owner's family photos; painted frames show only plain glass).
- At a desk, `deskEdge` is the desk's back edge: the body stops there and only the hands rest on the desk (`tools/preview.py desk()`).

Shots so far: `oval-medium` (the address at the Resolute desk) and `oval-wide` (desk, two advisers standing facing it, two couches). Recipe and status: `PLAN.md`.
