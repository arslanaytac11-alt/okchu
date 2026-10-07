from pathlib import Path
import shutil, subprocess
node = shutil.which("node")
if not node:
    raise SystemExit("Node.js is required to run the checks.")
raise SystemExit(subprocess.call([node, "tests/run-checks.mjs"], cwd=Path(__file__).resolve().parents[1]))
