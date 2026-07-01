"""Quick structure probe for a Kaggle dataset — prints folder layout, file-type histogram,
and sample paths, and writes /kaggle/working/structure.json. Fast (~1 min), no heavy deps."""
import json, os, glob, collections
from pathlib import Path

roots = glob.glob("/kaggle/input/*")
print("input roots:", roots)

info = {"roots": roots, "ext_hist": {}, "top_dirs": [], "samples": []}
ext = collections.Counter()
for base in roots:
    for dp, dirs, files in os.walk(base):
        for f in files:
            ext[Path(f).suffix.lower()] += 1

info["ext_hist"] = dict(ext.most_common(20))
print("file extensions:", info["ext_hist"])

# Top-level structure under each root (2 levels)
for base in roots:
    entries = sorted(os.listdir(base))[:60]
    info["top_dirs"].append({"root": base, "entries": entries})
    print(f"\n{base} -> {len(entries)} entries:")
    for e in entries[:40]:
        p = os.path.join(base, e)
        if os.path.isdir(p):
            sub = sorted(os.listdir(p))[:5]
            print(f"  [DIR] {e}/  (e.g. {sub})")
        else:
            print(f"  [FILE] {e}")

# Sample a few video files and their parent-folder (likely the word label)
vids = []
for base in roots:
    for dp, dirs, files in os.walk(base):
        for f in files:
            if Path(f).suffix.lower() in {".mp4", ".avi", ".mov", ".mkv", ".webm"}:
                vids.append(os.path.join(dp, f))
        if len(vids) > 30:
            break
info["samples"] = vids[:15]
info["video_count_sampled"] = len(vids)
print("\nsample videos:")
for v in vids[:15]:
    print("  parent:", Path(v).parent.name, "| file:", Path(v).name)

# distinct parent folders of videos (candidate word labels)
labels = sorted({Path(v).parent.name for v in vids})
info["candidate_labels_sample"] = labels[:40]
print("\ncandidate word-label folders (sample):", labels[:40])

Path("/kaggle/working/structure.json").write_text(json.dumps(info, ensure_ascii=False, indent=2))
print("\nwrote structure.json")
