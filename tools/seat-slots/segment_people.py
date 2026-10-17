"""Produce independent semantic person masks; never read the old difference masks.

The source JPEG is immutable. Each output directory records the exact model,
thresholds, source hash, instance score, and model box for reproducibility.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


def main():
    import torch
    from torchvision.models.detection import (
        MaskRCNN_ResNet50_FPN_V2_Weights,
        maskrcnn_resnet50_fpn_v2,
    )

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sources", nargs="+", type=Path)
    parser.add_argument("--threads", type=int, default=4)
    args = parser.parse_args()
    torch.set_num_threads(args.threads)
    weights = MaskRCNN_ResNet50_FPN_V2_Weights.COCO_V1
    model = maskrcnn_resnet50_fpn_v2(weights=weights).eval()
    for source in args.sources:
        dest = source.with_suffix(".persons")
        if dest.exists():
            record = json.loads((dest / "provenance.json").read_text())
            if record["source_sha256"] != hashlib.sha256(source.read_bytes()).hexdigest():
                raise ValueError(f"Source changed: {source}")
            if not all((dest / item["mask"]).is_file() for item in record["instances"]):
                raise ValueError(f"Incomplete existing masks: {dest}")
            print(f"Preserving existing masks: {dest}", flush=True)
            continue
        picture = Image.open(source).convert("RGB")
        with torch.inference_mode():
            result = model([weights.transforms()(picture)])[0]
        dest.mkdir()
        records = []
        for index in range(len(result["scores"])):
            score = float(result["scores"][index])
            if int(result["labels"][index]) != 1 or score < 0.8:
                continue
            mask = (result["masks"][index, 0].numpy() >= 0.5).astype(np.uint8) * 255
            name = f"{len(records):03d}.png"
            Image.fromarray(mask).save(dest / name)
            records.append({"mask": name, "score": score,
                            "box": result["boxes"][index].tolist()})
        provenance = {
            "tool": "torchvision.maskrcnn_resnet50_fpn_v2",
            "weights": "MaskRCNN_ResNet50_FPN_V2_Weights.COCO_V1",
            "torch": torch.__version__, "source": source.name,
            "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "size": list(picture.size), "score_threshold": 0.8,
            "mask_threshold": 0.5, "instances": records,
        }
        (dest / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
        print(f"{source}: {len(records)} people", flush=True)


if __name__ == "__main__":
    main()
