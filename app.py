from http.server import HTTPServer, BaseHTTPRequestHandler

HTML = b"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Hello World</title>
    <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>Hello, World!</h1>
</body>
</html>"""


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(HTML)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    server = HTTPServer(("", 8000), Handler)
    print("Serving at http://localhost:8000")
    server.serve_forever()
