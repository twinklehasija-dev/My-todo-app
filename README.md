# ⚡ TaskFlow — Simple To-Do App

> A distraction-free, modern To-Do application built with a clean, simple UI/UX and powered by standard **GET** and **POST** REST API methods.

---

## 🌟 Highlights

- **Clean & Simple UI/UX**: Minimalist, distraction-free interface inspired by modern productivity tools.
- **REST API Architecture**: Clean separation between client and server:
  - **`GET` Method**: Retrieves task data with filtering and search.
  - **`POST` Method**: Creates tasks, updates task completion, and handles deletions.
- **Zero External Dependencies**: Powered by Python's built-in standard library (`http.server`, `urllib`, `json`) — no extra packages required.
- **Persistent Storage**: Tasks are saved to `data/todos.json` on the server, with client-side offline fallback when running standalone.
- **Features**:
  - Dark / Light mode toggle.
  - Progress bar & completion stats.
  - Priority tags (Low, Medium, High).
  - Search and filter tabs (All, Active, Completed).

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
│   └── app.js             # Client logic: fetch API (GET / POST)
└── README.md              # Documentation & API reference
```

---

## 🚀 Quick Start

### 1. Run with Python REST API Server (Recommended)

Run from the project root:

```bash
python server.py
```

Then open your browser at:
```
http://127.0.0.1:5000
```

### 2. Standalone Browser Mode
You can also open `public/index.html` directly in your browser. The app will automatically use local storage if the server is offline.

---

## 📡 REST API Reference

### 1. `GET /api/todos` — Retrieve Tasks
Retrieves all tasks stored in the database.

- **Method**: `GET`
- **URL**: `/api/todos`
- **Optional Query Parameters**: `filter` (`all` | `active` | `completed`), `search`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "method": "GET",
  "count": 3,
  "data": [
    {
      "id": "todo-1",
      "title": "Plan project roadmap",
      "completed": false,
      "priority": "high",
      "category": "Work",
      "dueDate": "2026-10-30",
      "createdAt": "2026-10-26T12:00:00.000Z"
    }
  ]
}
```

---

### 2. `POST /api/todos` — Add a Task
Creates and adds a new task to the database.

- **Method**: `POST`
- **URL**: `/api/todos`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "title": "Review team updates",
  "priority": "medium",
  "category": "Work",
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
  "data": {
    "id": "todo-a1b2c3d4",
    "title": "Review team updates",
    "completed": false,
    "priority": "medium",
    "category": "Work",
    "dueDate": "2026-10-28",
    "createdAt": "2026-10-26T12:15:30.000Z"
  }
}
```

---

### 3. `POST /api/todos/:id/toggle` — Toggle Task Completion
Toggles the `completed` status of a task.

- **Method**: `POST`
- **URL**: `/api/todos/{id}/toggle`
- **Response** (`200 OK`)

---

### 4. `POST /api/todos/:id/delete` — Delete Task
Removes a task from the database.

- **Method**: `POST`
- **URL**: `/api/todos/{id}/delete`
- **Response** (`200 OK`)

---

### 5. `POST /api/todos/clear-completed` — Clear Completed Tasks
Removes all completed tasks.

- **Method**: `POST`
- **URL**: `/api/todos/clear-completed`
- **Response** (`200 OK`)

---

### 6. `GET /api/health` — Health Check
Checks if the server is running.

- **Method**: `GET`
- **URL**: `/api/health`

---

## 📄 License
MIT License
