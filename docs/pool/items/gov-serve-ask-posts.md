---
id: gov-serve-ask-posts
title: "A mayor or governor asks someone to take a department or cabinet post, and they can say no"
area: gov
kind: feature
priority: 2
size: M
status: merged
claimed-by: S6
pr: 9324
after:
blocked-on:
lead: governing
source: S6 (brief J, asking someone to serve), Nov 14 2026
standard: 2
model: opus
effort: medium
root: none
---

**What.** As mayor, the player picks a person for an open department post, and the next "name a department head" act seats them. As governor, a pick for a cabinet post seats the person at once, from the office panel or the desk. Nobody is asked, and nobody can say no. Seen: Office, then Jobs you fill, and for a governor the desk's open post.

**Cause.** Design: brief J (asking someone to serve, Nov 14). The owner's card of Nov 14 05:17Z ("Yes, but ask again later") says a person asked to serve can say no, with a reason and a date, and may be asked again. src/bench/office.ts `nameHeadPick` and `ordersDecide` named the pick directly. The serve-asks engine (src/core2/modules/serve-asks.ts) read only a ticket.

**Fix.**

- A `post` seat in src/core2/data/serve/willingness.json, read by the same sum as the ticket. Its terms are base, ambition, known or stranger, pay against their hourly pay now, the job they would leave, apart on their strongest question, and heard. The ticket's race terms do not apply.
- `askToServe` takes a post. The office panel and the governor's desk ask instead of naming.
- A yes seats the person through the engine that seats a post today: the "name a department head" act for a town post, `appointGovernor` for a state post. The council's or the chamber's confirmation is unchanged.
- A no is kept with its reason and date, as for the ticket.

**Time box.** 6 hours for one opus session.

**Rules.** No dice: the answer is the person's record. Nothing is named for the player without their press. Only dialogue in the scene. No new stopgaps.

**Done when.** A second session, in a drawn place with a seed it did not choose, plays the following in the running game. As mayor, a department head's post falls open. The player asks someone the office panel offers. A no keeps the post open with the reason said in the scene. A yes names them at the next "name a department head" act, confirmed by the council where the form asks. The same holds for a governor's cabinet post, from the panel or the desk.

**Waits on.** Nothing.

**Files.** src/core2/modules/serve-asks.ts, src/core2/data/serve/willingness.json, src/bench/office.ts, src/bench/handler.ts, src/bench/play.mjs, src/director/purpose-scene.ts, data/english/parts/scene-talk.json
