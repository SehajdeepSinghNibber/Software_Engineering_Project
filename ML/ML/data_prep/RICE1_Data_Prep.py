from glob import glob
import os
import cv2

in_dir = "./data/RICE1/cloud"
out_dir = "./data/staged_rice1"
os.makedirs(out_dir, exist_ok=True)

RICE1_paths = glob(os.path.join(in_dir, "*.*")

for path in RICE1_paths:
  img = cv2.imread(path)
  if img is not None:
    img = cv2.resize(img, (256, 256))
    cv2.imwrite(os.path.join(out_dir, os.path.basename(path)), img)

print("RICE-1 images resized to 256x256.")
