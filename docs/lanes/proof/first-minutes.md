# Lane 2 Path 1 — First minutes

**Built by Lane 2 on main 69b9126328a1698ee1376772582e7be59369b4c5, November 4, 2026. Not Verified.** Only a session that did not build the fixes may mark this path Verified after its own main replay.

All eight fixed towns opened through the normal New Game creator, explicitly selected by state and town. Each chosen player is female, born January 27, 2007; the creator supplied the printed name. The opening plays through Continue and real replies using main’s playOpening helper, never Skip scene or a time-advance route. Every life remains January 20, 2025. Every request checked succeeds and all eight page-error lists are empty.

The family cards show no living sibling with the player’s first name and no parent under 15 at the player’s birth. The matching world reconstruction checks all full-person family:parent and family:other-parent links and all living family:sibling links, including named husks: 651 parent links and 996 living sibling links, zero failures. All 6,184 full households have real dwelling rows at opening. Counts are summed across eight separate worlds, not unique people. Counted households' unexpanded family histories are not claimed checked.

| Town                             | Replay             | Chosen player  | Full households | Parent links | Sibling links | Home / room                       | Screenshot                                        |
| -------------------------------- | ------------------ | -------------- | --------------: | -----------: | ------------: | --------------------------------- | ------------------------------------------------- |
| Haleyville, Alabama              | ab5f58e9be125c95   | Sonia Ortiz    |             825 |          100 |           141 | house / house-suburban-living     | [View](first-minutes/0132704.png)                 |
| Murray, Nebraska                 | 1d3f0e18ca4ba7e5   | Audrey Delgado |             735 |           91 |            99 | house / house-suburban-living     | [View](first-minutes/3133425.png)                 |
| Meadow Lakes, Alaska             | f835dd278d7312a1   | Morgan Olsen   |             764 |           75 |           104 | house / house-suburban-living     | [View](first-minutes/0247735.png)                 |
| Brookside, Delaware              | 4d50e1f88df997f9   | Jaden Schmidt  |             756 |           78 |           122 | house / house-suburban-living     | [View](first-minutes/1009850.png)                 |
| Storrs, Connecticut              | storrs-1           | Carmen Taylor  |             868 |           68 |            83 | apartment / apartment-nice-living | [View](first-minutes/0973980.png)                 |
| Washington, District of Columbia | dc-closures-a      | Alexis Gregory |             719 |           85 |           175 | house / house-suburban-living     | [View](first-minutes/1150000.png)                 |
| Cabo Rojo, Puerto Rico           | f857db7436bf7449   | Lauren Ramirez |             808 |          106 |           214 | rowhouse / rowhouse               | [View](first-minutes/7209861.png)                 |
| Santa Rita, Guam                 | 6f539fcfdf6d96f9-5 | Jordan Mueller |             709 |           48 |            58 | house / house-suburban-living     | [View](first-minutes/territory-GU-santa-rita.png) |

The browser dwelling is the same complete record as the housing table's row; the normal homeOf reader selects the displayed room, and backdropFor returns the displayed backdrop. Screenshots were inspected for all eight rooms. Murray rents its house; Storrs opens in an apartment and Cabo Rojo in a rowhouse. This does not grade the art, prove later rent changes, or prove a newly voted law.

[World and home record IDs with counts](first-minutes/worlds.csv), [the player's named relatives and birth dates](first-minutes/player-family.csv), and [exact creator requests](first-minutes/new-game-urls.json) attach each replay to its evidence. The broad record check has no missing home, underage parent or living sibling-name collision. It reconstructs each exact chosen life and reads the actual housing/room engines, without patching a law, date, name, home or family fact for the test.

## Reproduce independently on main

Install and open the normal bench with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 npm run bench`. In a separate terminal run `node docs/lanes/proof/first-minutes.browser.mjs`, setting CHROMIUM_EXECUTABLE_PATH if the installed browser is outside Playwright's default cache. The browser check chooses all eight towns through the normal creator and writes results under test-results/lane-2-first-minutes. Stop the server before the record audit, then run `NODE_OPTIONS=--max-old-space-size=8192 node --import tsx docs/lanes/proof/first-minutes-records.mts`. These reproduction files contain the executed checks with workspace paths made portable. Use the recorded exact creator URLs if separately replaying one named person.

No production source changes in this proof. The fixes already merged separately: parent birthdays #7143, sibling names #7157, housing coverage #7147 and homes at opening #7189. Their component proofs retain the original failures, counterchecks, drawn lives and timing. For the last housing fix the first timing pair failed year three at +21.68%; its identical-world repeat passed every year, maximum +8.33%, with identical record fingerprints between repeats. Both pairs remain in [the housing proof](homes-at-opening.md). The merge desk separately opened Si'ufaga, American Samoa / 3a2fd883d5e9053f for #7189; that unit check is not this path's independent confirmation.

**Left unexplored here:** later jobs, payments, illnesses, couples, laws, voting, population change, weather and corruption. Paths 2–14 keep their prior unverified status. The next action is another session's eight-town replay on main; this builder does not mark Verified.
