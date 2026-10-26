#!/usr/bin/env python3
"""
Clean & Simple To-Do App REST API Server
Built with Python's standard library (Zero external dependencies).
Supports GET and POST (Push) API methods, as well as PUT and DELETE.
"""

import http.server
import socketserver
import json
import os
import sys
import urllib.parse
import uuid
from datetime import datetime

PORT = 5000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data", "todos.json")
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

# Ensure data directory exists
os.makedirs(os.path.join(BASE_DIR, "data"), exist_ok=True)
if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)


def read_todos():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Error reading todos]: {e}")
        return []


def write_todos(todos):
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(todos, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[Error writing todos]: {e}")
        return False


class TodoRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def _parse_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        post_data = self.rfile.read(content_length)
        try:
            return json.loads(post_data.decode("utf-8"))
        except Exception:
            return {}

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        # Health Check Endpoint
        if path == "/api/health":
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "online",
                "timestamp": datetime.now().isoformat(),
                "service": "To-Do API (GET / POST method engine)"
            }).encode("utf-8"))
            return

        # GET API: Retrieve todos
        if path == "/api/todos":
            todos = read_todos()

            # Filter by status: all, active, completed
            filter_status = query.get("filter", ["all"])[0].lower()
            if filter_status == "active":
                todos = [t for t in todos if not t.get("completed", False)]
            elif filter_status == "completed":
                todos = [t for t in todos if t.get("completed", False)]

            # Search query
            search_term = query.get("search", [""])[0].strip().lower()
            if search_term:
                todos = [
                    t for t in todos
                    if search_term in t.get("title", "").lower()
                    or search_term in t.get("category", "").lower()
                ]

            # Category filter
            category = query.get("category", [""])[0].strip()
            if category and category.lower() != "all":
                todos = [t for t in todos if t.get("category", "").lower() == category.lower()]

            self._set_headers(200)
            response = {
                "success": True,
                "method": "GET",
                "count": len(todos),
                "data": todos
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))
            return

        # Fallback to static file server (serves index.html, style.css, app.js from public/)
        return super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path.rstrip("/")

        # POST API: Create / Push a new todo item
        if path == "/api/todos":
            body = self._parse_body()
            title = body.get("title", "").strip()

            if not title:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "Task title is required."
                }).encode("utf-8"))
                return

            new_todo = {
                "id": f"todo-{uuid.uuid4().hex[:8]}",
                "title": title,
                "completed": bool(body.get("completed", False)),
                "priority": body.get("priority", "medium").lower(),
                "category": body.get("category", "General").strip() or "General",
                "dueDate": body.get("dueDate", ""),
                "createdAt": datetime.now().isoformat()
            }

            todos = read_todos()
            # Push new item to the top of the list
            todos.insert(0, new_todo)
            write_todos(todos)

            self._set_headers(201)
            response = {
                "success": True,
                "method": "POST",
                "action": "pushed_new_todo",
                "message": "Task pushed successfully via POST API",
                "data": new_todo
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))
            return

        # POST API: Toggle task status (convenience route)
        if path.startswith("/api/todos/") and path.endswith("/toggle"):
            parts = path.split("/")
            todo_id = parts[3]
            todos = read_todos()
            updated = None

            for t in todos:
                if t.get("id") == todo_id:
                    t["completed"] = not t.get("completed", False)
                    t["updatedAt"] = datetime.now().isoformat()
                    updated = t
                    break

            if updated:
                write_todos(todos)
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "success": True,
                    "method": "POST",
                    "action": "toggle_todo",
                    "data": updated
                }).encode("utf-8"))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"success": False, "error": "Todo not found"}).encode("utf-8"))
            return

        # POST API: Delete a task (convenience route)
        if path.startswith("/api/todos/") and path.endswith("/delete"):
            parts = path.split("/")
            todo_id = parts[3]
            todos = read_todos()
            initial_count = len(todos)
            todos = [t for t in todos if t.get("id") != todo_id]

            if len(todos) < initial_count:
                write_todos(todos)
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "success": True,
                    "method": "POST",
                    "action": "delete_todo",
                    "deletedId": todo_id
                }).encode("utf-8"))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"success": False, "error": "Todo not found"}).encode("utf-8"))
            return

        # POST API: Clear completed todos
        if path == "/api/todos/clear-completed":
            todos = read_todos()
            remaining = [t for t in todos if not t.get("completed", False)]
            cleared_count = len(todos) - len(remaining)
            write_todos(remaining)

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "success": True,
                "method": "POST",
                "action": "clear_completed",
                "clearedCount": cleared_count
            }).encode("utf-8"))
            return

        # Unknown POST route
        self._set_headers(404)
        self.wfile.write(json.dumps({"success": False, "error": "API route not found"}).encode("utf-8"))

    def do_PUT(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path.rstrip("/")

        # PUT /api/todos/<id>
        if path.startswith("/api/todos/"):
            todo_id = path.split("/")[3]
            body = self._parse_body()
            todos = read_todos()
            updated = None

            for t in todos:
                if t.get("id") == todo_id:
                    if "title" in body:
                        t["title"] = str(body["title"]).strip()
                    if "completed" in body:
                        t["completed"] = bool(body["completed"])
                    if "priority" in body:
                        t["priority"] = str(body["priority"]).lower()
                    if "category" in body:
                        t["category"] = str(body["category"]).strip()
                    if "dueDate" in body:
                        t["dueDate"] = str(body["dueDate"])
                    t["updatedAt"] = datetime.now().isoformat()
                    updated = t
                    break

            if updated:
                write_todos(todos)
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "success": True,
                    "method": "PUT",
                    "data": updated
                }).encode("utf-8"))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"success": False, "error": "Todo not found"}).encode("utf-8"))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"success": False, "error": "Route not found"}).encode("utf-8"))

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path.rstrip("/")

        # DELETE /api/todos/<id>
        if path.startswith("/api/todos/"):
            todo_id = path.split("/")[3]
            todos = read_todos()
            initial_count = len(todos)
            todos = [t for t in todos if t.get("id") != todo_id]

            if len(todos) < initial_count:
                write_todos(todos)
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "success": True,
                    "method": "DELETE",
                    "deletedId": todo_id
                }).encode("utf-8"))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"success": False, "error": "Todo not found"}).encode("utf-8"))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"success": False, "error": "Route not found"}).encode("utf-8"))


# Reconfigure UTF-8 encoding for Windows console if supported
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def run(port=PORT):
    server_address = ("127.0.0.1", port)
    with ThreadingServer(server_address, TodoRequestHandler) as httpd:
        print("======================================================")
        print(">> To-Do App REST API Server is running!")
        print(f">> Local Web App:  http://127.0.0.1:{port}")
        print(f">> GET API Route:  http://127.0.0.1:{port}/api/todos")
        print(f">> POST API Route: http://127.0.0.1:{port}/api/todos")
        print(f">> Serving Files:  {PUBLIC_DIR}")
        print("======================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server gracefully...")
            httpd.shutdown()


if __name__ == "__main__":
    port = PORT
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    run(port)

