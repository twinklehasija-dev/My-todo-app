const state = {
  todos: [],
  filter: 'all',
  search: '',
  isOnline: true
};

const elements = {
  todoForm: document.getElementById('todo-form'),
  todoInput: document.getElementById('todo-input'),
  todoPriority: document.getElementById('todo-priority'),
  todoCategory: document.getElementById('todo-category'),
  todoDueDate: document.getElementById('todo-duedate'),
  todoList: document.getElementById('todo-list'),
  emptyState: document.getElementById('empty-state'),
  emptyDesc: document.getElementById('empty-desc'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  progressText: document.getElementById('progress-text'),
  progressPct: document.getElementById('progress-pct'),
  footerCount: document.getElementById('footer-count'),
  filterTabs: document.querySelectorAll('.filter-tab'),
  searchInput: document.getElementById('search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  btnClearCompleted: document.getElementById('btn-clear-completed'),
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  themeIconSun: document.getElementById('theme-icon-sun'),
  themeIconMoon: document.getElementById('theme-icon-moon'),
  toastContainer: document.getElementById('toast-container')
};

const API_BASE = '/api';

async function fetchTodos() {
  try {
    const res = await fetch(`${API_BASE}/todos`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch');
    const json = await res.json();
    state.todos = json.data || [];
    state.isOnline = true;
  } catch {
    state.isOnline = false;
    const local = localStorage.getItem('taskflow_todos');
    state.todos = local ? JSON.parse(local) : [];
  } finally {
    renderTodos();
  }
}

async function addTodo(data) {
  if (!state.isOnline) {
    const newTodo = { id: `todo-${Date.now()}`, ...data, createdAt: new Date().toISOString() };
    state.todos.unshift(newTodo);
    saveLocal();
    showToast('Task added');
    renderTodos();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create task');
    showToast('Task added');
    await fetchTodos();
  } catch (err) {
    showToast(err.message || 'Error adding task');
  }
}

async function toggleTodo(id) {
  if (!state.isOnline) {
    const item = state.todos.find(t => t.id === id);
    if (item) {
      item.completed = !item.completed;
      saveLocal();
      renderTodos();
    }
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/todos/${id}/toggle`, { method: 'POST' });
    if (!res.ok) throw new Error('Toggle failed');
    await fetchTodos();
  } catch (err) {
    console.error(err);
  }
}

async function deleteTodo(id) {
  if (!state.isOnline) {
    state.todos = state.todos.filter(t => t.id !== id);
    saveLocal();
    showToast('Task deleted');
    renderTodos();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/todos/${id}/delete`, { method: 'POST' });
    if (!res.ok) throw new Error('Delete failed');
    showToast('Task deleted');
    await fetchTodos();
  } catch (err) {
    showToast('Error deleting task');
  }
}

async function clearCompleted() {
  const completedCount = state.todos.filter(t => t.completed).length;
  if (completedCount === 0) return;

  if (!state.isOnline) {
    state.todos = state.todos.filter(t => !t.completed);
    saveLocal();
    showToast('Completed tasks cleared');
    renderTodos();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/todos/clear-completed`, { method: 'POST' });
    if (!res.ok) throw new Error('Clear failed');
    showToast('Completed tasks cleared');
    await fetchTodos();
  } catch (err) {
    showToast('Error clearing tasks');
  }
}

function renderTodos() {
  let list = [...state.todos];

  if (state.filter === 'active') {
    list = list.filter(t => !t.completed);
  } else if (state.filter === 'completed') {
    list = list.filter(t => t.completed);
  }

  if (state.search.trim()) {
    const q = state.search.toLowerCase();
    list = list.filter(t => (t.title || '').toLowerCase().includes(q));
  }

  if (list.length === 0) {
    elements.todoList.innerHTML = '';
    elements.emptyState.classList.remove('hidden');
    elements.emptyDesc.textContent = state.search.trim() 
      ? `No tasks matching "${state.search}".` 
      : 'Your to-do list is clear.';
  } else {
    elements.emptyState.classList.add('hidden');
    elements.todoList.innerHTML = list.map(t => createTodoHtml(t)).join('');
  }

  updateMetrics();
}

function createTodoHtml(todo) {
  const isDone = Boolean(todo.completed);
  const priority = todo.priority || 'medium';
  const category = todo.category || 'Work';

  let dateHtml = '';
  if (todo.dueDate) {
    const d = new Date(todo.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const overdue = !isDone && d < today;
    dateHtml = `<span class="badge-date ${overdue ? 'overdue' : ''}">${escapeHtml(todo.dueDate)}</span>`;
  }

  return `
    <li class="todo-item ${isDone ? 'completed' : ''}">
      <button 
        class="checkbox-btn ${isDone ? 'checked' : ''}" 
        onclick="toggleTodo('${todo.id}')"
        aria-label="Toggle task"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>

      <div class="todo-details">
        <span class="todo-title">${escapeHtml(todo.title)}</span>
        <div class="todo-meta">
          <span class="badge badge-priority-${priority}">${priority}</span>
          <span class="badge badge-cat">${escapeHtml(category)}</span>
          ${dateHtml}
        </div>
      </div>

      <button class="btn-delete" onclick="deleteTodo('${todo.id}')" title="Delete">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </li>
  `;
}

function updateMetrics() {
  const total = state.todos.length;
  const completed = state.todos.filter(t => t.completed).length;
  const active = total - completed;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  elements.progressText.textContent = `${completed} of ${total} completed`;
  elements.progressPct.textContent = `${pct}%`;
  elements.progressBarFill.style.width = `${pct}%`;
  elements.footerCount.textContent = `${active} task${active === 1 ? '' : 's'} left`;
}

elements.todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = elements.todoInput.value.trim();
  if (!title) return;

  addTodo({
    title,
    priority: elements.todoPriority.value,
    category: elements.todoCategory.value,
    dueDate: elements.todoDueDate.value,
    completed: false
  });

  elements.todoInput.value = '';
  elements.todoDueDate.value = '';
});

window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;

elements.filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    elements.filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.filter = tab.dataset.filter;
    renderTodos();
  });
});

elements.searchInput.addEventListener('input', (e) => {
  state.search = e.target.value;
  elements.btnClearSearch.classList.toggle('hidden', !state.search);
  renderTodos();
});

elements.btnClearSearch.addEventListener('click', () => {
  elements.searchInput.value = '';
  state.search = '';
  elements.btnClearSearch.classList.add('hidden');
  renderTodos();
});

elements.btnClearCompleted.addEventListener('click', clearCompleted);

elements.themeToggleBtn.addEventListener('click', () => {
  const isDark = document.body.classList.contains('theme-dark');
  if (isDark) {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
    elements.themeIconSun.classList.add('hidden');
    elements.themeIconMoon.classList.remove('hidden');
    localStorage.setItem('taskflow_theme', 'light');
  } else {
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
    elements.themeIconSun.classList.remove('hidden');
    elements.themeIconMoon.classList.add('hidden');
    localStorage.setItem('taskflow_theme', 'dark');
  }
});

function initTheme() {
  const saved = localStorage.getItem('taskflow_theme') || 'dark';
  if (saved === 'light') {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
    elements.themeIconSun.classList.add('hidden');
    elements.themeIconMoon.classList.remove('hidden');
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

function saveLocal() {
  localStorage.setItem('taskflow_todos', JSON.stringify(state.todos));
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  fetchTodos();
});
