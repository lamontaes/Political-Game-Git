# Notes that were in src/director/data/spoken-when.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `about`

How people say how long ago they last saw someone, in passing: never a calendar date (owner, Oct 15, evening: nobody says a date in speech, 'I talked to Diana on November 13'). The first row whose upToDays covers the gap is said. Authored, calibrated to the way Americans mention a recent contact in the conversation bank; the engine only picks the row by the contact record's date. `gap` says how long that is as a greeting hears it (recent for a day, month for up to about six weeks, long past that, the owner's lead's three stages on Nov 11: "I just saw you yesterday" only when recent, a hedge like "if I remember right" only when long), and `since` whether the words read after "since" ("since last week", never "since a few days ago"); both are marks a line may require.
