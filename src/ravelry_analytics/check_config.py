"""Offline preflight only: no requests and no secret values in output."""
import os
from pathlib import Path

KEYS = ("RAVELRY_API_USERNAME", "RAVELRY_API_PASSWORD")

def main():
    # Deliberately supports only plain KEY=value lines; never executes a .env file.
    path = Path(".env")
    values = {}
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            key, sep, value = line.partition("=")
            if sep:
                values[key.strip()] = value.strip().strip("\"'")
    def get(key):
        return os.environ.get(key, values.get(key, ""))
    credentials = all(bool(get(key)) for key in KEYS)
    terms = get("RAVELRY_TERMS_REVIEWED").lower() == "true"
    storage = get("RAVELRY_LOCAL_STORAGE_PERMITTED").lower() == "true"
    print("Application credentials: " + ("configured" if credentials else "missing"))
    print("Terms review: " + ("recorded" if terms else "pending"))
    print("Local storage permission: " + ("recorded" if storage else "pending"))
    print("Offline preflight only; endpoint, schema and access remain unverified.")
    return 0 if credentials and terms and storage else 1

if __name__ == "__main__":
    raise SystemExit(main())
