# The first scene batch has spots and content faces for review

The first scene batch marks people spots and drawable faces on 39 supplied previews. Each picture has its own source key and measurements, so a different camera cannot inherit another picture's corners. Claude CTO and Lamontae must review the overlay before import. Rear-facing seats and fine distant screens remain blocked where the preview or current format cannot express them safely.

## What changed

The batch covers 20 filename groups from airport terminal through the first two campaign storefront images. These groups represent 10 semantic place kinds. The supplied folder has 131 filename groups and 87 semantic kinds because Adobe truncated filenames and retained alternate paintings. Every source filename remains distinct.

There are 453 candidate people spots across the 39 images. The 98 content faces include visible TVs, election-office screens, a bus timetable, campaign boards and a coffee-table paper. Empty `shows` lists retain private desktop paint. No simulation facts or coefficients were added.

The data is in `art/authoring/sept29-team7/scenes/batch-01/`. `measurement.json` binds every source filename, native dimensions, hash, variant, kind and unresolved issue. `contact-sheet.jpg` draws all spot numbers, seat lines, clip lines and content polygons over their source pictures. All quads use source-image pixels. People coordinates use percentages of the individual image.

## Import limits

The square bedroom preview has a different camera from the wide bedroom variants. It carries independent staging and native dimensions. Most other pictures retain the same furniture layout with lighting changes. Independent source keys preserve that distinction for the importer.

Airport and election-office chairs face away. The canonical facing enum offers viewer, left and right. Those seated candidates deliberately omit facing and are blocked for import, because the current consumer would default to viewer. CTO and job 08 must resolve their facing before release. Hidden cushion and foot points are estimates from furniture, not measured visible soles.

The staging scale uses explicit assumptions about painted furniture height. Those assumptions are recorded in `measuredFrom`. No physical survey, actual actor composite, crop check or runtime contact test was performed. Full-size files must be checked against these preview measurements before import.

Distant desktop faces and small paper edges require full-size corner review. They are unresolved, rather than claimed as exhaustively tagged. Laptop backs, windows, appliances and decorations remain painted. No geometry was fabricated for them.

## What happens next

Claude CTO reviews this candidate batch. Team 7 continues the remaining September 29 groups before adding surfaces for the existing untagged game places. Job 08 maps source keys to import identities. The canonical runtime JSON and game code are untouched.

Kids and TV corrections are authorized and remain after the scene priority. Newspaper revisions await Claude's real-news mockup. No new helper, merge, installation, runtime effect or art approval is claimed.

## Method and validation

The source is the supplied 600-pixel preview folder and its existing hash-bound tags. The wide images are 600 by 334 pixels; one bedroom image is 600 by 600 pixels. The overlay reduces the square preview for contact-sheet display and never enlarges a raster.

Data checks verify hashes and native dimensions, one hero per source, legal coordinate bounds, seat fields, surface identifiers and convex nonzero quads. The data check passed for all 39 source hashes and dimensions, 453 spots and 98 convex surfaces. It also identified 256 import-blocked seats without a supported facing. The report check passed with zero errors and zero warnings. Markdown formatting passed. Runtime tests and browser proof are NOT RUN. Independent report review is NOT RUN under the existing no-helper assignment restriction.
