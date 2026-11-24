# Job 10: UI restyle

Wait for the mockup Lamontae approves; Claude CTO posts its path in this job's first message. Start with the framework in step 1 now.

## Lamontae's direction (September 29)

- **The look:** a polished, Steam-ready game in the spirit of Crusader Kings III and The Sims 4. No navy, and no cartoony frames, bubbly buttons or thick outlines.
- **Panels** are clear, bounded glass: thin, nearly transparent, a hairline border and a small corner radius, with the scene visible through them. This is mock 18.
- **A person's dossier** has a tall full-body figure on the left and sections on the right. This is mock 22.
- **Menus** have tabs across the top, a list on the left and detail on the right. This is mock 27.
- **The player's portrait** is in the bottom-left corner, with the date and time.
- **The radial menu** is back, restyled to match.
- **Glossary underlines:** a term the player may not know is underlined; clicking it opens the glossary, which remembers what the player has learned.
- **All labels are the game's real labels**, from the real screens.
- **Mockups** are in `/Users/lamontae/political-game-play/cto-notes/firefly/ui-mocks/`. The 30 style studies are `ui-mock-01.png` to `ui-mock-30.png` (Lamontae liked 18, 22 and 27); the first combined attempts are `ui-v2-01.png` to `ui-v2-03.png`. He said v2-03 was closest but still too cartoony.

## Work

1. **One theme layer.** Tokens (colors, glass, borders, radii, type scale) and panel, tab, list and button components that every screen uses. Remove the old cream HTML look and the navy remnants everywhere, not screen by screen.
2. **Restyle the screens in playtest order:**
   - new game and character;
   - the opening cards;
   - home;
   - the conversation box (portraits top left, a Lie button beside the replies);
   - Stops;
   - the radial menu;
   - the Journal;
   - the dossier and full record (job 12 fills its content);
   - the TV;
   - the map;
   - campaigns;
   - the News;
   - money;
   - jobs;
   - meetings.
3. **Context for every number** a player sees. For example, 6.1% unemployment compared with what, and what it means for a person. Lamontae asked for this in the playtest.

## Checks

- Browser screenshots of every screen at 1440x900 and 1920x1080, before and after, in the hand-back.
- No screen may show a raw developer notice or unstyled HTML.
