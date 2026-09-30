# Review-only deterministic generator. Requires Pillow and macOS system fonts.
import json,math,hashlib,html,textwrap
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
b=Path(__file__).resolve().parent;packet=json.loads((b/'sample-packet.json').read_text());papers=packet['papers']
kit=dict(schema='ocd-newspaper-parts/v1',status='candidate-review-only',coordinates='normalized page-edge fractions',selection='Job08/consumer must persist one outlet design identity; no per-render reroll is implemented here.',nameplates=[dict(id=x,font=f,case=c,weight=w,align=a)for x,f,c,w,a in [('heritage','serif','title',700,'center'),('condensed','sans-serif','upper',800,'left'),('italic-local','serif','title',700,'left'),('stacked','serif','title',700,'center'),('modern','sans-serif','upper',700,'center'),('restrained','serif','title',400,'center')]],rules=[dict(id='hairline',width=0.0009),dict(id='double',width=0.0012,gap=0.002),dict(id='heavy-light',width=0.003,secondaryWidth=0.0008,gap=0.003)],grids=[4,5,6],photoTreatments=['warm-halftone','muted-color','monochrome','duotone'],folios=['thin-rule','accent-band','split-date-location','date-above-nameplate'],palettes=[dict(id='warm-newsprint',paper='#eee8d7',ink='#302b25',accent='#6c473b'),dict(id='blue-local',paper='#f1ebda',ink='#292d30',accent='#345763'),dict(id='olive-weekly',paper='#eee7d2',ink='#353126',accent='#69704c'),dict(id='neutral-city',paper='#f1eee3',ink='#292725',accent='#595b57')],type=dict(headline='system serif or sans family selected per outlet; no proprietary font bundled',body='serif',caption='serif italic',headlineMin=0.016,headlineMax=0.055,bodySize=0.012,leading=1.16),contentBindings=dict(nameplate='recorded outlet name',folio='recorded edition/date/location; hide missing fields',story='assembled English-engine packet only',photos='recorded/context-compatible approved assets only',advertisement='recorded ad only; omit when absent'),overflow='Reflow longer heads, omit absent photo/caption, continue body at measured word boundary; no invented filler or stretched glyphs.',sources=['R01','R02','R03','R04','R05','R06','R07','R08','R09','R10','R11','R12','R13','R14','R15','R16','R17','R18','R19','R20'])
(b/'kit.json').write_text(json.dumps(kit,indent=2)+'\n')
# Ten distinct editorial topologies; proportions vary in four bounded variations per class.
families=[('photo-left-rail',[[0,0,.70,.64],[.74,0,.26,.64],[0,.69,.47,.31],[.51,.69,.49,.31]],'above-head'),('news-first',[[0,0,1,.25],[0,.30,.66,.70],[.70,.30,.30,.70]],'below-head'),('center-feature',[[0,0,.21,1],[.25,0,.50,.66],[.79,0,.21,1],[.25,.71,.50,.29]],'above-head'),('split-leads',[[0,0,.48,.64],[.52,0,.48,.64],[0,.69,1,.31]],'below-head'),('banner-feature',[[0,0,1,.65],[0,.70,.31,.30],[.35,.70,.31,.30],[.70,.70,.30,.30]],'headline-over-photo'),('text-rail',[[0,0,.31,.64],[.35,0,.65,.64],[0,.69,.65,.31],[.69,.69,.31,.31]],'below-head'),('brief-led',[[0,0,.25,1],[.29,0,.71,.29],[.29,.34,.71,.66]],'below-head'),('tiered-local',[[0,0,1,.20],[0,.25,.61,.42],[.65,.25,.35,.42],[0,.72,.39,.28],[.43,.72,.57,.28]],'above-head'),('photo-pair',[[0,0,.56,.57],[.60,0,.40,.57],[0,.62,.36,.38],[.40,.62,.60,.38]],'paired-photo'),('dense-news',[[0,0,.42,.48],[.46,0,.25,.48],[.75,0,.25,1],[0,.53,.71,.47]],'inset-photo')]
layouts=[]
for ci,category in enumerate(['weekly','midsize-daily','big-city-daily']):
 for fi,(name,cells,photo) in enumerate(families):
  for variant in range(4):
   slots=[];shift=(variant//2)*.024
   for si,(x,y,w,h) in enumerate(cells):
    if variant%2:x=1-x-w
    # Vary vertical boundary slightly while preserving gaps and nonoverlap.
    if y==0 and h<1:h-=shift
    elif y>0:y-=shift
    slots.append(dict(id=f'story-{si+1}',x=round(x,4),y=round(y,4),width=round(w,4),height=round(h,4),priority=si+1,bodyColumns=max(1,round(w*(4+ci))),photoTreatment=kit['photoTreatments'][(fi+variant)%4],photoPlacement=photo if si==0 else ('inset-photo'if si%2 else 'none'),headlineFamily='sans-serif'if fi in[4,6]else'serif',headlineScale=round(.032+(si==0)*.013-ci*.003,4)))
   layouts.append(dict(id=f'{category}-{fi+1:02}-{variant+1:02}',category=category,topology=name,gridColumns=4+ci,margin=.045+ci*.003,gutter=.015+variant*.001,nameplate=kit['nameplates'][(fi+variant+ci)%6]['id'],rule=kit['rules'][(fi+variant)%3]['id'],folio=kit['folios'][(fi+variant)%4],palette=kit['palettes'][(fi+variant+ci)%4]['id'],storyArea=dict(x=.05,y=.19,width=.90,height=.74),slots=slots,references=[f'R{1+(fi%12):02}',f'R{13+fi%8:02}']))
data=dict(schema='ocd-newspaper-layouts/v1',status='candidate-only',count=len(layouts),scope='Data shapes and sample renderer only; game selection/flow not implemented.',layouts=layouts)
(b/'layouts.json').write_text(json.dumps(data,indent=2)+'\n')
# Render the very same data; all review copy is from the supplied owner mockup.
W,H=600,900;COLS=4;tileh=952;canvas=Image.new('RGB',(W*COLS,tileh*3),'#d6ccb8');draw=ImageDraw.Draw(canvas);svg=['<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="2856" viewBox="0 0 2400 2856">','<rect width="2400" height="2856" fill="#d6ccb8"/>']
fontpath='/System/Library/Fonts/Supplemental/'
def font(sz,bold=False,sans=False,italic=False):
 name=('Arial'if sans else'Georgia')+(' Bold Italic'if bold and italic else' Bold'if bold else' Italic'if italic else'')+'.ttf'
 try:return ImageFont.truetype(fontpath+name,max(5,int(sz)))
 except OSError:return ImageFont.load_default()
ox=oy=0

def rect(x,y,w,h,fill,stroke=None):
 draw.rectangle((ox+x,oy+y,ox+x+w,oy+y+h),fill=fill,outline=stroke);svg.append(f'<rect x="{ox+x}" y="{oy+y}" width="{w}" height="{h}" fill="{fill}"'+(f' stroke="{stroke}"'if stroke else'')+'/>')
def line(x,y,x2,y2,color,width=1):
 draw.line((ox+x,oy+y,ox+x2,oy+y2),fill=color,width=max(1,int(width)));svg.append(f'<line x1="{ox+x}" y1="{oy+y}" x2="{ox+x2}" y2="{oy+y2}" stroke="{color}" stroke-width="{width}"/>')
def text(x,y,t,sz,color,bold=False,sans=False,italic=False):
 f=font(sz,bold,sans,italic);draw.text((ox+x,oy+y),t,font=f,fill=color);svg.append(f'<text x="{ox+x}" y="{oy+y+sz}" fill="{color}" font-family="{ "sans-serif"if sans else"Georgia,serif"}" font-size="{sz}" font-weight="{700 if bold else 400}" font-style="{"italic"if italic else"normal"}">{html.escape(t)}</text>')
def wrap(t,width,sz,bold=False,sans=False):
 f=font(sz,bold,sans);rows=[];cur=''
 for word in t.split():
  test=(cur+' '+word).strip()
  if f.getlength(test)>width and cur:rows.append(cur);cur=word
  else:cur=test
 if cur:rows.append(cur)
 return rows
# Original vector illustration used solely as a design-study tile, not a reporting photo.
def illustration(x,y,w,h,treatment):
 sky={'muted-color':'#a6b9b4','warm-halftone':'#c0bca9','monochrome':'#c3c3bd','duotone':'#b3bec4'}[treatment];rect(x,y,w,h,sky);rect(x,y+h*.70,w,h*.30,'#83876f')
 rect(x+w*.15,y+h*.36,w*.70,h*.41,'#c9c1a6', '#4c493e');rect(x+w*.11,y+h*.32,w*.78,h*.05,'#797460')
 for c in range(8):rect(x+w*(.18+c*.083),y+h*.39,w*.035,h*.35,'#e8dfc6');line(x+w*(.20+c*.083),y+h*.39,x+w*(.20+c*.083),y+h*.74,'#625f51')
 rect(x+w*.43,y+h*.13,w*.14,h*.20,'#b2ac95','#4c493e');rect(x+w*.46,y+h*.04,w*.08,h*.10,'#d0c6a9','#4c493e');line(x+w*.50,y,x+w*.50,y+h*.04,'#4c493e');line(x+w*.14,y+h*.79,x+w*.86,y+h*.79,'#d9d0b7',3)
 if treatment=='warm-halftone':
  for yy in range(int(y+3),int(y+h),7):
   for xx in range(int(x+3),int(x+w),7):draw.point((ox+xx,oy+yy),fill='#797465');svg.append(f'<circle cx="{ox+xx}" cy="{oy+yy}" r=".3" fill="#797465"/>')
selected=[layouts[i]for i in[0,5,10,15,56,61,66,71,112,117,82,87]]
for pi,layout in enumerate(selected):
 ox=(pi%4)*600;oy=(pi//4)*tileh;pal=next(x for x in kit['palettes']if x['id']==layout['palette']);ink=pal['ink'];accent=pal['accent'];p=papers[pi%len(papers)];rect(7,8,586,884,'#938670');rect(3,2,586,884,pal['paper'],'#80745e');line(20,445,574,445,'#c7bba3',1)
 np=next(n for n in kit['nameplates']if n['id']==layout['nameplate']);sans=np['font']=='sans-serif';mast=p['name'].upper()if np['case']=='upper'else p['name'];sz=32
 while font(sz,True,sans).getlength(mast)>545:sz-=1
 mx=26 if np['align']=='left'else (586-font(sz,np['weight']>400,sans).getlength(mast))/2;text(mx,27,mast,sz,ink,np['weight']>400,sans,layout['nameplate']=='italic-local');text(28,64,p['tagline'],10,accent,False,False,True);line(28,86,560,86,ink,3 if layout['rule']=='heavy-light'else 1);
 if layout['rule']!='hairline':line(28,91,560,91,ink,1)

 if layout['folio']=='accent-band':rect(28,95,532,17,accent)
 text(28,99,p['folio'][1],9,pal['paper']if layout['folio']=='accent-band'else ink);text(333,99,p['folio'][2]+' · '+p['folio'][-1],9,pal['paper']if layout['folio']=='accent-band'else ink);line(28,115,560,115,accent,1)
 for ei,(label,value) in enumerate(p.get('ears',[])[:2]):
  text(28+ei*270,124,label.upper(),8,accent,True,True)
  for ri,row in enumerate(wrap(value,250,8)[:2]):text(28+ei*270,135+ri*9,row,8,ink)
 storylist=[p['stories']['lead'],p['stories']['second'],*p['stories']['below']]
 for si,slot in enumerate(layout['slots']):
  if si>=len(storylist):continue
  st=storylist[si];area=layout['storyArea'];x=W*(area['x']+slot['x']*area['width']);y=H*(area['y']+slot['y']*area['height']);w=W*slot['width']*area['width'];h=H*slot['height']*area['height'];end=y+h
  text(x,y,st.get('kicker','').upper(),9,accent,True,True);y+=17;photo=st.get('photo')and slot['photoPlacement']!='none'and h>210;ph=min(h*.25,w*.56,130)
  if photo and slot['photoPlacement']in['above-head','paired-photo']:
   illustration(x,y,w,ph,slot['photoTreatment']);y+=ph+6;text(x,y,'ILLUSTRATION',7,ink,False,True);y+=13
  sz=max(12,int(W*slot['headlineScale']));rows=wrap(st['hl'],w,sz,True,slot['headlineFamily']=='sans-serif')
  while len(rows)>4 and sz>12:sz-=1;rows=wrap(st['hl'],w,sz,True,slot['headlineFamily']=='sans-serif')
  for row in rows[:max(1,int((end-y-45)/(sz*1.13)))]:text(x,y,row,sz,ink,True,slot['headlineFamily']=='sans-serif');y+=sz*1.13
  y+=6
  if st.get('deck'):
   for row in wrap(st['deck'],w,10)[:max(0,min(3,int((end-y-30)/12)))]:text(x,y,row,10,ink,False,False,True);y+=12
   y+=4
  if photo and slot['photoPlacement']not in['above-head','paired-photo']and y+ph+40<end:
   illustration(x,y,w,ph,slot['photoTreatment']);y+=ph+6;text(x,y,'ILLUSTRATION',7,ink,False,True);y+=13
  body=' '.join(st['body']+st.get('more',[]));columns=slot['bodyColumns'];cw=(w-(columns-1)*9)/columns;rows=wrap(body,cw,10.5);cap=max(0,int((end-y-16)/12));pos=0
  for col in range(columns):
   for ri,row in enumerate(rows[pos:pos+cap]):text(x+col*(cw+9),y+ri*12,row,10.5,ink)
   pos+=cap
  if pos<len(rows):text(x,end-10,'Continued inside',8,accent,False,False,True)
  if si:line(x,y-5,x+w,y-5,accent,.6)
 text(28,853,' · '.join(p['index'])[:95],8,ink);line(28,845,560,845,ink,1);text(20,909,layout['id']+' / REVIEW ONLY',12,'#302b25',True,True)
svg.append('</svg>');(b/'samples.svg').write_text('\n'.join(svg)+'\n');canvas.save(b/'contact-sheet.jpg',quality=94)
print('120 unique layout records; 12 same-data sample renders; no runtime wiring')
