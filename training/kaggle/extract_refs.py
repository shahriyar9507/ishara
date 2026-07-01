"""Copy one small reference clip per word from bdslw60videoclips -> /kaggle/working/refs/.
Downscaled + short, so the app can bundle 60 reference clips for a Practice/Learn mode."""
import os, glob, subprocess, sys
from pathlib import Path

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "opencv-python-headless"], check=False)
import cv2

def find_root():
    for base in glob.glob("/kaggle/input/*"):
        for dp, dirs, files in os.walk(base):
            if any(f.lower().endswith(".mp4") for f in files):
                return str(Path(dp).parent)
    raise SystemExit("no mp4s")

ROOT = find_root()
out = Path("/kaggle/working/refs"); out.mkdir(parents=True, exist_ok=True)
words = sorted(d for d in Path(ROOT).iterdir() if d.is_dir())
print("words:", len(words))

for wd in words:
    clips = sorted(wd.glob("*.mp4"), key=lambda p: p.stat().st_size)  # smallest first
    if not clips:
        continue
    src = str(clips[0])
    cap = cv2.VideoCapture(src)
    fps = cap.get(cv2.CAP_PROP_FPS) or 20
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    scale = 240 / max(1, h)
    nw, nh = int(w*scale), 240
    dst = str(out / f"{wd.name}.mp4")
    vw = cv2.VideoWriter(dst, cv2.VideoWriter_fourcc(*"mp4v"), min(fps, 20), (nw, nh))
    n = 0
    while n < 60:  # cap ~3s
        ok, fr = cap.read()
        if not ok: break
        vw.write(cv2.resize(fr, (nw, nh))); n += 1
    cap.release(); vw.release()
    print("  ref:", wd.name, n, "frames")

print("DONE — refs in /kaggle/working/refs/")
