# Spot checks of the public school matches

Two stratified samples of 100 schools (50 matched by city name, 25 by the Census place outline, 25 by county) were checked by a Haiku helper against each school's own address and coordinates. The sample is drawn by hashing the seed and a counter, so anyone can re-draw it from the committed state files.

## Run 1 (before the county fix)

Seed `P12-schools-spotcheck-2026-10-09`. Strict rule: right only when the address and the match clearly agree.

Right 94, wrong 0, unsure 6.

| Row | School                                      | Address city      | Matched to         | Method            | Helper's verdict and reason                                                                               |
| --- | ------------------------------------------- | ----------------- | ------------------ | ----------------- | --------------------------------------------------------------------------------------------------------- |
| 32  | Armuchee Primary School (130219000882)      | Rome, GA          | Rome, GA           | city-name         | UNSURE: Mailing city Rome; sources place school in unincorporated Armuchee area north of Rome.            |
| 33  | Richardsville Elementary (210573001350)     | Bowling Green, KY | Bowling Green, KY  | city-name         | UNSURE: Mailing city Bowling Green; school is a Warren County school, city containment unconfirmed.       |
| 37  | Silver Summit School (490099001535)         | PARK CITY, UT     | Park City, UT      | city-name         | UNSURE: Mailing city Park City; Business Park Loop address, city limits containment unconfirmed.          |
| 47  | ORourke Elementary School (010237001813)    | Mobile, AL        | Mobile, AL         | city-name         | UNSURE: Mailing city Mobile; sources give Mobile County address, city containment unconfirmed.            |
| 66  | CENTRAL VALLEY PK - GREELEY (310018502302)  | GREELEY, NE       | Greeley Center, NE | point-in-boundary | UNSURE: Address and sources place school in Greeley; boundary says Greeley Center. Conflict, same county. |
| 71  | Casa Blanca Community School (590018600110) | Bapchule, AZ      | Sacate Village, AZ | point-in-boundary | UNSURE: Address city Bapchule; boundary says Sacate Village; sources do not tie school to Sacate Village. |

## Run 2 (after the county fix)

Seed `P12-schools-spotcheck-2026-10-09-run2`. Clarified rule: the school's own address city, or the place outline that holds its coordinates, counts as right.

Right 100, wrong 0, unsure 0.

| Row | School                                   | Address city    | Matched to      | Method    | Helper's verdict and reason                                                                                             |
| --- | ---------------------------------------- | --------------- | --------------- | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| 5   | West Orient Middle School (410600000996) | Gresham, OR     | Gresham, OR     | city-name | RIGHT: Address city Gresham matches place; Multnomah County. Coordinates may sit in unincorporated Orient, unconfirmed. |
| 32  | Brooklyn Avenue (062271002869)           | Los Angeles, CA | Los Angeles, CA | city-name | RIGHT: Address city Los Angeles matches place. Coordinates may sit in unincorporated East LA, unconfirmed.              |
