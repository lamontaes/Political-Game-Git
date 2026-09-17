import unittest
import numpy as np
from PIL import Image, ImageDraw
from fit_core import Fit, warp_group, warp_material_group

class MaterialSamplingTests(unittest.TestCase):
    def test_material_stays_complete_at_translucent_source_and_resampled_edges(self):
        paint=Image.new('RGBA',(32,32))
        ImageDraw.Draw(paint).ellipse((3,3,28,28),fill=(230,120,70,180))
        weight=np.array(paint);weight[...,:3]=128
        weight[...,3]=np.where(weight[...,3]>0,255,0)
        transform=Fit(.61,1.3,2.7)
        result=warp_material_group(paint,[Image.fromarray(weight)],transform,(24,24))
        alpha=np.array(result[0])[...,3];mapped=np.array(result[1])
        self.assertTrue(np.all(mapped[...,3][alpha>0]==255))
        self.assertTrue(np.array_equal(np.array(result[0]),np.array(warp_group([paint],transform,(24,24))[0])))

    def test_excluded_feature_and_alpha_are_preserved(self):
        paint=Image.new('RGBA',(20,20),(180,100,60,255))
        material=Image.new('RGBA',(20,20),(128,128,128,255))
        ImageDraw.Draw(material).rectangle((5,5,14,14),fill=(128,128,128,0))
        result=warp_material_group(paint,[material],Fit(1,0,0),(20,20))
        self.assertEqual(result[1].getpixel((10,10))[3],0)
        self.assertEqual(result[1].getpixel((0,0))[3],255)

if __name__=='__main__':unittest.main()
