# CLEANPLATE Python client

Zero dependencies (stdlib only). Wraps the public `/v1` API.

```bash
pip install -e clients/python        # or copy cleanplate_client.py
```

```python
from cleanplate_client import CleanplateClient

cp = CleanplateClient("http://localhost:8000", api_key="KEY")
cp.confirm_rights()                                  # first-launch rights gate

# one file through one tool
job = cp.run("uplift", "photo.jpg", params={"target": "4K"}, quality="best")
cp.wait(job["id"])
cp.download(job["id"], "photo_4k.png")

# a three-stage Stack
stack = {"stages": [
    {"tool": "clarify"},
    {"tool": "revive", "params": {"face_restore": True}},
    {"tool": "uplift", "params": {"target": "4K"}},
]}
job = cp.run("stack", "archive.mov", params=stack)
cp.wait(job["id"])
```

CLI:

```bash
CLEANPLATE_URL=http://localhost:8000 python cleanplate_client.py uplift photo.jpg 4K
```
