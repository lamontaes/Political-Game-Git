# Eviction talk, before and after (W1)

AFTER: claude/w1-conversation-eviction at c5277b2eda. BEFORE: claude/words-telling-said-as-talk at 657f1cd009.
Each case: a new life from POST /api/newlife?seed=...&placeKey=... (no person; rewritten with page.route on the New game > new world click), then dev mode's run-until {kind: "housing.eviction", person: <target>}, then /play reloaded and Continue.
The target is not in the player's room. The person on the room strip was clicked (the scene answer's talkable flag forced true with page.route, since the strip person had nothing to say and was not clickable) and the /api/talk/open request's otherId was rewritten to the target. The server opened a real talk with the target.
Every reply was played from its own fresh life (same seed, same day), so each answer is the first telling that day. Time shown on the card: 8:30 PM in every case.
Pictures: after/<place>/1.jpg and before/<place>/1.jpg are the talk as it opens; 2.jpg onward is the answer to reply 1, 2, 3 (and 4 before).

## Buckeye Lake, Ohio (player Eva Alvarez; Veronica Alvarez; Wednesday, February 26, 2025)

### AFTER

Open (after/buckeye/1.jpg), speaker Veronica Alvarez:

- Good to see you.
- If it isn't Eva. I last ran into you a few weeks ago.
- The landlord put me out today. I owed about $1,000.
- Replies: 1. Where to now? | 2. Need help moving? | 3. I'm sorry. (three replies, plus Say nothing and Leave)

| Shot                | Reply clicked | Eva says          | Veronica says                                    | Then     |
| ------------------- | ------------- | ----------------- | ------------------------------------------------ | -------- |
| after/buckeye/2.jpg | 1             | Where to now?     | I'm staying with my mother until I find a place. | Continue |
| after/buckeye/3.jpg | 2             | Need help moving? | Sure. It's all going to my mother's.             | Continue |
| after/buckeye/4.jpg | 3             | I'm sorry.        | I'll be fine at my mother's a while.             | Continue |

### BEFORE

Open (before/buckeye/1.jpg):

- Good to see you.
- If it isn't Eva. I last ran into you a few weeks ago.
- We have to be out of the house.
- Replies: 1. What can I do? | 2. Really? Since when? | 3. That's not fair. | 4. We'll get through this.

| Shot                 | Reply clicked | Eva says                | Veronica says | Then     |
| -------------------- | ------------- | ----------------------- | ------------- | -------- |
| before/buckeye/2.jpg | 1             | What can I do?          | See you soon. | Continue |
| before/buckeye/3.jpg | 2             | Really? Since when?     | See you soon. | Continue |
| before/buckeye/4.jpg | 3             | That's not fair.        | See you soon. | Continue |
| before/buckeye/5.jpg | 4             | We'll get through this. | See you soon. | Continue |

## Vero Lake Estates, Florida (player Henry Evans; Sherri Walls; Saturday, February 15, 2025)

### AFTER

Open (after/vero/1.jpg), speaker Sherri Walls:

- Good to see you.
- The last time I saw you was a few weeks ago.
- The landlord put me out today. I owed about $1,500.
- Replies: 1. I'm sorry. | 2. Where'll you stay? | 3. Need help moving?

| Shot             | Reply clicked | Henry says         | Sherri says                                      | Then     |
| ---------------- | ------------- | ------------------ | ------------------------------------------------ | -------- |
| after/vero/2.jpg | 1             | I'm sorry.         | I'll be fine at my mother's a while.             | Continue |
| after/vero/3.jpg | 2             | Where'll you stay? | I'm staying with my mother until I find a place. | Continue |
| after/vero/4.jpg | 3             | Need help moving?  | Sure. It's all going to my mother's.             | Continue |

### BEFORE

Open (before/vero/1.jpg):

- Good to see you.
- The last time I saw you was a few weeks ago.
- We have to move.
- Replies: 1. Oh, no. | 2. Tell me what needs doing, and I'll do it. | 3. We'll find a place. | 4. Wait. We have to move?

| Shot              | Reply clicked | Henry says                                | Sherri says | Then     |
| ----------------- | ------------- | ----------------------------------------- | ----------- | -------- |
| before/vero/2.jpg | 1             | Oh, no.                                   | Goodbye.    | Continue |
| before/vero/3.jpg | 2             | Tell me what needs doing, and I'll do it. | Goodbye.    | Continue |
| before/vero/4.jpg | 3             | We'll find a place.                       | Goodbye.    | Continue |
| before/vero/5.jpg | 4             | Wait. We have to move?                    | Goodbye.    | Continue |

## Leoma, Tennessee (player Joshua Riddle; Naomi Wu; Wednesday, April 2, 2025)

### AFTER

Open (after/leoma/1.jpg), speaker Naomi Wu:

- Hello there.
- It's been a while. Last I saw you was a couple of months ago.
- The landlord had me put out today. I was about three months behind.
- Replies: 1. I'm sorry. | 2. Where to now? | 3. Need help moving?

| Shot              | Reply clicked | Joshua says       | Naomi says                           | Then     |
| ----------------- | ------------- | ----------------- | ------------------------------------ | -------- |
| after/leoma/2.jpg | 1             | I'm sorry.        | I'll be fine at my sister's a while. | Continue |
| after/leoma/3.jpg | 2             | Where to now?     | At my sister's, for a while.         | Continue |
| after/leoma/4.jpg | 3             | Need help moving? | Sure. It's all going to my sister's. | Continue |

### BEFORE

Open (before/leoma/1.jpg):

- Hello there.
- It's been a while. Last I saw you was a couple of months ago.
- We have to move.
- Replies: 1. That's awful. | 2. We'll get through this. | 3. What can I do? | 4. Really? Since when?

| Shot               | Reply clicked | Joshua says             | Naomi says | Then     |
| ------------------ | ------------- | ----------------------- | ---------- | -------- |
| before/leoma/2.jpg | 1             | That's awful.           | Bye.       | Continue |
| before/leoma/3.jpg | 2             | We'll get through this. | Bye.       | Continue |
| before/leoma/4.jpg | 3             | What can I do?          | Bye.       | Continue |
| before/leoma/5.jpg | 4             | Really? Since when?     | Bye.       | Continue |
