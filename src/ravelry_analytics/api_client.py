"""Bounded read-only HTTPS client; no credential or response logging."""
import random
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import requests

class APIError(RuntimeError):
    pass

class Client:
    BASE = "https://api.ravelry.com"
    def __init__(self, username, password, interval=1.0, attempts=3, session=None, sleep=time.sleep):
        if not username or not password:
            raise APIError("Configure application-issued read-only credentials in .env")
        self.session = session or requests.Session()
        self.session.auth = (username, password)
        self.session.headers.update({"User-Agent": "IndependentPatternStudy/0.1 (private feasibility study)"})
        self.interval, self.attempts, self.sleep = interval, attempts, sleep
        self.last = None
        self.requests = 0

    def get(self, path, params=None):
        if path not in ("/patterns/search.json", "/patterns.json"):
            raise APIError("Endpoint not allowlisted")
        for attempt in range(self.attempts):
            if self.last is not None:
                self.sleep(max(0, self.interval - (time.monotonic() - self.last)))
            self.last = time.monotonic()
            self.requests += 1
            try:
                response = self.session.get(self.BASE + path, params=params, timeout=(5, 20), allow_redirects=False)
            except requests.RequestException:
                if attempt + 1 == self.attempts:
                    raise APIError("Network failure after bounded retries") from None
                self.sleep(2 ** attempt)
                continue
            if response.status_code in (429, 500, 502, 503, 504):
                if attempt + 1 == self.attempts:
                    raise APIError(f"Transient HTTP {response.status_code}: retry budget exhausted")
                wait = 2 ** attempt + random.uniform(0, .25)
                retry = response.headers.get("Retry-After")
                if retry:
                    try:
                        wait = max(wait, float(retry))
                    except ValueError:
                        try:
                            wait = max(wait, (parsedate_to_datetime(retry) - datetime.now(timezone.utc)).total_seconds())
                        except (ValueError, TypeError):
                            raise APIError("Invalid Retry-After; stopped rather than guessing") from None
                if wait > 60:
                    raise APIError("Retry-After exceeds run budget; resume later")
                self.sleep(wait)
                continue
            if response.status_code != 200:
                raise APIError(f"HTTP {response.status_code}; no response body logged")
            try:
                payload = response.json()
            except ValueError:
                raise APIError("Invalid JSON response") from None
            if not isinstance(payload, dict):
                raise APIError("Expected object response")
            return payload
        raise APIError("Retry budget exhausted")
