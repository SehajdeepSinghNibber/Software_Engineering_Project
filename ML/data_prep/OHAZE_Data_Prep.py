from glob import glob
import os
import cv2

in_dir = "./data/O-HAZE/hazy"
out_dir = "./data/staged_O-HAZE"
os.makedirs(out_dir, exist_ok=True)

OHAZE_paths = glob(os.path.join(in_dir, "*.*")

for path in OHAZE_paths:
  img = cv2.imread(path)
  if img is not None:
    img = cv2.resize(img, (256, 256))
    cv2.imwrite(os.path.join(out_dir, os.path.basename(path)), img)

print("RICE-1 images resized to 256x256.")
