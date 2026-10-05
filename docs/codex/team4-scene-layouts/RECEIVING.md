# Portable isolated scene comparison — T7 receiving

Candidate markup only. No production imports, save reads/writes, game activation or renderer created. Use the existing local rendering route and exact originals. Input-dependent image sheets remain NOT RENDERED until the T3 packet and selected Sheet23 CSS binding are supplied.

Original room: `/private/tmp/wt-play/art/backdrops/county-party-office__midday.jpg`, 1672×941. Its manifest status is `owner-placeholder-2026-09-27`, **not final approved art**. Exact local SHA256: `579316bd2b64f6a1027390cd529b78e81eed82ec7d23b7630358910911ffec38` (cloud bytes verified identical). Cloud counterpart exists at `art/backdrops/county-party-office__midday.jpg`. T7 verifies hashes against the exact local original. Existing room spots: `art/backdrops/staging.json:1135` (standing/table/desk/leaning; existing pose, depth and clipping rules). T7 uses the existing compositor to stage the actual bound people and supplies its resulting `composedRoomUrl`; do not invent people, reuse master sample people, or place flat portrait cutouts in the room.

Kit source: `docs/codex/ui-logo-packet/01_kit12_ui/kit12.css`, `final.png`, `final.html`, `final-lying.png`, `portrait3-sheet.png`; brief decisions 3/4. Relative kit link in candidate.html points to these exact existing styles. Sample master names, words and financial panels are deliberately absent. Sheet23 selected controls: required input `sheet23ControlsCssUrl`, exact live-integrator excerpt/file, not recreated. Scales URLs bind exact selected level/tipped SVGs. No ordinary navigation/time controls are included during exchange, no cinematic bars, portraits top-left, narrator italic, spoken lines in speech font, numbered word-only replies.

## One authoritative packet, all three layouts

Pass `?packet=<served-exact-T3-packet-URL>&layout=1&phase=greeting`. Markup refuses to render when required bindings are absent. The JSON contract is:

- `sourceReceipt`: T3 exact head/packet hash and record basis.
- `backgroundSha256`, `composedRoomUrl`, `roomLabel`, `exchangeBasis` (explicit current or grounded proposed wording).
- `sheet23ControlsCssUrl`, `scalesLevelUrl`, `scalesTippedUrl`: existing selected assets/styles.
- `people`: keyed by actual person ID, each with recorded `name`, existing-renderer `portraitUrl`, and retained portrait/recipe provenance in the packet.
- `phases.greeting`, `phases.room`, `phases.conversation`: each with `segments` and `replies`. Segments have `kind: narrator` and `words`, or `kind: spoken`, `personId` and `words`. Replies have exact `recordKey`, `words`, optional `unavailable`; exchanges have actual `canLie`/`lying`. Use the short greeting, canonical return-to-room and existing offer-more-talk words from T3/CTO; no stock substitutions.

Buttons are inert presentation samples, not a new chat engine. The sequence is shown by rendering separate phase URLs with identical bindings, not by simulating/applying a turn. Sheet controls remain accessible in the markup; keyboard/game action acceptance is not claimed by image sheets.

## Three comparisons to render

1. **Shared lower-center:** greeting and ordinary conversation use the same lower-center composition. Room return is the same scene with its actual room offer.
2. **Compact arrival → normal dialogue:** compact upper-left arrival greeting opens the lower-center ordinary conversation for more talk. Room return uses the actual offer without carrying an exchange panel full of old speech.
3. **Wider room-side composition:** greeting and conversation use a wider right-side composition with portraits and replies beside the visible room center. Narrow view relocates the same content to the lower edge.

Use SAME exact packet, composed room, people, words and selected controls for all options. Capture each option's greeting → room → conversation at embedded and short/narrow viewport. Compose existing captures into three comparison sheets using T7's existing tools; no new renderer. Record viewport sizes, exact input hashes and asset status alongside sheets. If a long actual exchange clips, report it rather than deleting words or shrinking type. Author review precedes selection; no layout activation authorized.

## Render-route entrypoint

Existing repository capture pattern: `docs/codex/ui-logo-packet/03_steam_capsules/render_c.mjs` (Playwright page navigation → `document.fonts.ready` → screenshot). It is a fixed Steam-file scanner, NOT a CLI for this candidate; do not claim it runs candidate URLs unmodified. T7 uses its existing local comparison capture route with this entrypoint: `<existing-isolated-static-origin>/docs/codex/team4-scene-layouts/candidate.html?packet=<served-packet-url>&layout=1&phase=greeting`. Repeat layout 1/2/3 and phase greeting/room/conversation. Wait for `document.documentElement.dataset.ready === "true"`, all images complete and fonts ready before capture; false means a missing input, not an acceptable mockup. Packet fetch requires the existing isolated HTTP route; no owner5294 reload/restart. T7 supplies exact command/route receipt from its current tools; Team4 does not invent a local executable endpoint.

CTO endpoint: each option must show arrival, actual response choices, then return to the ordinary room after the short exchange; more-talk opens the actual normal exchange. Capture the same small presentation pause in T7's existing route before the room return (not simulated clock advancement). The packet also retains T1's actual party destination and quiet-arrival control receipt; absent content/control is explicitly marked missing, never replaced by master sample facts.

## Binding owner staging permission supersedes office-presence wait

Use T3's reviewed **Marshall–Roland recorded agenda exchange** and their original portraits on this exact recovered background. Required outside-game caption is embedded in candidate.html: **Layout proposal: recorded exchange staged here; office attendance is not established.** Capture it on every sheet, outside the scene region. Retain `actualContext` in the packet/receipt: original place, moment, speaker IDs, narrator and choice/turn keys, knowledge basis and evidence link/hash. The markup now requires this context field. Do NOT rewrite words into a party greeting or assert office presence/arrival/quiet-trigger proof. T1 separately owns that actual office route; it is NOT a blocker to these staged layout sheets.

The `greeting` phase query is now ONLY a compact-arrival-layout comparison label; bind the SAME reviewed recorded exchange words, narrator and choices there, never manufacture an arrival greeting. `conversation` is the continued-dialogue arrangement of that SAME content. If T3 supplies no recorded return-room offer, do not invent one: render the exact composed room alone for the room-return comparison and record missing offer content explicitly. More-talk/arrival behavior is not proved by an isolated staged image. T3's exact reviewed packet and portrait URLs are the only remaining content inputs; the office facts are no longer requested for these sheets.
