// DOM Elements
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const menuToggle = document.getElementById("menu-toggle");
const navItems = document.querySelectorAll(".nav-item");
const pageViews = document.querySelectorAll(".page-view");
const quickTodayBtn = document.getElementById("quick-today-btn");
const sidebarMemberStatus = document.getElementById("sidebar-member-status");

// Calendar Elements
const calendarGrid = document.getElementById("calendar-grid");
const monthLabel = document.getElementById("month-label");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const todayBtn = document.getElementById("today-btn");
const searchInput = document.getElementById("search-input");
const searchDatalist = document.getElementById("search-datalist");
const filterCheckboxes = document.querySelectorAll(".filter-checkbox");
const panelDateTitle = document.getElementById("panel-date-title");
const panelEventsList = document.getElementById("panel-events-list");
const calendarMemberFilterBanner = document.getElementById("calendar-member-filter-banner");
const calendarMemberFilterDesc = document.getElementById("calendar-member-filter-desc");
const calendarClearMemberBtn = document.getElementById("calendar-clear-member-btn");

// Home Elements
const heroDateBox = document.getElementById("hero-date-box");
const todaySummaryLabel = document.getElementById("today-summary-label");
const todayEventsContainer = document.getElementById("today-events-container");
const upcomingEventsContainer = document.getElementById("upcoming-events-container");
const upcomingFilterChips = document.querySelectorAll(".upcoming-filter-bar .filter-chip");

// Members Elements
const membersSearchInput = document.getElementById("members-search-input");
const membersGrid = document.getElementById("members-grid");
const membersListSubview = document.getElementById("members-list-subview");
const memberProfileSubview = document.getElementById("member-profile-subview");
const memberBackBtn = document.getElementById("member-back-btn");
const memberViewCalendarBtn = document.getElementById("member-view-calendar-btn");
const memberSpotlightCard = document.getElementById("member-spotlight-card");
const memberTimelineCount = document.getElementById("member-timeline-count");
const memberEventsTimeline = document.getElementById("member-events-timeline");

// App State
let fixedEvents = {};
let specialEventsByDate = {};
let allSpecialEventsList = [];
let currentDate = new Date();
let selectedDate = new Date();
let activeView = "home";
let upcomingFilter = "all";
let activeMemberFilter = null; // 当選されたメンバーのslug

const weekdayNames = ["日", "月", "火", "水", "木", "金", "土"];

// View Transitions Helper (uses CSS hardware-accelerated transitions)
function executeTransition(updateDomFn) {
  updateDomFn();
}

// Initialize & Fetch Data
Promise.all([
  fetch("fixed-events.json").then(res => res.json()),
  fetch("special-events.json").then(res => res.json())
]).then(([fixedData, specialData]) => {
  fixedEvents = fixedData;
  processSpecialEvents(specialData);
  populateSearchDatalist();
  setupEventListeners();
  renderApp();
  restoreSavedState();
}).catch(err => {
  console.error("データ読み込み失敗:", err);
});

// Process Special Events
function processSpecialEvents(data) {
  specialEventsByDate = {};
  allSpecialEventsList = [];

  for (const [eventTitle, eventArray] of Object.entries(data)) {
    for (const ev of eventArray) {
      const dates = Array.isArray(ev.date) ? ev.date : [ev.date];
      dates.forEach(dateStr => {
        if (!specialEventsByDate[dateStr]) {
          specialEventsByDate[dateStr] = [];
        }
        const item = {
          ...ev,
          event: eventTitle,
          date: dateStr
        };
        specialEventsByDate[dateStr].push(item);
        allSpecialEventsList.push(item);
      });
    }
  }
}

// Populate Search Datalist
function populateSearchDatalist() {
  if (searchDatalist && fixedEvents) {
    const names = Object.values(fixedEvents)
      .map(item => item.name)
      .filter(Boolean);
    searchDatalist.innerHTML = names
      .map(name => `<option value="${name}">`)
      .join("");
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Navigation View Switching
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetView = item.dataset.view;
      switchView(targetView);
      closeMobileSidebar();
    });
  });

  // Mobile Menu Toggle
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      sidebarOverlay.classList.toggle("open");
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeMobileSidebar);
  }

  // Quick Today Button
  if (quickTodayBtn) {
    quickTodayBtn.addEventListener("click", () => {
      currentDate = new Date();
      selectedDate = new Date();
      switchView("home");
      closeMobileSidebar();
    });
  }

  // Calendar Controls
  if (prevMonthBtn) {
    prevMonthBtn.onclick = () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      animateCalendarMonth("prev");
    };
  }

  if (nextMonthBtn) {
    nextMonthBtn.onclick = () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      animateCalendarMonth("next");
    };
  }

  if (todayBtn) {
    todayBtn.onclick = () => {
      currentDate = new Date();
      selectedDate = new Date();
      executeTransition(() => renderCalendarView());
    };
  }

  if (searchInput) {
    searchInput.oninput = () => renderCalendarView();
  }

  filterCheckboxes.forEach(cb => {
    cb.onchange = () => renderCalendarView();
  });

  if (calendarClearMemberBtn) {
    calendarClearMemberBtn.onclick = () => {
      clearMemberFocus();
    };
  }

  // Upcoming Filter Chips
  upcomingFilterChips.forEach(chip => {
    chip.addEventListener("click", () => {
      upcomingFilterChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      upcomingFilter = chip.dataset.filter;
      executeTransition(() => renderUpcomingSection());
    });
  });

  // Members View
  if (membersSearchInput) {
    membersSearchInput.oninput = () => renderMembersList();
  }

  if (memberBackBtn) {
    memberBackBtn.onclick = () => {
      executeTransition(() => {
        activeMemberFilter = null;
        localStorage.setItem("holokoyomi_active_member", "");
        updateSidebarMemberStatus();
        memberProfileSubview.classList.add("u-hidden");
        membersListSubview.classList.remove("u-hidden");
        renderMembersList();
      });
    };
  }

  if (memberViewCalendarBtn) {
    memberViewCalendarBtn.onclick = () => {
      switchView("calendar");
    };
  }
}

function closeMobileSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
}

function switchView(viewName) {
  if (activeView === viewName && viewName !== "members") return;

  localStorage.setItem("holokoyomi_active_view", viewName);

  executeTransition(() => {
    activeView = viewName;
    navItems.forEach(item => {
      item.classList.toggle("active", item.dataset.view === viewName);
    });
    pageViews.forEach(view => {
      view.classList.toggle("active", view.id === `view-${viewName}`);
    });

    if (viewName === "calendar") {
      renderCalendarView();
    } else if (viewName === "members") {
      if (activeMemberFilter) {
        membersListSubview.classList.add("u-hidden");
        memberProfileSubview.classList.remove("u-hidden");
        renderMemberSpotlightContent(activeMemberFilter);
      } else {
        membersListSubview.classList.remove("u-hidden");
        memberProfileSubview.classList.add("u-hidden");
        renderMembersList();
      }
    } else if (viewName === "home") {
      renderHomeView();
    }
  });
}

function restoreSavedState() {
  if (window.location.hash) {
    try {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch (e) {}
  }

  const savedView = localStorage.getItem("holokoyomi_active_view") || "home";
  const savedMember = localStorage.getItem("holokoyomi_active_member");

  if (savedView === "members" && savedMember && fixedEvents[savedMember]) {
    openMemberSpotlight(savedMember);
  } else if (savedMember && fixedEvents[savedMember] && savedView === "calendar") {
    activeMemberFilter = savedMember;
    updateSidebarMemberStatus();
    switchView("calendar");
  } else {
    switchView(savedView);
  }
}

function clearMemberFocus() {
  activeMemberFilter = null;
  localStorage.setItem("holokoyomi_active_member", "");
  updateSidebarMemberStatus();
  if (calendarMemberFilterBanner) {
    calendarMemberFilterBanner.classList.add("u-hidden");
  }
  executeTransition(() => renderCalendarView());
}

function animateCalendarMonth(direction) {
  executeTransition(() => {
    renderCalendarView();
    if (calendarGrid) {
      calendarGrid.classList.remove("slide-from-left", "slide-from-right");
      void calendarGrid.offsetWidth;
      calendarGrid.classList.add(direction === "prev" ? "slide-from-left" : "slide-from-right");
    }
  });
}

function updateSidebarMemberStatus() {
  if (!sidebarMemberStatus) return;
  if (!activeMemberFilter || !fixedEvents[activeMemberFilter]) {
    sidebarMemberStatus.innerHTML = "";
    return;
  }

  const member = fixedEvents[activeMemberFilter];
  sidebarMemberStatus.innerHTML = `
    <div class="status-title">現在のフォーカス</div>
    <div>${member.emoji || "✨"} <strong>${member.name}</strong></div>
    <button type="button" class="btn-clear-member" onclick="clearMemberFocus()">✕ フォーカス解除</button>
  `;
}

// Master Render
function renderApp() {
  renderHomeView();
  renderCalendarView();
  renderMembersList();
  updateSidebarMemberStatus();
}

// ----------------------------------------------------
// View 1: Home View (Today & Upcoming)
// ----------------------------------------------------
function renderHomeView() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const weekday = weekdayNames[today.getDay()];

  // Render Hero Date Box
  if (heroDateBox) {
    heroDateBox.innerHTML = `
      <div class="hero-date-today">TODAY</div>
      <div class="hero-date-number">${month}/${day}</div>
      <div class="hero-date-day">(${weekday})</div>
    `;
  }

  // Today Events
  const todayEvents = getEventsForDate(today);

  if (todaySummaryLabel) {
    if (todayEvents.length > 0) {
      todaySummaryLabel.textContent = `きょうは ${todayEvents.length} 件のイベントがあります！`;
    } else {
      todaySummaryLabel.textContent = "きょうの固定記念日・公式大型イベントはありません";
    }
  }

  if (todayEventsContainer) {
    if (todayEvents.length === 0) {
      todayEventsContainer.innerHTML = `
        <div class="today-empty-card">
          <div class="empty-icon">🍵</div>
          <div class="empty-title">きょうの予定はありません</div>
          <p class="empty-desc">まったり推しの配信を楽しもう！カレンダーからこれからの予定もチェックできます。</p>
          <button type="button" class="btn-go-calendar" onclick="switchView('calendar')">
            📅 カレンダーを見る
          </button>
        </div>
      `;
    } else {
      todayEventsContainer.innerHTML = todayEvents.map(ev => {
        const charColor = getMemberColorVar(ev.character);
        const typeLabel = ev.type === "birthday" ? "🎂 お誕生日！" : ev.type === "debut" ? "📢 デビュー記念日！" : "✨ 本日のイベント！";
        const titleText = ev.type === "birthday" ? `${ev.name} の誕生日` : ev.type === "debut" ? `${ev.name} デビュー記念日` : ev.event;

        return `
          <div class="photo-item upcoming-photo-card today-photo-card" style="--photo-color: ${charColor};" onclick="goToMemberOrCalendar('${ev.character}')">
            <div class="photo-item-inner card-inner">
              <div class="photo-item-img card-img">
                <div class="photo-talent-avatar">${ev.emoji || "✨"}</div>
                <div class="photo-deco-notice deco-notice"></div>
                <div class="photo-deco-kira deco-kira _rt">
                  <span class="_kira1">✦</span><span class="_kira2">✦</span>
                </div>
                <div class="photo-deco-kira deco-kira _lb">
                  <span class="_kira3">✦</span><span class="_kira4">✦</span>
                </div>
                <div class="photo-deco-hanko deco-hanko is-today">
                  <span class="hanko-sub">ホロこよみ</span>
                  <span class="hanko-text">本日！</span>
                </div>
              </div>
              <div class="photo-item-info card-info">
                <div class="photo-item-name-block card-name-block">
                  <div class="photo-item-name card-name">
                    <span class="photo-item-name-jp card-name-jp">${ev.name}</span>
                    <span class="photo-item-name-en card-name-en">${ev.character}</span>
                  </div>
                  <button type="button" class="photo-item-keep" onclick="event.stopPropagation(); toggleKeep(this)" title="お気に入り">🔖</button>
                </div>
                <div class="photo-item-event card-event">${titleText}</div>
                <div class="photo-item-bottom card-bottom">
                  <span class="photo-item-date card-date">${formatDisplayDate(today)}</span>
                  <div class="photo-item-icon card-icon">
                    <button type="button" class="ic-heart" onclick="event.stopPropagation(); toggleHeart(this)" title="いいね">♥</button>
                    <button type="button" class="ic-fukidashi" onclick="event.stopPropagation();" title="コメント">💬</button>
                    <button type="button" class="ic-share" onclick="event.stopPropagation(); shareEvent('${ev.name}', '${titleText}')" title="シェア">↗</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  renderUpcomingSection();
}

function renderUpcomingSection() {
  if (!upcomingEventsContainer) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingList = [];

  // 1. Process Fixed Events (Birthday & Debut)
  for (const [ch, info] of Object.entries(fixedEvents)) {
    if (info.birthday) {
      const occurrence = getNextOccurrence(info.birthday, today);
      if (occurrence.diffDays >= 0 && occurrence.diffDays <= 50) {
        upcomingList.push({
          type: "birthday",
          character: ch,
          name: info.name,
          emoji: info.emoji,
          event: `${info.name} の誕生日`,
          dateObj: occurrence.targetDate,
          dateStr: formatDateString(occurrence.targetDate),
          diffDays: occurrence.diffDays
        });
      }
    }

    if (info.debut) {
      const occurrence = getNextOccurrence(info.debut, today);
      if (occurrence.diffDays >= 0 && occurrence.diffDays <= 50) {
        upcomingList.push({
          type: "debut",
          character: ch,
          name: info.name,
          emoji: info.emoji,
          event: `${info.name} デビュー記念日`,
          dateObj: occurrence.targetDate,
          dateStr: formatDateString(occurrence.targetDate),
          diffDays: occurrence.diffDays
        });
      }
    }
  }

  // 2. Process Special Events
  for (const ev of allSpecialEventsList) {
    const parts = ev.date.split("-").map(Number);
    const evDate = new Date(parts[0], parts[1] - 1, parts[2]);
    evDate.setHours(0, 0, 0, 0);

    const diffTime = evDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 60) {
      const firstChar = Array.isArray(ev.character) ? ev.character[0] : ev.character;
      const charName = Array.isArray(ev.character)
        ? ev.character.map(c => fixedEvents[c]?.name || c).join(" / ")
        : (fixedEvents[firstChar]?.name || "hololive");
      const charEmoji = Array.isArray(ev.character)
        ? (fixedEvents[firstChar]?.emoji || "✨")
        : (fixedEvents[firstChar]?.emoji || "✨");

      upcomingList.push({
        type: "special",
        character: firstChar,
        name: charName,
        emoji: charEmoji,
        event: ev.event,
        dateObj: evDate,
        dateStr: ev.date,
        diffDays: diffDays
      });
    }
  }

  // Sort by date ascending
  upcomingList.sort((a, b) => a.diffDays - b.diffDays);

  // Filter
  const filteredList = upcomingList.filter(item => {
    if (upcomingFilter === "all") return true;
    return item.type === upcomingFilter;
  });

  if (filteredList.length === 0) {
    upcomingEventsContainer.innerHTML = `
      <div class="today-empty-card" style="grid-column: 1/-1;">
        <div class="empty-icon">🌟</div>
        <div class="empty-title">該当する予定はありません</div>
        <p class="empty-desc">他のフィルターを選択してチェックしてみてください！</p>
      </div>
    `;
    return;
  }

  // odeholo authentic PhotoItem Polaroid Cards
  upcomingEventsContainer.innerHTML = filteredList.slice(0, 24).map(item => {
    const countdownInfo = getCountdownBadge(item.diffDays);
    const charColor = getMemberColorVar(item.character);

    return `
      <div class="photo-item upcoming-photo-card" style="--photo-color: ${charColor};" onclick="goToMemberOrCalendar('${item.character}')">
        <div class="photo-item-inner card-inner">
          <div class="photo-item-img card-img">
            <div class="photo-talent-avatar">${item.emoji || "✨"}</div>
            <div class="photo-deco-notice deco-notice"></div>
            <div class="photo-deco-kira deco-kira _rt">
              <span class="_kira1">✦</span><span class="_kira2">✦</span>
            </div>
            <div class="photo-deco-kira deco-kira _lb">
              <span class="_kira3">✦</span><span class="_kira4">✦</span>
            </div>
            <div class="photo-deco-hanko deco-hanko ${countdownInfo.className}">
              <span class="hanko-sub">ホロこよみ</span>
              <span class="hanko-text">${countdownInfo.label}</span>
            </div>
          </div>
          <div class="photo-item-info card-info">
            <div class="photo-item-name-block card-name-block">
              <div class="photo-item-name card-name">
                <span class="photo-item-name-jp card-name-jp">${item.name}</span>
                <span class="photo-item-name-en card-name-en">${item.character}</span>
              </div>
              <button type="button" class="photo-item-keep" onclick="event.stopPropagation(); toggleKeep(this)" title="お気に入り">🔖</button>
            </div>
            <div class="photo-item-event card-event">${item.event}</div>
            <div class="photo-item-bottom card-bottom">
              <span class="photo-item-date card-date">${formatDisplayDate(item.dateObj)}</span>
              <div class="photo-item-icon card-icon">
                <button type="button" class="ic-heart" onclick="event.stopPropagation(); toggleHeart(this)" title="いいね">♥</button>
                <button type="button" class="ic-fukidashi" onclick="event.stopPropagation();" title="コメント">💬</button>
                <button type="button" class="ic-share" onclick="event.stopPropagation(); shareEvent('${item.name}', '${item.event}')" title="シェア">↗</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function getCountdownBadge(diffDays) {
  if (diffDays === 0) {
    return { label: "今日！", className: "is-today" };
  } else if (diffDays === 1) {
    return { label: "明日！", className: "is-tomorrow" };
  } else if (diffDays === 2) {
    return { label: "あさって！", className: "is-soon" };
  } else if (diffDays <= 7) {
    return { label: `あと ${diffDays} 日`, className: "is-soon" };
  } else {
    return { label: `あと ${diffDays} 日`, className: "" };
  }
}

function getNextOccurrence(monthDayStr, fromDate) {
  const [m, d] = monthDayStr.split("-").map(Number);
  const year = fromDate.getFullYear();
  let target = new Date(year, m - 1, d);
  target.setHours(0, 0, 0, 0);

  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  if (target.getTime() < from.getTime()) {
    target = new Date(year + 1, m - 1, d);
  }

  const diffDays = Math.round((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  return { targetDate: target, diffDays };
}

function formatDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdayNames[date.getDay()];
  return `${m}月${d}日 (${w})`;
}

// ----------------------------------------------------
// View 2: Full Calendar View
// ----------------------------------------------------
function renderCalendarView() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const searchKeyword = searchInput ? searchInput.value.trim() : "";
  const enabledTypes = Array.from(filterCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  if (monthLabel) {
    monthLabel.textContent = `${year}年 ${month + 1}月`;
  }

  // Update member filter banner
  if (calendarMemberFilterBanner) {
    if (activeMemberFilter && fixedEvents[activeMemberFilter]) {
      calendarMemberFilterBanner.classList.remove("u-hidden");
      calendarMemberFilterDesc.textContent = `🌸 ${fixedEvents[activeMemberFilter].name} の予定を表示中`;
    } else {
      calendarMemberFilterBanner.classList.add("u-hidden");
    }
  }

  if (!calendarGrid) return;
  calendarGrid.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  // Empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "day-cell empty-cell";
    calendarGrid.appendChild(emptyCell);
  }

  // Days of current month
  for (let d = 1; d <= lastDate; d++) {
    const thisDate = new Date(year, month, d);
    const cell = document.createElement("div");
    cell.className = "day-cell";

    const isToday = (today.getFullYear() === year && today.getMonth() === month && today.getDate() === d);
    if (isToday) {
      cell.classList.add("is-today");
    }

    const isSelected = (selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === d);
    if (isSelected) {
      cell.classList.add("is-active");
    }

    // Get events for this specific day
    let dayEvents = getEventsForDate(thisDate);

    // Apply active member filter if set
    if (activeMemberFilter) {
      dayEvents = dayEvents.filter(ev => {
        if (Array.isArray(ev.character)) {
          return ev.character.includes(activeMemberFilter);
        }
        return ev.character === activeMemberFilter;
      });
    }

    const filteredEvents = dayEvents.filter(ev => enabledTypes.includes(ev.type));

    // Search Keyword highlight
    let isHighlight = false;
    if (searchKeyword) {
      for (const ev of filteredEvents) {
        if (ev.name && ev.name.includes(searchKeyword)) {
          isHighlight = true;
          break;
        }
        if (ev.event && ev.event.includes(searchKeyword)) {
          isHighlight = true;
          break;
        }
      }
    }
    if (isHighlight) {
      cell.classList.add("is-highlight");
    }

    // Day Header
    const numberRow = document.createElement("div");
    numberRow.className = "day-number-row";
    numberRow.innerHTML = `<span class="day-number">${d}</span>`;

    // Mobile Dots
    if (filteredEvents.length > 0) {
      const mobileDots = document.createElement("div");
      mobileDots.className = "mobile-dots";
      filteredEvents.slice(0, 3).forEach(ev => {
        const dot = document.createElement("span");
        dot.className = "mobile-dot";
        dot.style.setProperty("--dot-color", getMemberColorVar(ev.character));
        mobileDots.appendChild(dot);
      });
      numberRow.appendChild(mobileDots);
    }
    cell.appendChild(numberRow);

    // Desktop Badges
    const badgesWrapper = document.createElement("div");
    badgesWrapper.className = "cell-badges-wrapper";

    filteredEvents.slice(0, 2).forEach(ev => {
      const chip = document.createElement("div");
      chip.className = "mini-event-chip";
      chip.style.setProperty("--chip-color", getMemberColorVar(ev.character));
      const icon = ev.type === "birthday" ? "🎂" : ev.type === "debut" ? "📢" : (ev.emoji || "✨");
      const name = ev.name || ev.event || "";
      chip.innerHTML = `<span class="chip-emoji">${icon}</span><span class="chip-text">${name}</span>`;
      badgesWrapper.appendChild(chip);
    });

    if (filteredEvents.length > 2) {
      const moreChip = document.createElement("div");
      moreChip.className = "more-events-chip";
      moreChip.textContent = `+${filteredEvents.length - 2} 件`;
      badgesWrapper.appendChild(moreChip);
    }

    cell.appendChild(badgesWrapper);

    // Click handler to select day
    cell.onclick = () => {
      selectedDate = new Date(year, month, d);
      document.querySelectorAll(".calendar-cards-grid .day-cell").forEach(c => c.classList.remove("is-active"));
      cell.classList.add("is-active");
      renderSelectedDayPanel(true);
    };

    calendarGrid.appendChild(cell);
  }

  renderSelectedDayPanel();
}

// Right/Bottom Day Detail Panel
function renderSelectedDayPanel(shouldAnimate = false) {
  if (!panelDateTitle || !panelEventsList) return;

  if (shouldAnimate) {
    panelEventsList.classList.remove("detail-inner");
    void panelEventsList.offsetWidth;
    panelEventsList.classList.add("detail-inner");
  }

  const y = selectedDate.getFullYear();
  const m = selectedDate.getMonth() + 1;
  const d = selectedDate.getDate();
  const w = weekdayNames[selectedDate.getDay()];

  panelDateTitle.textContent = `${y}年${m}月${d}日 (${w})`;

  let events = getEventsForDate(selectedDate);
  if (activeMemberFilter) {
    events = events.filter(ev => {
      if (Array.isArray(ev.character)) return ev.character.includes(activeMemberFilter);
      return ev.character === activeMemberFilter;
    });
  }

  if (events.length === 0) {
    panelEventsList.innerHTML = `
      <div class="panel-empty-state">
        <div class="empty-tea-icon">☕</div>
        <p>この日の予定はありません</p>
      </div>
    `;
    return;
  }

  panelEventsList.innerHTML = events.map(ev => {
    const charColor = getMemberColorVar(ev.character);
    const typeLabel = ev.type === "birthday" ? "🎂 お誕生日" : ev.type === "debut" ? "📢 デビュー記念" : "✨ イベント";

    let membersContent = "";
    if (Array.isArray(ev.character) && ev.character.length > 1) {
      const pills = ev.character.map((ch, idx) => {
        const name = Array.isArray(ev.name) ? ev.name[idx] : ev.name;
        const col = getMemberColorVar(ch);
        return `<span class="mini-member-pill" style="--pill-color: ${col};" onclick="event.stopPropagation(); openMemberSpotlight('${ch}')">${name}</span>`;
      }).join("");
      membersContent = `<div class="item-members-list">${pills}</div>`;
    }

    return `
      <div class="panel-event-item" style="--item-color: ${charColor};" onclick="goToMemberOrCalendar('${Array.isArray(ev.character) ? ev.character[0] : ev.character}')">
        <div class="item-top">
          <span class="item-type">${typeLabel}</span>
          <span class="item-emoji">${ev.emoji || "✨"}</span>
        </div>
        <div class="item-member-name">${Array.isArray(ev.name) ? ev.name.join("、") : (ev.name || "")}</div>
        <div class="item-event-title">${ev.event || (ev.type === "birthday" ? "誕生日" : "デビュー日")}</div>
        ${membersContent}
      </div>
    `;
  }).join("");
}

// Event Query Helper for Specific Date
function getEventsForDate(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const y = date.getFullYear();
  const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const matches = [];

  // 1. Fixed Events
  for (const [ch, info] of Object.entries(fixedEvents)) {
    if (info.birthday) {
      const [bm, bd] = info.birthday.split("-").map(Number);
      if (bm === m && bd === d) {
        matches.push({
          type: "birthday",
          character: ch,
          emoji: info.emoji,
          name: info.name,
          event: `${info.name} の誕生日`
        });
      }
      // Leap year 2/29 handling on non-leap years
      if (bm === 2 && bd === 29 && m === 2 && d === 28) {
        const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
        if (!isLeap) {
          matches.push({
            type: "birthday",
            character: ch,
            emoji: info.emoji,
            name: info.name,
            event: `${info.name} の誕生日 (平年)`
          });
        }
      }
    }

    if (info.debut) {
      const [dm, dd] = info.debut.split("-").map(Number);
      if (dm === m && dd === d) {
        matches.push({
          type: "debut",
          character: ch,
          emoji: info.emoji,
          name: info.name,
          event: `${info.name} デビュー記念日`
        });
      }
    }
  }

  // 2. Special Events
  const specials = (specialEventsByDate[dateStr] || []).map(ev => {
    if (!ev.character || (Array.isArray(ev.character) && ev.character.length === 0)) {
      return {
        ...ev,
        name: "",
        emoji: "✨"
      };
    }
    if (Array.isArray(ev.character)) {
      return {
        ...ev,
        name: ev.character.map(ch => fixedEvents[ch]?.name ?? ch),
        emoji: fixedEvents[ev.character[0]]?.emoji ?? "✨"
      };
    } else {
      return {
        ...ev,
        name: fixedEvents[ev.character]?.name ?? "",
        emoji: fixedEvents[ev.character]?.emoji ?? "✨"
      };
    }
  });

  return [...matches, ...specials];
}

function getMemberColorVar(character) {
  if (!character) return "var(--color-main)";
  const ch = Array.isArray(character) ? character[0] : character;
  return `var(--${ch}-color, var(--color-main))`;
}

// ----------------------------------------------------
// View 3: Members View
// ----------------------------------------------------
function renderMembersList() {
  if (!membersGrid) return;

  const keyword = membersSearchInput ? membersSearchInput.value.trim().toLowerCase() : "";

  const membersArray = Object.entries(fixedEvents).map(([slug, data]) => ({
    slug,
    ...data
  }));

  const filtered = membersArray.filter(m => {
    if (!keyword) return true;
    return (
      (m.name && m.name.toLowerCase().includes(keyword)) ||
      (m.slug && m.slug.toLowerCase().includes(keyword)) ||
      (m.emoji && m.emoji.includes(keyword))
    );
  });

  const favorites = getFavorites();

  membersGrid.innerHTML = filtered.map(member => {
    const colorVar = getMemberColorVar(member.slug);
    const isFav = favorites.includes(member.slug);
    const emojiStr = member.emoji || "✨";

    return `
      <div class="member-card" style="--card-color: ${colorVar};" onclick="openMemberSpotlight('${member.slug}')">
        <div class="member-color-indicator"></div>
        <div class="member-oshi-box" title="${member.name}の推しマーク">${emojiStr}</div>
        <div class="member-card-info">
          <div class="member-card-name">${member.name}</div>
          <div class="member-card-slug">${member.slug}</div>
        </div>
        <button type="button" 
                class="member-card-heart-btn ${isFav ? 'is-active' : ''}" 
                onclick="burstMemberOshiMark(event, '${member.slug}', '${escapeHtml(emojiStr)}')" 
                title="${member.name}を推す！">
          ♥
        </button>
      </div>
    `;
  }).join("");
}

// 點選成員後，畫面「以該成員為主」
function openMemberSpotlight(slug) {
  const member = fixedEvents[slug];
  if (!member) return;

  activeMemberFilter = slug;
  localStorage.setItem("holokoyomi_active_view", "members");
  localStorage.setItem("holokoyomi_active_member", slug);
  updateSidebarMemberStatus();

  executeTransition(() => {
    // 切換至成員檢視
    activeView = "members";
    navItems.forEach(item => {
      item.classList.toggle("active", item.dataset.view === "members");
    });
    pageViews.forEach(view => {
      view.classList.toggle("active", view.id === "view-members");
    });

    // 隱藏成員列表，顯示個人專屬畫面
    membersListSubview.classList.add("u-hidden");
    memberProfileSubview.classList.remove("u-hidden");

    renderMemberSpotlightContent(slug);
  });
}

function renderMemberSpotlightContent(slug) {
  const member = fixedEvents[slug];
  if (!member) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const colorVar = getMemberColorVar(slug);

  // Calculate Countdown for Birthday & Debut
  let birthdayCountdownText = "未登録";
  if (member.birthday) {
    const bOccurrence = getNextOccurrence(member.birthday, today);
    birthdayCountdownText = bOccurrence.diffDays === 0
      ? "🎉 きょうがお誕生日です！"
      : `次の誕生日まで あと ${bOccurrence.diffDays} 日`;
  }

  let debutCountdownText = "未登録";
  if (member.debut) {
    const dOccurrence = getNextOccurrence(member.debut, today);
    debutCountdownText = dOccurrence.diffDays === 0
      ? "📢 きょうがデビュー記念日です！"
      : `次のデビュー記念日まで あと ${dOccurrence.diffDays} 日`;
  }

  if (memberSpotlightCard) {
    memberSpotlightCard.innerHTML = `
      <div class="member-hero-header" style="--member-color: ${colorVar};">
        <div class="member-hero-emoji">${member.emoji || "✨"}</div>
        <div class="member-hero-title-box">
          <h2 class="member-hero-name">${member.name}</h2>
          <div class="member-hero-sub">${slug}</div>
        </div>
      </div>
      <div class="member-countdown-grid">
        <div class="member-date-card" style="--member-color: ${colorVar};">
          <div class="date-card-label">🎂 誕生日</div>
          <div class="date-card-date">${member.birthday || "—"}</div>
          <div class="date-card-countdown">${birthdayCountdownText}</div>
        </div>
        <div class="member-date-card" style="--member-color: ${colorVar};">
          <div class="date-card-label">📢 デビュー記念日</div>
          <div class="date-card-date">${member.debut || "—"}</div>
          <div class="date-card-countdown">${debutCountdownText}</div>
        </div>
      </div>
    `;
  }

  // Find all special events for this member
  const memberEvents = allSpecialEventsList.filter(ev => {
    if (Array.isArray(ev.character)) {
      return ev.character.includes(slug);
    }
    return ev.character === slug;
  });

  // Sort events by date
  memberEvents.sort((a, b) => a.date.localeCompare(b.date));

  if (memberTimelineCount) {
    memberTimelineCount.textContent = `全 ${memberEvents.length} 件`;
  }

  if (memberEventsTimeline) {
    if (memberEvents.length === 0) {
      memberEventsTimeline.innerHTML = `
        <div class="timeline-empty">出演イベントの登録はまだありません。</div>
      `;
    } else {
      memberEventsTimeline.innerHTML = memberEvents.map(ev => {
        return `
          <div class="timeline-event-item">
            <div class="event-left">
              <span class="event-date-tag">${ev.date}</span>
              <div class="event-title-text">${ev.event}</div>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goToMemberOrCalendar(character) {
  if (character && fixedEvents[character]) {
    openMemberSpotlight(character);
  } else {
    switchView("calendar");
  }
}

// Interactive Card Helpers (odeholo inspired)
function toggleKeep(btn) {
  btn.classList.toggle("active");
  btn.style.transform = "scale(1.25) rotate(6deg)";
  setTimeout(() => {
    btn.style.transform = "";
  }, 250);
}

function toggleHeart(btn) {
  btn.classList.toggle("active");
  btn.style.transform = "scale(1.35)";
  setTimeout(() => {
    btn.style.transform = "";
  }, 250);
}

function shareEvent(name, title) {
  const text = `【ホロこよみ】${name} - ${title}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(`${text}\n${window.location.href}`);
    showToast("クリップボードにコピーしました！");
  } else {
    showToast(`${name}: ${title}`);
  }
}

function showToast(msg) {
  let toast = document.getElementById("koyomi-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "koyomi-toast";
    toast.className = "koyomi-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// Favorites in localStorage
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem("holokoyomi_favorites")) || [];
  } catch (e) {
    return [];
  }
}

function isFavorite(slug) {
  return getFavorites().includes(slug);
}

function toggleFavorite(slug) {
  let favs = getFavorites();
  let nowActive = false;
  if (favs.includes(slug)) {
    favs = favs.filter(s => s !== slug);
    nowActive = false;
  } else {
    favs.push(slug);
    nowActive = true;
  }
  localStorage.setItem("holokoyomi_favorites", JSON.stringify(favs));
  return nowActive;
}

// Split emojis using Intl.Segmenter (handles up to 3 emojis and ZWJ sequences)
function splitEmojis(emojiStr) {
  if (!emojiStr) return ["💖"];
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
    const segments = Array.from(segmenter.segment(emojiStr)).map(s => s.segment.trim()).filter(Boolean);
    return segments.length > 0 ? segments : ["💖"];
  }
  return [...emojiStr].filter(c => c.trim().length > 0);
}

// Disperse/Burst Member's Oshi Mark Emojis on Click
function burstMemberOshiMark(event, slug, emojiStr) {
  event.stopPropagation();
  const btn = event.currentTarget || event.target;
  const isNowFav = toggleFavorite(slug);

  if (btn) {
    btn.classList.toggle("is-active", isNowFav);
    btn.style.transform = "scale(1.4) rotate(-8deg)";
    setTimeout(() => {
      if (btn) btn.style.transform = "";
    }, 250);
  }

  const emojis = splitEmojis(emojiStr);
  const rect = btn ? btn.getBoundingClientRect() : { left: event.clientX - 15, top: event.clientY - 15, width: 30, height: 30 };
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  const count = 22;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "oshi-burst-particle";
    p.textContent = emojis[i % emojis.length];

    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const distance = 70 + Math.random() * 150;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const rot = -180 + Math.random() * 360;
    const scale = 0.85 + Math.random() * 0.7;
    const delay = Math.random() * 90;

    p.style.setProperty("--tx", `${tx.toFixed(1)}px`);
    p.style.setProperty("--ty", `${ty.toFixed(1)}px`);
    p.style.setProperty("--rot", `${rot.toFixed(0)}deg`);
    p.style.setProperty("--scale", scale.toFixed(2));
    p.style.left = `${originX}px`;
    p.style.top = `${originY}px`;
    p.style.animationDelay = `${delay.toFixed(0)}ms`;

    document.body.appendChild(p);
    setTimeout(() => {
      if (p.parentNode) p.parentNode.removeChild(p);
    }, 1100);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// Global exposure for inline onclick handlers
window.switchView = switchView;
window.openMemberSpotlight = openMemberSpotlight;
window.goToMemberOrCalendar = goToMemberOrCalendar;
window.clearMemberFocus = clearMemberFocus;
window.toggleKeep = toggleKeep;
window.toggleHeart = toggleHeart;
window.shareEvent = shareEvent;
window.showToast = showToast;
window.burstMemberOshiMark = burstMemberOshiMark;
