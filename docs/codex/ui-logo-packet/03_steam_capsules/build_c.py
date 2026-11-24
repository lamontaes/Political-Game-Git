# Option C (owner pick, Oct 2): full-bleed comic key art, navy fade, emblem + Cinzel 900 title.
# One page per Steam asset at exact pixel size; render_c.mjs screenshots each.
A = [
 # name, w, h, bgW, bgX, bgY, mode, title px, emblem px
 ("header-capsule-920x430",      920, 430,  920,   0,  -36, "line",  62, 104),
 ("small-capsule-462x174",       462, 174,  462,   0,  -40, "line",  28,  46),
 ("main-capsule-1232x706",      1232, 706, 1418, -93,  -15, "line",  84, 140),
 ("vertical-capsule-748x896",    748, 896, 1605,-436,    0, "stack", 76, 170),
 ("library-capsule-600x900",     600, 900, 1612,-506,    0, "stack", 62, 150),
 ("library-header-920x430",      920, 430,  920,   0,  -36, "line",  62, 104),
 ("page-background-1438x810",   1438, 810, 1451,  -6,   0, "bg",     0,   0),
 ("library-hero-3840x1240",     3840,1240, 3840,   0, -300, "none",   0,   0),
]
CSS = """@import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@900&display=block");
html,body{margin:0;overflow:hidden;background:#0d1020}
.cap{position:relative;overflow:hidden;background:url(keyart.png) no-repeat}
.word{font-family:"Cinzel",serif;font-weight:900;letter-spacing:.05em;line-height:.95;text-align:center;
 background:linear-gradient(180deg,#f0d9a4,#d6bd84 48%,#a87a48);-webkit-background-clip:text;background-clip:text;color:transparent;
 filter:drop-shadow(0 2px 0 #0b0f20) drop-shadow(0 0 1px #0b0f20) drop-shadow(0 4px 8px rgba(0,0,0,.55))}
.emb{filter:drop-shadow(0 6px 10px rgba(0,0,0,.5))}
.fade{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(180deg,rgba(13,16,32,0),rgba(13,16,32,.88) 55%,rgba(13,16,32,.96))}
.line{position:absolute;left:0;right:0;display:flex;justify-content:center;align-items:center}
.stack{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center}
.dim{position:absolute;inset:0;background:rgba(13,16,32,.55)}"""
for n,w,h,bw,bx,by,mode,ts,es in A:
    inner=""
    if mode=="line":
        inner=f'<div class="fade" style="height:46%"></div><div class="line" style="bottom:{round(h*.047)}px;gap:{round(es*.15)}px"><img class="emb" src="emblem-final.png" style="height:{es}px"><div class="word" style="font-size:{ts}px;white-space:nowrap">OUR CIVIC DUTY</div></div>'
    elif mode=="stack":
        inner=f'<div class="fade" style="height:52%"></div><div class="stack" style="bottom:{round(h*.05)}px;gap:{round(es*.06)}px"><img class="emb" src="emblem-final.png" style="height:{es}px"><div class="word" style="font-size:{ts}px">OUR<br>CIVIC<br>DUTY</div></div>'
    elif mode=="bg":
        inner='<div class="dim"></div>'
    html=f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="cap" style="width:{w}px;height:{h}px;background-size:{bw}px auto;background-position:{bx}px {by}px">{inner}</div></body></html>'
    open(f"c-{n}.html","w").write(html)
# transparent library logo + community icon
open("c-library-logo-1280x720.html","w").write(f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS} html,body{{background:transparent}}</style></head><body><div style="width:1280px;height:720px;display:flex;align-items:center;justify-content:center;gap:28px"><img class="emb" src="emblem-final.png" style="height:330px"><div class="word" style="font-size:118px;text-align:left">OUR<br>CIVIC<br>DUTY</div></div></body></html>')
open("c-community-icon-184x184.html","w").write(f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><div style="width:184px;height:184px;background:radial-gradient(circle at 50% 40%,#24305a,#10152a);display:flex;align-items:center;justify-content:center"><img src="emblem-final.png" style="height:150px"></div></body></html>')
print("ok")
