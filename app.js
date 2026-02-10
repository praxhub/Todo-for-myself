const STORAGE_KEY = "todo_calendar_tasks_v1";
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const state = {
  tasks: loadTasks(),
  viewDate: new Date(),
};

const form = document.getElementById("task-form");
const taskTitle = document.getElementById("task-title");
const taskDate = document.getElementById("task-date");
const taskTime = document.getElementById("task-time");
const taskList = document.getElementById("task-list");
const monthLabel = document.getElementById("month-label");
const calendarWeekdays = document.getElementById("calendar-weekdays");
const calendarDays = document.getElementById("calendar-days");
const notifyBtn = document.getElementById("notify-btn");

document.getElementById("prev-month").addEventListener("click", () => {
  state.viewDate.setMonth(state.viewDate.getMonth() - 1);
  render();
});

document.getElementById("next-month").addEventListener("click", () => {
  state.viewDate.setMonth(state.viewDate.getMonth() + 1);
  render();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = taskTitle.value.trim();
  if (!title) return;

  const dueISO = new Date(`${taskDate.value}T${taskTime.value}`).toISOString();
  state.tasks.push({
    id: crypto.randomUUID(),
    title,
    dueISO,
    completed: false,
    notifiedMissed: false,
  });

  saveTasks(state.tasks);
  form.reset();
  runOverdueCheck();
  render();
});

notifyBtn.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("Notifications are not available in this browser.");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    notifyBtn.textContent = "Notifications Enabled";
  }
});

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatDue(iso) {
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isOverdue(task) {
  return !task.completed && new Date(task.dueISO).getTime() < Date.now();
}

function runOverdueCheck() {
  let changed = false;

  for (const task of state.tasks) {
    if (isOverdue(task) && !task.notifiedMissed) {
      changed = true;
      task.notifiedMissed = true;
      sendMissedNotification(task);
    }
  }

  if (changed) saveTasks(state.tasks);
}

function sendMissedNotification(task) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  new Notification("Task time missed", {
    body: `${task.title} was due at ${formatDue(task.dueISO)}`,
    tag: `missed-${task.id}`,
  });
}

function toggleTask(id) {
  state.tasks = state.tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task,
  );
  saveTasks(state.tasks);
  runOverdueCheck();
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  saveTasks(state.tasks);
  render();
}

function renderTasks() {
  const sorted = [...state.tasks].sort(
    (a, b) => new Date(a.dueISO).getTime() - new Date(b.dueISO).getTime(),
  );

  taskList.innerHTML = "";

  if (!sorted.length) {
    taskList.innerHTML = "<li><small>No tasks yet.</small></li>";
    return;
  }

  for (const task of sorted) {
    const overdue = isOverdue(task);
    const li = document.createElement("li");
    li.className = "task-item";
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(task.title)}</strong><br />
        <small>${formatDue(task.dueISO)}</small><br />
        ${task.completed ? '<small class="status-done">Done</small>' : overdue ? '<small class="status-overdue">Missed time</small>' : ""}
      </div>
      <div class="task-actions">
        <button data-id="${task.id}" data-action="toggle" type="button">${task.completed ? "Undo" : "Done"}</button>
        <button data-id="${task.id}" data-action="delete" type="button">Delete</button>
      </div>
    `;

    taskList.appendChild(li);
  }

  taskList.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { id, action } = btn.dataset;
      if (action === "toggle") toggleTask(id);
      if (action === "delete") deleteTask(id);
    });
  });
}

function renderCalendar() {
  const year = state.viewDate.getFullYear();
  const month = state.viewDate.getMonth();
  monthLabel.textContent = new Date(year, month).toLocaleString([], {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const taskDays = new Set(
    state.tasks.map((task) => new Date(task.dueISO).toDateString()),
  );
  const overdueDays = new Set(
    state.tasks.filter(isOverdue).map((task) => new Date(task.dueISO).toDateString()),
  );

  calendarWeekdays.innerHTML = "";
  calendarDays.innerHTML = "";

  for (const dayName of DAY_NAMES) {
    const el = document.createElement("div");
    el.className = "day-name";
    el.textContent = dayName;
    calendarWeekdays.appendChild(el);
  }

  for (let i = 0; i < startOffset; i += 1) {
    const spacer = document.createElement("div");
    spacer.className = "day-spacer";
    spacer.setAttribute("aria-hidden", "true");
    calendarDays.appendChild(spacer);
  }

  const today = new Date().toDateString();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateString = date.toDateString();
    const el = document.createElement("div");
    el.className = "day";
    if (taskDays.has(dateString)) el.classList.add("has-task");
    if (overdueDays.has(dateString)) el.classList.add("overdue");
    if (dateString === today) el.classList.add("today");
    el.textContent = String(day);
    calendarDays.appendChild(el);
  }
}

function render() {
  renderCalendar();
  renderTasks();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

if (Notification.permission === "granted") {
  notifyBtn.textContent = "Notifications Enabled";
}

runOverdueCheck();
render();
setInterval(() => {
  runOverdueCheck();
  render();
}, 60_000);
