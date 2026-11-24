# How games write dialogue, and rules for our lines

Date: 2026-11-09. Purpose: give graders and writers of `data/english/parts/*.json` a checklist drawn from published practice. This is calibration for authoring, not game policy.

Method and gaps. I used web search and page fetches on 2026-11-09. Pages I fetched and read: the GDC Vault session page for Ruskin's talk, Emily Short's blog posts on the talk and on oatmeal, the Short post on storylets, and the ink documentation. For the others I relied on search-result summaries only, because the page fetch failed or timed out: Short's "Beyond Branching" (404 on the guessed URL, so I used a search summary of the 2016 post), the Wildermyth wiki Tag Reference (timeout), the Crusader Kings III wiki (blocked), Disco Elysium (search summary of an interview), and bark systems for The Last of Us and Watch Dogs Legion (search found only talk titles). Those sections are thin and say so. Nothing below is a quote I did not see.

## 1. Valve: fuzzy pattern matching (Elan Ruskin, GDC 2012)

- The system weighs "hundreds of world facts" against a database of thousands of lines and picks the best fit, instead of a large hand-written if/else script. Characters can remember past events and react to them. (GDC Vault session page: https://www.gdcvault.com/play/1015317/AI-driven-Dynamic-Dialog-through)
- A line carries criteria on world facts. Special cases take precedence and the system falls back to general ones; Short's summary says it "applies the most specific one it can find." (https://emshort.blog/2012/03/16/gdc-2012-talk-on-dynamic-dialogue/)
- A stated goal was that writers add special cases, running gags and new tracked facts without programmers. (GDC Vault page above)
- Not confirmed from a fetched page: the exact scoring, and how "what was said" is stored. Short's post does not describe line history. Third-party reimplementations break ties by match count and priority (search summary of https://www.nuget.org/packages/StellaFuzzyPatternMatcher/), which is not Valve's code.

## 2. Failbetter: quality-based narrative and storylets (Alexis Kennedy; Emily Short)

- Quality-based narrative is Short's name for Failbetter's structure: content unlocked by "qualities" (state values). (Search summary of Short, "Beyond Branching," https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)
- A storylet is "a piece of content" with "prerequisites that determine when the content can play" and "effects on the world state" after it plays; she calls them "simple, atomic, robust, and recombinable." (https://emshort.blog/2019/11/29/storylets-you-want-them/)
- Salience-based narrative picks from a large pool the element judged "most applicable at the moment," so the system decides, not the player. (Beyond Branching summary above)
- Takeaway: every piece states when it may play and what it changes, so it has a reason to exist in a given moment.

## 3. inkle: ink variation

- Alternatives sit in braces separated by `|`. Sequences show each in order and hold on the last; cycles (`&`) loop; once-only (`!`) shows each once and then nothing; shuffles (`~`) pick at random. (https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md)
- Text can also vary "depending on logical tests," such as a variable or whether a section was visited. (same page)
- Takeaway: ink's default is to track how many times text was seen and move on, so repetition is handled by the structure. Random shuffle is one option, not the default. Our no-dice rule makes the sequence and once-only forms the ones to copy, driven by what the speaker has already said.

## 4. Wildermyth (Worldwalker Games)

- Event authors assign story roles to targets, usually heroes, matched by class, personality, aspects or relationships; the most important roles go first. (Comic Editor Reference, via search summary: https://wildermyth.com/wiki/Comic_Editor_Reference)
- The Tag Reference lists tags that insert text from a hero's personality (examples: bookish, cowardly, goofy), and random tags that choose among options deterministically from the roles involved. (search summary: https://www.wildermyth.com/wiki/Tag_Reference)
- A changelog notes added dialog variance by personality in some events. (https://steamcommunity.com/sharedfiles/filedetails/changelog/3139809496?l=tchinese)
- Not found: a page defining "interpolation" by that word. Role casting and tag insertion are the mechanisms the sources show.

## 5. Disco Elysium (ZA/UM)

- Skills speak as internal voices; there are 24, in four attributes. The narrator interview says all the voices "have a very different style of writing." (search summary of https://pcgamer.com/we-talk-to-disco-elysiums-incredible-narrator-who-recorded-350000-words-of-dialogue-and-has-never-acted-before)
- Lead writer Kurvitz sent lists to other writers, with Helen Hindpere leading the work (same summary). I found no per-skill style guide.
- Takeaway: a voice is recognizable from a line alone, without a speaker label. This is the only claim I can support from sources; the rest is interpretation.

## 6. Crusader Kings III events

- Only secondhand sources came back, not the official wiki. Forum answers say event text can be selected with triggers per localized element, and that options may be simpler as separate options with their own effects. (https://admin-forum.paradoxplaza.com/forum/threads/is-there-a-way-to-change-localization-of-an-event-depending-on-tag-or-does-it-need-a-different-event.1674980)
- Culture, religion and trait triggers are used in practice in mods (search summary only). I did not verify the claim that events need a game-state trigger and options with concrete stakes against a fetched page; treat it as common knowledge about the format, not a cited finding.

## 7. Bark systems (Left 4 Dead, The Last of Us, Watch Dogs Legion)

- Left 4 Dead is the documented case: Valve's matcher above, with memory of earlier events. (GDC Vault page)
- Naughty Dog gave a 2014 GDC session titled "The Most Awesome Dialog System Ever." The listing has no technical detail. (https://www.naughtydog.com/blog/2014_naughty_dog_gdc_talks_and_the_last_of_us_accolades)
- I found no fetched source on cooldowns or repetition limits for Last of Us or Watch Dogs Legion, so nothing is claimed about them. Repetition handling is cited from ink (once-only, sequence) and Valve (memory of what happened).

## 8. Emily Short and Bruno Dias on procedural text

- "Procedural oatmeal" is Kate Compton's term for output that is technically unique but does not feel different. Short: easy to make 10,000 bowls, hard to make the differences "matter." (https://emshort.blog/2016/09/21/bowls-of-oatmeal-and-text-generation/)
- Her central test is "whether the generation is connected to anything mechanical." Generation tied to nothing is "purely decorative," and players learn to look past it. (same page)
- Her example: in The Mary Jane of Tomorrow the robot's speech reflects her training, so a cowgirl book gives an accent, which beats a status display. (same page)
- She says procgen "isn't a substitute for designing content" but "a way of designing content." Dias's Roguelike Celebration talk argues it does not turn small inputs into large content. I did not read the talk. (same page)
- Short has proposed salience as how many aspects of the world model a text reflects. (search summary: https://emshort.blog/category/procedural-text/page/2/)
- Voyageur (Dias) reuses text-generation tools and corpora from her Annals of the Parrigues (search summary of https://emshort.blog/page/63/). I did not read Dias's own Voyageur post.

## Rules for our lines

Each rule can be checked against one bank line and its slot.

1. A line names something specific from its situation (a person, place, thing, amount or day) instead of a general sentiment. (Short on oatmeal; Valve facts)
2. A line's variation is tied to a fact in the record (trait, relationship, law, price, event); if swapping in any other fact would change nothing, the line is decoration. (Short, "connected to anything mechanical")
3. A scene's first line or two says when, where and who, so the player never has to guess the setting. (storylet prerequisites; Wildermyth role casting)
4. A question names what it asks about; "What do you think?" with no object fails. (specificity, Short)
5. The most specific matching line wins: a line tied to the speaker's trait and the situation outranks a generic one, and the generic one exists only as fallback. (Valve; Short's summary)
6. A line is cast by role, with names and nouns filled from the world through slots, not typed into the text. (Wildermyth roles and tags)
7. A line varies by who speaks it: a different trait or role gives different words, not the same sentence with a synonym swapped. (Wildermyth personality tags; Disco Elysium voices)
8. A speaker's line is recognizable without the speaker's name attached; a flat, neutral register fails. (Disco Elysium)
9. A line said once is not said again by the same person soon; the choice reads what was already said. (Valve memory; ink once-only and sequences)
10. Repetition is handled by order and history (sequence, once-only), not by a random pick among near-identical lines. (ink; our no-dice rule)
11. A line states a prerequisite and an effect: it names the situation it needs and, when it plays, something in the world changes or is recorded. (storylets)
12. No line explains its own subtext or tells the player what to feel; it states what is said or done and stops. (Short on a robot's accent over a status label; Disco Elysium register)
13. Ten variants of a line must differ in what they say, not only in wording; if a reader cannot tell which fact picked a variant, delete the extras. (Short/Compton oatmeal)
14. A bank grows by adding conditions and specifics to existing lines, not by adding more generic lines to a slot. (Dias: procgen does not multiply content from little input; Valve special cases)
15. Every option or reply names a concrete stake (money, a vote, a person, a deadline) that the next line can acknowledge. (storylet effects; the CK3 format, uncited above)
16. A line that would fit unchanged in any other slot of the game fails the slot test and goes back for a rewrite. (specificity beats variety: Short, Dias)
