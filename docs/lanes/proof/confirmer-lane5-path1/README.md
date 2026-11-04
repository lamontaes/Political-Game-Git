# Confirmer run: Lane 5, Path 1 (every place opens)

Run Nov 4, 2026 on main d070e3d2d1 by a session that built none of it: `npm run all-places -- --years 0 --seed confirmer-open-1 --workers 2` (the all-towns run, `scripts/core2-year/all-places.mjs`), Node heap 8,192 MB, nothing else running. It draws one locality in each of the 56 states and territories from the run seed and opens its world.

**Result: pass.** 56 places, 0 crashed, exit 0 in 562 s, nothing on stderr. The places and seeds are in `all-places-summary.md` (Anchorage, Alaska through Lance Creek, Wyoming, with Utulei, American Samoa, Christiansted, U.S. Virgin Islands and the other territories). This is one locality per place; Lane 5's sweep of all 8,242 county-governed localities (`npm run opening:every-locality`) is a larger check the lane is still running.
