# UI-PROTOTYPE-01 — owner review screens

Development-only captures of the clickable prototype at `/ui-prototype.html`.
They are review aids, not acceptance evidence: the packet is explicit that a
screenshot is not human visual acceptance, and the prototype is meant to be
clicked, not looked at.

Regenerate them with the dev server running:

```
UI_PROTOTYPE_SCREENS=1 npx playwright test tests/e2e/ui-prototype-review-screens.spec.ts
```

The capture spec is opt-in behind that variable so an ordinary `npm run test:e2e`
never rewrites these files.

## The click-through, in order

| File                          | What it shows                                                     |
| ----------------------------- | ----------------------------------------------------------------- |
| `01-title-rest.jpg`           | Title at rest — transparent type over the released plate          |
| `02-title-selected.jpg`       | Selected item: brass line, bracket, brightness and position shift |
| `03-title-saved-games.jpg`    | Saved games, saying truthfully that there are none                |
| `04-options.jpg`              | Options — only settings with a real consumer                      |
| `05-scene-shell.jpg`          | The normal scene shell                                            |
| `06-nav-open.jpg`             | Bottom-left navigation, opening upward                            |
| `07-nav-submenu.jpg`          | The one subordinate level, in darker slate                        |
| `08-person-action-menu.jpg`   | One click on a scene person, anchored actions                     |
| `09-quick-dossier.jpg`        | Quick dossier beside the person it describes                      |
| `10-full-dossier.jpg`         | The full record in the centre workspace                           |
| `11-mixed-pins.jpg`           | A person, a commitment and a measure pinned together              |
| `12-people-categories.jpg`    | People, category view                                             |
| `13-people-list.jpg`          | People, list view                                                 |
| `14-calendar.jpg`             | Calendar agenda                                                   |
| `15-calendar-detail.jpg`      | One commitment                                                    |
| `16-personal-finances.jpg`    | Personal, with the three funds kept apart                         |
| `17-offices.jpg`              | Offices / work / civic context                                    |
| `18-journal.jpg`              | Life history chapters and open threads                            |
| `19-journal-chapter.jpg`      | A chapter, with dotted-underlined references                      |
| `20-scene-home.jpg`           | The home room                                                     |
| `21-scene-community-room.jpg` | The community room                                                |

## Review widths

`w-<width>x<height>-{title,dossier,people}.jpg` at 1920x1080, 1600x900,
1366x768, 1280x720 and 1024x768.
