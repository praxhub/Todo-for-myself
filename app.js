const STORAGE_KEY = "todo_calendar_tasks_v1";
const NOTES_STORAGE_KEY = "todo_calendar_notes_v1";
const THEME_STORAGE_KEY = "todo_calendar_theme_v1";
const SOUND_STORAGE_KEY = "todo_calendar_sound_v1";
const VIEW_STORAGE_KEY = "todo_calendar_view_v1";
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const state = {
  tasks: loadTasks(),
  notes: loadNotes(),
  viewDate: new Date(),
  theme: loadTheme(),
  reminderSound: loadReminderSound(),
  viewMode: loadViewMode(),
};

const form = document.getElementById("task-form");
const taskTitle = document.getElementById("task-title");
const taskDate = document.getElementById("task-date");
const taskTime = document.getElementById("task-time");
const taskRecurring = document.getElementById("task-recurring");
const taskList = document.getElementById("task-list");
const monthLabel = document.getElementById("month-label");
const calendarWeekdays = document.getElementById("calendar-weekdays");
const calendarDays = document.getElementById("calendar-days");
const notifyBtn = document.getElementById("notify-btn");
const themeBtn = document.getElementById("theme-btn");
const noteDate = document.getElementById("note-date");
const noteText = document.getElementById("note-text");
const saveNoteBtn = document.getElementById("save-note-btn");
const noteStatus = document.getElementById("note-status");
const savedNoteDates = document.getElementById("saved-note-dates");
const notePreview = document.getElementById("note-preview");
const soundSelect = document.getElementById("sound-select");
const testSoundBtn = document.getElementById("test-sound-btn");
const viewMode = document.getElementById("view-mode");

document.getElementById("prev-month").addEventListener("click", () => {
  if (state.viewMode === "week") {
    state.viewDate.setDate(state.viewDate.getDate() - 7);
  } else {
    state.viewDate.setMonth(state.viewDate.getMonth() - 1);
  }
  render();
});

document.getElementById("next-month").addEventListener("click", () => {
  if (state.viewMode === "week") {
    state.viewDate.setDate(state.viewDate.getDate() + 7);
  } else {
    state.viewDate.setMonth(state.viewDate.getMonth() + 1);
  }
  render();
});

viewMode.addEventListener("change", () => {
  state.viewMode = viewMode.value;
  saveViewMode(state.viewMode);
  renderCalendar();
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
    recurrence: taskRecurring.value,
  });

  saveTasks(state.tasks);
  form.reset();
  taskRecurring.value = "none";
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

themeBtn.addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  saveTheme(state.theme);
  applyTheme();
});

noteDate.addEventListener("change", () => {
  loadNoteForSelectedDate();
});

saveNoteBtn.addEventListener("click", () => {
  const dateKey = noteDate.value;
  if (!dateKey) return;

  state.notes[dateKey] = noteText.value;
  saveNotes(state.notes);
  showNoteStatus(`Saved note for ${formatDateOnly(dateKey)}.`);
  renderSavedDates();
});

noteText.addEventListener("input", () => {
  const dateKey = noteDate.value;
  if (!dateKey) return;

  state.notes[dateKey] = noteText.value;
  saveNotes(state.notes);
  renderSavedDates();
  renderNotePreview();
});

document.querySelectorAll(".format-btn").forEach((btn) => {
  btn.addEventListener("click", () => applyFormatting(btn.dataset.format));
});

soundSelect.addEventListener("change", () => {
  state.reminderSound = soundSelect.value;
  saveReminderSound(state.reminderSound);
});

testSoundBtn.addEventListener("click", () => {
  playReminderSound();
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

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveNotes(notes) {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

function loadTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

function saveTheme(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function loadReminderSound() {
  const sound = localStorage.getItem(SOUND_STORAGE_KEY);
  return ["off", "beep", "chime"].includes(sound) ? sound : "off";
}

function saveReminderSound(sound) {
  localStorage.setItem(SOUND_STORAGE_KEY, sound);
}

function loadViewMode() {
  const mode = localStorage.getItem(VIEW_STORAGE_KEY);
  return mode === "week" ? "week" : "month";
}

function saveViewMode(mode) {
  localStorage.setItem(VIEW_STORAGE_KEY, mode);
}

function formatDue(iso) {
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateOnly(dateKey) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString([], { dateStyle: "medium" });
}

function isOverdue(task) {
  return !task.completed && new Date(task.dueISO).getTime() < Date.now();
}

function runOverdueCheck() {
  let changed = false;

  for (const task of state.tasks) {
    if (isOverdue(task) && !task.notifiedMissed) {
      task.notifiedMissed = true;
      changed = true;
      sendMissedNotification(task);
      playReminderSound();
    }
  }

  if (changed) saveTasks(state.tasks);
}

function sendMissedNotification(task) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  new Notification("Task time missed", {
    body: `${task.title} was due at ${formatDue(task.dueISO)}`,
    tag: `missed-${task.id}`,
  });
}

function playReminderSound() {
  if (state.reminderSound === "off") return;

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;

  const playTone = (freq, start, duration, gain = 0.12) => {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    amp.gain.value = gain;
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  };

  if (state.reminderSound === "beep") {
    playTone(880, now, 0.15);
  } else {
    playTone(740, now, 0.1);
    playTone(988, now + 0.12, 0.16);
  }
}

function getNextDueISO(dueISO, recurrence) {
  const dueDate = new Date(dueISO);

  if (recurrence === "daily") {
    dueDate.setDate(dueDate.getDate() + 1);
  } else if (recurrence === "weekly") {
    dueDate.setDate(dueDate.getDate() + 7);
  } else if (recurrence === "monthly") {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }

  return dueDate.toISOString();
}

function toggleTask(id) {
  let createdTask = null;

  state.tasks = state.tasks.map((task) => {
    if (task.id !== id) return task;

    const willComplete = !task.completed;
    if (willComplete && task.recurrence && task.recurrence !== "none") {
      createdTask = {
        id: crypto.randomUUID(),
        title: task.title,
        dueISO: getNextDueISO(task.dueISO, task.recurrence),
        completed: false,
        notifiedMissed: false,
        recurrence: task.recurrence,
      };
    }

    return { ...task, completed: willComplete };
  });

  if (createdTask) state.tasks.push(createdTask);

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
  const sorted = [...state.tasks].sort((a, b) => new Date(a.dueISO) - new Date(b.dueISO));
  taskList.innerHTML = "";

  if (!sorted.length) {
    taskList.innerHTML = "<li><small>No tasks yet.</small></li>";
    return;
  }

  for (const task of sorted) {
    const overdue = isOverdue(task);
    const recurrenceLabel = task.recurrence && task.recurrence !== "none" ? ` • ${task.recurrence}` : "";

    const li = document.createElement("li");
    li.className = "task-item";
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(task.title)}</strong><br />
        <small>${formatDue(task.dueISO)}${recurrenceLabel}</small><br />
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
  if (state.viewMode === "week") {
    renderWeekCalendar();
  } else {
    renderMonthCalendar();
  }
}

function renderMonthCalendar() {
  const year = state.viewDate.getFullYear();
  const month = state.viewDate.getMonth();

  monthLabel.textContent = new Date(year, month).toLocaleString([], {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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
  const taskDays = new Set(state.tasks.map((task) => new Date(task.dueISO).toDateString()));
  const overdueDays = new Set(state.tasks.filter(isOverdue).map((task) => new Date(task.dueISO).toDateString()));

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

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function renderWeekCalendar() {
  const start = startOfWeek(state.viewDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  monthLabel.textContent = `${start.toLocaleDateString([], { month: "short", day: "numeric" })} - ${end.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;

  calendarWeekdays.innerHTML = "";
  calendarDays.innerHTML = "";

  const today = new Date().toDateString();

  for (let i = 0; i < 7; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);

    const dayHeader = document.createElement("div");
    dayHeader.className = "day-name";
    dayHeader.textContent = DAY_NAMES[current.getDay()];
    calendarWeekdays.appendChild(dayHeader);

    const dayTasks = state.tasks.filter((task) => new Date(task.dueISO).toDateString() === current.toDateString());
    const hasOverdue = dayTasks.some((task) => isOverdue(task));

    const dayCell = document.createElement("div");
    dayCell.className = "day week-day";
    if (dayTasks.length) dayCell.classList.add("has-task");
    if (hasOverdue) dayCell.classList.add("overdue");
    if (current.toDateString() === today) dayCell.classList.add("today");
    dayCell.innerHTML = `<strong>${current.getDate()}</strong><small>${dayTasks.length ? `${dayTasks.length} task(s)` : "No tasks"}</small>`;
    calendarDays.appendChild(dayCell);
  }
}

function renderSavedDates() {
  const dates = Object.keys(state.notes)
    .filter((dateKey) => state.notes[dateKey]?.trim())
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 30);

  savedNoteDates.innerHTML = "";
  if (!dates.length) {
    savedNoteDates.innerHTML = "<li><small>No saved notes yet.</small></li>";
    return;
  }

  for (const dateKey of dates) {
    const li = document.createElement("li");
    li.innerHTML = `<button class="link-btn" data-date="${dateKey}" type="button">${formatDateOnly(dateKey)}</button>`;
    savedNoteDates.appendChild(li);
  }

  savedNoteDates.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      noteDate.value = btn.dataset.date;
      loadNoteForSelectedDate();
    });
  });
}

function loadNoteForSelectedDate() {
  const dateKey = noteDate.value;
  noteText.value = state.notes[dateKey] ?? "";
  showNoteStatus(`Viewing note for ${formatDateOnly(dateKey)}.`);
  renderNotePreview();
}

function renderNotePreview() {
  notePreview.innerHTML = markdownToHtml(noteText.value);
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  const out = [];
  let inList = false;

  const applyInline = (text) =>
    escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");

  for (const line of lines) {
    if (line.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${applyInline(line.slice(2))}</li>`);
      continue;
    }

    if (inList) {
      out.push("</ul>");
      inList = false;
    }

    if (line.startsWith("### ")) {
      out.push(`<h3>${applyInline(line.slice(4))}</h3>`);
    } else if (line.trim()) {
      out.push(`<p>${applyInline(line)}</p>`);
    }
  }

  if (inList) out.push("</ul>");
  return out.join("") || "<p><em>No content yet.</em></p>";
}

function applyFormatting(type) {
  const start = noteText.selectionStart;
  const end = noteText.selectionEnd;
  const value = noteText.value;
  const selected = value.slice(start, end);

  let replacement = selected;
  if (type === "bold") replacement = `**${selected || "bold text"}**`;
  if (type === "italic") replacement = `*${selected || "italic text"}*`;
  if (type === "heading") replacement = `### ${selected || "Heading"}`;
  if (type === "bullet") replacement = `- ${selected || "List item"}`;

  noteText.value = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
  noteText.focus();

  const dateKey = noteDate.value;
  if (dateKey) {
    state.notes[dateKey] = noteText.value;
    saveNotes(state.notes);
  }

  renderNotePreview();
  renderSavedDates();
}

function showNoteStatus(message) {
  noteStatus.textContent = message;
}

function getTodayInputDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function applyTheme() {
  document.body.dataset.theme = state.theme;
  themeBtn.textContent = state.theme === "light" ? "🌞 Light" : "🌙 Dark";
}

function render() {
  renderCalendar();
  renderTasks();
  renderSavedDates();
  renderNotePreview();
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

soundSelect.value = state.reminderSound;
viewMode.value = state.viewMode;
noteDate.value = getTodayInputDate();
loadNoteForSelectedDate();
applyTheme();
runOverdueCheck();
render();
setInterval(() => {
  runOverdueCheck();
  render();
}, 60_000);
