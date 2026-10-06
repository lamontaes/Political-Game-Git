# Eight different menu structures for owner review

The owner is asked to choose a direction from eight game-inspired concepts. Each changes navigation placement and organization, while keeping the recorded player, clock and time controls together. The rejected portrait fan is preserved in the earlier PR and is not being polished. None of these images is a production choice.

| Named game         | Structure                                                | Native image                                     |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------ |
| Crusader Kings III | Character rail with personal, world and tool groups      | [Crusader-Kings-III.png](Crusader-Kings-III.png) |
| The Sims 4         | Split bottom dock                                        | [The-Sims-4.png](The-Sims-4.png)                 |
| Suzerain           | Wide desk folio with civic routes first                  | [Suzerain.png](Suzerain.png)                     |
| Disco Elysium      | Right-side reading column                                | [Disco-Elysium.png](Disco-Elysium.png)           |
| Frostpunk          | Centered command hub on an elliptical glass surface      | [Frostpunk.png](Frostpunk.png)                   |
| Baldur’s Gate 3    | Lower action toolbar                                     | [Baldurs-Gate-3.png](Baldurs-Gate-3.png)         |
| Civilization VI    | Civic upper-edge banners and personal lower-right routes | [Civilization-VI.png](Civilization-VI.png)       |
| Football Manager   | Persistent slim sidebar and selected workspace heading   | [Football-Manager.png](Football-Manager.png)     |

## Source and references

[references.json](references.json) names the studied game references and the original adaptation made for each. The references guide navigation structure; their images, logos, icons, code and other assets were not imported. These are original layout interpretations, not replicas or claims that the games use our exact controls.

The Kit13 sheet supplies actual fine-grain texture and brass panel ornament sprites. Cinzel titles and Fira Sans controls match the current rules. [source.json](source.json) records the approved sheet hash, main source, recorded character and backdrop identity. Panel contours and navigation arrangements are proposed concepts, not previously approved shapes. All destinations are unmarked; no chevrons appear on menu items. No square tile grid or internal scrolling is used.

The room is the existing mobile-home morning image, with trees and lawn through its windows. Its manifest approval remains `owner-placeholder-2026-09-27`. It is review staging for the recorded Scarville character, not evidence of her dwelling classification or actual room. No new art, local geometry, events or game records were created. The recorded figure and identity preserve Session3’s earlier source.

## Measured fit and coordination

[fit.json](fit.json) records eight native 1920×1080 browser captures. Every concept shows all eleven destinations, with no checked viewport clipping, text overflow, button overlap or player-card overlap. Clock and controls remain inside the player card. The initial character rail covered two items with the player card; the final capture fixes that spacing. These are static browser overlays on real game art, not full-shell screenshots or behavior proof. Smaller-screen support is not claimed. CSS cover enlarges the existing 1672×941 backdrop display; the raster itself is unchanged, and art fidelity is not approved by this check.

Session3 received the proposed four-game split [directly](https://github.com/lamontaes/Political-Game-Git/pull/2296#issuecomment-6009456252). Four primary Session14 concepts are CK3, Suzerain, Frostpunk and Football Manager. The remaining four are separately labeled exploratory supplements while Session3’s own concepts remain independent; the [follow-up](https://github.com/lamontaes/Political-Game-Git/pull/2296#issuecomment-6009489673) states that boundary. This packet neither overwrites Session3’s files nor holds its work.

Owner selection remains pending under the relayed orders 6009328018 and 6009337943. The earlier radial PR may be retained as an attempt record only. No production menu code changed. The exact repository Prettier check covers every added supported file, including evidence JSON; terminal output is included. No new product typecheck or simulation test pass is claimed for this documentation-only packet.
