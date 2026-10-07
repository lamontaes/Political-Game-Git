# Session 57 — Story screens: title hero, family portrait, conversation framing (owner-approved mockups, Oct 7)

Read RULES.md first. Rename this task to exactly "Session 57". No hand-written player text: every word is record data, approved control names or English-engine output. Uses Session 55's pose chooser (stub its function if not merged: poseFor(person, activity)).

## Items
1. TITLE HERO VARIES: src/presentation/appearance-engine/hero-posture.ts:37 `heroRecipe` hard-sets podium for speakers and arms-folded for everyone else. Replace with the pose chooser (activity "hero" + the character's strongest traits and current mood), so heroes differ by person. Owner: "the hero pose should not always be like that".
2. TITLE PLACE IS WHERE THEY ARE: src/presentation/title-civic-rotation.ts:218 `rolePlaceCandidates` — "With no role at all, the town's city hall stands in for their home" is the hardwired hometown the owner wants removed. The title shows the saved character at their recorded current place (workplace room by Session 56's chooser, their office, or their town's street), never a fixed city hall.
3. FAMILY PORTRAIT: the opening family card (and the People family view) draws every recorded family member (kin records: parents, partner, children, siblings, grandparents as recorded) posed together around the home's furniture, each in their own pose from the chooser, with name plates from records (relationship + name). Not one parent standing alone. Depends on correct family records (Session 30 #3228); build the view now.
4. CONVERSATION FRAMING: when talking, both people are large and facing; the dialogue box sits across the bottom with the speaker's portrait top left and the Lie button beside the replies (owner ruling Sept 27). Reply choices come from the engine only.

## Endpoint
New game in 3 random places: title shows a varied hero at their real place; family card shows the whole recorded family; a conversation shows both people large with the framed dialogue box. Screenshots main vs branch; SCREEN READY, CTO checks.
