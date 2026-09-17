"""Prepare calibrated pose descriptors with the same fitter and materials.

No source names or body-specific branches. Pose paint, neck ownership, sockets,
contacts and supported views must be supplied as data; no new view is invented.
"""
import copy,json,sys
from pathlib import Path
import numpy as np
from PIL import Image
from intake import fit_head,fit_hair,pinned_image,digest,IntakeError
from prepare import emit,png
from fit_core import visible_bounds

def prepare_poses(spec,root):
 registry=json.loads((root/spec['registry']).read_text())
 heads={x['id']:x for x in spec['heads']}; bodies={x['id']:x for x in spec['bodies']}; hairs={x['id']:x for x in spec['hairstyles']}
 generated={};variants=[];head_cache={};hair_cache={}
 def layer(identifier,family,kind,order,paint,maps,recipe):
  if identifier not in generated:
   part,_=emit(root,spec,identifier,'pose-'+kind,order,paint,maps,spec['ramps'])
   part.update(introducedGeneration=spec['generation'],fitRecipe=recipe)
   if identifier in registry['templates']:raise IntakeError('duplicate_id',identifier)
   registry['familyAdditions'].setdefault(family,[]).append(part)
   registry['templates'][identifier]={'familyId':family,'partIds':[identifier],'sourceSha256':part['sha256']}
   path=root/spec['outputPoseRaster']/f'{identifier}.png';path.parent.mkdir(parents=True,exist_ok=True)
   data=png(paint)
   if path.exists() and path.read_bytes()!=data:raise IntakeError('immutable_output_conflict',str(path))
   path.write_bytes(data)
   generated[identifier]={'assetId':identifier,'kind':kind,'layer':order,'path':str(path.relative_to(root)),'sha256':digest(data),'x':0,'y':0,'width':paint.width,'height':paint.height}
  return generated[identifier]
 for rule in spec['poseVariants']:
  body=bodies[rule['body']];head=heads[rule['head']];family=rule['family'];v=copy.deepcopy(rule['variant']);layers=[]
  for item in rule['staticLayers']:
   paint=pinned_image(root,item['paint'],body['canvas']);maps={c:pinned_image(root,r,body['canvas']) for c,r in item.get('materialMaps',{}).items()}
   layers.append(layer(item['id'],family,item['kind'],item['layer'],paint,maps,{'source':item['paint'],'materialMaps':item.get('materialMaps',{})}))
  key=(head['id'],body['id'])
  if key not in head_cache:head_cache[key]=fit_head(root,head,body)
  hp,hm,recipe=head_cache[key]
  # Garment-owned pixels occlude the body-owned neck, just as in standing.
  coverage=np.ones((hp.height,hp.width),float)
  for item in rule['staticLayers']:
   if item.get('coversNeck'):
    coverage*=1-np.array(pinned_image(root,item['paint'],body['canvas']))[...,3]/255
  a=np.array(hp);a[...,3]=np.rint(a[...,3]*coverage).astype('uint8');hp=Image.fromarray(a)
  layers.append(layer(rule['headPart'],family,'head',50,hp,hm,recipe))
  if rule.get('hair'):
   hair=hairs[rule['hair']];hk=(*key,hair['id'])
   if hk not in hair_cache:hair_cache[hk]=fit_hair(root,hair,head,body,recipe)
   paint,maps,receipt=hair_cache[hk]
   layers.append(layer(rule['hairPart'],family,'hair-front',55,paint,maps,receipt))
  v['layers']=layers
  composite=Image.new('RGBA',tuple(body['canvas']))
  for item in sorted(layers,key=lambda x:x['layer']):composite.alpha_composite(Image.open(root/item['path']).convert('RGBA'))
  b=visible_bounds(composite);v['alphaBounds']={'x':b.left,'y':b.top,'width':b.width,'height':b.height}
  v['contacts']['crown']={'x':recipe['anatomy']['left']+(recipe['anatomy']['right']-recipe['anatomy']['left'])/2,'y':b.top}
  v['humanAcceptance']='pending';variants.append(v)
 (root/spec['registry']).write_text(json.dumps(registry,indent=2)+'\n')
 (root/spec['posePack']).write_text(json.dumps({'schema':'calibrated-pose-v1','acceptance':'candidate-unapproved','variants':variants},indent=2)+'\n')
 return {'variants':len(variants),'preparedLayers':len(generated)}

if __name__=='__main__':
 print(prepare_poses(json.loads(Path(sys.argv[1]).read_text()),Path(sys.argv[2]).resolve()))
