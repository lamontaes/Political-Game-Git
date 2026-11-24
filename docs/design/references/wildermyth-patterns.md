# Wildermyth: how its scenes and words work

Studied Oct 26, 2026 from the game's own data files (read-only, on the owner's Mac), because the owner holds Wildermyth up as the standard for our scenes and dialogue. This is a description of its mechanisms in our words, not its text. The rules we take from it are in `.agents/skills/scene-standard/SKILL.md`.

## A scene has four parts

- **Trigger.** Each event names the world moment that starts it: a scouting stop, arriving at a dangerous place, a won battle, a hero's personal quest opening, news between chapters. Several hundred events fire only once per game. When several qualify, the most specific one wins (a score for how rare it is that all its conditions line up).
- **Casting.** Each role is filled by scoring the real roster on traits, relationships and history (the hero with a rival in the party; that rival; a peacemaker with a high healer trait). If a role can't be filled, the event can't fire. The most-used casting tests are relationships (partner, friend, rival) and leading personality traits.
- **One choice.** Usually two or three options, each spoken by a cast hero. Many options appear only when a certain role was cast. Stakes are shown on the button (for example which two heroes will become rivals).
- **Outcome written back.** Relationship points, stat changes, traits and flags, a history line, a follow-up that shows the consequence years later. Failing still changes something.

Wildermyth decides some outcomes with dice. We do not (`no-dice`): our outcomes follow people's recorded reasons.

## Their own words

- Lines are templates with name, pronoun, place and hometown slots.
- One line carries versions by the speaker's leading personality (about eleven kinds) and by their tie to the listener (rival, friend, partner, none); checks can nest (the speaker's trait and whether the other shares it).
- Lines carry facial expressions and panel poses.
- A typical event has dozens of lines with many alternates. A hero's voice is their personality, which comes from their past.

## History

- A person's past is assembled from origin, childhood and smaller episode entries. Each entry rules out contradictions, adds tags and a seed for a future personal quest, and adds personality.
- Later events cast by those tags; quest seeds open personal storylines; between-chapter news revisits them; retirement endings read them.
- Every history line goes into the character's written story, which the player can read and edit. History mostly works by deciding who is cast and which version of a line plays.

## Pacing

- A campaign is a few chapters, each with fixed story beats and an enemy clock; between chapters, an interval screen says how many years of peace passed (earned by how the chapter went) and shows weddings, aging, children and follow-ups paying off old choices.
- On the map, time passes in days; scenes fire from actions and world state (arriving, finishing a task, winning, relationships crossing a threshold, quest seeds), never from the calendar alone.

## People

- Skin comes in a few weighted families, each with its own matching hair colors; about a hundred hairstyles tied to those families; hair grays with age.
- Large first-name and surname pools. What someone says comes from their personality and past, not their looks.

## What it means for us

No consequence, no scene; cast from the world by score; most specific wins; every line in versions by trait and tie; options that depend on what happened, with stakes named; pasts that seed later scenes; history as the journal; the clock runs and stops only for a scene; a campaign season as a chapter with fixed beats and cast scenes between; a "years pass" screen after each term; varied skin and hair with aging; narration that sets a mood and never restates the screen.
