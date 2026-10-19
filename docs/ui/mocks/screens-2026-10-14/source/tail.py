CSS = open("screens.css").read()
nav = "".join(f'<a href="#{k}">{html.escape(t)}</a>' for k, t, _, _ in SCREENS)
body = "".join(f'<section id="{k}"><h2>{html.escape(t)}</h2><p class="note">{html.escape(n)}</p><div class="frame"><div class="scale">{h}</div></div></section>' for k, t, n, h in SCREENS)
page = f'''<title>Game Screens</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Fira+Sans:wght@400;500;600&family=Andada+Pro:wght@400;500&family=UnifrakturMaguntia&family=Playfair+Display:wght@700;900&family=Old+Standard+TT:wght@400;700&family=Libre+Franklin:wght@400;600&family=Anton&display=swap">
<style>{CSS}</style>
<header class="top"><h1>The screens, put together</h1><p>Every screen in the plan at full size (1440 × 900) in the approved Kit 13 look, with the new icons and frames in place. The words are sample records from one game in Latimer, Mississippi; in the game they come from the records and the English engine. Hover the menu icons to see their names.</p><nav>{nav}</nav></header>
<main>{body}</main>
<script>
function fit(){{document.querySelectorAll('.frame').forEach(f=>{{const s=f.clientWidth/1440;f.style.height=(900*s)+'px';f.firstElementChild.style.transform='scale('+s+')';}});}}
addEventListener('resize',fit);fit();
</script>'''
open("page/index.html", "w").write(page)
print(len(SCREENS), "screens")

# one file per screen at native size, for screenshots
import os
os.makedirs("page/shot", exist_ok=True)
for k, t, n, h in SCREENS:
    open(f"page/shot/{k}.html", "w").write(f'''<!doctype html><meta charset=utf-8><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Fira+Sans:wght@400;500;600&family=Andada+Pro:wght@400;500&family=UnifrakturMaguntia&family=Playfair+Display:wght@700;900&family=Old+Standard+TT:wght@400;700&family=Libre+Franklin:wght@400;600&family=Anton&display=swap"><style>{CSS} body{{margin:0;padding:0}} </style><base href="../">{h}''')
