# Routing list

The same material as `01-decisions-governing-current-work.md`, sorted by who
owns it. Each line is one concrete thing, the quote it rests on, and what it
changes. Items marked **NOW** contradict something a lane is doing or about to
do; the rest are work nobody has started.

Citations are `transcript [index]` into files 02 to 05, `AUD-xxx` into the
63-page audit, or a project-chat timestamp.

---

## Art, client and release delivery

**NOW · The cast is disposable; the system is not.** overnight [114]: *"it
doesnt need to necessarily keep these people... im not attached to these
people... It doesn't need to make these people work it needs to make modular
generation work so if that requires new people that's completely fine."*
Repairing these twelve heads is optional by his own statement. Making the
fitting general is not. Also overnight [106]: *"I'd rather it focus less on the
four current heads and more about making the current system fully work."*

**NOW · The head percentages were retracted.** overnight [107]: *"They should
not become universal 'shrink this head by 15%' rules."* Any plan scaling a head
by 13/15/8/3.5% is built on a withdrawn measurement.

**NOW · Skin recolour is blocked below the material layer.** overnight [107]:
*"The current artwork is a painted PNG inside an SVG wrapper. In a fresh
browser test, changing the declared color changed zero pixels."* Adding the
twelve missing material declarations will not unblock it; that theory was
withdrawn in the same message.

**NOW · The wardrobe count is twelve outfits, not thirty-six.** Project chat
2026-09-22 04:11: six per gender (three formal, three regular), modular across
that gender's three bodies — thirty-six fitted combinations from twelve drawn
garment sets. AUD ART-002's 36 is the combination count. The "nine things to
test" wording is withdrawn by him.

**Never started · Derived expressions.** overnight [6]: *"I don't see why the
game can't figure out, like, okay, these are the corners of the mouth, here's
what smiling looks like."* Neutral by default, expression when the scene calls
for it.

**Never started · All races at once, skin as its own axis.** overnight [9]:
*"let's create all races at once... In terms of skin color, it just has to be
pickable. You can have... six or seven shades, from lightest to darkest."*
overnight [17]: *"the hairstyle follows the face. That shouldn't happen. These
should all be individual."*

**Desktop hub defects he reported himself.** overnight [81]: branch names that
mean nothing to him, branch selection silently reverting to main, no reset
button, a refresh button he suspects does nothing, and "latest ready" naming a
build he does not think is current.

---

## Art bench and regional scenes

**NOW · Approved art with no consumer.** Five approved regional scenes;
`WorldOrientationPanel.tsx`, named by all twenty-three requests, paints no
plate. AUD DESK-001: *"A file bundled in a snapshot is not proof it appeared."*

**Revision numbers are useless to him.** overnight [81]: *"It just shows up as
revision 12, 13, 14, etc. for me... this means nothing to me... it's really
messy. It's not very human-centric UI, really. And then I don't think any of the
buttons work."*

**Pre-load the bench.** overnight [95]: *"I would love if the art bench is
prepped with like fifty to a hundred different things."*

**Generation needs real references.** overnight [81]: *"it should look for
images of the stuff it's trying to replace it with or fix, so that way it has a
reference... It needs real stuff."*

**Plausible, not recognisable, and tagged for reuse.** merge263 [34]: one
Midwestern park serving 80% of the country, twenty more for Texas, Kansas,
California and New Mexico. *"I just want stuff to be not recognizable, but
plausible."*

**The workflow he described end to end.** overnight [73]: generate → he marks
what is wrong → labelled revision → an agent revises, upscales, rescales to 16:9
and 4K → final review batch → he approves → it goes in the game, tagged.

---

## Nationwide government (#283)

**NOW · A realistic national range, not a refusal and not an average.** Project
chat 2026-09-22 03:57 and 04:13. Three states — sourced, generated from a
realistic national range, genuinely unknown — and only the middle one is
missing. AUD JUR-003 permits it. Full chain in `01`, section A4.

**NOW · No source references on screen.** Project chat 2026-09-22 00:36:
*"there should be NO references to sources in the game. just display the info.
this is player facing."* A generated rule is not labelled as generated.

**NOW · The corresponding legislation mirrors the same range.** Same message:
*"just make the corrosponding legislation mirrior that."* A rule and the bills
written under it must not describe different governments.

**The all-fifty-states bottleneck is the third layer, not the first.**
AUD JUR-002 and overnight [66]: fifty governor identities, nine compiled
legislative packs, five executive-authority packs plus federal. His complaint
in overnight [20] — *"I don't have anything I can do as an executive. This is
what I mean. This state stuff should have been being put in this entire time.
Like all 50 states. That keeps being bottlenecked"* — is about executive packs.

**Nebraska is unicameral; D.C. is not a state.** AUD JUR-007: *"Do not
manufacture a second chamber to fit a shared UI... a generic state governor
route is inappropriate."*

**Never started · The Congress / total-government view.** overnight [20], quoted
in full in `01` section F. He wants to see coalitions — the Squad, the Tea
Party, Libertarians, Bernie caucusing with Democrats — and a screen that goes
state / federal / local then legislative / judicial / executive.

---

## Modular legislation (#282)

**NOW · Nothing consumes the bundles.** PR #282's own disclosure. AUD LAW-001:
*"These are types of proposals the compiler can form, not 43 enacted
statutes."* Against his *"I want legislation to start being implemented too."*
The next unit of work is a consumer, not a forty-fourth variant.

**AUD LAW-007 names the order:** trace one measure through introduction,
amendment, chamber action, executive action, effective date, authority
reference, appropriation, administration, service or payment, and knowledge.
*"Your feedback should identify which families need deeper effect models first,
not demand another copy of the same funding slider."*

**Two wording tensions to version rather than silently rewrite.** AUD LAW-007:
the older transit text says "There is appropriated" while its instrument is a
program authorisation; and several bank limitation sentences claim a global
absence of records that newer systems do carry.

---

## People and life (#280)

**Personality is 1A.** overnight [81]: *"Relationships, personality, private
goals, and long life memory. Actually, this is number one. It's 1A and 1B. This
is 1A."* The same system the playtest lane was told on 2026-09-22 02:05 to
examine because *"i fiigure that system is very shallow."*

**The trait system, not the five.** Project chat 2026-09-22 03:01: *"i want the
trait system itself. not those 5 hardwired. built the connectors for later
traits and effects etc. that goes with all systems."* And 03:02: *"i want this
game to be like rimworld and the sims - super modder friendly."*

**Traits start at one or two, and will move.** Project chat 2026-09-22 04:11:
*"start people with one or two traits and then... It will be adjusted."* Build
nothing that assumes a fixed count.

**Resistance, in his words.** Project chat 2026-09-22 03:36: *"every character
should be able to change with varying levels of resistance. and obviously you as
a character need your own. it's how you are portayed to people."*

**NOW · Contact is hardcoded unavailable.** `const contactAvailable = false;` at
`src/presentation/person-contact.ts:81` on `origin/main` `273fd2b8`. Named in
overnight [86] and still there.

**The catalogue's concrete finding.** Leisure preference conflates what the
activity is with who is present, and should stop standing in for personality.

**Never started · The succession choice.** overnight [87]: *"Do you be your vice
president? Do you be the upcoming person? Or do you be a child? That's a cool
decision to make when you die."* Birth, adoption and control transfer exist
(AUD PEOPLE-008); the choice does not.

**Permanent death.** overnight [85]: *"If you make a save before, but once the
character's dead, it's dead. I'm thinking of Crusader Kings."*

---

## Playtesting (#284)

**NOW · The time-jump constants are still there.** `QUIET_ADULT_STEPS =
[31, 47, 78, 124]` at `src/presentation/life-story.ts:803` on `origin/main`
`273fd2b8`. This produced his *"Oh, it's April 11th, 2028. Whoa! What the hell
happened? How did we go to April?"* in overnight [20].

**His own three tests** are already filed in ALIVE44 under "DIRECTOR PLAYTEST
REQUESTS" (project chat 2026-09-22 00:57), the first being whether the game
rewards work or clicking.

**Location-agnostic.** Project chat 2026-09-21 23:01: *"be sure for tests it is
location agnostic. for whatever reason it always defaults to lex ky which is
where i live. it should test everywhere it can."*

**The full-traversal audit he asked for.** overnight [85]: *"follow every menu
in the game, click every option, etc. Basically follow everything to its end,
and then look at all the systems that are currently in the game and how they
interact in real life."*

**Presentation debt he has reported more than once and that survived the last
playtest** — listed in `01` section F: the shading behind the title, the
"uncommitted" label, "V.2.0", the black box in the creator, the back button
wired to custom start, the top-bar element, Taxes and public receipts as a
player-facing form, and Transit service as its own menu entry.

---

## Hardcoded-content audit (#279)

**The scope is not bill designations.** merge263 [5]: *"HB 214 is an example,
not the scope. Ordinary production play is not allowed to depend on a fixed
bill, candidate, officeholder, school/person/place, dialogue exchange, campaign
result, public event, biography fact, or legal outcome embedded in production
UI/control-flow code."*

**Do not overstate the census.** merge263 [142]: *"'Zero detected by this
restricted scan' is not 'the game is dehardcoded.'"*

**Do not delete authored content to satisfy it.** merge263 [3]: *"Authored
dialogue, narrative alternatives, bill templates, issue families, scenario
material and verified/disclosed-simulation rules remain valid."*

**Do not solve it with a runtime model.** merge263 [3]: *"Do not solve this with
a runtime LLM. Production dialogue must select/bind reusable content from actual
relationship, event, knowledge, identity and history state."*

---

## Fix main

**Merge-first has one stated limit.** AUD OPS-002 and QA-004: save corruption,
private-data exposure, loss of source or history, unusable startup and unsafe
updater behaviour block; copy, aesthetics, an optional screen and a stale
locator do not. *"A failing required check remains failing; do not erase tests
or label an unrun check passed."*

**His posture.** merge263 [2]: *"small bugs and fixes should not keep us from
merging. The goal is to merge, merge, merge."*

---

## The coordinator

**Priorities are already ranked.** overnight [81], read out as a table in `01`
section C. 1A is relationships, personality, private goals and long-life
memory; 1B is a genuinely seated world; UI and prose sit above the list;
governing and legislative at eight or nine out of ten; ordinary life low; party
evolution and multi-generation play core and must-ship.

**Where questions go.** Project chat 2026-09-22 04:11 and 04:13, set out in `01`
section B. Design-judgement questions become ChatGPT research briefs. Questions
whose answer is already in his messages are ours to find.

**Briefs must be explicit.** overnight [81], the PB&J rule, and merge263 [36]:
*"Don't give it anything to assume. You do the research. You give it all the
inputs."* A brief that says "don't invent" is a brief that failed to supply
something.

**Model and effort are chosen with a reason.** overnight [22].

**No autonomous monitoring.** merge263 [59].

**Say what goes into the game, not that it went in.** merge263 [65]: what the
player can interact with, what happens in the background, and what other systems
it affects.

**Do not make him review everything.** overnight [81]: *"I'd rather a few things
mechanically work and then get merged."*

---

## Still to read

*Continuous Coordinator — Complete Audit Knowledge.md* (368 KB, Drive
`19lJ5ONFpvaK2vbSy5FoZ8SestUW_75I1`) and *Audit and Skills Package.zip* (990 KB,
Drive `1X2XNIRptns55BhuaXf2g0T6MRBHYy9k0`). They hold the audit's coverage CSVs,
all forty-three law variants, all sixty judicial entries and the fifty-one
jurisdiction rows in tabular form. Also
`61B_CLAUDE_ORIGINAL_VISION_AND_DYNAMIC_CAUSAL_ARCHITECTURE_AUDIT` (Drive
`1982313Yo3NKERYCBQsyszNfafSxi62UiIMWLoIWaH7A`), which is what "61" names in the
transcripts.

**Warning on 61B.** It is dated 2026-09-04 and audited at main `b986fbe`,
PR #60 — three weeks stale. It states flatly that no party model exists,
which was true then and is false at `273fd2b8`. Read for its framing, never
for its findings, and measure at the current head before planning anything
from it. Read in full 2026-09-22; what survives is in
`07-tasks-making-the-game-alive.md`, appendix.
