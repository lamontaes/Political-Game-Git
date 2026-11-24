import pathlib
S=pathlib.Path('base-proto.css').read_text()
E=pathlib.Path('ex.css').read_text(); J=pathlib.Path('ex.js').read_text()
groups=[("You",[("you-mix-strips","Mix: strips"),("you-mix-panes","Mix: panes"),("you-mix-layered","Mix: layered"),("you-ck","Crusader Kings 3"),("you-sz","Suzerain"),("you-wm","Wildermyth"),("you-de","Disco Elysium")]),
 ("Person",[("per-hale","Margaret Hale")]),
 ("Government",[("gov-local","Local"),("gov-state","State"),("gov-federal","Federal")]),
 ("Outlines",[("you-ol-g","Middles + fades down"),("you-ol-a","Fades down"),("you-ol-b","Corners"),("you-ol-c","Middles"),("you-ol-d","Open corners"),("you-ol-e","Rails"),("you-ol-f","Dotted")]),
 ("Calendar",[("cal-strips","Strips"),("cal-week","B Week"),("cal-planner","C Day planner"),("cal-places","D With places"),("cal-typed","E Typed")]),
 ("Budgets",[("bud-strips","Mix: strips"),("bud-mix","Mix"),("bud-v3","Victoria 3"),("bud-d4","Democracy 4"),("bud-sz","Suzerain"),("bud-tp","The Political Process")]),
 ("Paper",[("mon-mix","Mix"),("mon-a","Paper in the room's light"),("mon-b","Dark objects"),("mon-c","Panels instead")])]
optgroups=[("Name",[("name:a","A Playfair Display"),("name:b","B Cormorant Garamond"),("name:c","C Libre Caslon Display")]),
 ("Close",[("close:a","A small X"),("close:b","B round button"),("close:c","C no X")]),
 ("Glow",[("glow:on","On"),("glow:off","Off")])]
opts=''.join(f'<div class="group"><span>{g}</span><div class="seg" role="group" aria-label="{g}">'+''.join(f'<button type="button" data-opt="{k}" aria-pressed="false">{t}</button>' for k,t in items)+'</div></div>' for g,items in optgroups)
strip=''.join(f'<div class="group"><span>{g}</span><div class="seg" role="group" aria-label="{g}">'+''.join(f'<button type="button" data-ex="{k}" aria-pressed="false">{t}</button>' for k,t in items)+'</div></div>' for g,items in groups)
html=f'''<meta charset="utf-8">
<title>Menu Examples</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Fira+Sans:wght@400;500;600;700&family=Andada+Pro:ital,wght@0,400;0,500;1,400&family=Caveat:wght@500;600;700&family=Courier+Prime:wght@400;700&family=Old+Standard+TT:wght@400;700&family=Libre+Franklin:wght@600;700&family=Playfair+Display:wght@600;700&family=Cormorant+Garamond:wght@500;600;700&family=Libre+Caslon+Display&display=swap">
<style>
{S}
{E}
</style>
<div class="wrap">
  <div class="strip"><h1>Menu examples</h1>{strip}</div>
  <div class="strip">{opts}</div>
  <p class="note" id="follows"></p>
  <div class="viewport" id="viewport">
    <div class="stage nav-row menu-open" id="stage">
      <div class="scene" id="scene" style="background-image:url(img/house-suburban-living__midday.jpg)"></div>
      <div id="menuhost"></div>
      <div class="hud" id="hud"></div>
      <div id="cardhost"></div>
      <div class="tipbox" id="tip" hidden></div>
    </div>
  </div>
</div>
<script>
{J}
</script>
'''
pathlib.Path('menu-examples.html').write_text(html); print(len(html))
