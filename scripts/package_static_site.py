"""Package only the public synthetic dashboard, never local catalogue records."""
from pathlib import Path
import argparse
import json
import zipfile

ASSETS = ("index.html", "app.js", "styles.css", "data.json", "needle.svg", "stitches.svg")

def package(destination: Path) -> None:
    root = Path(__file__).resolve().parents[1] / "dashboard"
    json.loads((root / "data.json").read_text())
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
        for name in ASSETS:
            archive.write(root / name, name)
    with zipfile.ZipFile(destination) as archive:
        assert set(archive.namelist()) == set(ASSETS)
    print(f"Packaged {len(ASSETS)} public assets: {destination}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    package(parser.parse_args().destination)
