var tasks = [];
var activeFilter = "All";
var searchText = "";
var editingTaskId = "";
var focusMode = false;
var focusedTaskId = "";

var taskForm = document.getElementById("taskForm");
var taskNameInput = document.getElementById("taskName");
var taskDescriptionInput = document.getElementById("taskDescription");
var taskCategoryInput = document.getElementById("taskCategory");
var taskPriorityInput = document.getElementById("taskPriority");
var taskDueDateInput = document.getElementById("taskDueDate");
var formMessage = document.getElementById("formMessage");
var submitButton = document.getElementById("submitButton");
var cancelEditButton = document.getElementById("cancelEditButton");
var taskGroups = document.getElementById("taskGroups");
var emptyState = document.getElementById("emptyState");
var searchInput = document.getElementById("searchInput");
var focusToggle = document.getElementById("focusToggle");
var focusToggleText = document.getElementById("focusToggleText");
var focusBanner = document.getElementById("focusBanner");
var taskNotice = document.getElementById("taskNotice");

function loadTasks() {
  var savedTasks = localStorage.getItem("taskflowTasks");

  if (savedTasks) {
    try {
      var parsedTasks = JSON.parse(savedTasks);
      if (Array.isArray(parsedTasks)) {
        tasks = parsedTasks;
      }
    } catch (error) {
      console.error("TaskFlow could not read saved tasks:", error);
      formMessage.textContent = "Saved tasks could not be loaded. New tasks can still be added.";
    }
  }
}

function saveTasks() {
  try {
    localStorage.setItem("taskflowTasks", JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("TaskFlow could not save tasks:", error);
    formMessage.textContent = "Your browser could not save this change. Check available storage.";
    return false;
  }
}

function getTodayText() {
  var today = new Date();
  return today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
}

function isOverdue(task) {
  return Boolean(task.dueDate) && !task.completed && task.dueDate < getTodayText();
}

function formatDate(dateText) {
  if (!dateText) {
    return "No due date";
  }

  var dateParts = dateText.split("-");
  var date = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function updateDashboard() {
  var completedCount = tasks.filter(function (task) {
    return task.completed;
  }).length;
  var pendingCount = tasks.length - completedCount;
  var highCount = tasks.filter(function (task) {
    return task.priority === "High";
  }).length;
  var score = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  document.getElementById("totalTasks").textContent = tasks.length;
  document.getElementById("pendingTasks").textContent = pendingCount;
  document.getElementById("completedTasks").textContent = completedCount;
  document.getElementById("highPriorityTasks").textContent = highCount;
  document.getElementById("productivityScore").textContent = score;
  document.getElementById("scoreBar").style.width = score + "%";
  document.getElementById("allCount").textContent = tasks.length;
  document.getElementById("pendingCount").textContent = pendingCount;
  document.getElementById("taskCount").textContent = tasks.length + (tasks.length === 1 ? " task" : " tasks");

  var motivation = "Every great day starts with one small step.";
  if (completedCount > 0 && pendingCount === 0) {
    motivation = "You did it! Everything on your list is complete.";
  } else if (completedCount >= 3) {
    motivation = "You are on a productivity streak! Keep that momentum.";
  } else if (completedCount > 0) {
    motivation = "Great job! Keep going — you are making progress.";
  }
  document.getElementById("motivationMessage").textContent = motivation;
}

function getVisibleTasks() {
  var visibleTasks = tasks.filter(function (task) {
    return task.name.toLowerCase().includes(searchText.toLowerCase())
      || task.description.toLowerCase().includes(searchText.toLowerCase())
      || task.category.toLowerCase().includes(searchText.toLowerCase())
      || task.priority.toLowerCase().includes(searchText.toLowerCase());
  });

  if (activeFilter === "Pending") {
    visibleTasks = visibleTasks.filter(function (task) {
      return !task.completed;
    });
  } else if (activeFilter === "Completed") {
    visibleTasks = visibleTasks.filter(function (task) {
      return task.completed;
    });
  } else if (activeFilter === "High Priority") {
    visibleTasks = visibleTasks.filter(function (task) {
      return task.priority === "High";
    });
  }

  if (focusMode && focusedTaskId) {
    visibleTasks = visibleTasks.filter(function (task) {
      return task.id === focusedTaskId;
    });
  }

  return visibleTasks;
}

function createTaskCard(task) {
  var card = document.createElement("article");
  card.className = "task-card priority-" + task.priority.toLowerCase();
  if (task.completed) {
    card.classList.add("is-completed");
  }
  var overdue = isOverdue(task);
  var dueToday = Boolean(task.dueDate) && !task.completed && task.dueDate === getTodayText();
  if (overdue) {
    card.classList.add("is-overdue");
  }
  if (dueToday) {
    card.classList.add("is-due-today");
  }

  var checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", "Mark " + task.name + " as " + (task.completed ? "pending" : "complete"));
  checkbox.addEventListener("change", function () {
    toggleTask(task.id);
  });

  var main = document.createElement("div");
  main.className = "task-main";
  var titleRow = document.createElement("div");
  titleRow.className = "task-title-row";
  var title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.name;

  var priority = document.createElement("span");
  priority.className = "priority-pill " + task.priority.toLowerCase();
  priority.textContent = task.priority;
  titleRow.appendChild(title);
  titleRow.appendChild(priority);

  main.appendChild(titleRow);

  if (overdue || dueToday) {
    var deadlineMessage = document.createElement("p");
    deadlineMessage.className = overdue ? "deadline-message overdue-message" : "deadline-message due-today-message";
    deadlineMessage.textContent = overdue
      ? "🚨 Overdue! This task has passed its deadline."
      : "⏰ Deadline Alert! This task is due today.";
    main.appendChild(deadlineMessage);
  }

  if (task.description) {
    var description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description;
    main.appendChild(description);
  }

  var meta = document.createElement("div");
  meta.className = "task-meta";
  var category = document.createElement("span");
  category.textContent = task.category;
  var dueDate = document.createElement("span");
  dueDate.textContent = formatDate(task.dueDate);
  var status = document.createElement("span");
  status.textContent = task.completed ? "Completed" : "Pending";
  meta.appendChild(category);
  meta.appendChild(dueDate);
  meta.appendChild(status);
  main.appendChild(meta);

  var actions = document.createElement("div");
  actions.className = "task-actions";
  var focusButton = document.createElement("button");
  focusButton.className = "task-action focus-action";
  focusButton.type = "button";
  focusButton.textContent = "◎";
  focusButton.title = "Focus on this task";
  focusButton.setAttribute("aria-label", "Focus on " + task.name);
  focusButton.addEventListener("click", function () {
    enterFocusMode(task.id);
  });
  actions.appendChild(focusButton);

  var editButton = document.createElement("button");
  editButton.className = "task-action";
  editButton.type = "button";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", function () {
    editTask(task.id);
  });
  actions.appendChild(editButton);

  var deleteButton = document.createElement("button");
  deleteButton.className = "task-action delete";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", function () {
    deleteTask(task.id);
  });
  actions.appendChild(deleteButton);

  card.appendChild(checkbox);
  card.appendChild(main);
  card.appendChild(actions);
  return card;
}

function renderTasks() {
  taskGroups.textContent = "";
  var visibleTasks = getVisibleTasks();
  var categories = [];

  visibleTasks.forEach(function (task) {
    if (!categories.includes(task.category)) {
      categories.push(task.category);
    }
  });

  categories.forEach(function (categoryName) {
    var groupTasks = visibleTasks.filter(function (task) {
      return task.category === categoryName;
    });
    var group = document.createElement("section");
    group.className = "task-group";
    var heading = document.createElement("h3");
    heading.className = "category-heading";
    var dot = document.createElement("span");
    dot.className = "category-dot";
    heading.appendChild(dot);
    heading.appendChild(document.createTextNode(categoryName));
    group.appendChild(heading);

    groupTasks.forEach(function (task) {
      group.appendChild(createTaskCard(task));
    });
    taskGroups.appendChild(group);
  });

  emptyState.hidden = visibleTasks.length > 0;
  if (visibleTasks.length === 0) {
    var noTasks = tasks.length === 0;
    document.getElementById("emptyTitle").textContent = searchText
      ? "No matching tasks found."
      : (noTasks ? "A fresh page." : "Nothing here just yet.");
    document.getElementById("emptyCopy").textContent = searchText
      ? "Try another search term or clear your search."
      : (noTasks
        ? "Add your first task and give today some direction."
        : "Try another filter to find what you need.");
  }

  focusBanner.hidden = !focusMode;
  taskGroups.classList.toggle("focus-mode", focusMode);
  focusToggleText.textContent = focusMode ? "Exit focus mode" : "Enter focus mode";
  document.getElementById("focusToggle").classList.toggle("active", focusMode);
  updateDashboard();
}

function resetForm() {
  taskForm.reset();
  editingTaskId = "";
  submitButton.innerHTML = "<span>＋</span> Add to my list";
  cancelEditButton.hidden = true;
  document.getElementById("formTitle").innerHTML = 'Create a task<span class="heading-period">.</span>';
  formMessage.textContent = "";
}

taskForm.addEventListener("submit", function (event) {
  event.preventDefault();
  var taskName = taskNameInput.value.trim();
  var taskDescription = taskDescriptionInput.value.trim();
  var taskCategory = taskCategoryInput.value;
  var taskPriority = taskPriorityInput.value;
  var taskDueDate = taskDueDateInput.value;

  if (taskName.length < 2) {
    formMessage.textContent = "Give your task a name with at least 2 characters.";
    taskNameInput.focus();
    return;
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9\s.,!?'"()\-&:]*$/.test(taskName)) {
    formMessage.textContent = "Use letters or numbers to start your task name.";
    taskNameInput.focus();
    return;
  }

  if (taskDescription.length > 220) {
    formMessage.textContent = "Keep the description under 220 characters.";
    taskDescriptionInput.focus();
    return;
  }

  var addedHighPriorityTask = !editingTaskId && taskPriority === "High";
  if (editingTaskId) {
    var taskIndex = tasks.findIndex(function (task) {
      return task.id === editingTaskId;
    });
    if (taskIndex !== -1) {
      tasks.splice(taskIndex, 1, {
        id: tasks[taskIndex].id,
        name: taskName,
        description: taskDescription,
        category: taskCategory,
        priority: taskPriority,
        dueDate: taskDueDate,
        completed: tasks[taskIndex].completed
      });
    }
  } else {
    tasks.unshift({
      id: String(Date.now()),
      name: taskName,
      description: taskDescription,
      category: taskCategory,
      priority: taskPriority,
      dueDate: taskDueDate,
      completed: false
    });
  }

  var wasSaved = saveTasks();
  resetForm();
  if (!wasSaved) {
    formMessage.textContent = "Task updated here, but your browser could not save it. Check available storage.";
  }
  if (addedHighPriorityTask) {
    document.getElementById("taskNoticeText").textContent = "⚠️ High Priority Task! Make sure to complete this task on time.";
    taskNotice.hidden = false;
  }
  renderTasks();
});

function toggleTask(taskId) {
  var taskIndex = tasks.findIndex(function (task) {
    return task.id === taskId;
  });
  if (taskIndex !== -1) {
    tasks[taskIndex].completed = !tasks[taskIndex].completed;
    saveTasks();
    renderTasks();
  }
}

function editTask(taskId) {
  var task = tasks.find(function (item) {
    return item.id === taskId;
  });
  if (!task) {
    return;
  }

  editingTaskId = taskId;
  taskNameInput.value = task.name;
  taskDescriptionInput.value = task.description;
  taskCategoryInput.value = task.category;
  taskPriorityInput.value = task.priority;
  taskDueDateInput.value = task.dueDate;
  submitButton.innerHTML = "<span>✓</span> Save changes";
  cancelEditButton.hidden = false;
  document.getElementById("formTitle").innerHTML = 'Edit your task<span class="heading-period">.</span>';
  formMessage.textContent = "";
  taskNameInput.focus();
  document.getElementById("taskForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

function deleteTask(taskId) {
  var taskIndex = tasks.findIndex(function (task) {
    return task.id === taskId;
  });
  if (taskIndex !== -1) {
    tasks.splice(taskIndex, 1);
    if (focusedTaskId === taskId) {
      focusedTaskId = "";
      focusMode = false;
    }
    if (editingTaskId === taskId) {
      resetForm();
    }
    saveTasks();
    renderTasks();
  }
}

function enterFocusMode(taskId) {
  focusedTaskId = taskId || (tasks.length > 0 ? tasks[0].id : "");
  if (!focusedTaskId) {
    formMessage.textContent = "Add a task before starting focus mode.";
    taskNameInput.focus();
    return;
  }
  focusMode = true;
  activeFilter = "All";
  searchText = "";
  searchInput.value = "";
  document.querySelectorAll(".filter-button").forEach(function (button) {
    button.classList.toggle("active", button.dataset.filter === "All");
  });
  renderTasks();
  document.getElementById("tasksTitle").scrollIntoView({ behavior: "smooth", block: "start" });
}

function exitFocusMode() {
  focusMode = false;
  focusedTaskId = "";
  renderTasks();
}

document.querySelectorAll(".filter-button").forEach(function (button) {
  button.addEventListener("click", function (event) {
    activeFilter = event.currentTarget.dataset.filter;
    focusMode = false;
    focusedTaskId = "";
    document.querySelectorAll(".filter-button").forEach(function (filterButton) {
      filterButton.classList.remove("active");
    });
    event.currentTarget.classList.add("active");
    renderTasks();
  });
});

searchInput.addEventListener("input", function (event) {
  searchText = event.target.value.trim();
  renderTasks();
});

focusToggle.addEventListener("click", function () {
  if (focusMode) {
    exitFocusMode();
  } else {
    enterFocusMode();
  }
});

document.getElementById("exitFocusButton").addEventListener("click", exitFocusMode);
cancelEditButton.addEventListener("click", resetForm);
document.getElementById("dismissNoticeButton").addEventListener("click", function () {
  taskNotice.hidden = true;
});

function loadProductivityTip() {
  var tipText = document.getElementById("tipText");
  var tipCredit = document.getElementById("tipCredit");

  fetch("https://api.adviceslip.com/advice?type=general")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("The tip service is unavailable.");
      }
      return response.json();
    })
    .then(function (data) {
      if (data.slip && data.slip.advice) {
        var advice = data.slip.advice.trim();
        if (!advice || /\b(?:bastard|bastards|shit|fuck|asshole|damn)\b/i.test(advice)) {
          throw new Error("The tip service returned unsuitable advice.");
        }
        tipText.textContent = advice;
        tipCredit.textContent = "A NOTE FOR YOUR DAY";
      } else {
        throw new Error("The tip service returned no advice.");
      }
    })
    .catch(function (error) {
      console.error("TaskFlow could not load a productivity tip:", error);
      tipText.textContent = "Small progress is still progress. Keep going! 🚀";
      tipCredit.textContent = "YOUR OFFLINE NUDGE";
    });
}

document.getElementById("tipRefresh").addEventListener("click", loadProductivityTip);

document.getElementById("todayLabel").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric"
});

loadTasks();
renderTasks();
loadProductivityTip();
