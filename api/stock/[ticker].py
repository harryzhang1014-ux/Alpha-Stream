import asyncio
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from fastapi import HTTPException

from backend.main import get_stock_data


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        ticker = parsed.path.rstrip("/").split("/")[-1]
        query = parse_qs(parsed.query)
        av_key = query.get("av_key", [""])[0]

        try:
          payload = asyncio.run(get_stock_data(ticker=ticker, av_key=av_key))
          body = json.dumps(payload).encode("utf-8")
          self.send_response(200)
        except HTTPException as exc:
          body = json.dumps({"detail": exc.detail}).encode("utf-8")
          self.send_response(exc.status_code)
        except Exception as exc:
          body = json.dumps({"detail": str(exc)}).encode("utf-8")
          self.send_response(500)

        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)
