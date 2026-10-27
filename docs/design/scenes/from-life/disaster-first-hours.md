# Episode: a disaster's first hours

Scenes from life (`scenes-from-life`), owner's Oct 27 executive brief ("a disaster's first hours", "a mayor and the governor"). Calibration only: no real person's name or words ship, and none are in the packet. A researcher's packet for the director engineer (CTO change of role, Oct 27). The director's build item is `scene-disaster-first-hours`; the engine items it waits on are `world-disaster-names-the-executives`, `world-governor-declares-emergency-in-play` and `world-local-emergency-declaration`.

## Sources

- City of St. Louis, Mayor's Office, "The First 100 Days" (page dated July 24, 2025), read in full: an EF-3 tornado struck the city on May 16, 2025 and affected more than 10,000 residents. In the first 24 hours about 250 fire, EMS and search-and-rescue personnel searched nearly 2,500 structures and answered over 400 emergencies. Power and water were restored to hospitals, schools, cell towers and supermarkets within 48 hours. A curfew was set. The mayor issued an executive order declaring a city state of emergency right after the storm, which gave departments ongoing emergency powers, and her office worked with the governor's office to speed state orders. A presidential major disaster declaration came June 9; the state later approved relief and a housing grant program. The page does not say what the mayor did personally in the first hours or when the request went to the president.
- Little Rock, Arkansas, March 2025 (THV11, from a search summary; page not opened): the mayor said he and the governor were on the phone within minutes of the tornado, and the state said the governor requested a presidential declaration within 24 hours.
- Selma, Alabama, January 2023 (search summary): the governor declared a state of emergency in six counties and asked the president to expedite a major disaster declaration.

## Packet

1. The event happens. Within minutes the people who run the first response (fire, police, public works) are working, and the mayor knows.
2. The mayor and the governor talk by phone in the first hour; the state's emergency power and the city's own are both in play.
3. The mayor signs an emergency order that gives the departments their powers; the governor declares a state emergency; the request for federal help follows within a day or two.
4. What each person says is short and practical: how many homes, how many people, what is needed now (shelter, power, a curfew), who is asked for what.
5. The executive's choice in that hour is what to ask for and from whom, and what to authorize now.
6. What changes: a declaration on the record, money moved to the response, people housed, and the first story in the paper.

## Does the engine fire it?

Asked in played worlds (`buildBenchWorld`, two-level), a mayor's and a governor's years, and one town for two years:

- **Exists:** `hazard.disaster`, written on the day FEMA's real incident begins (`disasters.ts`), with the disaster number, title, incident type, county, whether statewide and, where FEMA counted homes, the damaged homes scaled to the world. In Prospect, Kentucky two disasters begin on February 14, 2025 (an emergency declaration, 3624, and a major disaster, 4860), two on April 2, 2025 (3626 and 4864, which counts 93 damaged homes) and one on January 23, 2026. The town's fire chief and public works director are seated.
- **Exists:** the money. On FEMA's declaration date the town, the county and the households are paid what FEMA obligated (`disaster-assistance:<number>`, `disaster-households:<number>`).
- **Exists, nothing fires:** the disaster record names no one (`personIds` is empty), so no executive's moments change (four disasters a year in Kentucky; one in Tennessee and North Dakota). Engine item `world-disaster-names-the-executives`.
- **Does not exist:** a governor's emergency declaration in play. `declareEmergency` is never called outside its own test. Engine item `world-governor-declares-emergency-in-play`.
- **Does not exist:** a mayor's or county executive's emergency order. Only the governor's power is in the executive-powers table. Engine item `world-local-emergency-declaration`.
- **Does not exist:** any record of the governor and the mayor talking. Engine item `world-executives-meet-in-records`.

## Same producer, two other lives

- Little Rock: the same trigger and the governor in the visitor's chair, by phone.
- Selma: the state-level order with the county executive as the visitor.

## Gaps

The record names no one; the declarations and the executives' meeting are not recorded. The cast (the fire chief and public works director, the governor), the place (the office or the phone) and the lines can be written now.
