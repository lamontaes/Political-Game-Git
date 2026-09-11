# PT3-PROSE first-session samples

Three separate lives, not one save: seed `pt3-probe`, normal start, 2026-01-05, Kentucky. Produced by driving the canonical opening-life flow (`openNextLifeScene` → `currentOpeningLifeScene` → `chooseOpeningLifeScene`), which is exactly what `LifeScenePanel` renders. Lines in brackets are the clock before the scene, then (scene key/stage); `>` is the choice taken and the saved aftermath.

## Before — UI144 `302e1f0c`

```text

==== AGE 22 — LIVES ALONE ====
[intro] Lara Mann · Age 22 · 2026-01-05 · Kentucky
[household] You're 22, and you live in Kentucky. No one else is recorded in your current household.
[9:10 AM] (adult.home.free-time/moment) You have a little free time at home. What would you like to do?
   15 minutes | here: nobody
   choices: Read for a while / Rest for a few minutes / Spend time sketching
   > Read for a while  => "You spend a little time reading."  now 9:25 AM
[9:25 AM] (adult.home.free-time/follow-through) You spent some of your free time reading. You can keep going or put the book aside.
   5 minutes | here: nobody
   choices: Read a little more before putting the book down / Mark your place and put the book aside
   > Read a little more before putting the book down  => "You spend a few more minutes reading."  now 9:30 AM
[no scene] -> Continue your day
  (nothing opens; falls through to Continue your life)

==== AGE 22 — SHARES A HOME ====
[intro] Kayla Gill · Age 22 · 2026-01-05 · Kentucky
[household] You're 22, and you live in Kentucky. At home with you: Sierra Tucker, who you live with
[9:10 AM] (adult.home.shared-time/moment) You and Sierra Tucker are both at home with time to talk.
   10 minutes | here: Sierra Tucker
   choices: Ask how their day is going / Leave the topic to your housemate / Ask for some quiet time
   > Ask how their day is going  => "You ask Sierra Tucker how their day is going."  now 9:20 AM
[9:20 AM] (adult.home.free-time/moment) You have a little free time at home. What would you like to do?
   15 minutes | here: Sierra Tucker
   choices: Read for a while / Rest for a few minutes / Spend time sketching
   > Read for a while  => "You spend a little time reading."  now 9:35 AM
[9:35 AM] (adult.home.free-time/follow-through) You spent some of your free time reading. You can keep going or put the book aside.
   5 minutes | here: Sierra Tucker
   choices: Read a little more before putting the book down / Mark your place and put the book aside
   > Mark your place and put the book aside  => "You mark your place and put the book aside."  now 9:40 AM
[no scene] -> Continue your day
  (nothing opens; falls through to Continue your life)

==== AGE 7 — CHILD WITH GUARDIAN ====
[intro] Aiko Knight · Age 7 · 2026-01-05 · Kentucky
[household] You're 7, and you live in Kentucky. At home with you: Charlotte Knight, your mom Elise Sanchez, your mom
[9:10 AM] (early.home.food-refusal/moment) There's broccoli on your plate. Charlotte Knight asks you to try a bite.
   10 minutes | here: Charlotte Knight, Elise Sanchez
   choices: Try a bite / Say you don't want it / Ask to leave it
   > Try a bite  => "You try a bite of broccoli."  now 9:20 AM
[9:20 AM] (early.home.food-refusal/follow-through) You tried a bite of broccoli. There is still some on your plate.
   5 minutes | here: Charlotte Knight, Elise Sanchez
   choices: Choose another bite of broccoli / Say one bite is enough for now
   > Choose another bite of broccoli  => "You take another bite of broccoli."  now 9:25 AM
[9:25 AM] (early.home.broken-mug/moment) Your sleeve catches a mug. It falls and breaks. Charlotte Knight asks what happened.
   10 minutes | here: Charlotte Knight, Elise Sanchez
   choices: Say you knocked it over / Ask for help with the pieces / Say nothing
   > Ask for help with the pieces  => "You ask Charlotte Knight to help with the broken pieces."  now 9:35 AM
[9:35 AM] (young.home.choose-activity/moment) You have a little free time at home. What would you like to do?
   15 minutes | here: Charlotte Knight, Elise Sanchez
   choices: Draw something / Read a book / Take a quiet break
   > Take a quiet break  => "You take a quiet break."  now 9:50 AM
[9:50 AM] (early.home.closet-fear/moment) A branch casts a moving shadow across your closet door.
   10 minutes | here: Charlotte Knight, Elise Sanchez
   choices: Turn on the lamp / Pull up the covers / Look out the window
   > Turn on the lamp  => "You turn on the lamp and look at the closet door."  now 10:00 AM
```

## After — this branch

```text

==== AGE 22 — LIVES ALONE ====
[intro] Lara Mann · Age 22 · 2026-01-05 · Kentucky
[household] You're 22, and you live in Kentucky. No one else is recorded in your current household.
[9:10 AM] (adult.home.plan-week/moment) You're at home, thinking about what to make time for in the days ahead.
   5 minutes | here: nobody
   choices: Make time to learn something / Make time for people you know / Make some time for yourself
   effects: connection → records plan: Make time for people you know; privacy → records plan: Make some time for yourself
   > Make time to learn something  => "You decide to set aside some time to learn something."  now 9:15 AM
[9:15 AM] (adult.home.plan-week/follow-through) You've just made a plan to learn something, and there are five minutes open right now.
   5 minutes | here: nobody
   choices: Start by reading now / Leave it for another time
   effects: read → keeps plan: Make time to learn something
   > Start by reading now  => "You spend the five minutes reading."  now 9:20 AM
[9:20 AM] (adult.home.free-time/moment) You're at home with fifteen minutes free.
   15 minutes | here: nobody
   choices: Read / Rest / Sketch
   > Rest  => "You rest for the fifteen minutes."  now 9:35 AM
[no scene] -> Continue your day
  (nothing opens; falls through to Continue your life)
[saved plans] opening-life:learning=active, opening-life:learning=completed
[reload] identical: true

==== AGE 22 — SHARES A HOME ====
[intro] Kayla Gill · Age 22 · 2026-01-05 · Kentucky
[household] You're 22, and you live in Kentucky. At home with you: Sierra Tucker, who you live with
[9:10 AM] (adult.home.free-time/moment) You're at home with fifteen minutes free.
   15 minutes | here: Sierra Tucker
   choices: Read / Rest / Sketch
   effects: read → keeps plan: Make time to learn something
   > Read  => "You spend the fifteen minutes reading."  now 9:25 AM
[9:25 AM] (adult.home.free-time/follow-through) You've been reading for the last fifteen minutes. You can read for five more, or stop here.
   5 minutes | here: Sierra Tucker
   choices: Read five more minutes / Mark your place and stop
   > Read five more minutes  => "You read for another five minutes."  now 9:30 AM
[9:30 AM] (adult.home.shared-time/moment) You're home, and so is Sierra Tucker, who you live with.
   10 minutes | here: Sierra Tucker
   choices: Ask about their day / Let them pick the topic / Ask for some quiet
   > Let them pick the topic  => "You let Sierra Tucker choose what to talk about."  now 9:40 AM
[9:40 AM] (adult.home.plan-week/moment) You're at home, thinking about what to make time for in the days ahead.
   5 minutes | here: Sierra Tucker
   choices: Make time to learn something / Make time for people you know / Make some time for yourself
   effects: learning → records plan: Make time to learn something; connection → records plan: Make time for people you know; privacy → records plan: Make some time for yourself
   > Make some time for yourself  => "You decide to make some time for yourself."  now 9:45 AM
[no scene] -> Continue your day
  (nothing opens; falls through to Continue your life)
[saved plans] opening-life:learning=active, opening-life:learning=completed, opening-life:privacy=active
[reload] identical: true

==== AGE 7 — CHILD WITH GUARDIAN ====
[intro] Aiko Knight · Age 7 · 2026-01-05 · Kentucky
[household] You're 7, and you live in Kentucky. At home with you: Charlotte Knight, your mom Elise Sanchez, your mom
[9:10 AM] (young.home.choose-activity/moment) You're at home, and the next fifteen minutes are yours.
   15 minutes | here: Charlotte Knight, Elise Sanchez
   choices: Draw something / Read a book / Take a quiet break
   effects: read → keeps plan: Make time to learn something
   > Draw something  => "You draw for the fifteen minutes."  now 9:25 AM
[9:25 AM] (young.home.choose-activity/follow-through) You spent some time drawing. You can decide what to do with the picture you made.
   5 minutes | here: Charlotte Knight, Elise Sanchez
   choices: Add one more detail to your picture / Put your picture somewhere safe
   > Add one more detail to your picture  => "You add another detail to your drawing."  now 9:30 AM
[9:30 AM] (early.home.broken-mug/moment) Your sleeve catches a mug. It falls and breaks. Charlotte Knight asks what happened.
   10 minutes | here: Charlotte Knight, Elise Sanchez
   choices: Say you knocked it over / Ask for help with the pieces / Say nothing
   > Ask for help with the pieces  => "You ask Charlotte Knight to help with the broken pieces."  now 9:40 AM
[no scene] -> Continue your day
  (nothing opens; falls through to Continue your life)
[saved plans] opening-life:learning=active
[reload] identical: true
```

The household line is joined here for the transcript; on screen each sentence is its own paragraph. `effects:` is `openingSceneChoiceEffects`, the read-only adapter the scene panel does not render yet.
