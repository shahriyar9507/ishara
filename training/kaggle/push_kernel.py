"""Push + run the Ishara training kernel on Kaggle via REST (Basic auth from kaggle.json).
Then poll status and pull output (model.json, sample_sheet.png) into web/public/models/letters/.

Usage:
    python push_kernel.py push      # create/run the kernel
    python push_kernel.py status    # check run status
    python push_kernel.py pull      # download outputs when complete
"""
import json, sys, time, base64, io, zipfile
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
CREDS = json.loads((Path.home() / ".kaggle" / "kaggle.json").read_text())
USER, KEY = CREDS["username"], CREDS["key"]
AUTH = "Basic " + base64.b64encode(f"{USER}:{KEY}".encode()).decode()
SLUG = f"{USER}/ishara-letter-train"
DATASET = "mdhadiuzzaman/baust-lipi-a-bdsl-dataset"
API = "https://www.kaggle.com/api/v1"


def call(path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = Request(API + path, data=data, method="POST" if body is not None else "GET",
                  headers={"Authorization": AUTH, "Content-Type": "application/json"})
    try:
        with urlopen(req) as r:
            return r.status, r.read()
    except HTTPError as e:
        return e.code, e.read()


def push():
    code = (HERE / "ishara_train_kernel.py").read_text(encoding="utf-8")
    body = {
        "id": SLUG,
        "title": "Ishara Letter Train",
        "text": code,
        "language": "python",
        "kernelType": "script",
        "isPrivate": True,
        "enableGpu": True,
        "enableInternet": True,
        "datasetDataSources": [DATASET],
        "competitionDataSources": [],
        "kernelDataSources": [],
        "categoryIds": [],
    }
    st, raw = call("/kernels/push", body)
    print("push:", st, raw.decode()[:500])


def status():
    st, raw = call(f"/kernels/status/{SLUG}")
    print("status:", st, raw.decode()[:400])


def pull():
    out = REPO / "web" / "public" / "models" / "letters"
    out.mkdir(parents=True, exist_ok=True)
    st, raw = call(f"/kernels/output/{SLUG}")
    if st != 200:
        print("output not ready:", st, raw.decode()[:300]); return
    data = json.loads(raw)
    for f in data.get("files", []):
        name, url = f["fileName"], f.get("url")
        if url:
            with urlopen(Request(url, headers={"Authorization": AUTH})) as r:
                (out / name).write_bytes(r.read())
            print("pulled", name)
    print("saved to", out)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "push"
    {"push": push, "status": status, "pull": pull}.get(cmd, push)()
