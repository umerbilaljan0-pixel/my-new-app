"""Run the engine:  python -m cleanplate   (or `uvicorn cleanplate.main:app`)."""
from __future__ import annotations

import os

import uvicorn


def main() -> None:
    uvicorn.run(
        "cleanplate.main:app",
        host=os.environ.get("CLEANPLATE_HOST", "0.0.0.0"),
        port=int(os.environ.get("CLEANPLATE_PORT", "8000")),
        reload=os.environ.get("CLEANPLATE_RELOAD", "0") == "1",
    )


if __name__ == "__main__":
    main()
