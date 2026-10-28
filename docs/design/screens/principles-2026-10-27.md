# Screen principles, Oct 27, 2026

Rules every menu screen is built to, from the owner's Oct 27 playtest (OWNER-DECISIONS.md, Oct 27 afternoon) and the sources fetched below. Each rule is checkable by looking at one screenshot; every screens PR names the rules it builds to by number.

Honesty note: I could not verify how The Political Process lays out its calendar, news or travel screens (the Steam page has no captions or layout text, and the dev posts only show titles). The rules for those screens come from the owner's playtest and general design sources, and say so.

1. **Content fills the panel, or the panel shrinks to the content.** No region of a panel is empty; a screen with six rows is a small panel, not a full-height one. Empty space is allowed only where it separates groups. (Source: Matt Ström, "UI Density", https://mattstromawn.com/writing/ui-density, fetched: "Every bit of ink on a graphic requires reason"; push the ratio of useful to total "as close to 1 as possible"; but "some whitespace has meaning", so keep space that separates groups.)

2. **Title plus content only.** No subheading that restates state ("You are at home", "Your jobs"). If the title and the rows already say it, the line is deleted. (Source: owner, Oct 27: "Remove all those subheadings. I hate them all." Ström: every element must earn its place.)

3. **One header level at most, and never an orphan.** A group header exists only when two or more groups share the screen and each has at least two rows. A header with one row under it, or none, is removed. (Source: Ström, same page: proximity and similarity make groups read as groups, so space and shared styling do the grouping and labels are rarely needed.)

4. **Group by meaning, not by record type.** Rows that belong together (a job, its pay, its next shift) sit together with space between groups; the same kind of text has the same size, font and color everywhere. (Source: Ström: "text with the same size, font, and color serves the same purpose in the interface.")

5. **Every row says who and what in words, once.** "Maria Lopez, clerk, files your papers Tuesday" not "Filing: pending". No two rows say the same thing; the player's own items come first, others after. (Source: owner playtest, "useless rows"; CK3 preview in Shacknews, https://www.shacknews.com/article/118072/crusader-kings-3-hands-on-preview-evolving-the-intricacies-of-lineage-statecraft, fetched: the Issues menu sorts suggestions into "less pressing affairs and priority decisions", i.e. ordered by importance to the player.)

6. **Detail goes on hover or click, not on the face of the row.** A row shows the name and the one fact that decides whether you open it; reasons, numbers and history live in a tooltip or the person card. Tooltips can nest: hover a term inside a tooltip to open another. (Source: Shacknews CK3 preview: "every single term of importance" is highlighted; hovering gives an explanation box, and you "can hover within a tooltip to open more"; moving the cursor away closes them all.)

7. **Calendar events sit on their day cells with icons, and a day list sits beside the grid.** The grid shows an icon per event kind on its day; clicking a day fills the list beside it with that day's entries in words. The grid is never a blob of text rows. (Source: owner, Oct 27, "the calendar is just a blob". The Political Process time model, per the Awkward Mixture review, https://awkwardmixture.blogspot.com/2023/12/the-political-process-from-senator-to.html, fetched: 40 hours a week divided among fundraising, travel and speeches; I found no description of its calendar screen, so the grid layout is our design, not a copy.)

8. **Only things the player acts on or will feel go on the calendar.** "Law takes effect" rows that nobody reads are removed, or become one line in News when a person the player knows is affected. (Source: owner, Oct 27. Ström: remove decoration that carries no data.)

9. **News is a newspaper.** Masthead with the paper and date; one lead story with a headline, a dateline and several sentences of body text; smaller stories below in descending size; a story with no text is not published. Front-page hierarchy is size and position, not labels. (Source: owner, Oct 27, "News has no newspaper story text". Ström, grouping and hierarchy through size and proximity.)

10. **Traits are a sentence, not a stat block.** The person's traits read as one plain sentence ("Patient, careful with money, slow to trust"); ratings appear only in a tooltip, and only where the player needs them. (Source: owner, Oct 27. Shacknews CK3 preview: stats are numbers where "low numbers represent a deficit and high numbers represent a specialty", with explanation delivered by tooltip rather than on the face.)

11. **Travel always lists destinations, each marked open or closed right now.** Every place the player can go appears as a row with "open" or "closed until 9 a.m." in words; closed ones are listed, never hidden, so the player learns why. (Source: owner playtest. Awkward Mixture review: travel is a time cost in The Political Process, so the screen must show what a trip costs and whether it is worth it.)

12. **One way to each screen.** A screen has one nav entry. If the same screen is reachable from two menus, one is removed; a shortcut inside content (a name that opens a card) is fine because it is a link, not a second menu. (Source: Paradox CK3 console dev diary 3, https://www.paradoxinteractive.com/games/crusader-kings-iii/news/ck3-console-dev-diary-3-uiux-and-controls, fetched: "Avoiding the use of lots of fullscreen menus"; top-tier menus sit in one Command Bar with sub-menus tabbed beneath.)

13. **Every name opens its person card.** Anywhere a person's name or portrait appears, clicking it opens the card. (Source: Awkward Mixture review: the author complains "I should be able to click on the portrait (or name) of any politician and access their page, but I can't." That is a failure we avoid.)

14. **Players get as much on screen as fits legibly.** Default to dense: several groups side by side on a wide panel rather than one long column plus empty margin. Density is limited by what a new player can read, so hierarchy (size, order) carries the load. (Source: CK3 dev diary 3: players "want as much information at their fingertips as possible"; Ström: "There's an upper limit to information density", set by the audience.)

15. **Remove elements that stopped serving a purpose.** If a row, panel or button was added for a system that no longer reads it, it is deleted in the same change. (Source: Game Developer, "The User Interface Continuum", https://www.gamedeveloper.com/design/the-user-interface-continuum-a-study-of-player-preference, fetched: once a feature "doesn't serve its purpose and function anymore, the feature becomes annoying".)

16. **Judge each screen against a shipped reference before building.** Pull three screens of the same type (Character, Map, Menu, Stats) from Game UI Database or Interface In Game and write one line on what each one puts on the screen and what it leaves out. (Source: Interface In Game, https://interfaceingame.com/, fetched: a collection with screens sorted into Character, Dialogue, Menu, Map, Stats, Quest and other categories. Game UI Database returned HTTP 403 to me, so I could not read it.)

## What I could not verify

- The Political Process menus, calendar, news and travel layout: the Steam store page (fetched) has no screenshot captions or layout text; the Steam dev board lists only post titles ("Upcoming Updates - Improving User Experience", Jul 27, 2024 is the one to read by hand); one aggregator search snippet called its UI "clunky and overwhelming", unverified.
- RimWorld inspect pane: the wiki returned HTTP 403; search results only gave forum and mod pages, so no RimWorld rule above rests on a source.
- CK3 character window layout: no Paradox page fetched describes it; only tooltips and the Issues menu (via Shacknews) and the console diary.
- Hodent, "The Gamer's Brain" and Fagerholt and Lorentzon, "Beyond the HUD": only search summaries seen, no text fetched, so none are cited for a rule.

## Sources (pages fetched)

- https://store.steampowered.com/app/1184770/The_Political_Process/
- https://steamcommunity.com/app/1184770/discussions/3
- https://awkwardmixture.blogspot.com/2023/12/the-political-process-from-senator-to.html
- https://www.paradoxinteractive.com/games/crusader-kings-iii/news/ck3-console-dev-diary-3-uiux-and-controls
- https://www.shacknews.com/article/118072/crusader-kings-3-hands-on-preview-evolving-the-intricacies-of-lineage-statecraft
- https://mattstromawn.com/writing/ui-density (redirect from matthewstrom.com)
- https://www.gamedeveloper.com/design/the-user-interface-continuum-a-study-of-player-preference
- https://interfaceingame.com/
- Failed (HTTP 403): https://rimworldwiki.com/wiki/User_interface, https://www.gameuidatabase.com/
