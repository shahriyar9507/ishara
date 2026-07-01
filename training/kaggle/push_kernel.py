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
# Write ops (kernels/push) require the new Bearer KGAT token; the hex key is its suffix.
AUTH = f"Bearer KGAT_{KEY}"
SLUG = f"{USER}/ishara-letter-train"
DATASET = "mdhadiuzzaman/baust-lipi-a-bdsl-dataset"
API = "https://www.kaggle.com/api/v1"


BASIC = "Basic " + base64.b64encode(f"{USER}:{KEY}".encode()).decode()


def call(path, body=None, auth=None):
    # push (write) needs the Bearer KGAT token; status/output (read) need Basic auth.
    data = json.dumps(body).encode() if body is not None else None
    req = Request(API + path, data=data, method="POST" if body is not None else "GET",
                  headers={"Authorization": auth or AUTH, "Content-Type": "application/json"})
    try:
        with urlopen(req) as r:
            return r.status, r.read()
    except HTTPError as e:
        return e.code, e.read()


def push():
    code = (HERE / "ishara_train_kernel.py").read_text(encoding="utf-8")
    body = {
        "slug": SLUG,
        "newTitle": "Ishara Letter Train",
        "text": code,
        "language": "python",
        "kernelType": "script",
        "isPrivate": False,
        "enableGpu": True,
        "enableInternet": True,
        "datasetDataSources": [DATASET],
        "competitionDataSources": [],
        "kernelDataSources": [],
        "categoryIds": [],
    }
    st, raw = call("/kernels/push", body)
    print("push:", st, raw.decode()[:500])


Q = f"?userName={USER}&kernelSlug=ishara-letter-train"


def status():
    st, raw = call(f"/kernels/status{Q}", auth=BASIC)
    print("status:", st, raw.decode()[:300])
    return raw


def _output():
    st, raw = call(f"/kernels/output{Q}", auth=BASIC)
    return (json.loads(raw) if st == 200 else {"files": [], "log": ""})


def pull():
    out = REPO / "web" / "public" / "models" / "letters"
    out.mkdir(parents=True, exist_ok=True)
    data = _output()
    files = data.get("files", [])
    if not files:
        print("no output files yet. log tail:", (data.get("log") or "")[-300:]); return False
    for f in files:
        name, url = f.get("fileName"), f.get("url")
        if url:
            with urlopen(Request(url)) as r:
                (out / name).write_bytes(r.read())
            print("pulled", name, "->", out)
    return True


def poll():
    """Loop until output files appear (or an error shows in the log)."""
    import time
    # Give a freshly-pushed version time to supersede the previous run's output.
    time.sleep(150)
    for i in range(120):  # up to ~60 min at 30s
        st, raw = call(f"/kernels/status{Q}", auth=BASIC)
        s = json.loads(raw).get("status", "?") if st == 200 else f"http{st}"
        data = _output()
        nfiles = len(data.get("files", []))
        print(f"[{i}] status={s} files={nfiles}")
        if nfiles > 0:
            pull(); print("DONE"); return
        if s in ("error", "cancelAcknowledged"):
            print("LOG TAIL:\n", (data.get("log") or "")[-1500:]); return
        time.sleep(30)
    print("timed out")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "push"
    {"push": push, "status": status, "pull": pull, "poll": poll}.get(cmd, push)()
