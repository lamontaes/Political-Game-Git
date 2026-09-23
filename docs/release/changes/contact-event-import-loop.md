---
id: contact-event-import-loop
impact: none
---

Moves the contact proposal event name into its own small file, so relationship fading no longer imports the whole contact file. That import had closed a loop that made command-line scripts, the observer probe among them, crash on start. Nothing in play changes.
