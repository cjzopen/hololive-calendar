const calendarGrid = document.getElementById("calendar-grid");
const monthLabel = document.getElementById("month-label");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const searchInput = document.getElementById("search-input");
const filterCheckboxes = document.querySelectorAll(".filter-checkbox");

let current = new Date();
let fixedEvents = [];
let specialEvents = {};

fetch("fixed-events.json")
  .then(res => res.json())
  .then(data => {
    fixedEvents = data;
    return fetch("special-events.json");
  })
  .then(res => res.json())
  .then(data => {
    specialEvents = data;
    render();
  });

prevMonthBtn.onclick = () => {
  current.setMonth(current.getMonth() - 1);
  render();
};

nextMonthBtn.onclick = () => {
  current.setMonth(current.getMonth() + 1);
  render();
};

searchInput.oninput = render;
filterCheckboxes.forEach(cb => cb.onchange = render);

function render() {
  const year = current.getFullYear();
  const month = current.getMonth();
  const today = new Date();
  const searchKeyword = searchInput.value.trim();
  const enabledTypes = Array.from(filterCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];

  monthLabel.textContent = `${year} 年 ${month + 1} 月`;
  calendarGrid.innerHTML = "";

  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < startDay; i++) {
    calendarGrid.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= lastDate; d++) {
    const date = new Date(year, month, d);
    const cell = document.createElement("div");
    cell.className = "day-cell";
    if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === d) {
      cell.classList.add("today");
    }

    // const weekday = document.createElement("div");
    // weekday.className = "weekday";
    // weekday.textContent = weekdayNames[date.getDay()];
    // cell.appendChild(weekday);

    // const title = document.createElement("div");
    // title.textContent = d;
    // cell.appendChild(title);
    const dayContent = document.createElement("div");
    dayContent.innerHTML = `${d} <span class="weekday">（${weekdayNames[date.getDay()]}）</span>`;
    cell.appendChild(dayContent);

    const matches = [...fixedEvents.filter(e => e.month === month + 1 && e.day === d),
      ...(specialEvents[`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`] || [])];

    let highlight = false;

    for (const ev of matches) {
      if (!enabledTypes.includes(ev.type)) continue;

      // 多成員事件陣列處理
      if (ev.type === 'special' && (
        (Array.isArray(ev.character) && ev.character.length === 1) ||
        (typeof ev.character === 'string' && ev.character)
      )) {
        // event.special 只有一人（character 為陣列長度1或字串），不包 details
        const ch = Array.isArray(ev.character) ? ev.character[0] : ev.character;
        const name = Array.isArray(ev.name) ? ev.name[0] : ev.name;
        const emoji = Array.isArray(ev.emoji) ? ev.emoji[0] : (ev.emoji || "");
        const div = document.createElement("div");
        div.className = `event ${ev.type}`;
        div.title = `${name || ''}`;
        div.style.backgroundColor = `var(--${ch}-color)`;
        div.innerHTML = `<span class=\"event-member\" >${emoji} <span class=\"event-title\">${ev.event || ''}</span></span>`;
        if (searchKeyword && name && name.includes(searchKeyword)) {
          highlight = true;
        }
        cell.appendChild(div);
      } else if (Array.isArray(ev.character)) {
        // 多人
        const memberNames = ev.character.map((ch, idx) => {
          const name = Array.isArray(ev.name) ? ev.name[idx] : ev.name;
          const emoji = Array.isArray(ev.emoji) ? ev.emoji[idx] : (ev.emoji || "");
          return `<div class=\"event-member\" style=\"background-color:var(--${ch}-color)\"><span class=\"event-name\">${name}${emoji}</span></div>`;
        }).join('');
        const div = document.createElement("div");
        div.className = `event ${ev.type}`;
        div.innerHTML = `<details><summary><span class=\"event-title\">${ev.event || ""}</span></summary>${memberNames}</details>`;
        if (searchKeyword && ev.name.some && ev.name.some(n => n.includes(searchKeyword))) {
          highlight = true;
        }
        cell.appendChild(div);
      } else {
        const div = document.createElement("div");
        div.className = `event ${ev.type}`;
        div.innerHTML = `<span class=\"event-name\">${ev.name}</span>${ev.emoji} <span class=\"event-title\">${ev.event || ""}</span>`;
        div.style.backgroundColor = `var(--${ev.character}-color)`;
        if (searchKeyword && ev.name.includes(searchKeyword)) {
          highlight = true;
        }
        cell.appendChild(div);
      }
    }

    if (highlight) cell.classList.add("highlight");

    calendarGrid.appendChild(cell);
  }
}
