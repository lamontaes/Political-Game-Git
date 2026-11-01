# Songs of Syx: what it does that we want, and how its maker built it

Written by the first-account CTO on Oct 31, 2026, at the owner's request: "read the description of the game... it does a lot of stuff that I want my game to do. See if you can find, like, the developer talking about how he did it, or open source stuff." It is a different game, a fantasy city builder, so nothing here is copied. It is read for ideas and methods only.

## The short version

- **One person built it.** Jakob "Jake" de Laval (company Gamatron AB, Stockholm) has worked on it alone since about 2015. It entered Early Access on Steam in September 2020.
- **It is not open source, but the source ships with the game.** Anyone who buys it gets the full Java source as `info/SongsOfSyx-sources.jar` in the install folder. He confirmed this on Steam in June 2023 and said he planned to open his GitHub "pretty soon". I found no public repository of his.
- **Its content is plain data files.** Races, buildings, resources and their bonuses are text files inside `base/data.zip`. Mods override them file by file, and code mods hook into the game's update loop. A public mod template on GitHub shows both.
- **His central design idea is the same as ours.** The game starts with individuals and, as the city grows, asks the player to look at groups instead. Our two-level population (full people where they matter, counted groups elsewhere) is the same idea arrived at separately.

## What it does that our game wants, and where we stand

| Songs of Syx                                                                                                                                                    | Our Civic Duty                                                                                                                                      | Where we are                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Tens of thousands of individually simulated citizens... each with their own life, religion, fears and desires."                                                | Full people where they matter; everyone else counted by place, age, job and household; a counted person filled in on first meeting.                 | Built. Ours covers a country, so most people stay counted. His city simulates everyone.                                                            |
| "It evolves into a game where you no longer need to pay attention to individuals unless you really want to. Instead you'll focus on the many groups of people." | Voter groups and the counted population, read by every engine with the same rule as a person times its count.                                       | Built underneath. The screens do not yet widen from people to groups as the player rises from council to governor to president.                    |
| "Small events can spiral into the collapse of kingdoms." Upkeep, a dip in production or standing "could quickly spiral out of control."                         | The outcome web: a law or a price moves money, which moves people, which moves votes.                                                               | 170 of 246 links reach people (laws matrix). The effects-web plan for the rest waits on the owner's read.                                          |
| Weather, migrations, droughts, pestilence, raiders and traders, so that "kingdoms and empires come and go with or without your intervention."                   | World events from causes (a hazard record, a health record, a law, a price), never a monthly chance; the world runs while the player plays.         | The rule is set and many causes exist; state and federal governments act through the same engines (governing lead, unit U1 on an unmerged branch). |
| The capital is "sustained by the villages, towns, lumber camps, castles and ports" of the kingdom.                                                              | Other places run at a coarser level and feed the national economy.                                                                                  | Built at a coarse level. 21 of 56 places run slower than the two-minute year.                                                                      |
| Nobles you appoint run parts of the kingdom; "some might get the idea to usurp you or join your enemies."                                                       | Appointees and officials with traits, principles and relationships deciding what they do.                                                           | Appointments exist; federal cabinet and vice-president vacancies never refill (nightly, 13 places). Codex package C covers it.                     |
| Content as data files that mods override.                                                                                                                       | Content is data rows; policy packs are meant to be "modder-friendly in the way RimWorld and The Sims are" (`docs/systems/policy-content-packs.md`). | Built as data rows; no outside mod loading yet. Not on the golden path.                                                                            |

## How he built it, in his own words

- **Language and engine.** "My tools have been Java and lwjgl 3.0" (Java Gaming forum, Oct 21, 2016). On Steam, June 20, 2023: "Yes, it's made in java." He chose Java because it is easy to set up and ship, and says he learned to write Java "as efficient as assembler, well more or less." Modders call his own engine Snake2d after its code package.
- **Groups over individuals.** Asked how it differs from Dwarf Fortress and RimWorld (Indie Game Picks, Apr 2020): "Songs of Syx plays more god like. You don't control your subjects other than in battle." Then: "It evolves into a game where you no longer need to pay attention to individuals unless you really want to." And: "Instead you'll focus on the many groups of people that are within your kingdom."
- **Why he made it.** "I enjoy more RPG-like base builders on small, yet detailed scale, but usually find myself disappointed by the end game." Of working alone: "I don't see this as 'one of my games'. I see this as my life's work."
- **Speed.** The game wiki's version history, read once on Oct 31 before the page went down, records these steps. He rewrote the pathfinder to run twice as fast. A 28,000-person city then ran about three times faster on a laptop. Pathfinding moved to its own thread, more threading was planned for five to six times, and he put the ceiling above 100,000 people. One release (0.61.16) promised "20–50% more performance". Players praise how it runs on modest machines and also report slowdowns in very large cities (VaporLens summary of Steam reviews).

I found no talk or post where he explains, step by step, how each citizen is updated or stored. The two long video interviews (RPG Codex with Blind, and DevTALK) were not transcribed and I did not watch them.

## What is open, and what we could use

1. **The source in the install folder.** If the owner buys the game, a session can read how it updates tens of thousands of people each frame and how it counts groups, then write our own code. Nothing is copied in (`AGENTS.md`: no proprietary material from other games). The questions worth asking it are these. Does every citizen update every tick, or a slice of them each tick? Are citizens objects, or rows in number arrays? When does the game stop tracking someone as an individual?
2. **The mod template** (`4rg0n/songs-of-syx-mod-example` on GitHub, public). It shows the data-file layout (`assets/init/race/HUMAN.txt` and similar) and how a bonus is written, for example `{BOOSTER_KEY}>MUL: 0.0`. Our parameter tables already work this way; it is a model for mod loading if that is ever wanted.
3. **For the speed lead.** His biggest gains came from rewriting one hot path (the pathfinder) and moving it to its own thread. Ours is a TypeScript simulation on one thread, held to a country's year in under two minutes. Whether to move any engine to a worker thread is the speed lead's call. This note only records that the one comparable game got most of its gains that way.

## Sources

- [Songs of Syx on Steam](https://store.steampowered.com/app/1162750/Songs_of_Syx/) (store description, quoted from the store data)
- [Steam discussion: the developer on Java and the source in the install folder](https://steamcommunity.com/app/1162750/discussions/0/3820784854040045190/)
- [Java Gaming forum thread, 2016](https://jvm-gaming.org/t/songs-of-syx-2019/57797)
- [Indie Game Picks interview, Apr 2020](https://indiegamepicks.wordpress.com/2020/04/18/songs-of-syx-interview/)
- [Songs of Syx wiki, version history](https://songsofsyx.com/wiki/index.php/Version_history)
- [Mod template on GitHub](https://github.com/4rg0n/songs-of-syx-mod-example)
- [Devlog on itch.io](https://songsofsyx.itch.io/songs-of-syx/devlog)
- [RPG Codex interview article](https://rpgcodex.net/article.php?id=11952) and [video](https://www.youtube.com/watch?v=BJudRCyQSDg)
- [DevTALK video interview](https://www.youtube.com/watch?v=aZ1SE0XXW-4)
- [VaporLens summary of Steam reviews](https://vaporlens.app/app/1162750/songs_of_syx)
- [Game*Spark article naming the developer](https://www.gamespark.jp/article/2020/04/14/98317.html)
