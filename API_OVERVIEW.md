# Understanding the API: GET vs. POST

An **API** (Application Programming Interface) connects the user interface (the browser) to the backend server so your tasks can be saved and retrieved.

---

## 1. The GET Method (Reading)

* **Purpose:** Ask the server to send data without changing anything.
* **Analogy:** *"Hey server, show me my task list."*
* **When it runs:**
  * When you first open or refresh the app.
* **What happens:**
  1. The browser requests `GET /api/todos`.
  2. The server reads `todos.json`.
  3. The server sends back the list of tasks to display on your screen.

---

## 2. The POST Method (Writing / Pushing)

* **Purpose:** Send new data to the server to create, update, or remove records.
* **Analogy:** *"Hey server, here is new data — save it to the database."*
* **When it runs:**
  * **Adding a task:** Submitting the form sends `POST /api/todos` with the task title. The server creates an ID and saves it.
  * **Checking off a task:** Clicking a checkbox sends `POST /api/todos/{id}/toggle` to switch between active and completed.
  * **Deleting a task:** Clicking delete sends `POST /api/todos/{id}/delete` to remove the task from storage.

---

## 3. Quick Reference

| User Action | HTTP Method | Endpoint | Result |
| :--- | :--- | :--- | :--- |
| **Open the app** | `GET` | `/api/todos` | Loads existing tasks onto the screen |
| **Add a new task** | `POST` | `/api/todos` | Saves the new task into `todos.json` |
| **Toggle checkmark** | `POST` | `/api/todos/{id}/toggle` | Updates completed status (`true` / `false`) |
| **Delete a task** | `POST` | `/api/todos/{id}/delete` | Removes the task from `todos.json` |
| **Clear completed** | `POST` | `/api/todos/clear-completed` | Removes all finished tasks at once |

---

## 4. Visual Flow

```text
Browser (Frontend)                  Server (Backend)             Storage (todos.json)
       |                                   |                              |
       | ----- GET /api/todos -----------> |                              |
       |                                   | ----- Read data -----------> |
       |                                   | <---- Return tasks --------- |
       | <---- 200 OK (Tasks list) ------- |                              |
       |                                   |                              |
       | ----- POST /api/todos ----------> |                              |
       |       { "title": "Buy milk" }     | ----- Save new task -------> |
       |                                   | <---- Confirm saved -------- |
       | <---- 201 Created --------------- |                              |
```
