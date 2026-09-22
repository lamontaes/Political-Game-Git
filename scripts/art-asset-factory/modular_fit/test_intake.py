import copy,unittest
from intake import fit_recipe, fit_hair, IntakeError

class DescriptorTests(unittest.TestCase):
 def setUp(self):
  cal={'version':'v1','provenance':'synthetic fixture, not art','status':'calibrated','confidence':'fixture'}
  self.h={'id':'new-source','schemaVersion':1,'calibration':cal,'canvas':[600,1200],'view':'front','pose':'standing','paint':{'sha256':'a'*64},'geometry':{'anatomy':[240,20,370,200],'attachment':[300,200],'crown':[300,20],'chin':[300,200],'eyeLine':110}}
  self.b={'id':'new-body','schemaVersion':1,'calibration':cal,'canvas':[600,1200],'view':'front','compatibleSourcePoses':['standing'],'socket':{'attachment':[280,220],'heightRange':[150,165],'widthRange':[100,140],'preferredHeight':160}}
 def test_new_data_only_body_and_head(self):
  a=fit_recipe(self.h,self.b);b=copy.deepcopy(self.b);b['id']='held-out-body';b['socket']['attachment']=[320,235]
  v=fit_recipe(self.h,b);self.assertEqual(a['transform']['scale'],v['transform']['scale']);self.assertEqual(v['attachment'],(320,235))
 def test_cache_covers_calibration_and_masks(self):
  a=fit_recipe(self.h,self.b);h=copy.deepcopy(self.h);h['ownershipMask']={'sha256':'b'*64};self.assertNotEqual(a['cacheKey'],fit_recipe(h,self.b)['cacheKey'])
 def test_distinct_missing_and_ambiguous(self):
  h=copy.deepcopy(self.h);del h['geometry']
  with self.assertRaisesRegex(IntakeError,'missing_geometry'):fit_recipe(h,self.b)
  h=copy.deepcopy(self.h);h['calibration']['status']='unknown'
  with self.assertRaisesRegex(IntakeError,'ambiguous_segmentation'):fit_recipe(h,self.b)
 def test_pose_and_view_refusal(self):
  b=copy.deepcopy(self.b);b['view']='profile'
  with self.assertRaisesRegex(IntakeError,'incompatible_view'):fit_recipe(self.h,b)
  b['compatibleSourcePoses']=[]
  with self.assertRaisesRegex(IntakeError,'unsupported_pose'):fit_recipe(self.h,b)
 def test_no_raster_enlargement(self):
  b=copy.deepcopy(self.b);b['socket'].update(heightRange=[200,240],widthRange=[140,180],preferredHeight=210)
  with self.assertRaisesRegex(IntakeError,'native_detail_shortfall'):fit_recipe(self.h,b)
 def test_turned_head_requires_explicit_socket_view_support(self):
  h=copy.deepcopy(self.h);h['view']='three-quarter-left';b=copy.deepcopy(self.b);b['neckOwnership']='body-layer'
  with self.assertRaisesRegex(IntakeError,'incompatible_view'):fit_recipe(h,b)
  b['supportedHeadViews']=['front','three-quarter-left'];r=fit_recipe(h,b)
  self.assertEqual(r['sourceView'],'three-quarter-left');self.assertEqual(r['bodyView'],'front')
  self.assertEqual(r['attachment'],(280,220))
 def test_frontal_hair_cannot_follow_a_turned_face(self):
  h=copy.deepcopy(self.h);h['view']='three-quarter-left'
  hair={'view':'front','pose':h['pose']}
  with self.assertRaisesRegex(IntakeError,'incompatible_view'):fit_hair(None,hair,h,self.b,{})
 def test_view_changes_invalidate_fit_recipe(self):
  b=copy.deepcopy(self.b);b.update(neckOwnership='body-layer',supportedHeadViews=['front','three-quarter-right'])
  first=fit_recipe(self.h,b);h=copy.deepcopy(self.h);h['view']='three-quarter-right'
  self.assertNotEqual(first['cacheKey'],fit_recipe(h,b)['cacheKey'])
if __name__=='__main__':unittest.main()
