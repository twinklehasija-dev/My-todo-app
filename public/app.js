/**
 * TaskFlow — Client Application Logic
 * Integrates with the REST API using GET and POST (Push) methods.
 */

// Global State
const state = {
  todos: [],
  filter: 'all',          // 'all' | 'active' | 'completed'
  category: 'all',        // 'all' | 'Work' | 'Personal' etc.
  search: '',
  isOnline: true,
  apiLogs: []
};

// DOM Elements
const elements = {
  todoForm: document.getElementById('todo-form'),
  todoInput: document.getElementById('todo-input'),
  todoPriority: document.getElementById('todo-priority'),
  todoCategory: document.getElementById('todo-category'),
  todoDueDate: document.getElementById('todo-duedate'),
  todoList: document.getElementById('todo-list'),
  emptyState: document.getElementById('empty-state'),
  emptyDesc: document.getElementById('empty-desc'),
  
  // Progress & Counts
  progressBarFill: document.getElementById('progress-bar-fill'),
  progressText: document.getElementById('progress-text'),
  statTotal: document.getElementById('stat-total'),
  statActive: document.getElementById('stat-active'),
  statCompleted: document.getElementById('stat-completed'),
  footerCount: document.getElementById('footer-count'),
  
  // Controls
  filterTabs: document.querySelectorAll('.filter-tab'),
  searchInput: document.getElementById('search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  filterCategorySelect: document.getElementById('filter-category-select'),
  btnRefreshGet: document.getElementById('btn-refresh-get'),
  btnClearCompleted: document.getElementById('btn-clear-completed'),
  
  // Theme Toggle
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  themeIconSun: document.getElementById('theme-icon-sun'),
  themeIconMoon: document.getElementById('theme-icon-moon'),
  
  // API Inspector Drawer
  btnToggleApiDrawer: document.getElementById('btn-toggle-api-drawer'),
  apiStatusText: document.getElementById('api-status-text'),
  apiDrawer: document.getElementById('api-drawer'),
  btnCloseDrawer: document.getElementById('btn-close-drawer'),
  btnClearLogs: document.getElementById('btn-clear-logs'),
  apiLogsContainer: document.getElementById('api-logs-container'),
  
  // Toasts
  toastContainer: document.getElementById('toast-container')
};

/* ==========================================================================
   API Service (GET and POST HTTP Methods)
   ========================================================================== */

const API_BASE = '/api';

/**
 * Log network activity to the visible API activity inspector
 */
function logApiActivity(method, url, status, detail = null) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = { method, url, status, detail, timestamp };
  state.apiLogs.unshift(entry);
  if (state.apiLogs.length > 30) state.apiLogs.pop();
  renderApiLogs();
}

function renderApiLogs() {
  if (!elements.apiLogsContainer) return;

  if (state.apiLogs.length === 0) {
    elements.apiLogsContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">
        No API calls logged yet. Add a task or refresh to see GET / POST requests.
      </div>
    `;
    return;
  }

  elements.apiLogsContainer.innerHTML = state.apiLogs.map(log => {
    const methodClass = `tag-${log.method.toLowerCase()}`;
    const statusClass = `status-${log.status}`;
    const detailHtml = log.detail 
      ? `<div class="log-detail">${escapeHtml(typeof log.detail === 'object' ? JSON.stringify(log.detail, null, 2) : String(log.detail))}</div>` 
      : '';

    return `
      <div class="api-log-entry">
        <div class="log-meta-row">
          <div class="log-left">
            <span class="method-tag ${methodClass}">${log.method}</span>
            <span class="log-url">${log.url}</span>
            <span class="log-status ${statusClass}">${log.status}</span>
          </div>
          <span class="log-time">${log.timestamp}</span>
        </div>
        ${detailHtml}
      </div>
    `;
  }).join('');
}

/**
 * GET Method: Fetch tasks from the backend REST API
 */
async function fetchTodosViaGET() {
  const url = `${API_BASE}/todos`;
  elements.btnRefreshGet.classList.add('rotating');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`GET failed with status ${response.status}`);
    }

    const result = await response.json();
    state.todos = result.data || [];
    state.isOnline = true;
    updateApiStatus('Connected (GET / POST active)');
    logApiActivity('GET', url, response.status, `Retrieved ${state.todos.length} tasks`);
  } catch (error) {
    console.warn('[API Offline/Fallback]: Falling back to local storage', error);
    state.isOnline = false;
    updateApiStatus('Offline / Local Storage');
    const localData = localStorage.getItem('taskflow_todos');
    state.todos = localData ? JSON.parse(localData) : getInitialFallbackTodos();
    logApiActivity('GET', url, 'Fallback', 'Loaded from client cache');
  } finally {
    setTimeout(() => {
      elements.btnRefreshGet.classList.remove('rotating');
    }, 400);
    renderTodos();
  }
}

/**
 * POST Method: Push a new task to the backend REST API
 */
async function pushTodoViaPOST(todoData) {
  const url = `${API_BASE}/todos`;

  if (!state.isOnline) {
    // Client-side fallback if server is unreachable
    const newTodo = {
      id: `todo-${Date.now()}`,
      ...todoData,
      createdAt: new Date().toISOString()
    };
    state.todos.unshift(newTodo);
    saveLocalFallback();
    logApiActivity('POST', url, 'Fallback 201', newTodo);
    showToast('Task saved locally (Server unreachable)', 'info');
    renderTodos();
    return newTodo;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(todoData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `POST failed with status ${response.status}`);
    }

    logApiActivity('POST', url, response.status, result.data);
    showToast('Task pushed successfully via POST API', 'success');

    // Refresh list via GET to ensure sync
    await fetchTodosViaGET();
    return result.data;
  } catch (error) {
    console.error('[POST Error]:', error);
    showToast(`Error pushing task: ${error.message}`, 'error');
    logApiActivity('POST', url, 'Error', error.message);
  }
}

/**
 * POST Method: Toggle completion state
 */
async function toggleTodoStatus(id) {
  const url = `${API_BASE}/todos/${id}/toggle`;

  if (!state.isOnline) {
    const item = state.todos.find(t => t.id === id);
    if (item) {
      item.completed = !item.completed;
      saveLocalFallback();
      logApiActivity('POST', url, 'Fallback 200', { id, completed: item.completed });
      renderTodos();
    }
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Toggle failed');

    logApiActivity('POST', url, response.status, { id, completed: result.data?.completed });
    await fetchTodosViaGET();
  } catch (error) {
    console.error('[Toggle Error]:', error);
    // Optimistic fallback
    const item = state.todos.find(t => t.id === id);
    if (item) item.completed = !item.completed;
    renderTodos();
  }
}

/**
 * POST / DELETE Method: Remove a task
 */
async function deleteTodoItem(id) {
  const url = `${API_BASE}/todos/${id}/delete`;

  if (!state.isOnline) {
    state.todos = state.todos.filter(t => t.id !== id);
    saveLocalFallback();
    logApiActivity('POST', url, 'Fallback 200', { deletedId: id });
    showToast('Task removed', 'info');
    renderTodos();
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error('Delete failed');

    logApiActivity('POST', url, response.status, { deletedId: id });
    showToast('Task deleted successfully', 'info');
    await fetchTodosViaGET();
  } catch (error) {
    console.error('[Delete Error]:', error);
    showToast(`Failed to delete: ${error.message}`, 'error');
  }
}

/**
 * POST Method: Clear completed tasks
 */
async function clearCompletedTasks() {
  const completedCount = state.todos.filter(t => t.completed).length;
  if (completedCount === 0) {
    showToast('No completed tasks to clear', 'info');
    return;
  }

  const url = `${API_BASE}/todos/clear-completed`;

  if (!state.isOnline) {
    state.todos = state.todos.filter(t => !t.completed);
    saveLocalFallback();
    logApiActivity('POST', url, 'Fallback 200', { cleared: completedCount });
    showToast(`Cleared ${completedCount} completed tasks`, 'info');
    renderTodos();
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });

    const result = await response.json();
    if (!response.ok) throw new Error('Clear completed failed');

    logApiActivity('POST', url, response.status, result);
    showToast(`Cleared ${result.clearedCount || completedCount} completed tasks`, 'info');
    await fetchTodosViaGET();
  } catch (error) {
    console.error('[Clear Error]:', error);
    showToast(`Failed to clear: ${error.message}`, 'error');
  }
}

/* ==========================================================================
   Rendering & UI Updates
   ========================================================================== */

function renderTodos() {
  let filtered = [...state.todos];

  // 1. Status Filter
  if (state.filter === 'active') {
    filtered = filtered.filter(t => !t.completed);
  } else if (state.filter === 'completed') {
    filtered = filtered.filter(t => t.completed);
  }

  // 2. Category Filter
  if (state.category !== 'all') {
    filtered = filtered.filter(t => (t.category || '').toLowerCase() === state.category.toLowerCase());
  }

  // 3. Search Filter
  if (state.search.trim()) {
    const q = state.search.toLowerCase();
    filtered = filtered.filter(t => 
      (t.title || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    );
  }

  // Render List
  if (filtered.length === 0) {
    elements.todoList.innerHTML = '';
    elements.emptyState.classList.remove('hidden');

    if (state.search.trim()) {
      elements.emptyDesc.textContent = `No tasks matching "${state.search}". Try clearing search.`;
    } else if (state.filter === 'active') {
      elements.emptyDesc.textContent = 'All tasks are completed! Awesome job.';
    } else if (state.filter === 'completed') {
      elements.emptyDesc.textContent = 'No completed tasks yet. Mark some tasks done!';
    } else {
      elements.emptyDesc.textContent = 'Your task list is clear. Use the input above to push a new task via the POST API!';
    }
  } else {
    elements.emptyState.classList.add('hidden');
    elements.todoList.innerHTML = filtered.map(todo => createTodoItemHtml(todo)).join('');
  }

  updateMetrics();
}

function createTodoItemHtml(todo) {
  const isCompleted = Boolean(todo.completed);
  const priority = (todo.priority || 'medium').toLowerCase();
  const category = todo.category || 'General';

  let dateHtml = '';
  if (todo.dueDate) {
    const dateObj = new Date(todo.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);

    const isOverdue = !isCompleted && dateObj < today;
    const isToday = dateObj.getTime() === today.getTime();

    let dateClass = 'badge-date';
    let dateLabel = todo.dueDate;
    if (isOverdue) {
      dateClass += ' overdue';
      dateLabel = `⚠️ Overdue (${todo.dueDate})`;
    } else if (isToday) {
      dateClass += ' today';
      dateLabel = '📅 Today';
    }

    dateHtml = `<span class="${dateClass}">${dateLabel}</span>`;
  }

  return `
    <li class="todo-item ${isCompleted ? 'completed' : ''}" data-id="${todo.id}">
      <button 
        class="checkbox-btn ${isCompleted ? 'checked' : ''}" 
        onclick="handleToggleClick('${todo.id}')"
        aria-label="${isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>

      <div class="todo-content">
        <span class="todo-title" title="Task">${escapeHtml(todo.title)}</span>
        <div class="todo-badges">
          <span class="badge badge-priority-${priority}">● ${priority}</span>
          <span class="badge badge-category">${escapeHtml(category)}</span>
          ${dateHtml}
        </div>
      </div>

      <div class="todo-actions">
        <button 
          class="btn-action-icon btn-delete" 
          onclick="handleDeleteClick('${todo.id}')" 
          title="Delete task via API"
          aria-label="Delete task"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </li>
  `;
}

function updateMetrics() {
  const total = state.todos.length;
  const completed = state.todos.filter(t => t.completed).length;
  const active = total - completed;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  elements.statTotal.textContent = total;
  elements.statActive.textContent = active;
  elements.statCompleted.textContent = completed;
  elements.progressText.textContent = `${pct}% Completed`;
  elements.progressBarFill.style.width = `${pct}%`;

  elements.footerCount.textContent = `${active} active task${active === 1 ? '' : 's'} remaining`;
}

function updateApiStatus(text) {
  if (elements.apiStatusText) {
    elements.apiStatusText.textContent = `API: ${text}`;
  }
}

/* ==========================================================================
   User Event Handlers
   ========================================================================== */

// Push Task Form Submission (POST method)
elements.todoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = elements.todoInput.value.trim();
  if (!title) return;

  const priority = elements.todoPriority.value;
  const category = elements.todoCategory.value;
  const dueDate = elements.todoDueDate.value;

  const pushBtn = document.getElementById('btn-push-task');
  pushBtn.disabled = true;
  pushBtn.style.opacity = '0.7';

  await pushTodoViaPOST({
    title,
    priority,
    category,
    dueDate,
    completed: false
  });

  // Reset form
  elements.todoInput.value = '';
  elements.todoDueDate.value = '';
  elements.todoInput.focus();
  pushBtn.disabled = false;
  pushBtn.style.opacity = '1';
});

// Window-scoped click handlers for generated HTML buttons
window.handleToggleClick = function(id) {
  toggleTodoStatus(id);
};

window.handleDeleteClick = function(id) {
  deleteTodoItem(id);
};

// Filter Tabs (All / Active / Completed)
elements.filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    elements.filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.filter = tab.dataset.filter;
    renderTodos();
  });
});

// Category Filter Select
elements.filterCategorySelect.addEventListener('change', (e) => {
  state.category = e.target.value;
  renderTodos();
});

// Search Input
elements.searchInput.addEventListener('input', (e) => {
  state.search = e.target.value;
  elements.btnClearSearch.classList.toggle('hidden', !state.search);
  renderTodos();
});

elements.btnClearSearch.addEventListener('click', () => {
  elements.searchInput.value = '';
  state.search = '';
  elements.btnClearSearch.classList.add('hidden');
  elements.searchInput.focus();
  renderTodos();
});

// Re-fetch Button (GET API)
elements.btnRefreshGet.addEventListener('click', () => {
  fetchTodosViaGET();
  showToast('Refreshed tasks via GET /api/todos', 'info');
});

// Clear Completed
elements.btnClearCompleted.addEventListener('click', () => {
  clearCompletedTasks();
});

// API Activity Inspector Drawer Toggle
elements.btnToggleApiDrawer.addEventListener('click', () => {
  elements.apiDrawer.classList.toggle('active');
  elements.btnToggleApiDrawer.classList.toggle('open');
});

elements.btnCloseDrawer.addEventListener('click', () => {
  elements.apiDrawer.classList.remove('active');
  elements.btnToggleApiDrawer.classList.remove('open');
});

elements.btnClearLogs.addEventListener('click', () => {
  state.apiLogs = [];
  renderApiLogs();
  showToast('API logs cleared', 'info');
});

// Dark/Light Theme Switcher
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
  } else {
    document.body.classList.add('theme-dark');
    document.body.classList.remove('theme-light');
    elements.themeIconSun.classList.remove('hidden');
    elements.themeIconMoon.classList.add('hidden');
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
  `;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// Helper Utilities
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function getInitialFallbackTodos() {
  return [
    {
      id: 'fallback-1',
      title: 'Welcome to TaskFlow! (Offline client mode)',
      completed: false,
      priority: 'high',
      category: 'Getting Started',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    },
    {
      id: 'fallback-2',
      title: 'Push a new task using the POST button above',
      completed: false,
      priority: 'medium',
      category: 'API',
      dueDate: ''
    }
  ];
}

function saveLocalFallback() {
  localStorage.setItem('taskflow_todos', JSON.stringify(state.todos));
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  // Esc to close drawer or clear search
  if (e.key === 'Escape') {
    if (elements.apiDrawer.classList.contains('active')) {
      elements.apiDrawer.classList.remove('active');
      elements.btnToggleApiDrawer.classList.remove('open');
    } else if (state.search) {
      elements.searchInput.value = '';
      state.search = '';
      elements.btnClearSearch.classList.add('hidden');
      renderTodos();
    }
  }
});

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  fetchTodosViaGET();
});
