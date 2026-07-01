"""Ishara — download a Kaggle dataset via the REST API and unzip it into data/raw/.

Auth: reads ~/.kaggle/kaggle.json ({"username","key"}) or KAGGLE_USERNAME/KAGGLE_KEY env.
The classic key also works as the hex part of a new "KGAT_<hex>" token.

Usage:
    python -m src.download_data --ref mdhadiuzzaman/baust-lipi-a-bdsl-dataset --name baust_lipi
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import zipfile
from pathlib import Path
from urllib.request import Request, urlopen
from base64 import b64encode

from . import config


def _creds() -> tuple[str, str]:
    j = Path.home() / ".kaggle" / "kaggle.json"
    if j.exists():
        d = json.loads(j.read_text())
        return d["username"], d["key"]
    u, k = os.environ.get("KAGGLE_USERNAME"), os.environ.get("KAGGLE_KEY")
    if u and k:
        return u, k
    sys.exit("No Kaggle credentials. Create ~/.kaggle/kaggle.json or set KAGGLE_USERNAME/KAGGLE_KEY.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Download + unzip a Kaggle dataset into data/raw/<name>/.")
    ap.add_argument("--ref", required=True, help="owner/dataset-slug")
    ap.add_argument("--name", required=True, help="local folder name under data/raw/")
    args = ap.parse_args()

    user, key = _creds()
    auth = "Basic " + b64encode(f"{user}:{key}".encode()).decode()
    url = f"https://www.kaggle.com/api/v1/datasets/download/{args.ref}"

    zips = config.RAW_DIR / "_zips"
    zips.mkdir(parents=True, exist_ok=True)
    zpath = zips / f"{args.name}.zip"

    print(f"Downloading {args.ref} …")
    req = Request(url, headers={"Authorization": auth})
    with urlopen(req) as r, open(zpath, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    print(f"  saved {zpath}  ({zpath.stat().st_size/1e6:.1f} MB)")

    dest = config.RAW_DIR / args.name
    dest.mkdir(parents=True, exist_ok=True)
    print(f"Unzipping → {dest} …")
    with zipfile.ZipFile(zpath) as z:
        z.extractall(dest)
    print(f"  done: {sum(1 for _ in dest.rglob('*') if _.is_file())} files")


if __name__ == "__main__":
    main()
