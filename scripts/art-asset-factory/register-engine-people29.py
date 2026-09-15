"""Register only V's explicitly supplied families. Native SVG composition, no rasterization."""
from pathlib import Path
import json,hashlib,sys,subprocess
root=Path(__file__).resolve().parents[2]
pack=next((a.split('=',1)[1] for a in sys.argv if a.startswith('--pack=')), 'engine-people29')
assert pack in ['engine-people29','engine-people34','engine-people35','engine-people36','engine-people40','engine-people41']
base=root/'art/authoring'/pack
out=root/'art/generated/candidates'/pack
check='--check' in sys.argv
outputs={}
if not check: out.mkdir(parents=True,exist_ok=True)
records=[];fits=[];templates={};families=[]
def sha(b):return hashlib.sha256(b).hexdigest()
def read(path,expected=None):
 b=(root/path).read_bytes()
 if expected:assert sha(b)==expected,path
 return b.decode()
def inside(svg):return svg[svg.index('>')+1:svg.rindex('</svg>')]
family_names = ['masc-average','fem-average'] if pack == 'engine-people40' else ['masc-average','fem-average','masc-heavy','masc-lean','fem-lean','fem-heavy']
for name in family_names:
 mp=base/'families'/name/'manifest.json'
 assert mp.exists(), f'Missing frozen family: {mp}'
 m=json.loads(mp.read_text());families.append(m); lm=m['geometry']['landmarks']; anchors={a:lm[b] for a,b in [('head','head'),('torso','torso'),('hips','waist'),('feet','leftFoot'),('crown','crown')]};anchors['feet']={'x':300,'y':lm['leftFoot']['y']};parts={p['id']:p for p in m['parts']};body=next(p['id'] for p in m['parts'] if p['kind']=='body');heads=[p['id'] for p in m['parts'] if p['kind']=='head']
 for p in m['parts']:
  read(p['svgPath'],p['sha256'])
  if p['kind']=='face-feature' or 'side-reference' in p['id'] or p['id'].endswith('-sleeves'):continue
  ident=p['id'];kind=p['kind'];sources=[ident]
  if kind=='top' and ident.endswith('-torso'):sources=[ident.replace('-torso','-sleeves'),ident]
  if kind=='head':sources += [i for i in m['recipes']['default'] if parts[i]['kind']=='face-feature' and not i.endswith('-painted')]
  svg='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1200" viewBox="0 0 600 1200">'+''.join(inside(read(parts[i]['svgPath'],parts[i]['sha256'])) for i in sources)+'</svg>'
  path=out/(p.get('generatedName',ident)+'.svg')
  if path in outputs: assert outputs[path]==svg.encode(), f'Shared part drift: {path}'
  outputs[path]=svg.encode()
  definition={'kind':kind,'family':ident,'layer':p['layer'],'canvas':m['canvas']}
  if kind=='body':
   definition.update(pose_family=m['pose'],head_orientation='front',root={'convention':'pelvis-hip-center','x':m['geometry']['landmarks']['root']['x']/600,'y':m['geometry']['landmarks']['root']['y']/1200},attachment_anchors=[{'id':a,'x':p['x']/600,'y':p['y']/1200} for a,p in anchors.items()],contacts={'leftFoot':{'x':m['geometry']['landmarks']['leftFoot']['x']/600,'y':m['geometry']['landmarks']['leftFoot']['y']/1200},'rightFoot':{'x':m['geometry']['landmarks']['rightFoot']['x']/600,'y':m['geometry']['landmarks']['rightFoot']['y']/1200}})
   # Each full-canvas part carries the same authored anchor coordinate as its matching body anchor, giving exact zero-offset placement.
  else:
   anchor={'head':'head','hair-front':'crown','top':'torso','bottom':'hips','footwear':'feet'}[kind]
   definition.update(attaches_to=anchor,origin={'x':anchors[anchor]['x']/600,'y':anchors[anchor]['y']/1200},compatible_body_families=[body],compatible_pose_families=[m['pose']],compatible_head_orientations=['front'])
   if kind=='hair-front':definition['compatible_head_families']=p.get('compatibleHeadIds',heads)
  if kind=='top':
   owner=ident.replace('-sleeves','-torso').replace('-collar','-torso')
   definition['family']=owner
   if ident==owner:definition['render_piece_ids']=[ident.replace('-torso','-collar')]
   else:definition['render_piece_of']=owner
  records.append({'asset_id':ident,'asset_type':'character-component-candidate','fixed_or_modular':'modular','availability':'production-candidate','generation_status':'draft','qa_status':'pending','runtime_release_status':'unreleased','final_path':str(path.relative_to(root)),'hash':sha(svg.encode()),'candidate_component':definition})
  templates[ident]={'familyId':m['id'],'partIds':sources,'sourceSha256':sha(svg.encode())}
  if kind in ['top','bottom','footwear','accessory'] and 'render_piece_of' not in definition:
   fits.append({'component_family':definition['family'],'kind':kind,'classification':'affine-reusable','authored_for_body_family':body,'basis':'P29 V shared native SVG canvas. Identity mapping, authored coordinates, unapproved candidate; no fitted raster stretch.','profiles':[{'target_body_family':body,'pose_family':m['pose'],'transform':{'kind':'affine','scaleX':1,'scaleY':1,'translateX':0,'translateY':0}}]})
outputs[root/f'art/manifest/character_candidate_{pack.replace("engine-people","engine")}_registry.json']=(json.dumps({'schema':'engine-people29-registration-v1','assets':records,'garments':fits,'templates':templates,'families':families},indent=2)+'\n').encode()
registry=root/f'art/manifest/character_candidate_{pack.replace("engine-people","engine")}_registry.json'
outputs[registry]=subprocess.run([str(root/"node_modules/.bin/prettier"),"--parser","json"],input=outputs[registry],stdout=subprocess.PIPE,check=True).stdout
for path,content in outputs.items():
 if check: assert path.read_bytes()==content, f'Registration drift: {path}'
 else: path.write_bytes(content)
assert set(out.glob('*.svg'))=={p for p in outputs if p.suffix=='.svg'}, 'Unexpected generated component files'
print(len(families),'families',len(records),'registered native components')
