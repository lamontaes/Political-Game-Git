# b01-p3 played petition asks

ENGLISH batch for the played ask action in a candidate's petition circulation.

All spoken request and reply templates, the action prompt, and the record-only
fallback are routed through the English composition engine. The action appears
only for an active campaign whose filing record requires signatures and is
marked as circulating. The same `askToSign` event writer handles the scene ask.

The batch is intentionally limited to two decisions: sign or decline. It adds
no authored outcomes, mini-game, or petition screen.
