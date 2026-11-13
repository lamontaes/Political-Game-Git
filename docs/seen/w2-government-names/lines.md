# A government is said by its place record's proper name

Ruling: Fable A on the crew line, Nov 13: "a government's name is said from the place record's own proper name ('City of' plus 'McCall'), never by re-capitalizing the source's capitals; where no proper name is on record, show which governments those are so the data can be fixed. One reader, every government, the Budgets tab and Metrics alike."

Bench at 1440x900: a new life in the place named, then Politics (Government, Local, Legislative). Before is main at c6b5fe2b55; after is this branch. These three places were chosen, not drawn: only about 1 in 100 governments has a name the old rule got wrong (208 of 22,513), and eight drawn lives (`w2g1` to `w2g8`) found none.

| Place (bench place key, seed `w2gn`) | Before                                                         | After                                                           |
| ------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------- |
| McCall, Idaho (`1648790`)            | Mccall City Council                                            | McCall City Council                                             |
| O'Fallon, Illinois (`1755249`)       | O Fallon City Council / St Clair County Board of Commissioners | O'Fallon City Council / St. Clair County Board of Commissioners |
| McMinnville, Oregon (`4145000`)      | Mcminnville City Council                                       | McMinnville City Council                                        |

The Budgets tab's government names (`budgetView`) for the same three worlds. The player reaches the tab at voting age or with a filing, so it is read here from the view the tab draws.

| Place       | Before (main)                           | After                                |
| ----------- | --------------------------------------- | ------------------------------------ |
| McCall      | County of Valley ; City of Mccall       | Valley County ; City of McCall       |
| O'Fallon    | County of St Clair ; City of O Fallon   | St. Clair County ; City of O'Fallon  |
| McMinnville | County of Yamhill ; City of Mcminnville | Yamhill County ; City of McMinnville |

Metrics prints no government's name (its sections are titled from `controls.json`), so nothing there changes.

The 122 governments whose place record holds no matching name are listed in `no-proper-name.md`, so the data can be fixed.
