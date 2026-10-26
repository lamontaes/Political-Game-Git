# Character screen data

The character screen presents the current person. Their name, birthday,
household members, schools, job, traits, views and money come from that person.
The screen does not create simulation facts.

## Data contract

The existing `/api/card` response supplies the content.
Optional presentation fields can be added by the card adapter:

- `presentation.portraitUrl`: an image of this person. If omitted, use their
  creator portrait or their figure in the current scene. Explicit `null` leaves
  the slot clear.
- `presentation.backgroundUrl`: this person's recorded home artwork. Omitted or
  `null` leaves the slot clear. The screen supplies no default room.
- `views`: entries with `label` and `text` supplied by the English engine. When
  absent, the screen uses the existing view label. No illustrative opinions are
  supplied by the screen.

Image load failures clear the image. No sample character, sample room or mockup
image is a runtime fallback. The media area adds no frame; the existing Kit 13
panel supplies its borders and corners.

Household buttons open the existing person card. Long content uses the existing
Back and Continue pager, which recalculates on window resize. Opening this screen
spends no game time.
