import unittest
import os
from pathlib import Path
import numpy as np
from PIL import Image
from fit_core import *

ROOT=Path(os.environ.get('MODULAR_SUPPLIED_EVIDENCE', '/nonexistent-private-evidence'))

class FitTests(unittest.TestCase):
    def source(self,w=120,h=180,attachment=(300,200),view='front',cal='test-source'):
        return HeadGeometry(Box(240,20,240+w,20+h),attachment,view,cal)
    def target(self,point=(310,230),heights=(160,180),widths=(95,150),preferred=168,view='front',cal='test-body'):
        return BodySocket(point,heights,widths,preferred,view,cal)
    def test_uniform_preserves_aspect(self):
        s=self.source();r=solve_fit(s,self.target());b=r.transform.box(s.anatomy)
        self.assertAlmostEqual(b.width/b.height,s.anatomy.width/s.anatomy.height)
    def test_attachment_exact(self):
        s=self.source();t=self.target();r=solve_fit(s,t)
        np.testing.assert_allclose(r.transform.point(s.attachment),t.attachment)
    def test_no_fit_is_not_squeezed(self):
        r=solve_fit(self.source(w=240),self.target(widths=(80,100)))
        self.assertEqual(r.status,'needs_source_review');self.assertIsNone(r.transform)
    def test_view_mismatch(self):
        self.assertEqual(solve_fit(self.source(view='profile'),self.target()).status,'incompatible_view')
    def test_uncalibrated_refused(self):
        self.assertEqual(solve_fit(self.source(cal=''),self.target()).status,'needs_calibration')
    def test_padding_coordinate_invariance(self):
        s=self.source();t=self.target();f=solve_fit(s,t).transform
        sp=HeadGeometry(Box(280,60,400,240),(340,240),'front','padded-source')
        fp=solve_fit(sp,t).transform
        np.testing.assert_allclose(f.point((240,20)),fp.point((280,60)))
    def test_new_body_no_asset_branch(self):
        s=self.source();one=solve_fit(s,self.target()).transform
        two=solve_fit(s,self.target(point=(280,255))).transform
        self.assertEqual(one.scale,two.scale);self.assertNotEqual(one.dy,two.dy)
    def test_new_head_only_data(self):
        r=solve_fit(self.source(w=142,h=195),self.target())
        self.assertEqual(r.status,'fitted')
    def test_finite_validation(self):
        with self.assertRaises(ValueError):solve_fit(self.source(w=float('nan')),self.target())
    def test_reversed_range(self):
        with self.assertRaises(ValueError):solve_fit(self.source(),self.target(heights=(180,160)))
    def test_empty_image(self):
        self.assertIsNone(visible_bounds(Image.new('RGBA',(16,16))))
    def test_semantic_mask_not_neck_slab(self):
        a=np.zeros((30,30,4),np.uint8);a[2:20,6:22]=(120,80,50,255);a[20:28,2:27]=(120,80,50,255)
        m=np.zeros((30,30),np.uint8);m[2:20,6:22]=255
        im=Image.fromarray(a)
        self.assertEqual(visible_bounds(im).height,26)
        self.assertEqual(visible_bounds(im,semantic_mask=Image.fromarray(m)).height,18)
    def test_hidden_rgb_does_not_enlarge_bounds(self):
        a=np.zeros((16,16,4),np.uint8);a[:,:,:3]=(0,255,0);a[5:10,5:10]=(100,50,30,255)
        self.assertEqual(visible_bounds(Image.fromarray(a)),Box(5,5,10,10))
    def test_group_same_warp(self):
        im=Image.new('RGBA',(32,32));im.paste((70,40,20,255),(8,8,20,20))
        a,b=warp_group([im,im],Fit(.85,2,3),(32,32))
        self.assertEqual(a.tobytes(),b.tobytes())
    def test_no_transparent_rgb_fringe_after_warp(self):
        a=np.zeros((16,16,4),np.uint8);a[:,:,:3]=(0,255,0);a[4:12,4:12]=(180,90,45,255)
        b=a.copy();b[b[:,:,3]==0,:3]=0
        x=warp_group([Image.fromarray(a)],Fit(.77,.3,.4),(16,16))[0]
        y=warp_group([Image.fromarray(b)],Fit(.77,.3,.4),(16,16))[0]
        self.assertEqual(x.tobytes(),y.tobytes())
    def test_portrait_union_retains_hair(self):
        f=union_frame([Box(240,20,360,200),Box(205,0,392,120)],12)
        self.assertLessEqual(f.top,-12);self.assertGreaterEqual(f.right,404)
        self.assertAlmostEqual(f.width,f.height)
    def test_replay_same_inputs(self):
        self.assertEqual(solve_fit(self.source(),self.target()),solve_fit(self.source(),self.target()))

class MaterialTests(unittest.TestCase):
    def inputs(self):
        a=np.full((10,10,4),(160,125,90,255),np.uint8);a[0,:,3]=0
        m=np.zeros((10,10),np.uint8);m[2:8,2:8]=255
        return Image.fromarray(a),Image.fromarray(m),np.linspace(0,1,100).reshape(10,10)
    def test_mask_changes_pixels(self):
        im,m,s=self.inputs();out=remap_material(im,m,s,((25,14,9),(70,39,25),(120,76,50)))
        self.assertNotEqual(out.tobytes(),im.tobytes())
    def test_outside_mask_exact(self):
        im,m,s=self.inputs();out=remap_material(im,m,s,((25,14,9),(70,39,25),(120,76,50)))
        keep=np.asarray(m)==0;np.testing.assert_array_equal(np.asarray(out)[keep],np.asarray(im)[keep])
    def test_alpha_exact(self):
        im,m,s=self.inputs();out=remap_material(im,m,s,((25,14,9),(70,39,25),(120,76,50)))
        self.assertEqual(out.getchannel('A').tobytes(),im.getchannel('A').tobytes())
    def test_invalid_mask_refused(self):
        im,m,s=self.inputs()
        with self.assertRaises(ValueError):remap_material(im,Image.new('L',(1,1)),s,((0,0,0),(1,1,1),(2,2,2)))
    def test_nonfinite_shade_refused(self):
        im,m,s=self.inputs();s[0,0]=np.nan
        with self.assertRaises(ValueError):remap_material(im,m,s,((0,0,0),(1,1,1),(2,2,2)))
    def test_seven_authored_ramps_can_change_same_art(self):
        im,m,s=self.inputs();outputs=[]
        # Synthetic test ramps, NOT the game's production complexion palette.
        for n in range(7):
            outputs.append(remap_material(im,m,s,((10+n*10,5+n*8,3+n*7),(35+n*20,20+n*18,12+n*17),(70+n*25,40+n*26,25+n*26))).tobytes())
        self.assertEqual(len(set(outputs)),7)

@unittest.skipUnless(ROOT.exists(), "requires supplied private evidence bundle")
class RealSourceMeasurements(unittest.TestCase):
    def test_actual_heads_read_and_measure(self):
        cases=[('masc-average','head-average',168),('masc-average','head-heavy-v2',193),('fem-heavy','head-average',166),('fem-heavy','head-heavy-v2',195)]
        for family,name,h in cases:
            with self.subTest(family=family,name=name):
                im=Image.open(ROOT/'inputs'/family/(name+'.png'))
                self.assertEqual(im.size,(600,1200));self.assertEqual(visible_bounds(im).height,h)
    def test_actual_padding_does_not_change_extent(self):
        im=Image.open(ROOT/'inputs/masc-average/head-heavy-v2.png').convert('RGBA')
        padded=Image.new('RGBA',(640,1240));padded.paste(im,(20,20));a,b=visible_bounds(im),visible_bounds(padded)
        self.assertEqual((a.width,a.height),(b.width,b.height))
        self.assertEqual((b.left-a.left,b.top-a.top),(20,20))
    def test_actual_registry_only_source_colour(self):
        import json
        r=json.loads((ROOT/'sources/character_candidate_engine41_registry.json').read_text())
        ramps={ramp['id'] for f in r['families'] for p in f['parts'] for m in p.get('materials',[]) for ramp in m['ramps']}
        self.assertEqual(ramps,{'source-colour'})
    def test_twelve_actual_v2_heads_lack_material_regions(self):
        import json
        r=json.loads((ROOT/'sources/character_candidate_modular41_heads.json').read_text())
        ps=[p for parts in r['familyAdditions'].values() for p in parts if p['kind']=='head']
        self.assertEqual(len(ps),12);self.assertTrue(all(not p['materials'] for p in ps))

if __name__=='__main__':unittest.main(verbosity=2)
