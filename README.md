# ⚡ TaskFlow — Clean & Simple To-Do App

> A distraction-free, modern To-Do application built with a clean UI/UX and driven by standard **GET** and **POST (Push)** REST API methods.

---

## 🌟 Highlights

- **Clean & Simple UI/UX**: Minimalist, distraction-free interface inspired by modern productivity tools (Linear & Apple Reminders).
- **GET & POST API Architecture**: Clean separation between client and REST API server.
  - **`GET` Method**: Retrieves task data with real-time filtering, searching, and category sorting.
  - **`POST` Method**: Pushes new tasks, updates task completion, and performs data mutations.
- **Live API Activity Inspector**: An interactive expandable drawer in the UI displaying all incoming and outgoing `GET` and `POST` network requests in real time.
- **Zero External Dependencies**: Powered by Python's built-in standard library (`http.server`, `urllib`, `json`) — no `npm install` or `pip install` required!
- **Persistent Storage**: Data is saved to `data/todos.json` on the server, plus client-side offline fallback when running standalone.
- **Rich Aesthetics**:
  - Crisp modern typography (Plus Jakarta Sans).
  - Smooth theme toggle (Dark / Light mode).
  - Real-time progress bar & task completion metrics.
  - Priority badges (🟢 Low, 🟡 Medium, 🔴 High) & category chips.
  - Micro-animations, responsive layout, and toast notifications.

---

## 📁 Project Structure

```text
To Do App/
├── server.py              # Lightweight REST API server (Python standard library)
├── data/
│   └── todos.json         # Persistent JSON database
├── public/
│   ├── index.html         # Clean, semantic HTML5 structure
│   ├── style.css          # Vanilla CSS design system (Dark & Light themes)
│   └── app.js             # Client logic: fetch API (GET / POST), UI state & events
└── README.md              # Full documentation & API reference
```

---

## 🚀 Quick Start

### 1. Run with Python REST API Server (Recommended)

Make sure Python 3 is installed, then run from the project root:

```bash
python server.py
```

Then open your browser and navigate to:
```
http://127.0.0.1:5000
```

> **Note**: The server runs on port `5000` by default. You can specify a custom port by running `python server.py 8080`.

### 2. Standalone Browser Mode (Zero Server)
You can also directly double-click `public/index.html` in your file explorer. The application detects the offline environment and falls back gracefully to `localStorage` while continuing to simulate and log the `GET` and `POST` API interactions!

---

## 📡 REST API Reference

The backend provides clean REST endpoints demonstrating the **GET** and **POST** methods:

### 1. `GET /api/todos` — Retrieve Tasks
Retrieves all tasks stored in the database. Supports query string filtering and search.

- **Method**: `GET`
- **URL**: `/api/todos`
- **Optional Query Parameters**:
  - `filter`: `all` | `active` | `completed`
  - `category`: `all` | `Work` | `Personal` | `API` | `Study` | `Health`
  - `search`: Keyword to search in task titles
- **Response** (`200 OK`):
```json
{
  "success": true,
  "method": "GET",
  "count": 3,
  "data": [
    {
      "id": "todo-1",
      "title": "Ship clean To-Do app",
      "completed": false,
      "priority": "high",
      "category": "Work",
      "dueDate": "2026-10-30",
      "createdAt": "2026-10-26T12:00:00.000Z"
    }
  ]
}
```

#### Example cURL:
```bash
curl -X GET "http://127.0.0.1:5000/api/todos?filter=active"
```

---

### 2. `POST /api/todos` — Push a New Task
Pushes a newly created task into the persistent task database.

- **Method**: `POST`
- **URL**: `/api/todos`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "title": "Implement push API notification",
  "priority": "high",
  "category": "API",
  "dueDate": "2026-10-28",
  "completed": false
}
```
- **Response** (`201 Created`):
```json
{
  "success": true,
  "method": "POST",
  "action": "pushed_new_todo",
  "message": "Task pushed successfully via POST API",
  "data": {
    "id": "todo-a1b2c3d4",
    "title": "Implement push API notification",
    "completed": false,
    "priority": "high",
    "category": "API",
    "dueDate": "2026-10-28",
    "createdAt": "2026-10-26T12:15:30.000Z"
  }
}
```

#### Example cURL:
```bash
curl -X POST "http://127.0.0.1:5000/api/todos" \
     -H "Content-Type: application/json" \
     -d '{"title": "Test Push API", "priority": "medium", "category": "Work"}'
```

---

### 3. `POST /api/todos/:id/toggle` — Toggle Task Completion
Toggles the `completed` boolean flag of an existing task.

- **Method**: `POST`
- **URL**: `/api/todos/{id}/toggle`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "method": "POST",
  "action": "toggle_todo",
  "data": {
    "id": "todo-1",
    "title": "Ship clean To-Do app",
    "completed": true,
    "updatedAt": "2026-10-26T12:18:00.000Z"
  }
}
```

---

### 4. `POST /api/todos/:id/delete` — Delete Task
Removes a task from the database.

- **Method**: `POST` (or `DELETE /api/todos/:id`)
- **URL**: `/api/todos/{id}/delete`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "method": "POST",
  "action": "delete_todo",
  "deletedId": "todo-1"
}
```

---

### 5. `POST /api/todos/clear-completed` — Clear Completed Tasks
Batch removes all finished tasks from the database.

- **Method**: `POST`
- **URL**: `/api/todos/clear-completed`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "method": "POST",
  "action": "clear_completed",
  "clearedCount": 2
}
```

---

### 6. `GET /api/health` — Health Check
Checks if the API server is alive and operational.

- **Method**: `GET`
- **URL**: `/api/health`
- **Response** (`200 OK`):
```json
{
  "status": "online",
  "service": "To-Do API (GET / POST method engine)"
}
```

---

## 🎨 UI & UX Design Details

1. **Focused Header**:
   - Distinctive gradient brand icon.
   - Interactive **Live API Status Pill** that pulses green when connected and toggles the API Inspector drawer when clicked.
   - Smooth dark/light theme switch with persistent preference memory.
2. **Dynamic Progress & Metrics**:
   - Real-time animated progress bar showing the percentage of tasks finished.
   - Dynamic counter pills for Total, Active, and Done tasks.
3. **Ergonomic Task Creator**:
   - High-contrast text input with instant push button.
   - Priority selectors (Low, Medium, High).
   - Category tags (Work, Personal, API, Study, Health).
   - Optional due date picker with smart indicators (⚠️ Overdue / 📅 Today).
4. **Instant Filters & Search**:
   - Filter tabs: **All**, **Active**, **Completed**.
   - Instant search bar with clear button (`Esc` shortcut).
   - Quick "GET" button to re-fetch from the API with rotating animation.
5. **Interactive API Activity Drawer**:
   - Click the **API: Ready (GET/POST)** badge to open the log console.
   - Inspect every request method (`GET`, `POST`), endpoint URL, HTTP response status code, and payload details.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Enter` (in input) | Push new task via `POST` API |
| `Esc` | Clear search or close API activity drawer |

---

## 📄 License
This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).
