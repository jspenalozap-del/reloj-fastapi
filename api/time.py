from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime
import json
import pytz

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)

        # Esta función vive en /api/time
        if parsed.path != "/api/time":
            self.send_response(404)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(b'{"error":"not found"}')
            return

        qs = parse_qs(parsed.query)
        tz = (qs.get("tz", ["UTC"])[0] or "UTC").strip()

        try:
            timezone = pytz.timezone(tz)
        except Exception:
            self.send_response(400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(b'{"error":"invalid timezone"}')
            return

        now = datetime.now(timezone)
        body = json.dumps(
            {"timezone": tz, "iso": now.isoformat()},
            ensure_ascii=False
        ).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)