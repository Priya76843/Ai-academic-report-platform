"""Write the FastAPI OpenAPI document to the given path. Run from backend/ via `make openapi`."""
import json
import sys
from pathlib import Path

from app.main import create_app

out = Path(sys.argv[1] if len(sys.argv) > 1 else "../docs/api/openapi.json")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(create_app().openapi(), indent=2) + "\n")
print(f"wrote {out}")
