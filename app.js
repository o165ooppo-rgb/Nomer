/**
 * SIM Manager — app.js
 * Полная логика: авторизация, CRUD, статусы, пароль на изменения
 * С интеграцией Firebase Realtime Database
 */

// ─── КОНСТАНТЫ ───────────────────────────────────────────────
const APP_PASSWORD   = "admin123";   // пароль по умолчанию

// ─── DEMO DATA ───────────────────────────────────────────────
const DEFAULT_SIMS = [
  { id:1,  phone:"+998 90 123 45 67", company:"ООО Альфа-Трейд",    owner:"Иванов Иван Иванович",    address:"г. Ташкент, ул. Навои 14",        tariff:"Бизнес Про",      internet:"50 ГБ / мес",  abFee:"95 000 сум",  payDay:5,  extra:"—",                    operator:"Ucell",   note:"Основной номер директора", paidThisMonth:false },
  { id:2,  phone:"+998 93 234 56 78", company:"ИП Бета-Сервис",      owner:"Петрова Анна Борисовна",   address:"г. Ташкент, ул. Амира Темура 7",  tariff:"Корп Стандарт",   internet:"20 ГБ / мес",  abFee:"65 000 сум",  payDay:10, extra:"—",                    operator:"Beeline", note:"Бухгалтерия",             paidThisMonth:false },
  { id:3,  phone:"+998 91 345 67 89", company:"ООО Гамма",           owner:"Сидоров Петр",             address:"г. Самарканд, ул. Регистан 3",    tariff:"Корп Лайт",       internet:"10 ГБ / мес",  abFee:"45 000 сум",  payDay:15, extra:"10 000 сум (SMS)",      operator:"Mobiuz",  note:"Склад Самарканд",         paidThisMonth:false },
  { id:4,  phone:"+998 97 456 78 90", company:"ООО Дельта Логистик", owner:"Юсупов Бобур",             address:"г. Ташкент, ТИИТ, корп. 3",       tariff:"Бизнес Макс",     internet:"100 ГБ / мес", abFee:"140 000 сум", payDay:1,  extra:"—",                    operator:"Humans",  note:"Генеральный директор",    paidThisMonth:false },
  { id:5,  phone:"+998 94 567 89 01", company:"ООО Эпсилон",         owner:"Каримова Зульфия",          address:"г. Ташкент, Чиланзар 9-кв.",      tariff:"Корп Стандарт",   internet:"20 ГБ / мес",  abFee:"65 000 сум",  payDay:20, extra:"—",                    operator:"UMS",     note:"HR отдел",                paidThisMonth:false },
  { id:6,  phone:"+998 95 678 90 12", company:"ЧП Зета-Строй",       owner:"Рахимов Санжар",            address:"г. Бухара, ул. Гоголя 22",        tariff:"Бизнес Про",      internet:"50 ГБ / мес",  abFee:"95 000 сум",  payDay:25, extra:"5 000 сум (доп. мин)", operator:"Ucell",   note:"Прораб Бухара",           paidThisMonth:false },
  { id:7,  phone:"+998 99 789 01 23", company:"ООО Эта-Медиа",       owner:"Азимов Джамшид",            address:"г. Ташкент, ул. Шота Руставели 9",tariff:"Корп Лайт",       internet:"10 ГБ / мес",  abFee:"45 000 сум",  payDay:28, extra:"—",                    operator:"Beeline", note:"SMM специалист",          paidThisMonth:false },
  { id:8,  phone:"+998 98 890 12 34", company:"ООО Тета Импорт",     owner:"Хасанов Фаррух",            address:"г. Ташкент, АГМК офис",           tariff:"Бизнес Про",      internet:"50 ГБ / мес",  abFee:"95 000 сум",  payDay:3,  extra:"—",                    operator:"Mobiuz",  note:"Логистика импорт",        paidThisMonth:false },
  { id:9,  phone:"+998 77 901 23 45", company:"ИП Йота-Тех",         owner:"Мусаев Улугбек",            address:"г. Ташкент, Яшнабад р-н",         tariff:"Корп Стандарт",   internet:"20 ГБ / мес",  abFee:"65 000 сум",  payDay:7,  extra:"15 000 сум (роуминг)", operator:"Humans",  note:"IT отдел",                paidThisMonth:false },
  { id:10, phone:"+998 71 012 34 56", company:"ООО Каппа Финанс",    owner:"Бекова Малика",             address:"г. Ташкент, Мирабад р-н",         tariff:"Бизнес Макс",     internet:"100 ГБ / мес", abFee:"140 000 сум", payDay:12, extra:"—",                    operator:"UMS",     note:"Финансовый директор",     paidThisMonth:false },
  { id:11, phone:"+998 90 111 22 33", company:"ООО Лямбда",          owner:"Норов Тимур",               address:"г. Наманган, Центр р-н",           tariff:"Корп Лайт",       internet:"10 ГБ / мес",  abFee:"45 000 сум",  payDay:18, extra:"—",                    operator:"Ucell",   note:"Офис Наманган",           paidThisMonth:false },
  { id:12, phone:"+998 93 222 33 44", company:"ИП Мю-Дизайн",        owner:"Файзиева Шахло",            address:"г. Ташкент, ул. Беруни 12",       tariff:"Корп Стандарт",   internet:"20 ГБ / мес",  abFee:"65 000 сум",  payDay:22, extra:"—",                    operator:"Beeline", note:"Дизайн отдел",            paidThisMonth:false },
];

// ─── STATE ───────────────────────────────────────────────────
let sims = [];
let currentViewId = null;
let currentEditId = null;       // null = новый, число = редактирование
let pendingAction  = null;      // { type: 'edit'|'delete'|'paid', id }
let pendingDeleteId = null;
let isLoading = false;

// ─── FIREBASE ────────────────────────────────────────────────
const dbRef = window.ref(window.db, 'sims');

function saveToFirebase() {
  if (isLoading) return;
  window.set(dbRef, sims).catch(error => {
    console.error("Ошибка сохранения в Firebase:", error);
  });
}

async function loadFromFirebase() {
  isLoading = true;
  try {
    const snapshot = await window.get(dbRef);
    if (snapshot.exists()) {
      sims = snapshot.val();
      // Проверяем сброс месяца
      const savedMonth = localStorage.getItem("simmanager_month");
      const nowMonth   = new Date().getMonth() + "-" + new Date().getFullYear();
      if (savedMonth !== nowMonth) {
        sims.forEach(s => s.paidThisMonth = false);
        localStorage.setItem("simmanager_month", nowMonth);
        saveToFirebase();
      }
    } else {
      // Первый запуск — загружаем демо-данные
      sims = JSON.parse(JSON.stringify(DEFAULT_SIMS));
      saveToFirebase();
    }
  } catch (error) {
    console.error("Ошибка загрузки из Firebase:", error);
    sims = JSON.parse(JSON.stringify(DEFAULT_SIMS));
  }
  isLoading = false;
  return sims;
}

// ─── SESSION ─────────────────────────────────────────────────
function isLoggedIn() {
  return sessionStorage.getItem("simmanager_session") === "1";
}
function login() {
  sessionStorage.setItem("simmanager_session", "1");
  document.getElementById("lockScreen").style.display = "none";
  document.getElementById("app").style.display = "block";
  // Подписываемся на реальные обновления из Firebase
  window.onValue(dbRef, (snapshot) => {
    if (snapshot.exists() && !isLoading) {
      sims = snapshot.val();
      renderAll();
    }
  });
  renderAll();
}
function logout() {
  sessionStorage.removeItem("simmanager_session");
  location.reload();
}

// ─── DATE UTILS ──────────────────────────────────────────────
function now()         { return new Date(); }

function daysUntilPayment(sim) {
  if (sim.paidThisMonth) return 999; // Уже оплачено — не срочно

  const n  = now();
  const yr = n.getFullYear();
  const mo = n.getMonth();
  let next = new Date(yr, mo, sim.payDay);
  if (next <= n) next = new Date(yr, mo + 1, sim.payDay);
  return Math.ceil((next - n) / 864e5);
}

function cycleProgress(sim) {
  const n  = now();
  const yr = n.getFullYear();
  const mo = n.getMonth();
  let last = new Date(yr, mo, sim.payDay);
  let next = new Date(yr, mo + 1, sim.payDay);
  if (last > n) { last = new Date(yr, mo - 1, sim.payDay); next = new Date(yr, mo, sim.payDay); }
  return Math.min(100, Math.max(0, Math.round(((n - last) / (next - last)) * 100)));
}

function getStatus(sim) {
  if (sim.paidThisMonth) return "paid";
  const d = daysUntilPayment(sim);
  if (d <= 3) return "danger";
  if (d <= 7) return "warn";
  return "ok";
}

// ─── RENDER ──────────────────────────────────────────────────
function renderAll() {
  updateHeaderDate();
  renderStats();
  renderBanner();
  renderCards();
}

function updateHeaderDate() {
  const el = document.getElementById("headerDate");
  el.textContent = now().toLocaleDateString("ru-RU", { weekday:"short", day:"numeric", month:"long", year:"numeric" });
}

function renderStats() {
  const total   = sims.length;
  const warn    = sims.filter(s => getStatus(s) === "warn").length;
  const danger  = sims.filter(s => getStatus(s) === "danger").length;

  document.getElementById("countTotal").textContent   = total;
  document.getElementById("countWarning").textContent = warn;
  document.getElementById("countDanger").textContent  = danger;

  document.getElementById("pillWarn").style.display   = warn > 0   ? "" : "none";
  document.getElementById("pillDanger").style.display = danger > 0 ? "" : "none";
}

function renderBanner() {
  const urgents = sims.filter(s => getStatus(s) === "danger");
  const el = document.getElementById("alertBanner");
  if (urgents.length) {
    document.getElementById("alertText").textContent =
      `Срочная оплата (осталось ≤3 дня): ${urgents.map(s => s.phone + " — " + s.company).join("  |  ")}`;
    el.style.display = "flex";
  } else {
    el.style.display = "none";
  }
}

function renderCards() {
  const grid = document.getElementById("cardsGrid");
  grid.innerHTML = "";

  if (!sims.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-state-emoji">📱</div>
      <h3>Нет номеров</h3>
      <p>Нажмите «Добавить номер», чтобы начать</p>
    </div>`;
    return;
  }

  const sorted = [...sims].sort((a, b) => {
    const order = { danger:0, warn:1, ok:2, paid:3 };
    return order[getStatus(a)] - order[getStatus(b)];
  });

  sorted.forEach((sim, i) => {
    const st       = getStatus(sim);
    const days     = daysUntilPayment(sim);
    const progress = cycleProgress(sim);

    let badgeText, badgeClass;
    if (st === "paid")        { badgeText = "✓ Оплачено";           badgeClass = "badge-paid"; }
    else if (days === 0)      { badgeText = "Сегодня!";             badgeClass = "badge-danger"; }
    else if (days <= 3)       { badgeText = `${days} дн. — СРОЧНО`; badgeClass = "badge-danger"; }
    else if (days <= 7)       { badgeText = `${days} дн.`;          badgeClass = "badge-warn"; }
    else                      { badgeText = `${days} дн.`;          badgeClass = "badge-ok"; }

    const progClass = st === "paid" ? "prog-ok" : `prog-${st}`;
    const dotClass  = st === "paid" ? "dot-ok"  : `dot-${st}`;

    const card = document.createElement("div");
    card.className = `sim-card status-${st === "paid" ? "ok" : st}`;
    card.dataset.id = sim.id;
    card.style.animationDelay = `${i * 40}ms`;
    card.innerHTML = `
      <div class="card-top">
        <span class="card-operator-chip">${sim.operator}</span>
        <span class="card-dot ${dotClass}"></span>
      </div>
      <div class="card-number">${sim.phone}</div>
      <div class="card-company">${sim.company}</div>
      <div class="card-footer">
        <div class="card-pay-info">день <b>${sim.payDay}</b></div>
        <span class="card-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="card-progress">
        <div class="card-progress-inner ${progClass}" style="width:${progress}%"></div>
      </div>
    `;
    card.addEventListener("click", () => openViewModal(sim.id));
    grid.appendChild(card);
  });
}

// ─── VIEW MODAL ──────────────────────────────────────────────
function openViewModal(id) {
  const sim = sims.find(s => s.id === id);
  if (!sim) return;
  currentViewId = id;

  const st   = getStatus(sim);
  const days = daysUntilPayment(sim);
  const prog = cycleProgress(sim);

  // Status badge
  const sb = document.getElementById("vStatusBadge");
  const sbMap = { ok:"vsb-ok", warn:"vsb-warn", danger:"vsb-danger", paid:"vsb-paid" };
  const sbText = { ok:`✓ В порядке (${days} дн.)`, warn:`⚠ Скоро (${days} дн.)`, danger:`🔴 СРОЧНО (${days} дн.)`, paid:"✓ Оплачено в этом месяце" };
  sb.className = `view-status-badge ${sbMap[st]}`;
  sb.textContent = sbText[st];

  document.getElementById("vNumber").textContent = sim.phone;
  document.getElementById("vMeta").textContent   = `${sim.company}  •  ${sim.operator}`;

  // Countdown
  const cd = document.getElementById("vCountdown");
  if (st === "paid") {
    cd.textContent = "✅ Оплата этого месяца отмечена";
    cd.className = "view-countdown cd-paid";
  } else if (days === 0) {
    cd.textContent = "🔴 Оплатить СЕГОДНЯ!";
    cd.className = "view-countdown cd-danger";
  } else if (days <= 3) {
    cd.textContent = `🔴 Осталось ${days} дн. — СРОЧНО ОПЛАТИТЬ`;
    cd.className = "view-countdown cd-danger";
  } else if (days <= 7) {
    cd.textContent = `⚠️ До оплаты ${days} дн. — скоро`;
    cd.className = "view-countdown cd-warn";
  } else {
    cd.textContent = `✅ До оплаты ${days} дн. — всё в порядке`;
    cd.className = "view-countdown cd-ok";
  }

  // Fields
  const fields = [
    { label:"👤 На чьё имя",       value: sim.owner },
    { label:"🏢 Компания",          value: sim.company },
    { label:"📶 Тарифный план",     value: sim.tariff },
    { label:"🌐 Интернет",          value: sim.internet },
    { label:"💳 Абонентская плата", value: sim.abFee },
    { label:"📅 День оплаты",       value: `${sim.payDay}-е число каждого месяца` },
    { label:"💰 Доп. сумма",        value: sim.extra || "—" },
    { label:"📍 Адрес",             value: sim.address, wide: true },
    { label:"📝 Примечание",        value: sim.note || "—", wide: true },
  ];
  document.getElementById("vFields").innerHTML = fields.map(f =>
    `<div class="view-field${f.wide ? " wide" : ""}">
      <span class="vf-label">${f.label}</span>
      <span class="vf-value">${f.value}</span>
    </div>`
  ).join("");

  // Progress
  const fill = document.getElementById("vProgressFill");
  fill.style.width = prog + "%";
  fill.style.background = st === "ok" || st === "paid" ? "var(--ok)" : st === "warn" ? "var(--warn)" : "var(--danger)";
  document.getElementById("vProgressPct").textContent = prog + "%";

  // Paid button
  const paidBtn = document.getElementById("btnMarkPaid");
  if (sim.paidThisMonth) {
    paidBtn.textContent = "✓ Уже оплачено в этом месяце";
    paidBtn.classList.add("already-paid");
  } else {
    paidBtn.textContent = "✓ Отметить оплаченным";
    paidBtn.classList.remove("already-paid");
  }

  openOverlay("viewOverlay");
}

function closeViewModal() { closeOverlay("viewOverlay"); currentViewId = null; }

// ─── PAID ────────────────────────────────────────────────────
function markPaid() {
  if (!currentViewId) return;
  const sim = sims.find(s => s.id === currentViewId);
  if (!sim || sim.paidThisMonth) return;

  // Требуем пароль
  pendingAction = { type: "paid", id: currentViewId };
  openPasswordConfirm("Подтвердить оплату", `Отметить ${sim.phone} как оплаченный?`);
}

function executePaid(id) {
  const idx = sims.findIndex(s => s.id === id);
  if (idx === -1) return;
  sims[idx].paidThisMonth = true;
  saveToFirebase();
  renderAll();
  // Обновляем открытое модальное окно
  openViewModal(id);
}

// ─── EDIT ────────────────────────────────────────────────────
function startEdit(id) {
  pendingAction = { type: "edit", id };
  const sim = sims.find(s => s.id === id);
  openPasswordConfirm("Редактировать", `Редактировать номер ${sim ? sim.phone : ""}?`);
}

function openEditModal(id = null) {
  currentEditId = id;
  document.getElementById("editTitle").textContent = id ? "✏ Редактировать номер" : "+ Добавить номер";

  const sim = id ? sims.find(s => s.id === id) : null;
  document.getElementById("ePhone").value    = sim ? sim.phone    : "";
  document.getElementById("eCompany").value  = sim ? sim.company  : "";
  document.getElementById("eOwner").value    = sim ? sim.owner    : "";
  document.getElementById("eAddress").value  = sim ? sim.address  : "";
  document.getElementById("eTariff").value   = sim ? sim.tariff   : "";
  document.getElementById("eInternet").value = sim ? sim.internet : "";
  document.getElementById("eAbFee").value    = sim ? sim.abFee    : "";
  document.getElementById("ePayDay").value   = sim ? sim.payDay   : "";
  document.getElementById("eExtra").value    = sim ? sim.extra    : "";
  document.getElementById("eOperator").value = sim ? sim.operator : "Ucell";
  document.getElementById("eNote").value     = sim ? sim.note     : "";

  openOverlay("editOverlay");
}

function saveEdit() {
  const phone = document.getElementById("ePhone").value.trim();
  const company = document.getElementById("eCompany").value.trim();
  if (!phone || !company) { alert("Заполните номер телефона и компанию."); return; }

  const data = {
    phone,
    company,
    owner:    document.getElementById("eOwner").value.trim(),
    address:  document.getElementById("eAddress").value.trim(),
    tariff:   document.getElementById("eTariff").value.trim(),
    internet: document.getElementById("eInternet").value.trim(),
    abFee:    document.getElementById("eAbFee").value.trim(),
    payDay:   parseInt(document.getElementById("ePayDay").value) || 1,
    extra:    document.getElementById("eExtra").value.trim() || "—",
    operator: document.getElementById("eOperator").value,
    note:     document.getElementById("eNote").value.trim(),
  };

  if (currentEditId) {
    const idx = sims.findIndex(s => s.id === currentEditId);
    if (idx !== -1) sims[idx] = { ...sims[idx], ...data };
  } else {
    const newId = sims.length ? Math.max(...sims.map(s => s.id)) + 1 : 1;
    sims.push({ id: newId, paidThisMonth: false, ...data });
  }

  saveToFirebase();
  renderAll();
  closeOverlay("editOverlay");
}

// ─── DELETE ──────────────────────────────────────────────────
function startDelete(id) {
  pendingAction = { type: "delete", id };
  const sim = sims.find(s => s.id === id);
  openPasswordConfirm("Удалить номер", `Удалить ${sim ? sim.phone + " (" + sim.company + ")" : "этот номер"}?`);
}

function openDeleteConfirm(id) {
  pendingDeleteId = id;
  const sim = sims.find(s => s.id === id);
  document.getElementById("deleteSub").textContent =
    sim ? `${sim.phone} — ${sim.company}` : "Это действие нельзя отменить.";
  openOverlay("deleteOverlay");
}

function executeDelete(id) {
  sims = sims.filter(s => s.id !== id);
  saveToFirebase();
  renderAll();
  closeOverlay("deleteOverlay");
  closeViewModal();
}

// ─── PASSWORD CONFIRM MODAL ──────────────────────────────────
function openPasswordConfirm(title, sub) {
  document.getElementById("pwTitle").textContent  = title;
  document.getElementById("pwSub").textContent    = sub;
  document.getElementById("pwInput").value        = "";
  document.getElementById("pwError").textContent  = "";
  openOverlay("pwOverlay");
  setTimeout(() => document.getElementById("pwInput").focus(), 300);
}

function confirmPassword() {
  const val = document.getElementById("pwInput").value;
  if (val !== APP_PASSWORD) {
    document.getElementById("pwError").textContent = "Неверный пароль. Попробуйте снова.";
    document.getElementById("pwInput").value = "";
    document.getElementById("pwInput").focus();
    // Shake animation
    const inp = document.getElementById("pwInput");
    inp.style.animation = "none";
    inp.style.borderColor = "var(--danger)";
    inp.style.boxShadow   = "0 0 0 3px var(--danger-bg)";
    setTimeout(() => { inp.style.borderColor = ""; inp.style.boxShadow = ""; }, 1200);
    return;
  }

  closeOverlay("pwOverlay");

  if (!pendingAction) return;
  const { type, id } = pendingAction;
  pendingAction = null;

  if (type === "edit") {
    closeViewModal();
    setTimeout(() => openEditModal(id), 200);
  } else if (type === "delete") {
    openDeleteConfirm(id);
  } else if (type === "paid") {
    executePaid(id);
  } else if (type === "add") {
    closeViewModal();
    setTimeout(() => openEditModal(null), 200);
  }
}

// ─── ADD (requires password) ─────────────────────────────────
function startAdd() {
  pendingAction = { type: "add", id: null };
  openPasswordConfirm("Добавить номер", "Введите пароль для добавления новой SIM-карты.");
}

// ─── OVERLAY HELPERS ─────────────────────────────────────────
function openOverlay(id) {
  document.getElementById(id).classList.add("open");
}
function closeOverlay(id) {
  document.getElementById(id).classList.remove("open");
}
function closeAllModals() {
  ["viewOverlay","editOverlay","pwOverlay","deleteOverlay"].forEach(closeOverlay);
}

// ─── EVENT LISTENERS ─────────────────────────────────────────

// Lock screen
document.getElementById("lockBtn").addEventListener("click", () => {
  const pw = document.getElementById("lockPassword").value;
  if (pw === APP_PASSWORD) {
    login();
  } else {
    const errEl = document.getElementById("lockError");
    errEl.textContent = "Неверный пароль";
    const inp = document.getElementById("lockPassword");
    inp.value = "";
    inp.style.borderColor = "var(--danger)";
    inp.style.boxShadow   = "0 0 0 3px var(--danger-bg)";
    setTimeout(() => { inp.style.borderColor = ""; inp.style.boxShadow = ""; }, 1200);
  }
});
document.getElementById("lockPassword").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("lockBtn").click();
});

// Logout
document.getElementById("btnLogout").addEventListener("click", logout);

// FAB / add top button — требуют пароль
document.getElementById("fabAdd").addEventListener("click", startAdd);
document.getElementById("btnAddTop").addEventListener("click", startAdd);

// View modal actions
document.getElementById("vBtnClose").addEventListener("click", closeViewModal);
document.getElementById("vBtnEdit").addEventListener("click", () => {
  if (currentViewId) startEdit(currentViewId);
});
document.getElementById("vBtnDelete").addEventListener("click", () => {
  if (currentViewId) startDelete(currentViewId);
});
document.getElementById("btnMarkPaid").addEventListener("click", markPaid);

// Edit modal
document.getElementById("editCancel").addEventListener("click", () => closeOverlay("editOverlay"));
document.getElementById("editSave").addEventListener("click", saveEdit);

// Password modal
document.getElementById("pwConfirm").addEventListener("click", confirmPassword);
document.getElementById("pwCancel").addEventListener("click", () => {
  closeOverlay("pwOverlay");
  pendingAction = null;
});
document.getElementById("pwInput").addEventListener("keydown", e => {
  if (e.key === "Enter") confirmPassword();
});

// Delete modal
document.getElementById("deleteConfirm").addEventListener("click", () => {
  if (pendingDeleteId) executeDelete(pendingDeleteId);
});
document.getElementById("deleteCancel").addEventListener("click", () => {
  closeOverlay("deleteOverlay");
  pendingDeleteId = null;
});

// Close overlays on backdrop click
["viewOverlay","editOverlay","pwOverlay","deleteOverlay"].forEach(id => {
  document.getElementById(id).addEventListener("click", e => {
    if (e.target === e.currentTarget) {
      closeOverlay(id);
      if (id === "pwOverlay") pendingAction = null;
      if (id === "deleteOverlay") pendingDeleteId = null;
    }
  });
});

// ESC
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeAllModals();
});

// ─── INIT ────────────────────────────────────────────────────
// Загружаем данные из Firebase перед проверкой сессии
(async function init() {
  await loadFromFirebase();
  
  if (isLoggedIn()) {
    document.getElementById("lockScreen").style.display = "none";
    document.getElementById("app").style.display = "block";
    // Подписываемся на реальные обновления
    window.onValue(dbRef, (snapshot) => {
      if (snapshot.exists() && !isLoading) {
        sims = snapshot.val();
        renderAll();
      }
    });
    renderAll();
  } else {
    // Показываем lock screen
    setTimeout(() => document.getElementById("lockPassword").focus(), 400);
  }
})();

// Авто-обновление каждую минуту (для отображения актуальных дат)
setInterval(() => {
  if (isLoggedIn()) renderAll();
}, 60_000);