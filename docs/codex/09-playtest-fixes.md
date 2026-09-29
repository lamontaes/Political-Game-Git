# Job 09: playtest fixes

## Why

On September 29, Lamontae played a new life in Lebanon, Kentucky across 13 screens. `refs/playtest-2026-09-29.md` holds 149 numbered items:

- items 1 to 111 are what he said and what his screenshots show;
- items 112 to 144 are Claude CTO's second pass;
- items 145 to 149 come from watched worlds.

As of this job, only two are fixed: 100 senators, and release automation. Lamontae: every item must be routed somewhere; nothing is dropped. He wants to play this weekend.

## Work

1. **Route every item.**
   - Make `docs/codex/handbacks/09-routing.md`, a table with the item number, a short title, and the job that owns it (02 to 12 in `README.md`) or "09" if no other job covers it.
   - The team names in the playtest file (Build 7, Build 16 and so on) are from before handoff; ignore them.
   - Commit this table first, in its own small pull request, so the other jobs can read it.
2. **Fix the items routed to 09.** They are mostly direct screen and flow bugs. Examples from the log:
   - the fair market rent on the place step;
   - the place search still shown after a pick;
   - appearance labels unreadable on the backdrop;
   - the Vice President missing from the opening;
   - the version number stuck at v0.4.0;
   - "Full record" dropping you out of the opening;
   - the developer notice on other people's records;
   - Journal dates;
   - the day list and time controls;
   - "Waiting on you";
   - too many options at once;
   - the money screen garbled;
   - the jobs screen's raw HTML;
   - unrealistic shift pay;
   - a 7 a.m. meeting shown in a night scene.

   Fix a simple bug fast, in small pull requests grouped by screen.

3. For each fixed item, give the before and after in one line, with a browser screenshot for anything visible.

## Checks

- Play the same path again in a random place (not Lebanon): new game, the opening, home, talking to a housemate, Stops, the radial menu, the Journal, the TV, the map, filing for office, the News and a public meeting.
- List every item you saw still broken.
- The speed budget applies.
