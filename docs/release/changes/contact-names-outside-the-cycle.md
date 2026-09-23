---
id: contact-names-outside-the-cycle
impact: patch
section: Fixed
title: The relationship-fading reading loads cleanly again
---

The reading of how current a relationship is imported one event name from the
contact-request code, which builds its scheduler registry as it loads. That put
the registry inside an import cycle, and any screen or test that reached the
fading reading first failed to load. The event names now live in a file of
their own.
