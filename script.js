/**
 * DAYBLOOM - Student Goal Tracker & Daily Habit Dashboard
 * Plain JavaScript (Vanilla, no external libraries, no frameworks)
 * Robust localStorage state management with error handling & local date processing.
 */

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // 1. Constants & Configuration
  // ---------------------------------------------------------------------------
  const STORAGE_KEY = "daybloom_data";

  // Original, short inspirational lines (18 lines)
  const MOTIVATIONAL_QUOTES = [
    "Every small effort today plants the seeds of tomorrow's success.",
    "Consistency is not about perfection, but showing up day after day.",
    "Focus on progress, not perfection — one habit at a time.",
    "The secret to getting ahead is simply getting started.",
    "Your future self will thank you for the work you do today.",
    "Small daily disciplines lead to massive long-term triumphs.",
    "Believe you can, take the next step, and watch yourself bloom.",
    "A little progress each day adds up to big results.",
    "Mistakes are proof that you are trying and learning.",
    "Success is the sum of small habits repeated day in and day out.",
    "Keep going; the hard days are the ones that build your strength.",
    "Dream big, start small, and stay focused on today's goals.",
    "Discipline is choosing between what you want now and what you want most.",
    "You don't have to be extreme, just consistent.",
    "Every completed goal is a step toward your biggest dreams.",
    "Cultivate your daily habits, and your results will flourish.",
    "Turn your ambitions into actions, one checklist at a time.",
    "Today is a fresh canvas — make every single goal count."
  ];

  // Exact 8 Curated Reference Books for 1st Year College Students
  const COLLEGE_REFERENCE_BOOKS = [
    {
      title: "Higher Engineering Mathematics",
      author: "B.S. Grewal",
      note: "Essential foundation for differential calculus, linear algebra, and analytical problem-solving."
    },
    {
      title: "Advanced Engineering Mathematics",
      author: "Erwin Kreyszig",
      note: "Comprehensive coverage of differential equations, Fourier analysis, and complex variables."
    },
    {
      title: "Let Us C",
      author: "Yashavant Kanetkar",
      note: "Clear, beginner-friendly introduction to C language fundamentals, pointers, and program flow."
    },
    {
      title: "The C Programming Language",
      author: "Brian W. Kernighan and Dennis M. Ritchie",
      note: "The definitive, authoritative classic for mastering standard C and systems-level programming."
    },
    {
      title: "Engineering Physics",
      author: "Gaur and Gupta",
      note: "Applied optics, laser technology, electromagnetism, and modern physical sciences."
    },
    {
      title: "Engineering Chemistry",
      author: "Jain and Jain",
      note: "Core concepts in polymers, water treatment, electrochemistry, and engineering materials."
    },
    {
      title: "Engineering Drawing",
      author: "N.D. Bhatt",
      note: "Foundational guide for orthographic projections, isometric views, and machine drafting."
    },
    {
      title: "A Foundation Course in Human Values and Professional Ethics",
      author: "R.R. Gaur, R. Sangal, G.P. Bagaria",
      note: "Value-oriented education exploring human relationships, universal values, and professional responsibility."
    }
  ];

  // Default clean data schema
  const DEFAULT_DATA = {
    profile: {
      name: "",
      age: "",
      standard: "",
      collegeStudent: false
    },
    goals: [],
    completions: {}, // { "YYYY-MM-DD": [goalId, ...] }
    points: 0,
    pointsLog: [], // [ { date, change, reason } ]
    lastProcessedDate: null,
    bestStreak: 0,
    theme: "light"
  };

  // State in memory
  let data = JSON.parse(JSON.stringify(DEFAULT_DATA));
  let currentCategoryFilter = "All";
  let quoteIndex = 0;
  let quoteTimer = null;
  let pendingDeleteGoalId = null;

  // ---------------------------------------------------------------------------
  // 2. Date Utilities (Local date strictly, no UTC shifts)
  // ---------------------------------------------------------------------------
  function getLocalDateString(d) {
    const dateObj = d instanceof Date ? d : new Date();
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getFullFormattedDate(d) {
    const dateObj = d instanceof Date ? d : new Date();
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${weekdays[dateObj.getDay()]}, ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  }

  // Generate unique goal ID using timestamp + random suffix
  function generateGoalId() {
    return Date.now().toString() + "_" + Math.random().toString(36).substring(2, 9);
  }

  // ---------------------------------------------------------------------------
  // 3. Storage Layer with Try/Catch Resilience
  // ---------------------------------------------------------------------------
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // First visit: determine theme preference from system
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        data = JSON.parse(JSON.stringify(DEFAULT_DATA));
        data.theme = prefersDark ? "dark" : "light";
        data.lastProcessedDate = getLocalDateString();
        saveData();
        return;
      }

      const parsed = JSON.parse(raw);
      // Validate schema and merge safely to protect against corrupted structures
      data = {
        profile: {
          name: typeof parsed.profile?.name === "string" ? parsed.profile.name : "",
          age: parsed.profile?.age !== undefined ? parsed.profile.age : "",
          standard: typeof parsed.profile?.standard === "string" ? parsed.profile.standard : "",
          collegeStudent: Boolean(parsed.profile?.collegeStudent)
        },
        goals: Array.isArray(parsed.goals) ? parsed.goals.filter(g => g && g.id && g.name) : [],
        completions: typeof parsed.completions === "object" && parsed.completions !== null ? parsed.completions : {},
        points: typeof parsed.points === "number" && !isNaN(parsed.points) ? Math.max(0, parsed.points) : 0,
        pointsLog: Array.isArray(parsed.pointsLog) ? parsed.pointsLog : [],
        lastProcessedDate: typeof parsed.lastProcessedDate === "string" ? parsed.lastProcessedDate : null,
        bestStreak: typeof parsed.bestStreak === "number" && !isNaN(parsed.bestStreak) ? parsed.bestStreak : 0,
        theme: parsed.theme === "dark" ? "dark" : "light"
      };
    } catch (err) {
      console.warn("Daybloom: Error reading localStorage data. Resetting to safe defaults.", err);
      data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      data.lastProcessedDate = getLocalDateString();
      saveData();
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Daybloom: Error saving data to localStorage.", err);
      showToast("Unable to save changes to browser storage.", "warning");
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Daily Reward Penalties & New Day Processing
  // ---------------------------------------------------------------------------
  function processPastDayPenalties() {
    const todayStr = getLocalDateString();

    if (!data.lastProcessedDate) {
      data.lastProcessedDate = todayStr;
      saveData();
      return;
    }

    if (data.lastProcessedDate >= todayStr) {
      return; // Already up to date
    }

    // Step day-by-day from the day after lastProcessedDate up to yesterday
    let [y, m, d] = data.lastProcessedDate.split("-").map(Number);
    let cursor = new Date(y, m - 1, d);
    cursor.setDate(cursor.getDate() + 1);

    const [ty, tm, td] = todayStr.split("-").map(Number);
    const todayDate = new Date(ty, tm - 1, td);

    let penaltiesCount = 0;

    while (cursor < todayDate) {
      const curDateStr = getLocalDateString(cursor);
      const completedIds = Array.isArray(data.completions[curDateStr]) ? data.completions[curDateStr] : [];

      // Goals that already existed on curDateStr
      const existedGoals = data.goals.filter(g => g.createdDate <= curDateStr);

      for (const goal of existedGoals) {
        if (!completedIds.includes(goal.id)) {
          // Missed goal penalty: -5 points once, floor at 0
          data.points = Math.max(0, data.points - 5);
          data.pointsLog.unshift({
            date: curDateStr,
            change: -5,
            reason: `Missed (${curDateStr}): ${goal.name}`
          });
          penaltiesCount++;
          showToast(`-5 points for missed goal: ${goal.name}`, "warning");
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    data.lastProcessedDate = todayStr;
    // Keep reasonable history size
    if (data.pointsLog.length > 50) {
      data.pointsLog = data.pointsLog.slice(0, 50);
    }
    saveData();
  }

  // ---------------------------------------------------------------------------
  // 5. Level & Streak Calculations
  // ---------------------------------------------------------------------------
  function getLevelInfo(pts) {
    if (pts >= 300) {
      return { title: "Full Bloom", icon: "🌺", nextThreshold: 300, minThreshold: 300, percent: 100 };
    }
    if (pts >= 150) {
      const pct = Math.round(((pts - 150) / 150) * 100);
      return { title: "Bloom", icon: "🌸", nextThreshold: 300, minThreshold: 150, percent: pct };
    }
    if (pts >= 50) {
      const pct = Math.round(((pts - 50) / 100) * 100);
      return { title: "Sprout", icon: "🌿", nextThreshold: 150, minThreshold: 50, percent: pct };
    }
    const pct = Math.round((pts / 50) * 100);
    return { title: "Seedling", icon: "🌱", nextThreshold: 50, minThreshold: 0, percent: pct };
  }

  function isDayFullyCompleted(dateStr) {
    // Only consider goals created on or before that date
    const activeGoals = data.goals.filter(g => g.createdDate <= dateStr);
    if (activeGoals.length === 0) {
      return false; // "A day with zero goals does not count toward the streak."
    }
    const completedIds = Array.isArray(data.completions[dateStr]) ? data.completions[dateStr] : [];
    return activeGoals.every(g => completedIds.includes(g.id));
  }

  function calculateStreak() {
    const today = new Date();
    const todayStr = getLocalDateString(today);

    let streak = 0;
    const checkDate = new Date(today);

    const todayDone = isDayFullyCompleted(todayStr);
    if (todayDone) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // "ending today, or ending yesterday if today is not finished yet"
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Trace backwards day by day
    while (true) {
      const curStr = getLocalDateString(checkDate);
      if (isDayFullyCompleted(curStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Check and update best streak
    if (streak > data.bestStreak) {
      data.bestStreak = streak;
      saveData();
    }

    return streak;
  }

  // ---------------------------------------------------------------------------
  // 6. UI Notification Toasts
  // ---------------------------------------------------------------------------
  function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const textSpan = document.createElement("span");
    textSpan.textContent = message;

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "toast-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Close notification");
    closeBtn.addEventListener("click", () => {
      dismissToast(toast);
    });

    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    const timer = setTimeout(() => {
      dismissToast(toast);
    }, 3500);

    toast._dismissTimer = timer;
  }

  function dismissToast(toast) {
    if (toast.classList.contains("hide")) return;
    toast.classList.add("hide");
    clearTimeout(toast._dismissTimer);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  // ---------------------------------------------------------------------------
  // 7. Motivational Quotes Banner
  // ---------------------------------------------------------------------------
  function initQuotesBanner() {
    const quoteEl = document.getElementById("quote-text");
    if (!quoteEl) return;

    // Pick a random starting quote
    quoteIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    quoteEl.textContent = `"${MOTIVATIONAL_QUOTES[quoteIndex]}"`;

    if (quoteTimer) clearInterval(quoteTimer);

    quoteTimer = setInterval(() => {
      quoteEl.classList.add("fade-out");
      setTimeout(() => {
        quoteIndex = (quoteIndex + 1) % MOTIVATIONAL_QUOTES.length;
        quoteEl.textContent = `"${MOTIVATIONAL_QUOTES[quoteIndex]}"`;
        quoteEl.classList.remove("fade-out");
      }, 400);
    }, 6000);
  }

  function getRandomQuote() {
    const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[idx];
  }

  // ---------------------------------------------------------------------------
  // 8. Theme Switcher (Light / Dark)
  // ---------------------------------------------------------------------------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    data.theme = theme;
    saveData();

    const icon = document.getElementById("theme-icon");
    const label = document.getElementById("theme-label");
    if (theme === "dark") {
      if (icon) icon.textContent = "☀️";
      if (label) label.textContent = "Light";
    } else {
      if (icon) icon.textContent = "🌙";
      if (label) label.textContent = "Dark";
    }
  }

  function initTheme() {
    applyTheme(data.theme);
    const themeBtn = document.getElementById("theme-toggle-btn");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const nextTheme = data.theme === "dark" ? "light" : "dark";
        applyTheme(nextTheme);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Single-Page Navigation
  // ---------------------------------------------------------------------------
  function switchSection(sectionId) {
    const sections = document.querySelectorAll(".app-section");
    sections.forEach(sec => {
      if (sec.id === `section-${sectionId}`) {
        sec.classList.add("active");
      } else {
        sec.classList.remove("active");
      }
    });

    // Update desktop nav buttons
    const desktopBtns = document.querySelectorAll(".nav-desktop .nav-btn");
    desktopBtns.forEach(btn => {
      if (btn.dataset.section === sectionId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Update mobile nav buttons
    const mobileBtns = document.querySelectorAll(".nav-mobile-bottom .mobile-nav-btn");
    mobileBtns.forEach(btn => {
      if (btn.dataset.section === sectionId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Refresh UI for the activated section
    renderCurrentSection(sectionId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderCurrentSection(sectionId) {
    if (sectionId === "dashboard") {
      renderDashboard();
    } else if (sectionId === "goals") {
      renderGoalsList();
    } else if (sectionId === "progress") {
      renderProgressSection();
    } else if (sectionId === "profile") {
      renderProfileSection();
    }
  }

  function initNavigation() {
    const navButtons = document.querySelectorAll("[data-section]");
    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.section;
        if (target) {
          switchSection(target);
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 10. Dashboard Rendering
  // ---------------------------------------------------------------------------
  function renderDashboard() {
    const todayStr = getLocalDateString();

    // Date & Greeting
    const dateEl = document.getElementById("dashboard-date");
    if (dateEl) {
      dateEl.textContent = getFullFormattedDate();
    }

    const greetingEl = document.getElementById("dashboard-greeting");
    if (greetingEl) {
      const name = data.profile.name ? data.profile.name.trim() : "";
      greetingEl.textContent = name ? `Hello, ${name}!` : "Hello there!";
    }

    // Points & Level Badge
    const levelInfo = getLevelInfo(data.points);
    const heroLevelBadge = document.getElementById("hero-level-badge");
    if (heroLevelBadge) {
      const iconSpan = heroLevelBadge.querySelector(".badge-icon");
      const titleSpan = document.getElementById("hero-level-title");
      const ptsSpan = document.getElementById("hero-points-count");
      if (iconSpan) iconSpan.textContent = levelInfo.icon;
      if (titleSpan) titleSpan.textContent = levelInfo.title;
      if (ptsSpan) ptsSpan.textContent = `${data.points} pts`;
    }

    // Summary Cards
    const totalGoals = data.goals.length;
    const completedTodayList = Array.isArray(data.completions[todayStr]) ? data.completions[todayStr] : [];
    // Only count completed goals that are still in data.goals
    const doneToday = completedTodayList.filter(id => data.goals.some(g => g.id === id)).length;
    const completionPercent = totalGoals === 0 ? 0 : Math.round((doneToday / totalGoals) * 100);

    const totalEl = document.getElementById("summary-total-goals");
    const doneEl = document.getElementById("summary-done-today");
    const percentEl = document.getElementById("summary-percent-today");
    const pointsEl = document.getElementById("summary-points");

    if (totalEl) totalEl.textContent = totalGoals;
    if (doneEl) doneEl.textContent = doneToday;
    if (percentEl) percentEl.textContent = `${completionPercent}%`;
    if (pointsEl) pointsEl.textContent = `${data.points} pts`;

    // Reminder Panel (Pending goals for today)
    renderReminderPanel(completedTodayList);
  }

  function renderReminderPanel(completedTodayList) {
    const container = document.getElementById("reminder-list-container");
    if (!container) return;
    container.innerHTML = "";

    const todayStr = getLocalDateString();
    const pendingGoals = data.goals.filter(g => !completedTodayList.includes(g.id));

    if (data.goals.length === 0) {
      // No goals exist state
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-state";

      const icon = document.createElement("div");
      icon.className = "empty-state-icon";
      icon.textContent = "🌱";

      const title = document.createElement("h3");
      title.className = "empty-state-title";
      title.textContent = "No Daily Goals Yet";

      const desc = document.createElement("p");
      desc.className = "empty-state-desc";
      desc.textContent = "Start your journey today by creating your first daily habit.";

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn-primary";
      addBtn.textContent = "➕ Add Your First Goal";
      addBtn.addEventListener("click", () => {
        switchSection("goals");
      });

      emptyDiv.appendChild(icon);
      emptyDiv.appendChild(title);
      emptyDiv.appendChild(desc);
      emptyDiv.appendChild(addBtn);
      container.appendChild(emptyDiv);
      return;
    }

    if (pendingGoals.length === 0) {
      // All goals completed state
      const doneDiv = document.createElement("div");
      doneDiv.className = "empty-state";

      const icon = document.createElement("div");
      icon.className = "empty-state-icon";
      icon.textContent = "🎉";

      const title = document.createElement("h3");
      title.className = "empty-state-title";
      title.textContent = "All done today!";

      const desc = document.createElement("p");
      desc.className = "empty-state-desc";
      desc.textContent = "Awesome job! You have completed every single goal planned for today.";

      doneDiv.appendChild(icon);
      doneDiv.appendChild(title);
      doneDiv.appendChild(desc);
      container.appendChild(doneDiv);
      return;
    }

    // List of pending goals
    pendingGoals.forEach(goal => {
      const item = document.createElement("div");
      item.className = "reminder-item";

      const infoDiv = document.createElement("div");
      infoDiv.className = "reminder-info";

      const categoryTag = document.createElement("span");
      categoryTag.className = "category-tag";
      categoryTag.textContent = goal.category;

      const nameSpan = document.createElement("span");
      nameSpan.className = "reminder-name";
      nameSpan.textContent = goal.name; // Escaped safely

      infoDiv.appendChild(categoryTag);
      infoDiv.appendChild(nameSpan);

      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "btn btn-secondary btn-sm";
      actionBtn.textContent = "Check Off ✓";
      actionBtn.title = "Mark this goal done for today";
      actionBtn.addEventListener("click", () => {
        toggleGoalCompletion(goal.id);
      });

      item.appendChild(infoDiv);
      item.appendChild(actionBtn);
      container.appendChild(item);
    });
  }

  // ---------------------------------------------------------------------------
  // 11. Goals Management (Add, Edit, Delete, Toggle)
  // ---------------------------------------------------------------------------
  function toggleGoalCompletion(goalId) {
    const todayStr = getLocalDateString();
    if (!Array.isArray(data.completions[todayStr])) {
      data.completions[todayStr] = [];
    }

    const goal = data.goals.find(g => g.id === goalId);
    if (!goal) return;

    const idx = data.completions[todayStr].indexOf(goalId);
    if (idx === -1) {
      // Mark as done: +10 points
      data.completions[todayStr].push(goalId);
      data.points += 10;
      data.pointsLog.unshift({
        date: todayStr,
        change: 10,
        reason: `Completed: ${goal.name}`
      });
      saveData();

      // Show toast with reward and random motivational message
      showToast(`+10 points! Nice work. "${getRandomQuote()}"`, "success");
    } else {
      // Un-marking on same day: -10 points (reverses reward, never below 0)
      data.completions[todayStr].splice(idx, 1);
      data.points = Math.max(0, data.points - 10);
      data.pointsLog.unshift({
        date: todayStr,
        change: -10,
        reason: `Unmarked: ${goal.name}`
      });
      saveData();

      showToast("-10 points (reversal)", "info");
    }

    // Refresh UI across components
    renderDashboard();
    renderGoalsList();
    renderProgressSection();
  }

  function initGoalsForm() {
    const form = document.getElementById("add-goal-form");
    const nameInput = document.getElementById("goal-name-input");
    const categorySelect = document.getElementById("goal-category-select");
    const charCount = document.getElementById("goal-char-count");
    const errorBox = document.getElementById("add-goal-error");

    if (nameInput && charCount) {
      nameInput.addEventListener("input", () => {
        charCount.textContent = `${nameInput.value.length}/60`;
        if (errorBox) errorBox.style.display = "none";
      });
    }

    if (form) {
      form.addEventListener("submit", e => {
        e.preventDefault();
        const trimmedName = (nameInput.value || "").trim();

        if (!trimmedName) {
          if (errorBox) {
            errorBox.textContent = "Please enter a valid goal name.";
            errorBox.style.display = "block";
          }
          nameInput.focus();
          return;
        }

        if (trimmedName.length > 60) {
          if (errorBox) {
            errorBox.textContent = "Goal name must be 60 characters or less.";
            errorBox.style.display = "block";
          }
          nameInput.focus();
          return;
        }

        const category = categorySelect ? categorySelect.value : "Study";
        const todayStr = getLocalDateString();

        const newGoal = {
          id: generateGoalId(),
          name: trimmedName,
          category: category,
          createdDate: todayStr
        };

        data.goals.push(newGoal);
        saveData();

        // Reset form
        form.reset();
        if (charCount) charCount.textContent = "0/60";
        if (errorBox) errorBox.style.display = "none";

        showToast(`Goal added: "${trimmedName}"`, "success");
        renderDashboard();
        renderGoalsList();
        renderProgressSection();
      });
    }

    // Category Filter Buttons
    const filterContainer = document.getElementById("category-filter-buttons");
    if (filterContainer) {
      const buttons = filterContainer.querySelectorAll(".filter-btn");
      buttons.forEach(btn => {
        btn.addEventListener("click", () => {
          buttons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          currentCategoryFilter = btn.dataset.category || "All";
          renderGoalsList();
        });
      });
    }
  }

  function renderGoalsList() {
    const container = document.getElementById("goals-container");
    if (!container) return;
    container.innerHTML = "";

    const todayStr = getLocalDateString();
    const completedToday = Array.isArray(data.completions[todayStr]) ? data.completions[todayStr] : [];

    // Filter goals by category
    const filteredGoals = currentCategoryFilter === "All"
      ? data.goals
      : data.goals.filter(g => g.category === currentCategoryFilter);

    if (filteredGoals.length === 0) {
      const emptyCard = document.createElement("div");
      emptyCard.className = "card empty-state";
      emptyCard.style.gridColumn = "1 / -1";

      const icon = document.createElement("div");
      icon.className = "empty-state-icon";
      icon.textContent = "📝";

      const title = document.createElement("h3");
      title.className = "empty-state-title";
      title.textContent = currentCategoryFilter === "All" ? "No Goals Created" : `No ${currentCategoryFilter} Goals Found`;

      const desc = document.createElement("p");
      desc.className = "empty-state-desc";
      desc.textContent = currentCategoryFilter === "All"
        ? "Add your first daily habit above to begin tracking your achievements."
        : "Switch to 'All' or add a new goal in this category above.";

      emptyCard.appendChild(icon);
      emptyCard.appendChild(title);
      emptyCard.appendChild(desc);
      container.appendChild(emptyCard);
      return;
    }

    filteredGoals.forEach(goal => {
      const isDone = completedToday.includes(goal.id);

      const card = document.createElement("div");
      card.className = `card goal-card category-${goal.category} ${isDone ? "completed" : ""}`;

      // Header row
      const headerDiv = document.createElement("div");
      headerDiv.className = "goal-header";

      const nameHeading = document.createElement("h3");
      nameHeading.className = "goal-name-heading";
      nameHeading.textContent = goal.name; // Escaped safely

      const categoryTag = document.createElement("span");
      categoryTag.className = "category-tag";
      categoryTag.textContent = goal.category;

      headerDiv.appendChild(nameHeading);
      headerDiv.appendChild(categoryTag);

      // Actions row
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "goal-actions-row";

      // Toggle Done/Not Done Button
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = `goal-toggle-btn ${isDone ? "is-done" : ""}`;
      toggleBtn.innerHTML = isDone ? "✓ Completed" : "Mark Done";
      toggleBtn.setAttribute("aria-label", isDone ? `Mark ${goal.name} as not completed` : `Mark ${goal.name} as completed`);
      toggleBtn.addEventListener("click", () => {
        toggleGoalCompletion(goal.id);
      });

      // Edit & Delete Buttons
      const btnGroup = document.createElement("div");
      btnGroup.className = "btn-group-mini";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn-mini";
      editBtn.innerHTML = "✏️";
      editBtn.title = "Edit goal";
      editBtn.setAttribute("aria-label", `Edit goal ${goal.name}`);
      editBtn.addEventListener("click", () => {
        openEditModal(goal);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn-mini btn-mini-delete";
      deleteBtn.innerHTML = "🗑️";
      deleteBtn.title = "Delete goal";
      deleteBtn.setAttribute("aria-label", `Delete goal ${goal.name}`);
      deleteBtn.addEventListener("click", () => {
        openDeleteModal(goal);
      });

      btnGroup.appendChild(editBtn);
      btnGroup.appendChild(deleteBtn);

      actionsDiv.appendChild(toggleBtn);
      actionsDiv.appendChild(btnGroup);

      card.appendChild(headerDiv);
      card.appendChild(actionsDiv);
      container.appendChild(card);
    });
  }

  // ---------------------------------------------------------------------------
  // 12. Edit & Delete Modals
  // ---------------------------------------------------------------------------
  function initModals() {
    // Edit Modal
    const editModal = document.getElementById("edit-goal-modal");
    const editForm = document.getElementById("edit-goal-form");
    const editIdInput = document.getElementById("edit-goal-id");
    const editNameInput = document.getElementById("edit-goal-name");
    const editCategorySelect = document.getElementById("edit-goal-category");
    const editCharCount = document.getElementById("edit-char-count");
    const editErrorBox = document.getElementById("edit-goal-error");
    const closeEditBtn = document.getElementById("btn-close-edit-modal");
    const cancelEditBtn = document.getElementById("btn-cancel-edit");

    if (editNameInput && editCharCount) {
      editNameInput.addEventListener("input", () => {
        editCharCount.textContent = `${editNameInput.value.length}/60`;
        if (editErrorBox) editErrorBox.style.display = "none";
      });
    }

    const closeEdit = () => {
      if (editModal) editModal.style.display = "none";
      if (editErrorBox) editErrorBox.style.display = "none";
    };

    if (closeEditBtn) closeEditBtn.addEventListener("click", closeEdit);
    if (cancelEditBtn) cancelEditBtn.addEventListener("click", closeEdit);

    if (editForm) {
      editForm.addEventListener("submit", e => {
        e.preventDefault();
        const id = editIdInput.value;
        const trimmedName = (editNameInput.value || "").trim();

        if (!trimmedName) {
          if (editErrorBox) {
            editErrorBox.textContent = "Please enter a valid goal name.";
            editErrorBox.style.display = "block";
          }
          editNameInput.focus();
          return;
        }

        const goal = data.goals.find(g => g.id === id);
        if (goal) {
          goal.name = trimmedName;
          goal.category = editCategorySelect.value;
          saveData();
          showToast("Goal updated successfully.", "success");
          closeEdit();
          renderDashboard();
          renderGoalsList();
          renderProgressSection();
        }
      });
    }

    // Delete Modal
    const deleteModal = document.getElementById("delete-confirm-modal");
    const closeDeleteBtn = document.getElementById("btn-close-delete-modal");
    const cancelDeleteBtn = document.getElementById("btn-cancel-delete");
    const confirmDeleteBtn = document.getElementById("btn-confirm-delete");

    const closeDelete = () => {
      if (deleteModal) deleteModal.style.display = "none";
      pendingDeleteGoalId = null;
    };

    if (closeDeleteBtn) closeDeleteBtn.addEventListener("click", closeDelete);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeDelete);

    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener("click", () => {
        if (!pendingDeleteGoalId) return;

        const todayStr = getLocalDateString();
        // Deleting a goal removes it from future calculations and completions, without breaking past percentages
        data.goals = data.goals.filter(g => g.id !== pendingDeleteGoalId);

        // Remove from today's completions if present
        if (Array.isArray(data.completions[todayStr])) {
          data.completions[todayStr] = data.completions[todayStr].filter(id => id !== pendingDeleteGoalId);
        }

        saveData();
        showToast("Goal deleted.", "info");
        closeDelete();
        renderDashboard();
        renderGoalsList();
        renderProgressSection();
      });
    }

    // Close on backdrop click or ESC key
    window.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        closeEdit();
        closeDelete();
      }
    });

    [editModal, deleteModal].forEach(modal => {
      if (modal) {
        modal.addEventListener("click", e => {
          if (e.target === modal) {
            closeEdit();
            closeDelete();
          }
        });
      }
    });
  }

  function openEditModal(goal) {
    const editModal = document.getElementById("edit-goal-modal");
    const editIdInput = document.getElementById("edit-goal-id");
    const editNameInput = document.getElementById("edit-goal-name");
    const editCategorySelect = document.getElementById("edit-goal-category");
    const editCharCount = document.getElementById("edit-char-count");
    const editErrorBox = document.getElementById("edit-goal-error");

    if (!editModal) return;

    editIdInput.value = goal.id;
    editNameInput.value = goal.name;
    editCategorySelect.value = goal.category;
    if (editCharCount) editCharCount.textContent = `${goal.name.length}/60`;
    if (editErrorBox) editErrorBox.style.display = "none";

    editModal.style.display = "flex";
    editNameInput.focus();
  }

  function openDeleteModal(goal) {
    const deleteModal = document.getElementById("delete-confirm-modal");
    const nameEl = document.getElementById("delete-goal-name-text");
    if (!deleteModal) return;

    pendingDeleteGoalId = goal.id;
    if (nameEl) nameEl.textContent = `"${goal.name}"`;

    deleteModal.style.display = "flex";
  }

  // ---------------------------------------------------------------------------
  // 13. Progress Section Rendering
  // ---------------------------------------------------------------------------
  function renderProgressSection() {
    const todayStr = getLocalDateString();
    const totalGoals = data.goals.length;
    const completedList = Array.isArray(data.completions[todayStr]) ? data.completions[todayStr] : [];
    const doneGoals = completedList.filter(id => data.goals.some(g => g.id === id)).length;
    const pct = totalGoals === 0 ? 0 : Math.round((doneGoals / totalGoals) * 100);

    // SVG Progress Ring
    const circle = document.getElementById("progress-circle-fill");
    const ringText = document.getElementById("progress-ring-text");
    const ringCount = document.getElementById("progress-ring-count");
    const linearFill = document.getElementById("linear-bar-fill");

    const radius = 66;
    const circumference = 2 * Math.PI * radius; // ~414.69

    if (circle) {
      circle.style.strokeDasharray = `${circumference} ${circumference}`;
      const offset = circumference - (pct / 100) * circumference;
      circle.style.strokeDashoffset = offset;
    }

    if (ringText) ringText.textContent = `${pct}%`;
    if (ringCount) ringCount.textContent = `${doneGoals}/${totalGoals} Done`;
    if (linearFill) linearFill.style.width = `${pct}%`;

    // Streaks
    const currentStreak = calculateStreak();
    const currentStreakEl = document.getElementById("current-streak-val");
    const bestStreakEl = document.getElementById("best-streak-val");
    if (currentStreakEl) currentStreakEl.textContent = currentStreak;
    if (bestStreakEl) bestStreakEl.textContent = data.bestStreak || 0;

    // Level Progress
    const levelInfo = getLevelInfo(data.points);
    const tierNameEl = document.getElementById("level-tier-name");
    const totalPtsEl = document.getElementById("level-total-pts");
    const levelFillEl = document.getElementById("level-progress-fill");

    if (tierNameEl) tierNameEl.textContent = `${levelInfo.icon} Level: ${levelInfo.title}`;
    if (totalPtsEl) totalPtsEl.textContent = `${data.points} Total Points`;
    if (levelFillEl) levelFillEl.style.width = `${levelInfo.percent}%`;

    // Weekly 7-day Bar Chart
    renderWeeklyChart();

    // Points Log History
    renderPointsHistory();
  }

  function renderWeeklyChart() {
    const container = document.getElementById("weekly-chart-container");
    if (!container) return;
    container.innerHTML = "";

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const todayStr = getLocalDateString(today);

    // Calculate last 7 days ending with today
    const past7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      past7Days.push(d);
    }

    past7Days.forEach(dateObj => {
      const dateStr = getLocalDateString(dateObj);
      const isToday = dateStr === todayStr;

      // Simplest implementation: Goal is removed from goals array and future completions;
      // past date calculations consider currently known goals active on that date, avoiding NaN and capping 0-100%.
      const goalsOnDate = data.goals.filter(g => g.createdDate <= dateStr);
      const completedOnDate = Array.isArray(data.completions[dateStr]) ? data.completions[dateStr] : [];
      const doneOnDate = completedOnDate.filter(id => goalsOnDate.some(g => g.id === id)).length;

      const percent = goalsOnDate.length === 0 ? 0 : Math.round((doneOnDate / goalsOnDate.length) * 100);

      const col = document.createElement("div");
      col.className = `chart-column ${isToday ? "is-today" : ""}`;

      const valLabel = document.createElement("span");
      valLabel.className = "chart-value-label";
      valLabel.textContent = `${percent}%`;

      const barWrap = document.createElement("div");
      barWrap.className = "chart-bar-wrap";

      const bar = document.createElement("div");
      bar.className = "chart-bar";
      bar.style.height = `${Math.max(4, Math.round((percent / 100) * 140))}px`;
      bar.setAttribute("title", `${dateStr}: ${percent}% (${doneOnDate}/${goalsOnDate.length} goals)`);

      barWrap.appendChild(bar);

      const dayLabel = document.createElement("span");
      dayLabel.className = "chart-day-label";
      dayLabel.textContent = isToday ? "Today" : daysOfWeek[dateObj.getDay()];

      col.appendChild(valLabel);
      col.appendChild(barWrap);
      col.appendChild(dayLabel);
      container.appendChild(col);
    });
  }

  function renderPointsHistory() {
    const container = document.getElementById("points-history-list");
    const summaryPill = document.getElementById("points-pill-summary");
    if (!container) return;
    container.innerHTML = "";

    if (summaryPill) {
      summaryPill.textContent = `Total: ${data.points} pts`;
    }

    // Show last 10 entries
    const history = data.pointsLog.slice(0, 10);

    if (history.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-state";
      emptyDiv.style.padding = "20px";

      const text = document.createElement("p");
      text.className = "text-muted text-sm";
      text.textContent = "No points recorded yet. Mark a daily goal done to earn +10 points!";

      emptyDiv.appendChild(text);
      container.appendChild(emptyDiv);
      return;
    }

    history.forEach(item => {
      const logDiv = document.createElement("div");
      logDiv.className = "point-log-item";

      const detailsDiv = document.createElement("div");
      detailsDiv.className = "point-log-details";

      const badge = document.createElement("span");
      const isPositive = item.change > 0;
      badge.className = `point-badge ${isPositive ? "positive" : "negative"}`;
      badge.textContent = isPositive ? `+${item.change}` : `${item.change}`;

      const reason = document.createElement("span");
      reason.className = "point-log-reason";
      reason.textContent = item.reason; // Safely set text

      detailsDiv.appendChild(badge);
      detailsDiv.appendChild(reason);

      const dateSpan = document.createElement("span");
      dateSpan.className = "point-log-date";
      dateSpan.textContent = item.date;

      logDiv.appendChild(detailsDiv);
      logDiv.appendChild(dateSpan);
      container.appendChild(logDiv);
    });
  }

  // ---------------------------------------------------------------------------
  // 14. Profile & Reference Books Section
  // ---------------------------------------------------------------------------
  function initProfileSection() {
    const form = document.getElementById("profile-form");
    const nameInput = document.getElementById("profile-name");
    const ageInput = document.getElementById("profile-age");
    const standardInput = document.getElementById("profile-standard");
    const errorBox = document.getElementById("profile-error");
    const clearBtn = document.getElementById("btn-clear-profile");
    const collegeToggle = document.getElementById("college-student-toggle");

    // Populate inputs from saved data
    if (nameInput) nameInput.value = data.profile.name || "";
    if (ageInput) ageInput.value = data.profile.age !== "" ? data.profile.age : "";
    if (standardInput) standardInput.value = data.profile.standard || "";
    if (collegeToggle) collegeToggle.checked = Boolean(data.profile.collegeStudent);

    // Render reference books and toggle visibility
    toggleReferenceBooks(Boolean(data.profile.collegeStudent));

    if (collegeToggle) {
      collegeToggle.addEventListener("change", () => {
        data.profile.collegeStudent = collegeToggle.checked;
        saveData();
        toggleReferenceBooks(data.profile.collegeStudent);
        showToast(
          data.profile.collegeStudent
            ? "College Student mode enabled. Reference books shown."
            : "College Student mode disabled. Reference books hidden.",
          "info"
        );
      });
    }

    if (form) {
      form.addEventListener("submit", e => {
        e.preventDefault();
        const trimmedName = (nameInput.value || "").trim();
        const ageVal = ageInput.value ? parseInt(ageInput.value, 10) : "";
        const standardVal = (standardInput.value || "").trim();

        // Validate age range (10 to 100) if provided
        if (ageVal !== "" && (isNaN(ageVal) || ageVal < 10 || ageVal > 100)) {
          if (errorBox) {
            errorBox.textContent = "Please enter a valid age between 10 and 100.";
            errorBox.style.display = "block";
          }
          ageInput.focus();
          return;
        }

        if (errorBox) errorBox.style.display = "none";

        data.profile.name = trimmedName;
        data.profile.age = ageVal;
        data.profile.standard = standardVal;
        data.profile.collegeStudent = collegeToggle ? collegeToggle.checked : false;

        saveData();
        showToast("Profile saved successfully!", "success");

        renderDashboard();
        renderProfileOverview();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        data.profile.name = "";
        data.profile.age = "";
        data.profile.standard = "";
        data.profile.collegeStudent = false;

        if (nameInput) nameInput.value = "";
        if (ageInput) ageInput.value = "";
        if (standardInput) standardInput.value = "";
        if (collegeToggle) collegeToggle.checked = false;
        if (errorBox) errorBox.style.display = "none";

        saveData();
        toggleReferenceBooks(false);
        renderDashboard();
        renderProfileOverview();

        showToast("Profile cleared.", "info");
      });
    }

    renderReferenceBooks();
    renderProfileOverview();
  }

  function renderProfileSection() {
    renderProfileOverview();
    const collegeToggle = document.getElementById("college-student-toggle");
    if (collegeToggle) {
      toggleReferenceBooks(collegeToggle.checked);
    }
  }

  function renderProfileOverview() {
    const avatarEl = document.getElementById("profile-avatar-initial");
    const nameEl = document.getElementById("display-profile-name");
    const metaEl = document.getElementById("display-profile-meta");
    const statStreak = document.getElementById("profile-stat-streak");
    const statPoints = document.getElementById("profile-stat-points");
    const statGoals = document.getElementById("profile-stat-goals");

    const name = data.profile.name ? data.profile.name.trim() : "";
    if (avatarEl) {
      avatarEl.textContent = name ? name.charAt(0).toUpperCase() : "?";
    }

    if (nameEl) {
      nameEl.textContent = name || "Guest Student";
    }

    if (metaEl) {
      const ageText = data.profile.age ? `Age: ${data.profile.age}` : "Age: Not set";
      const classText = data.profile.standard ? `Class: ${data.profile.standard}` : "Class: Not set";
      metaEl.textContent = `${ageText} • ${classText}`;
    }

    if (statStreak) statStreak.textContent = calculateStreak();
    if (statPoints) statPoints.textContent = data.points;
    if (statGoals) statGoals.textContent = data.goals.length;
  }

  function toggleReferenceBooks(isVisible) {
    const section = document.getElementById("reference-books-section");
    if (section) {
      section.style.display = isVisible ? "block" : "none";
    }
  }

  function renderReferenceBooks() {
    const container = document.getElementById("books-grid-container");
    if (!container) return;
    container.innerHTML = "";

    COLLEGE_REFERENCE_BOOKS.forEach(book => {
      const card = document.createElement("div");
      card.className = "book-card";

      const title = document.createElement("h3");
      title.className = "book-card-title";
      title.textContent = book.title;

      const author = document.createElement("span");
      author.className = "book-card-author";
      author.textContent = book.author;

      const note = document.createElement("p");
      note.className = "book-card-note";
      note.textContent = book.note;

      card.appendChild(title);
      card.appendChild(author);
      card.appendChild(note);
      container.appendChild(card);
    });
  }

  // ---------------------------------------------------------------------------
  // 15. Application Bootstrapping
  // ---------------------------------------------------------------------------
  function initApp() {
    // 1. Load data from localStorage safely
    loadData();

    // 2. Process penalties for any missed past days
    processPastDayPenalties();

    // 3. Initialize theme
    initTheme();

    // 4. Initialize navigation
    initNavigation();

    // 5. Initialize quotes banner & form listeners
    initQuotesBanner();
    initGoalsForm();
    initModals();
    initProfileSection();

    // 6. Initial render of Dashboard
    renderDashboard();

    // 7. Welcome motivating toast on every page load
    setTimeout(() => {
      showToast(`Welcome to Daybloom! "${getRandomQuote()}"`, "info");
    }, 600);
  }

  // Start when DOM is fully loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }

})();
