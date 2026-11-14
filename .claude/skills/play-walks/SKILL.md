---
name: play-walks
description: How to play Our Civic Duty the way a player does, with scripts that start a new life on the bench, click what a player clicks (the people at home each day, the places Travel lists, the filing office, every menu) and write down every line on screen, so a lead or a second session reads the game and not only the tests. Use before a build goes to the owner, after a train of screen or words pull requests, when reading a words or screen pull request on screen, and when someone says the game says nothing or nothing happens. Not for one item's finish line (seen-in-game), not for proving a simulation change in a played year (played-world-proof), and not a check that passes or fails.
---

# Play walks

**A walk plays the game and writes down what it saw. It asserts nothing; a person or a session reads it.** The tests say whether a rule holds. A walk says what the player gets.

On Nov 11, three walks before the morning's Mac build found what no test had:

- **A talk on the first evening cost the player a day.** After two talks at home, Day landed on Wednesday.
- **A visit did not last.** After any talk at a place the player was back in their own kitchen, with the person they had just left standing in it.
- **The talk a player has most was written for another hour.** At 7:00 AM, to a 17-year-old with no job: "Busy one at work today?", answered only with "I'm beat. Just glad to be home."
- **A parent was in two rooms at once:** at the factory at 8:25 AM and at home at 8:42 AM.

Each was one or two presses from the opening. Each would have been the first thing the owner saw.

## The walks

They live in `scripts/play-walks/` and share `scripts/play-walks/lib.mjs`. Each takes a folder for its pictures and log, starts a new life through the one helper every browser check uses (`src/bench/start-life.mjs`), and prints the log at the end.

| Walk           | What it plays                                                                                                                                                                                      | Run                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `at-home.mjs`  | Each day for a few days: a talk with everyone at home who has something to say, then Day                                                                                                           | `node scripts/play-walks/at-home.mjs <out-dir> [days]`  |
| `meet.mjs`     | The first morning, then the places Travel lists one after another: who is there, a talk with up to two of them, and the way home                                                                   | `node scripts/play-walks/meet.mjs <out-dir> [places]`   |
| `menus.mjs`    | The office that takes filings (what the counter says and offers), then the first screenful of words on every menu                                                                                  | `node scripts/play-walks/menus.mjs <out-dir>`           |
| `official.mjs` | The Advanced start: steps in as a member of a local body, presses Day for some weeks, and writes down every stop, scene, note and what Politics says on the first and last day                     | `node scripts/play-walks/official.mjs <out-dir> [days]` |
| `cards.mjs`    | The first evening: "Who I am", then the card of each person named under the people the player is closest to, pictured with every line on it (the words bar's before and after of a person's story) | `node scripts/play-walks/cards.mjs <out-dir> [people]`  |

The log has one block per thing said: the clock, who spoke, the last lines of the talk box, and the replies offered. A reply is taken in turn (first, then second, and so on), so a walk hears more than the first answer.

## How to run one

1. Start a fresh bench on the tree you want to read: `npm run bench` (port 3000; `BENCH_PORT` changes it). The bench serves the checkout it was started in. After a change to server code (`src/bench/*.ts`), stop it and start it again; a change to the page (`play.mjs`, `play.css`) needs only a new life.
2. Run the walk. The world draws its own place; the log's first line names the place and the seed.
3. To play the same life again, on another tree or after a fix, set `BENCH_SEED` to that seed. Use it for before and after. Never use a seed you chose to say something is seen: the place is drawn (skill `seen-in-game`).
4. Read the log top to bottom, as the player would hear it. Open a picture when a line makes you doubt the screen.

One bench and one walk at a time. A walk takes two to five minutes, most of it the world being built.

Pictures and `lines.md` files copied into `docs/seen/` for a pull request go through prettier before the commit (`npx prettier --write docs/seen/<folder>/`): the walk writes `lines.md` unformatted, and CI's `repository` check runs prettier on every changed file (Nov 13: #8987 and #8957 failed on six and three `lines.md` files).

## What to read for

The review rules in the skill `words-engine` (its lessons of Nov 11), and these, which only show in play:

- **The hour.** Is what is said right for the time on the card and for where the player is standing?
- **The person.** Is the question one this person could be asked (a job, a school, a town they do not have)?
- **The same thing again.** The same opener two days running; two strangers with the same four lines; a name said in full three times in one short talk.
- **The clock and the room.** After each press: did the clock move by what the act took, and is the player still where they went?
- **Who is here.** Does the strip name people who are somewhere else at this hour?
- **Nothing.** A day, a place or a menu with nothing in it is a finding too. Say which.

## What to do with a finding

1. **Look first** (skill `look-first`): the pool and the open pull requests. A built fix may be waiting for a desk; then replay it and send it to one.
2. **If it is small and yours, fix it** on its own pull request, with the walk's place and seed, the line before and after, and a test that fails without the fix.
3. **Otherwise write the item with its cause** on the hour's notes branch (skill `pool-notes`), quoting the lines as played, and name a builder for it.
4. **Post it** on the crew's issue with the place, the seed and the lines. A finding nobody can replay is a rumor.

## Traps

- **A walk that continues a saved life reads someone else's day.** The walks always start a new life. A browser check run on the same bench afterward may continue the walk's life, wherever the walk left it.
- **Some browser checks write pictures into tracked folders.** After running one in your own tree, look at `git status` and put back what it changed.
- **A before and after of another branch: check it out detached, and write down the head.** A branch that is checked out in a helper copy cannot be checked out in the main checkout, and `git checkout -q <branch>` in a script fails without a word, so the bench serves the old tree and the "after" pictures are the wrong branch's (Life records builder, Nov 12: three branches' pictures were all the school branch's). Use `git fetch origin <branch> && git checkout --detach FETCH_HEAD`, save `git log --oneline -1` beside the pictures, and read it before you trust them. Two benches at once need two ports (`BENCH_PORT`), and stopping one by `pkill -f src/bench/server.ts` stops both.
- **Do not change the checkout a walk is running from.** A walk started from a checkout loads its scripts as it goes; switching that checkout's branch under it makes the next walk in the queue fail with "Cannot find module". Run walks from a checkout you will not touch until they finish, or from a copy of `scripts/play-walks/` beside the bench.
- **The bench serves its working tree.** A patch applied there for a look is in every picture taken after it. Put the tree back (`git status`) before taking a "before".
- **Escape does not close a menu.** In play it puts Options over the open menu, and the clock stays covered, so the next press of Day never lands. Close a menu with `closeMenu` from the library (the menu's own close button), until the item play-escape-opens-options-over-an-open-menu is on main.
- **A quiet walk is a finding too.** Twenty-four days as a seated county commissioner played one street scene, and the board passed its budget on its meeting day with no stop for the player's vote. Read what did not happen against what Politics said was coming up, and post that.
- **A walk is not a pass.** "The walk ran with no page errors" says nothing about what was said. Quote lines.
- **Do not turn a walk into a test by adding asserts.** When a walk finds a rule worth holding, the rule goes into a test or a guard in the area that owns it, and the walk stays a walk.
- **A walk works a panel through and leaves it (Nov 11).** The official's walk pressed the first button of the meeting panel each time, which was Read the bill, then Back to the meeting, five hundred times, and wrote five hundred pictures. It now reads the first bill once, votes each item, adjourns, and stops with a line if it presses one control six times at a stop. It takes a new picture only when the panel's words change. Replay a life with `BENCH_SEED` to take before and after pictures of the same meeting.
- **A new control name needs the bench restarted (Nov 11).** The page's control names are read when the server starts. A label added to `src/bench/data/controls.json` shows as an empty space until the bench is restarted; page files and styles need only a new life.
- **A slow press is the script until the server says otherwise (Nov 13).** Playtester P3 reported a seven-minute week that was its own wait loop: the loop polled 600 times every 0.7 seconds and had no exit for the meeting panel, so every meeting day "took" 420 seconds after the game had stopped. Before reporting a slow press, give every wait loop an exit for each panel that can stop the clock, and read the bench server's CPU time (`/proc/<pid>/stat`, fields 14 and 15, in hundredths of a second) before and after the press; a press that used a few seconds of CPU was not slow.
