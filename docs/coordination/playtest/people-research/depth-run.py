import sys,torch,numpy as np
from PIL import Image
from transformers import pipeline
pipe=pipeline("depth-estimation",model="depth-anything/Depth-Anything-V2-Small-hf",device=-1)
for src,out in zip(sys.argv[1::2],sys.argv[2::2]):
    im=Image.open(src).convert("RGB")
    r=pipe(im)
    d=r["predicted_depth"].squeeze().numpy() if hasattr(r["predicted_depth"],"numpy") else np.array(r["predicted_depth"])
    np.save(out+".npy",d)
    d=(d-d.min())/(d.max()-d.min()+1e-9)
    Image.fromarray((d*255).astype("uint8")).resize(im.size).save(out+".png")
    print(src,im.size,d.shape)
