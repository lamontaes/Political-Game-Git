# Decisions that govern current work

Read this first. It is the part that gets read under pressure. Everything here
is lamontae's own words, dated, with the later statement marked wherever two
conflict. The full verbatim record is in files 02 through 05; a quote here
names the transcript and message index so it can be found in context.

Sources: four ChatGPT exports (Merge 263, 2026-09-15; OCD Overnight,
2026-09-15 to 09-17; Review modular generation, 2026-09-17 to 09-21; Become My
CTO, 2026-09-21), the 63-page *Full-Game Audit — Review Edition 1*, the
personality catalogue, the original product vision invariants, and the project
chat through 2026-09-22 04:14 UTC.

---

## A. Things a lane is contradicting tonight

### A1 · The cast of modular people is disposable. The system is not.

**overnight [114], 2026-09-17, and it is the last thing he says in that export:**

> "the collars are messed up. lots of artifacts. etc. it doesnt need to
> necessarily keep these people. it can generate new people instead of trying
> to work around what is created. im not attached to these people. all it needs
> is the body types which by the way why can't they rigging choose like a body
> type skeleton or all of them? I don't know how it works but yes, I'm not
> attached to these people. It has the body types. It doesn't need to make
> these people work it needs to make modular generation work so if that
> requires new people that's completely fine. I don't care. It just has to be
> something that can be recreated and that works in the game."

And **overnight [106]**, rejecting a four-head pilot:

> "I'd rather it focus less on the four current heads and more about making the
> current system fully work. I don't want just four heads. I want four heads
> with the expansion ready for more, because the engine will automatically
> resize them or something. Why can't the system automatically measure head
> height and width or something?"

**Why it matters now.** Work that repairs this cast's heads, necks and collars
is optional by his own statement. Work that makes generation reproducible is
not. A lane choosing between "fix these twelve heads" and "make the fitting
general" has his answer, and it is the second.

### A2 · The head-percentage measurements were retracted. Do not build on them.

ChatGPT, **overnight [103]**, measured the heads:

> "masculine heavy is about 13% too tall, feminine heavy about 15%, feminine
> lean about 8%, and masculine lean about 3.5%"

ChatGPT, **overnight [107]**, retracting it:

> "That also corrects my earlier percentages: they measured the extent of the
> painted image, including any neck section — not verified skull dimensions.
> They should not become universal 'shrink this head by 15%' rules."

And the real blocker underneath, same message:

> "The current artwork is a painted PNG inside an SVG wrapper. In a fresh
> browser test, changing the declared color changed zero pixels in the body,
> head, hair and collar tested. ... My earlier explanation that the missing
> twelve material declarations explained the skin problem was incomplete. The
> painted-image recoloring path itself needs work."

**Why it matters now.** Any plan to scale a head by a fixed percentage, or to
unblock skin tone by adding material declarations, is acting on a number and a
theory that were both withdrawn in the same conversation.

### A3 · The wardrobe count, settled twice and superseded once

**modgen [148], 2026-09-20** — the original, and the source of the "nine":

> "I want it to make 3 formal outfits and 3 regular outfits total for each body
> type. that way, when im in game, I will have 9 things to test on each body
> type. multi[ple pairs of shoes, pants, hairstyles, facial hair, etc. let's
> get real modular people moving"

**Project chat, 2026-09-22 04:11 UTC — LATER, and it supersedes the above:**

> "Nine things to test meant two, six, sorry. Three outfits. Sorry, one outfit
> per body type. So I don't know what I meant by that. ... oh, I remember. I
> wanted three formal outfits and then three regular outfits on each male and
> female body type and then have the outfits be modular for the same gender."

**The answer is the final sentence.** The authoring unit is per gender, not per
body: six outfits masculine (three formal, three regular) and six feminine,
each fitting all three bodies of its gender. **Twelve authored outfits,
thirty-six fitted combinations.** Audit ART-002's count of 36 survives; what it
corrects is what must be drawn — twelve garment sets, not thirty-six. Do not
quote the "nine" back at him; he withdrew it himself.

### A4 · An unresearched jurisdiction gets a realistic range

**This thread, 2026-09-22 03:47 UTC:**

> "what should happen for non researched areas it should be an average."

**Project chat, 2026-09-22 03:57 UTC — LATER, and it supersedes the above:**

> "not the middle or an average. sorry. a realistic range. it just needs to
> resemble real life. just make the corrosponding legislation mirrior that."

**Project chat, 2026-09-22 04:13 UTC**, answering whether the range is national
or regional: **national.**

The principle is older than all three. **overnight [2], 2026-09-15** — the
fullest statement, and it covers everything rather than only economics:

> "it's not just the economic data that doesn't need to be specific, but pretty
> much everything. Like there could be no housing shortage. I mean, that's a
> pretty drastic one, but it's just like a seed on RimWorld, for example. You
> could end up on a place that has awesome megafauna, low predators, fertile
> soil, and rich ore deposits, or you could end up on a place with mountainous
> caves and there's no grow season. It just depends. But all this stuff should
> be at least pretty recognizable to today."

**merge263 [71], 2026-09-15:**

> "all this data is good, but you don't exactly need to match months up with
> stuff. These are all data points. You can do a range between, you know, 4.2
> to 4.3, or you can allow it to go lower if the GDP is between this range and
> this range, based on the data. Like, that's okay. The data is more for you to
> calibrate, not to get exactly right."

**cto, 2026-09-21:**

> "the rules jurisdictionally do not need to be perfect. They just need to be
> realistic and resemble modern day... it's a data point, just like with
> economic data... the laws and conditions will randomly generate within a
> bounded area within today"

**So a rule is in one of three states, never two:**

1. **Sourced** — a retrieved, hashed authority. Cited as law.
2. **Generated** — drawn from a realistic national range for that office class,
   bounded by what the researched jurisdictions actually span. Versioned and
   recorded as a game profile rather than as law. The legislation generated for
   that jurisdiction is drawn from the same range. **Playable.**
3. **Unknown** — no source and no profile applies. Refuses.

The middle state does not exist today for office qualifications, which is why
absence collapses into refusal. The audit permits it at **JUR-003**: *"Other
consumers may admit separately approved fictional/game-profile behavior. They
must be audited as those routes, not silently counted as sourced law."*

**Two boundaries.** First, the range governs *rules*; for observed *data* his
older rule stands — merge263 [70]: *"Missing observations remain missing. They
do not become zero, an invented estimate or a graph line that conceals the
gap."* Second, none of it is visible in play. **Project chat, 2026-09-22 00:36
UTC:**

> "there should be NO references to sources in the game. just display the info.
> this is player facing."

Confirmed again at 04:13 UTC: quiet in play. A generated rule is not labelled
on screen as generated, any more than a sourced one is labelled as sourced.

### A5 · Permanent removal covers what ships, and only what ships

**2026-09-21, PROJECT START and ART-SOURCE1:**

> "I want those unused assets DELETED!!!!!!!! PERMANENTLY. IN DRIVE. INGITHUB.
> OUT OF EXISTANCE. NBO MORE. ZERO RECORD. GET RID OF THEM. things like the old
> releasplan.ts should be DELETED im TIRED of superseding. THIS IS A STANDING
> RULE. SUPERSEEDING IS SACRELIGIOUS. DELETE."

**merge263 [51]:**

> "the preview is still showing the old meeting room thing. which should be
> DELETED. PERMANENETLY. im sick of seeing it."

**Project chat, 2026-09-22 04:13 UTC — the scope, asked and answered:** asked
whether the rule reaches dated reports as well as shipped material, he said
**"Only what ships."**

So: shipped assets, obsolete code, packed copies and stale instructions are
deleted permanently and without asking. Dated records — reports, evidence,
this document — stay. And nothing another party holds a live pointer into is
deleted: he restored a Drive document and its replies from the trash himself on
the night of 2026-09-21 rather than asking for them to be recreated.

---

## B. Where questions go now

**Project chat, 2026-09-22 04:11 UTC:**

> "add ChatGPT, have it ask me or uh, come to me with questions or a report
> about uh, the amount of traits people should have. Questions like that should
> be given to ChatGPT to come back with me, come back to with me. So it should
> just ask me those questions."

And at 04:13 UTC, of two questions this thread had put to him directly: *"This
should be given to chat GPT... you should have gotten that from the main
chat."*

**Three kinds of question, three destinations.**

- A **fact about our code** — which branch, what a test asserts, whether a
  consumer exists. A lane reads it. Never a question.
- A **fact already in his messages** — answered somewhere in the project chat
  or these transcripts. Ours to find. He does not repeat himself.
- A **decision only he can make** — merge, approve art, spend money, delete.
  Straight to him, one line, recommendation marked.
- A **judgement about how the world should feel** — how many traits, how common
  a disposition, how a system is balanced. Written as a research brief for
  **ChatGPT**, which comes back to him. Not to him from us.

The trait count is the worked example. He gave a starting answer — *"start
people with one or two traits and then... It will be adjusted"* — and said in
the same breath that it will move, which is exactly the case for filing it
rather than treating it as closed.

---

## C. The priority ranking, in his words

**overnight [81], 2026-09-17.** He ranked the roadmap himself, item by item,
and nothing since has replaced it. This is the routing table.

> "So yes, finish everything in the current delivery picture, and finish
> everything already owed from the playtest. That should be completely cleared
> out. So should the pork barrel. That should be completely cleared out now.
> Yes, Party Life. We can go about a five out of ten into that right now. The
> governing and legislative, I would like to go to, like, an eight or nine out
> of ten, in terms of, like, how much of that I feel like should be
> implemented. ... A genuinely seated world. Yes, this is, like... obviously the
> UI and shit's number one in pros, but this is, out of this list, this is
> number one, I think. Economy that changes. Yes, yes, and world events, etc.
> You should change it to a world that changes for D. And yes, recording
> reporters, interviews, leaks, etc. That's good. Ordinary life, that's still
> pretty low for me. I'm not really worried about that right now.
> Relationships, personality, private goals, and long life memory. Actually,
> this is number one. It's 1A and 1B. This is 1A. Financial scandals. This to
> me goes with the reporters and shit too. Health, death, succession,
> disasters, and crisis. This is pretty high up there. Just realism, really.
> The map content and stuff, that's very high for me. Party evolution should be
> included too. That seems like something that should be included in the seated
> generation, and multi-generation play. That's a core part of something that
> needs to be shipped."

Read out as an ordering:

| Rank | Area | His words |
| --- | --- | --- |
| **1A** | Relationships, personality, private goals, long-life memory | "Actually, this is number one. It's 1A and 1B. This is 1A." |
| **1B** | A genuinely seated world | "out of this list, this is number one, I think" |
| **Above the list** | UI and prose | "the UI and shit's number one in pros" |
| **8–9 / 10** | Governing and legislative | "I would like to go to, like, an eight or nine out of ten" |
| **High** | Map content; health, death, succession, disasters, crisis | "very high for me"; "pretty high up there. Just realism, really" |
| **Core, must ship** | Party evolution, multi-generation play | "a core part of something that needs to be shipped" |
| **5 / 10** | Party life | "about a five out of ten into that right now" |
| **Low** | Ordinary life | "that's still pretty low for me. I'm not really worried about that right now" |
| **Clear first** | Delivery picture, playtest debt, pork barrel | "should be completely cleared out now" |

Personality is 1A. That is the same system the playtest lane was told to
examine on 2026-09-22 02:05 — *"look at people's personalities - how many are
there? do they actually affect the game? do they act? does dialogue change? how
does it work with negotiation etc? i fiigure that system is very shallow"* —
and the same one the trait framework serves. It is not a side quest.

---

## D. How he wants agents run

**Standing code authority.** overnight [15]:

> "remember as tech director you have any and all authority to change any code
> at any time without explicit prior permission as long as you let me know
> afterwards"

merge263 [71]: *"As the technical director, you have complete authority. The
fact that you have direct access to me versus agents puts you at a distinct
advantage. So change whatever, at any time, as long as you let me know."*

**Explicitness — the PB&J rule.** overnight [81], the most-quoted directive he
has given:

> "you're talking to your engineers, so you cannot leave any room for them to
> try to figure shit out. You need to be explicit with them... It's like one
> time in math that he told us to make a... tell him how to make a PB&J. And we
> said, okay, open it, put it in the thing, and then, but you have to be very
> specific. You have to say, put your open right hand on top of the jelly, grip
> it, but just the top, apply pressure, and then turn it toward the right until
> you feel a pop. Remove the lid, turn it upside down. Like we would have to
> tell them like that. That's how you need to talk with them, including
> sources, etc."

merge263 [36], the same rule stated as a correction:

> "telling it not to assume stuff. Don't give it anything to assume. You do the
> research. You give it all the inputs. Remember, these are only engineers.
> They are only as smart as the information given to them."

**A brief that says "don't invent" is a brief that failed to supply something.**

**Model and effort must be chosen and justified.** overnight [22]:

> "you have to tell me which model and effort to use. Like, you can't just tell
> me to pick one. That's not acceptable at all. ... you have to have a reason
> for doing it as well. Like, look at anecdotal evidence and what the
> manufacturers... say, and then independent testing. Different models are good
> for different things versus their token consumption. And high effort is not
> always needed."

**Merge posture.** merge263 [2]: *"small bugs and fixes should not keep us from
merging. The goal is to merge, merge, merge."* merge263 [57]: *"if a couple of
them have anything useful, write it in the docs or whatever, or we can pork
barrel it later."* And the limit, audit OPS-002: *"A failing required check
remains failing; do not erase tests or label an unrun check passed."*

**Do not hold work back to test it.** overnight [63]:

> "I do not want you to hold stuff back so we can test stuff. I want you to get
> the information, run it by me, and then get it in the game. Remember, it's
> important that you run it by me, so I want to know what you want to put into
> the game, so that way I can make sure that there's a balance of game versus
> depth."

**Do not make him test everything.** overnight [81]:

> "I don't have to review and test everything. Honestly, I'd rather a few things
> mechanically work and then get merged, and then I can test the main build on
> the desktop thing once the live update gets fixed."

**No autonomous monitoring.** merge263 [59]:

> "Remove that. I don't know why the hell you did that. You clear that stuff out
> now... Yeah, remove that monitoring. I don't know why the hell you did that."

**Stop asking obvious questions.** merge263 [61]:

> "Don't ask these obvious-ass questions. Like, you ask so many stupid
> questions. Just make it realistic, obviously. Don't ask me questions like,
> Should the game make up realistic things before the game starts? Yeah, no
> shit."

**Report what goes into the game, not just that it went in.** merge263 [65]:

> "when systems are being put into the game, say like economy, right? Tell me
> exactly what's going into the game, right? So I'm trying to prevent something
> like the education thing from earlier. So I want to know what systems are
> going into the game, what the player will be able to interact with versus
> what happens in the background, what other systems this will affect."

---

## E. The simulation, in his words

**Nothing hardcoded.** merge263 [2]:

> "I want every law, piece of dialogue, anything that's hardcoded in to be taken
> out. Like, give me this to a point where I can actually start testing some of
> the gameplay systems, and stuff being hardcoded in is messing that behavior
> up."

Project chat 2026-09-21 23:02: *"PLEASE find anything else hardcoded in like
names, bills, etc. stuff that shouldnt be hardcoded in when the point of the
game is modularity."*

And the honest limit, ChatGPT merge263 [142]: *"'Zero detected by this
restricted scan' is not 'the game is dehardcoded.'"*

**Modder-friendly is the shape of the whole thing.** Project chat 2026-09-22
03:02: *"i have mentioned that i want this game to be like rimworld and the
sims - super modder friendly."* And 03:01: *"i want the trait system itself.
not those 5 hardwired. built the connectors for later traits and effects etc.
that goes with all systems."*

**No developer-facing language in play.** merge263 [2]:

> "all that developer view shit. I don't like that. Like, your character does
> not know this, or whatever, or no, no acting this blood because your character
> does not know this, or anything like that. I don't want that."

With the rule that must not be broken in response, ChatGPT merge263 [3]: *"DO
NOT remove the underlying knowledge, authority, privacy or evidence logic. That
logic remains authoritative and should normally operate silently."*

**The world happens around you.** overnight [87]:

> "the world needs to happen around you. So other people lie, or other people
> run for elections, or other people literally anything: go to college, get
> married. ... Remember your character is just one, in one of, I mean, you know,
> technically billions... it's important that this is a shared simulation.
> You're a cog."

**Dark is allowed; arbitrary is not.** merge263 [63]:

> "as dark as possible. ... There could be assassinations. The president could
> get a terminal diagnosis and die in two months, and then a world war start
> right after, if the conditions are right, you know?"

overnight [89]:

> "you should not be able to tell me what event could happen based on my world
> if you run a thousand simulations."

**Not everything cascades.** overnight [87]: *"Not everything has to affect
everything. There can be a budget cut that doesn't affect transit or housing or
something, or something can just be straight up ineffective."*

**One cause, many consequences, never duplicated.** overnight [89]: *"I want to
make sure that it's not duplicating, but its effects are having realistic
butterfly effects."*

**Lying is player agency.** merge263 [63]:

> "I do like the idea of lying. ... maybe there should be, like, two separate
> chat things, right? So you have the normal four choices, but then you can
> click lie, or you can click from memory, or something like that. ... But
> broadly, yes, you should be able to lie."

With ChatGPT's constraint, merge263 [64]: *"there is no magical lie detector"*
and *"lying should not be implemented by slapping lie=true onto the current NPC
Claim."*

**Generate on demand, not all at once.** merge263 [63]:

> "The game doesn't have to generate everybody all at once. It just needs to
> generate people as either it's relevant somehow in the story... there could be
> a hundred people somewhere, and maybe the only thing that could be generated
> is their looks, but as soon as you click them, boom, there's their entire
> history, and then that's generated."

**Time must not pass while deliberating.** overnight [89]:

> "If you're in the middle of just, like, looking through a bill... or you're in
> a menu, and then you leave your computer for an hour, like, that shouldn't
> affect it. But if you mean, like, if you travel to an event and then do an
> interview, yes, everything should change."

**Generational play, Crusader Kings model.** overnight [85]: *"If you make a
save before, but once the character's dead, it's dead. I'm thinking of Crusader
Kings."* overnight [87], the full model, on the succession choice: *"Do you be
your vice president? Do you be the upcoming person? Or do you be a child?
That's a cool decision to make when you die. It keeps you invested in an
ever-changing world."*

**Campaigns must not be a math problem.** overnight [87]:

> "It is very one-dimensional. ... if you are really good at speeches, like that
> can really guide you, or, you know, maybe your America ends up being like the
> early 20th century, and you need a Pendergast-type figure. ... it shouldn't be
> a math problem. ... this kind of conceptualization is the kind of specificity
> that needs to be in these packets so that we make sure that it's not a math
> problem. Or if it is, it's one that makes sense in the world."

**Money needs a reason.** overnight [89]: *"corruption should not be the reason
wealth exists. Corruption should exist because there is a value to that wealth.
That is not click button, win election."*

---

## F. Presentation, in his words

**He is sick of the look.** overnight [20], mid-playtest:

> "The X, this is still off-center, and I don't like this. This stuff needs to
> start having, like, visual assets. I'm tired of the HTML, CSS look of this
> game. I'm absolutely sick of it."

**The news must look like news.** overnight [20]:

> "The Civic Ledger. No, this doesn't. See, this also needs to be stylized. I
> said I want it to, like, literally visually look like a newspaper or a
> magazine or something like that. ... And then it needs to have, you know,
> scripts. So, like I said, there needs to be a bunch of different titles, kind
> of like Apple News."

**The journal must read as a chronicle, not a log.** overnight [20]:

> "this is my journal. This doesn't really make sense. It needs to be more in a
> narrative way. ... It's literally just a word-for-word account of what I did
> in 2026. It should say, oh, you know, you ran for governor, you ended up
> raising this much. You know, maybe this could affect your legacy or something
> like that. ... Like a chronicle sorts of sorts."

**He wants to see the shape of Congress.** overnight [20]:

> "I should have a big thing of Congress and my state legislature. I want to
> see, you know, different coalitions of Congress. It doesn't have to be insider
> stuff, but what you can tell, you know? Like, I know the Squad. ... You know
> the Tea Party members. You know the Libertarian people. And, you know,
> Independents, like Bernie Sanders, who caucuses with liberal Democrats. I
> should be able to, you know, glean that much, because I can't see anything
> about Congress or anything. So see, I feel like it should go politics and then
> some kind of, like, view total government screen. ... And then it should say
> something like, you know, state, federal, local, and then you should be able to
> choose legislative, judicial, executive."

**Creator ordering.** overnight [17]: *"It should have you—it should do gender
first: gender, name, birthday, age. That's how it should go. And there should be
some thing somewhere that tells you that you're starting on January—what is it?
1st or 5th, 2026? ... And so you should put in your birth month, day, and year,
and then it should say you will start the game at this years old."*

**Hair, skin and face are independent.** overnight [17]: *"the hairstyle follows
the face. That shouldn't happen. These should all be individual."* and *"the
skin tone needs to be a separate thing."*

**Ken Burns, turned up.** overnight [20]: *"I like the still pan and zoom. Like
I said, it's the Ken Burns style. It can honestly be turned up a little bit,
like 15-20%."* And on the crossfade: *"it's like a big jump, and I believe
that's from the perspective of the picture."*

**Occupants stay seated while you browse.** overnight [20]: *"I think occupants
should remain visible in natural seated positions while you browse menus and
stuff. Full body figures can appear when needed."*

**Inline civics helper and an in-game encyclopedia.** overnight [95]:

> "I'd like for the inline thing to now be made. ... go ahead and start the kind
> of encyclopedia-ish. Not quite. I don't want it to lead to, like, actual
> sources, but, like, I want it to be explained in the game, just using, like,
> public source things. ... I want it to read as a part of the game. ... And I
> think the goal is to Shift-click to mark something as learned."

**Things he has asked to be removed more than once and that were still there at
the last playtest** — overnight [17] and [20]: the shading behind the title, the
"uncommitted" build label at the top, the "V.2.0" label, the black box behind
the creator, the back button wired to custom start, the top-bar element
(*"Remember, this up here needs to be completely removed. There's no reason this
should be here."*), Taxes and public receipts as a player-facing form
(*"I shouldn't be entering this kind of information"*), and Transit service as
its own menu entry.

---

## G. Art workflow, in his words

**Art Desk is the tool he built because none existed.** overnight [32]:

> "Yeah, so basically I want to get this asset generation. I spent the entire
> time looking for a tool to do it. Fuck it, I want to do it myself. Like, and
> so I'm making the tool myself. So let's go ahead and get this finished."

**The workflow he wants, end to end.** overnight [73]:

> "my perfect workflow is this. So we generated these. ... You say you like one
> of those, but there's this wrong, this wrong, this wrong. ... Okay, so you save
> that, or label it somehow, tell Claude we want this one from this perspective.
> And then I would hope that Claude would be able to, or maybe I could put in
> the art bench the requested revision, and then once Claude, once we run that
> session again, or maybe Claude has a timer, right? Once an hour, just to check.
> And during when it runs it, it makes those revisions and then upsizes and then
> rescales them to 16 by 9 and then 4K, and then those go into the final review
> batch for me to approve. Once they're approved, then they get put in the game,
> tagged, etc."

**Revision numbers mean nothing to him.** overnight [81]:

> "It just shows up as revision 12, 13, 14, etc. for me. Like, here, I'll send
> you a screenshot. So, like, this means nothing to me. ... The custom, the
> filters and stuff, it's really messy. It's not very human-centric UI, really.
> And then I don't think any of the buttons work."

**Pre-load the bench.** overnight [95]: *"I would love if the art bench is
prepped with like fifty to a hundred different things, right? So it can fix the
modular generation first and then just start generating scenes and modular
pieces and UI stuff and screens."*

**Generation needs real references.** overnight [81]: *"when it does this stuff,
it should look for images of the stuff it's trying to replace it with or fix, so
that way it has a reference. ... It needs real stuff."*

**Plausible, not recognisable.** merge263 [34]:

> "there could be 100 images generated of a Midwestern park, but 50 of those can
> be used through, like, 80% of the country, and then another 20 can be used in
> Texas, Kansas, California, and New Mexico... that's why the tagging system
> needs to be implemented. I just want stuff to be not recognizable, but
> plausible for people, because obviously people see the stuff, you're gonna pick
> where you live. So I want it to be at least somewhat faithful in that way."

**All races, at once, with skin as its own axis.** overnight [9]:

> "let's create all races at once. ... In terms of hair, get all races. In terms
> of skin color, it just has to be pickable. You can have, I don't know, the main
> shades of people, what, six or seven shades, from lightest to darkest."

**Expressions should be derived, not painted per case.** overnight [6]:

> "your expression should be neutral unless, you know, the scene calls for it,
> because I don't see why the game can't figure out, like, okay, these are the
> corners of the mouth, here's what smiling looks like, and so this is how you
> make characters smile, plus the eyes and all that."

**Presidential poses.** overnight [9]: *"I wouldn't mind if there were three or
four poses that the president could take, like one maybe like an action one where
they're pointing, one sitting at the Resolute desk, you know, one among a bunch
of people, and maybe, like just a regular portrait or something. Maybe depending
on the personality of the president or something, or maybe just random."*

**Fifty state capitals, eventually.** overnight [9]: *"It would probably be best
to do 50 state capitals, uh, scenes, but local stuff we can have, like, again,
just like the parks or whatever, localized scenes for certain parts in the
country."*

**Only he approves pixels.** Audit DESK-001: *"Only Lamontae approves exact
pixels. A changed child does not inherit its parent's approval."*

---

## H. What the audit says we have, have differently, and have never touched

The 63-page audit's own coverage ledger, AUD-010, is the honest version of this
and should be read whole. The short form, with the audit's own finding IDs:

**Implemented and confirmed at source.** Period-based education with a real term
writer (EDU-001 to EDU-004); the real-school directory; six authored work paths
(WORK-001); the contact panel and its pacing (PEOPLE-003, PEOPLE-004); twenty
legislative families in forty-three variants across eight instruments (LAW-001,
LAW-002); the six judicial office exchanges (JUD-004); the ten-field civil
personnel contract with nineteen procedure keys (CIVIL-001); the narrow
constitutional and tax editors (CONST-001, TAX-001); the macro kernel and all
eleven shock profiles (ECON-001, ECON-003); the crisis handler registry and
hazard producer (CRISIS-001); the press source desk (PRESS-001); travel dispatch
and the clock contract (PLACE-001, TIME-001).

**Implemented differently from what he described, and the difference matters.**

- *Legislation exists as text and reaches nobody.* LAW-001: *"These are types of
  proposals the compiler can form, not 43 enacted statutes."* PR #282's own
  disclosure: "No shipped surface consumes bundles yet." Against his *"I want
  legislation to start being implemented too."*
- *Jurisdiction coverage is three different layers being counted as one.*
  JUR-002. A governor identity exists for all fifty states; a compiled
  legislative pack exists for nine; an executive-authority pack for five plus
  federal. His *"all 50 states. That keeps being bottlenecked"* (overnight [20])
  is about the third layer, not the first.
- *The trait system is five compiled-in constants where he asked for a system.*
  PEOPLE-001 lists the five. Project chat 2026-09-22 03:01: *"i want the trait
  system itself. not those 5 hardwired."*
- *Leisure preference stands in for personality.* The catalogue's clearest
  finding: the three-way switch conflates what the activity is with who is
  present.
- *The journal is a log where he asked for a chronicle.* overnight [20], quoted
  in full above.
- *Approved regional art has no consumer.* Five approved scenes; the panel all
  twenty-three requests name paints no plate.

**Never touched.** These are the ones he is asking about, and nobody has
produced the list before:

- **Party evolution**, factions, coalitions and realignment. Vision invariant 13
  describes it; overnight [81] calls it core and must-ship; overnight [20] asks
  to see the Squad, the Tea Party, the Libertarians, Bernie caucusing with
  Democrats. Nothing implements it.
- **Multi-generation play beyond the writers.** Birth, adoption and control
  transfer exist (PEOPLE-008); the succession *choice* he describes in overnight
  [87] — vice president, protégé, child — does not.
- **The in-game encyclopedia and inline civics helper**, overnight [95]. Not
  started.
- **A stylised newspaper surface** for the news, overnight [20]. Not started.
- **Fifty state-capital scenes**, overnight [9]. Not started.
- **The Congress / total-government view**, overnight [20]. Not started.
- **Derived facial expressions**, overnight [6]. Not started.
- **Resistance to trait change.** The proposal exists on
  `origin/claude/people-and-life-4qpuwb` (`docs/systems/traits.md`, commits
  `aeaa88d8` and `1eed9ba8`) and is marked PROPOSED; nothing is built, and
  `recordTraitChange` has no production caller at all.
- **The cross-agent harness / single executable**, merge263 [26]. A standing
  want, never scoped.
- **The campaign as a human problem rather than a formula.** The audit's
  CAMP-001 describes the weekly plan; ChatGPT's overnight [86] finding is the
  sharp one: *"The function cannot express 'they heard you clearly, understood
  your position, and disliked it.'"*

---

## I. Named defects from the transcripts, checked against current `origin/main`

Checked at `origin/main` = `273fd2b8` on 2026-09-22. Naming the tree matters
here: several of these are true of one branch and false of another.

| Finding, and where it was named | State on `origin/main` `273fd2b8` |
| --- | --- |
| Hidden time-jump constants producing "How did we go to April?" (overnight [21]) | **STILL PRESENT.** `QUIET_ADULT_STEPS: readonly number[] = [31, 47, 78, 124]` at `src/presentation/life-story.ts:803` |
| Person contact always unavailable (overnight [86]) | **STILL PRESENT.** `const contactAvailable = false;` at `src/presentation/person-contact.ts:81`, read at line 136 |
| Agent actions recorded as the owner (overnight [39]) | **FIXED.** `src/ui/ArtDeskView.tsx:150` now reads `{ kind: "owner", id: ownerSession?.ownerId ?? "unknown" }` rather than a hardcoded `"lamontae"` |
| Art Desk hardwiring `privatePackPath: undefined` (overnight [25]) | **GONE from main** — no occurrence of `privatePackPath` in `src/` at this head. Whether the "no bytes" display he saw is fixed is a separate question about his installed build |
| 435 House and 33 Senate seats with no recorded holder (overnight [21]) | Not re-measured here. ChatGPT's distinction stands and is the important part: *"'No recorded holder' is not the same as 'vacant.'"* |
| Executive-authority packs for five states only (overnight [66]) | Registry present at `src/simulation/executive-authority-rule-packs.ts`; the pack count was not re-counted at this head |
| Filing sets the election to exactly 28 days after filing (overnight [21]) | Not re-checked |
| The RNG can return zero, so `-log(0)` is infinity in mortality (overnight [84]) | Not re-checked |
| `#266`'s magic constants — 85% House / 80% Senate incumbent return, retirement threshold 82, 75% party retention, `staffAssessment` deriving competence from a person ID hash (overnight [92]) | Not re-checked. The audit's GOV-003 says the person-ID-hash approach should be replaced with real evidence, and that the seam for it now exists |

Everything in the right-hand column marked "not re-checked" is a bounded
verification job, not a research question.

---

## J. What could not be extracted

- **The two companion files to the audit** — *Continuous Coordinator — Complete
  Audit Knowledge.md* (368 KB, Drive `19lJ5ONFpvaK2vbSy5FoZ8SestUW_75I1`) and
  *Audit and Skills Package.zip* (990 KB, Drive
  `1X2XNIRptns55BhuaXf2g0T6MRBHYy9k0`) — are located and readable but not yet
  read. They hold the audit's coverage CSVs, all forty-three law variants, all
  sixty judicial entries and the fifty-one jurisdiction rows in tabular form.
- **The "61 page audit" name.** The printed review is **63 pages**. In the
  merge-263 export "61" appears only as a document identifier —
  `61B_CLAUDE_ORIGINAL_VISION_AND_DYNAMIC_CAUSAL_ARCHITECTURE_AUDIT`, Drive
  `1982313Yo3NKERYCBQsyszNfafSxi62UiIMWLoIWaH7A` — which is a separate, unread
  document. Both exist. This record treats the 63-page PDF as the one meant.

  **Warning on 61B.** It is dated 2026-09-04 and audited at main `b986fbe`,
  PR #60 — three weeks stale. It states flatly that no party model exists,
  which was true then and is false at `273fd2b8`. Read for its framing, never
  for its findings, and measure at the current head before planning anything
  from it. Read in full 2026-09-22; what survives is in
  `07-tasks-making-the-game-alive.md`, appendix.
- **Inside the "Review modular generation" export**, 82 of 162 messages are his.
  A large share of those are pastes of agent delivery reports with his own words
  appended at the end; the verbatim file marks what could be identified and
  keeps everything.
- **In the merge-263 and overnight exports**, the pasted-agent entries are
  marked from an explicit index list. For the CTO and modular-generation exports
  no such list was produced, so nothing there is marked and the reader should
  judge from the text.
- **Nothing was truncated by the exports themselves.** All four were read end to
  end at their full byte length (418 KB, 1,006 KB, 408 KB, 678 KB).
- **Video and screen recordings** referenced in the transcripts (`jjjj.mov` and
  the playtest captures) are named but not present in the attachments.

---

## K. The verbatim record

- `02-cto.md` — "Become My CTO", 2026-09-21. 32 owner messages of 63.
- `03-modgen.md` — "Review modular generation", 2026-09-17 to 09-21. 82 of 162.
- `04-merge263.md` — "Merge 263 and clean PRs", 2026-09-15. 40 of 79.
- `05-overnight.md` — "OCD Overnight Report", 2026-09-15 to 09-17. 61 of 116.

215 messages, every one complete, in order, with his spelling and dictation
errors preserved. Nothing was summarised into those files.
