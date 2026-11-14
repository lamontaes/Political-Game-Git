# Lines as played: Travel lists where the player has business and says why (carries #8485)

Owner, Nov 8, 2026, about 2:10 p.m., on Travel: "I go to travel. Everything's a market or a post office. I don't even know how I'm supposed to be able to run for office." Owner, Oct 26, 2026, on offices listed for being offices: "Why have to travel ... Public Works Department?" (both quoted in the pool item play-travel-in-a-village-lists-no-town-office).

Words lead's labels (Nov 14), all built: the heading is "Why it's listed"; one work tie per card, the closest ("You work here", else "Someone in your family works here", else "Someone you know works here"); "Someone in your home goes to school here" ("You go to school here" when it is the player); "Open to the public" and "Its board meets today" unchanged; the office where you file says "You can file to run for office here" on every day its window is open; your own seat says "Your office" and your own body's meeting day "Your board meets today" (proved by `travel-civic.test.ts`, not on a screen here).

Method: the bench on the Account lead train (head ee82407b) for **before**, the same train with this change for **after**; same place and seed, 1440x900. A new life (a woman born May 14, 1980); the world run to two days after the race's filing window opens; Travel opened; every card's detail read; the filing counter's card pictured (`filing-office-window-*.png`) and the first card (`travel-window-*.png`). Then the world is run a day at a time (up to 60 days) until a town or county office card shows (`town-office-window-after-*.png`).

## Oxford, Massachusetts (place key 2551790, seed `bill-words-f`)

The race: Select board member, filing at "City or town clerk (signatures certified by the board of registrars)", window opens 2025-08-01, election 2025-11-04. The Travel screens are taken two days into the window.

- Before, the filing card's detail: "OPEN | Closed now. Opens Monday, August 4, 2025 at 8:00 AM.". Every other card: no reason shown at all; no town or county office in 60 days.
- After, the filing card's detail: "OPEN | Closed now. Opens Monday, August 4, 2025 at 8:00 AM. | WHY IT'S LISTED | You can file to run for office here".
- After, each card: City or town clerk, Oxford: "You can file to run for office here"; Wall Manufacturing: "Someone in your family works here"; Poole's Market: "You work here"; Walker's Market: "Open to the public"; Mann's Kitchen: "Open to the public"; Barnes's Market: "Open to the public"; Copeland's Kitchen: "Open to the public"; Norris's Kitchen: "Open to the public"; Graham's Salon and Barbershop: "Open to the public".
- After, the office card on 2025-08-05: Town of Oxford, "OPEN | Open now | WHY IT'S LISTED | Its board meets today" (`town-office-window-after-oxford-ma.png`).

## Mineola, New York (place key 3647636, seed `bill-words-h`)

The race: Council member, filing at "County board of elections (counter: election commissioner)", window opens 2025-02-02, election 2025-11-04. The Travel screens are taken two days into the window.

- Before, the filing card's detail: "OPEN | Filing office". Every other card: no reason shown at all; no town or county office in 60 days.
- After, the filing card's detail: "OPEN | Filing office | WHY IT'S LISTED | You can file to run for office here".
- After, each card: County board of elections, Mineola: "You can file to run for office here"; Strickland's Market: "Someone in your family works here"; Simpson's Kitchen: "Someone in your family works here"; Mineola Public Schools: "Someone in your home goes to school here"; Village of Mineola: "Its board meets today"; Nassau County: "Its board meets today"; Wong Academy: "Someone in your home goes to school here"; Wilkerson's Market: "Open to the public"; Ali's Market: "Open to the public"; Moore's Kitchen: "Open to the public".
- After, the office card on 2025-02-04: Village of Mineola, "OPEN | Open now | WHY IT'S LISTED | Its board meets today" (`town-office-window-after-mineola-ny.png`).

## Summertown, Georgia (place key 1374348, seed `bill-words-c`)

The race: Council member, filing at "City or town clerk", window opens 2025-06-23, election 2025-11-04. The Travel screens are taken two days into the window.

- Before, the filing card's detail: "OPEN | Filing office". Every other card: no reason shown at all; no town or county office in 60 days.
- After, the filing card's detail: "OPEN | Filing office | WHY IT'S LISTED | You can file to run for office here".
- After, each card: City or town clerk, Summertown: "You can file to run for office here"; Summertown Campaign Works: "Someone you know works here"; Woods's Market: "Someone in your family works here"; Owen Trucking: "Someone you know works here"; Summertown Post Office: "Someone in your family works here"; Hammond's Market: "Someone you know works here"; Summertown Public Schools: "Someone in your home goes to school here"; Osborne's Kitchen: "Open to the public"; Reese's Kitchen: "Open to the public"; Dawson's Kitchen: "Open to the public".
- After, the office card on 2025-07-01: City of Summertown, "OPEN | Open now | WHY IT'S LISTED | Its board meets today" (`town-office-window-after-summertown-ga.png`).

## Seen beside it, not from this change

- A small town lists three markets and three kitchens; the item says to file that for the jobs lead if true.
