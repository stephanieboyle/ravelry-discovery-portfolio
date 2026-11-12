"""Store a minimised private catalogue snapshot, never a user profile."""
import argparse
import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from uuid import uuid4
import duckdb
from dotenv import load_dotenv
from .api_client import Client, APIError

FIELDS = ("id", "craft", "pattern_categories", "difficulty_average", "difficulty_count",
          "rating_average", "rating_count", "favorites_count", "projects_count", "published",
          "generally_available", "created_at", "yardage", "yardage_max", "yarn_weight")

def minimise(record):
    out = {key: record[key] for key in FIELDS if key in record}
    for key in ("craft", "yarn_weight"):
        if isinstance(out.get(key), dict):
            out[key] = {k: out[key][k] for k in ("id", "name", "permalink") if k in out[key]}
    if isinstance(out.get("pattern_categories"), list):
        out["pattern_categories"] = [{k: c[k] for k in ("id", "name", "permalink", "parent_id") if k in c} for c in out["pattern_categories"]]
    author = record.get("pattern_author") or record.get("designer")
    out["designer_id"] = author.get("id") if isinstance(author, dict) else None
    return out

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--query", default="cowl")
    parser.add_argument("--private-use", action="store_true", help="Acknowledge private local use; does not confer publication permission")
    parser.add_argument("--db", default="data/ravelry.duckdb")
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    if not args.private_use:
        parser.error("Collection requires --private-use; review docs/data_feasibility.md")
    if not 1 <= args.limit <= 100:
        parser.error("--limit must be 1..100; inspect five before scaling")
    load_dotenv()
    Path(args.db).parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(args.db)
    con.execute("create table if not exists raw_patterns (snapshot_id varchar, pattern_id bigint, extracted_at timestamptz, payload varchar, primary key(snapshot_id, pattern_id))")
    con.execute("create table if not exists collection_runs (snapshot_id varchar primary key, extracted_at timestamptz, provenance varchar)")
    if con.execute("select count(*) from collection_runs").fetchone()[0] and not args.refresh:
        raise APIError("Snapshot already exists; reuse locally or explicitly --refresh")
    client = Client(os.getenv("RAVELRY_API_USERNAME"), os.getenv("RAVELRY_API_PASSWORD"))
    ids, seen, pages = [], set(), []
    page = 1
    while len(ids) < args.limit:
        params = {"query": args.query, "page": page, "page_size": min(5, args.limit-len(ids))}
        result = client.get("/patterns/search.json", params)
        rows = result.get("patterns")
        paginator = result.get("paginator")
        if not isinstance(rows, list) or not isinstance(paginator, dict):
            raise APIError("Search schema mismatch")
        pages.append({"parameters": params, "paginator": paginator})
        if not rows:
            break
        new = []
        for row in rows:
            pid = row.get("id")
            if not isinstance(pid, int) or isinstance(pid, bool):
                raise APIError("Invalid search pattern ID")
            if pid not in seen:
                new.append(pid); seen.add(pid)
        if not new:
            raise APIError("Repeated search page; stopped")
        ids.extend(new[:args.limit-len(ids)])
        if page >= int(paginator.get("page_count", page)):
            break
        page += 1
    if not ids:
        raise APIError("No patterns returned; no snapshot written")
    result = client.get("/patterns.json", {"ids": " ".join(map(str, ids))})
    details = result.get("patterns")
    if not isinstance(details, dict):
        raise APIError("Bulk detail schema mismatch")
    rows = []
    for pid in ids:
        item = details.get(str(pid))
        if not isinstance(item, dict) or item.get("id") != pid:
            raise APIError("Missing/mismatched bulk detail; no partial snapshot stored")
        rows.append(minimise(item))
    stamp = datetime.now(timezone.utc)
    sid = str(uuid4())
    provenance = {"source": "https://api.ravelry.com", "query": args.query, "pages": pages,
                  "requested": args.limit, "returned": len(rows), "http_requests": client.requests,
                  "sort": "API default, unspecified", "scope": "private convenience sample",
                  "delete_review_at": (stamp+timedelta(days=7)).isoformat(),
                  "fields_present": sorted(set().union(*(set(row) for row in rows)))}
    con.execute("begin")
    try:
        con.executemany("insert into raw_patterns values (?, ?, ?, ?)", [(sid, row["id"], stamp, json.dumps(row)) for row in rows])
        con.execute("insert into collection_runs values (?, ?, ?)", [sid, stamp, json.dumps(provenance)])
        con.execute("commit")
    except Exception:
        con.execute("rollback"); raise
    finally:
        con.close()
    print(json.dumps({"patterns": len(rows), "http_requests": client.requests, "fields_present": provenance["fields_present"], "private_database": args.db}))

if __name__ == "__main__":
    try:
        main()
    except APIError as exc:
        raise SystemExit(str(exc)) from None
