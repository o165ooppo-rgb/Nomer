/**
 * SIM Manager — app.js
 * Полная логика: авторизация, CRUD, статусы, пароль на изменения
 */

// ─── КОНСТАНТЫ ───────────────────────────────────────────────
const APP_PASSWORD   = "admin123";   // пароль по умолчанию
const STORAGE_KEY    = "simmanager_v2";
const SESSION_KEY    = "simmanager_session";

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
let firebaseReady = false;

// ─── STORAGE ─────────────────────────────────────────────────
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    sims = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_SIMS));
  } catch {
    sims = JSON.parse(JSON.stringify(DEFAULT_SIMS));
  }
  // Сброс флага paidThisMonth в новом месяце
  const savedMonth = localStorage.getItem("simmanager_month");
  const nowMonth   = new Date().getMonth() + "-" + new Date().getFullYear();
  if (savedMonth !== nowMonth) {
    sims.forEach(s => s.paidThisMonth = false);
    localStorage.setItem("simmanager_month", nowMonth);
    saveData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sims));
  // Также сохраняем в Firebase если она готова
  if (firebaseReady && window.db) {
    window.db.ref('sims').set(sims).catch(error => {
      console.error("Ошибка сохранения в Firebase:", error);
    });
  }
}

function loadFromFirebase() {
  if (!window.db) return;
  
  window.db.ref('sims').once('value', (snapshot) => {
    const firebaseData = snapshot.val();
    if (firebaseData && firebaseData.length) {
      sims = firebaseData;
      saveData(); // синхронизируем с localStorage
    } else {
      // Если в Firebase нет данных, загружаем из localStorage или demo
      loadData();
      if (window.db) {
        window.db.ref('sims').set(sims);
      }
    }
    renderAll();
  }).catch(error => {
    console.error("Ошибка загрузки из Firebase:", error);
    loadData();
    renderAll();
  });
}

// ─── SESSION ─────────────────────────────────────────────────
function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

function login() {
  sessionStorage.setItem(SESSION_KEY, "1");
  document.getElementById("lockScreen").style.display = "none";
  document.getElementById("app").style.display = "block";
  
  // Подписываемся на реальные обновления из Firebase
  if (window.db) {
    window.db.ref('sims').on('value', (snapshot) => {
      const firebaseData = snapshot.val();
      if (firebaseData && firebaseData.length) {
        sims = firebaseData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sims));
        renderAll();
      }
    });
  }
  
  renderAll();
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
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
  if (el) el.textContent = now().toLocaleDateString("ru-RU", { weekday:"short", day:"numeric", month:"long", year:"numeric" });
}

function renderStats() {
  const total   = sims.length;
  const warn    = sims.filter(s => getStatus(s) === "warn").length;
  const danger  = sims.filter(s => getStatus(s) === "danger").length;

  const totalEl = document.getElementById("countTotal");
  const warnEl = document.getElementById("countWarning");
  const dangerEl = document.getElementById("countDanger");
  const pillWarn = document.getElementById("pillWarn");
  const pillDanger = document.getElementById("pillDanger");
  
  if (totalEl) totalEl.textContent = total;
  if (warnEl) warnEl.textContent = warn;
  if (dangerEl) dangerEl.textContent = danger;
  if (pillWarn) pillWarn.style.display = warn > 0 ? "" : "none";
  if (pillDanger) pillDanger.style.display = danger > 0 ? "" : "none";
}

function renderBanner() {
  const urgents = sims.filter(s => getStatus(s) === "danger");
  const el = document.getElementById("alertBanner");
  const alertText = document.getElementById("alertText");
  if (urgents.length && el && alertText) {
    alertText.textContent = `Срочная оплата (осталось ≤3 дня): ${urgents.map(s => s.phone + " — " + s.company).join("  |  ")}`;
    el.style.display = "flex";
  } else if (el) {
    el.style.display = "none";
  }
}

function renderCards() {
  const grid = document.getElementById("cardsGrid");
  if (!grid) return;
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
        <span class="card-operator-chip">${escapeHtml(sim.operator)}</span>
        <span class="card-dot ${dotClass}"></span>
      </div>
      <div class="card-number">${escapeHtml(sim.phone)}</div>
      <div class="card-company">${escapeHtml(sim.company)}</div>
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

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
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
  if (sb) {
    sb.className = `view-status-badge ${sbMap[st]}`;
    sb.textContent = sbText[st];
  }

  const vNumber = document.getElementById("vNumber");
  const vMeta = document.getElementById("vMeta");
  if (vNumber) vNumber.textContent = sim.phone;
  if (vMeta) vMeta.textContent = `${sim.company}  •  ${sim.operator}`;

  // Countdown
  const cd = document.getElementById("vCountdown");
  if (cd) {
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
  const vFields = document.getElementById("vFields");
  if (vFields) {
    vFields.innerHTML = fields.map(f =>
      `<div class="view-field${f.wide ? " wide" : ""}">
        <span class="vf-label">${f.label}</span>
        <span class="vf-value">${escapeHtml(f.value)}</span>
      </div>`
    ).join("");
  }

  // Progress
  const fill = document.getElementById("vProgressFill");
  const pct = document.getElementById("vProgressPct");
  if (fill) {
    fill.style.width = prog + "%";
    fill.style.background = st === "ok" || st === "paid" ? "var(--ok)" : st === "warn" ? "var(--warn)" : "var(--danger)";
  }
  if (pct) pct.textContent = prog + "%";

  // Paid button
  const paidBtn = document.getElementById("btnMarkPaid");
  if (paidBtn) {
    if (sim.paidThisMonth) {
      paidBtn.textContent = "✓ Уже оплачено в этом месяце";
      paidBtn.classList.add("already-paid");
    } else {
      paidBtn.textContent = "✓ Отметить оплаченным";
      paidBtn.classList.remove("already-paid");
    }
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
  saveData();
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
  const titleEl = document.getElementById("editTitle");
  if (titleEl) titleEl.textContent = id ? "✏ Редактировать номер" : "+ Добавить номер";

  const sim = id ? sims.find(s => s.id === id) : null;
  const ePhone = document.getElementById("ePhone");
  const eCompany = document.getElementById("eCompany");
  const eOwner = document.getElementById("eOwner");
  const eAddress = document.getElementById("eAddress");
  const eTariff = document.getElementById("eTariff");
  const eInternet = document.getElementById("eInternet");
  const eAbFee = document.getElementById("eAbFee");
  const ePayDay = document.getElementById("ePayDay");
  const eExtra = document.getElementById("eExtra");
  const eOperator = document.getElementById("eOperator");
  const eNote = document.getElementById("eNote");
  
  if (ePhone) ePhone.value = sim ? sim.phone : "";
  if (eCompany) eCompany.value = sim ? sim.company : "";
  if (eOwner) eOwner.value = sim ? sim.owner : "";
  if (eAddress) eAddress.value = sim ? sim.address : "";
  if (eTariff) eTariff.value = sim ? sim.tariff : "";
  if (eInternet) eInternet.value = sim ? sim.internet : "";
  if (eAbFee) eAbFee.value = sim ? sim.abFee : "";
  if (ePayDay) ePayDay.value = sim ? sim.payDay : "";
  if (eExtra) eExtra.value = sim ? sim.extra : "";
  if (eOperator) eOperator.value = sim ? sim.operator : "Ucell";
  if (eNote) eNote.value = sim ? sim.note : "";

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

  saveData();
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
  const deleteSub = document.getElementById("deleteSub");
  if (deleteSub) deleteSub.textContent = sim ? `${sim.phone} — ${sim.company}` : "Это действие нельзя отменить.";
  openOverlay("deleteOverlay");
}

function executeDelete(id) {
  sims = sims.filter(s => s.id !== id);
  saveData();
  renderAll();
  closeOverlay("deleteOverlay");
  closeViewModal();
}

// ─── PASSWORD CONFIRM MODAL ──────────────────────────────────
function openPasswordConfirm(title, sub) {
  const pwTitle = document.getElementById("pwTitle");
  const pwSub = document.getElementById("pwSub");
  const pwInput = document.getElementById("pwInput");
  const pwError = document.getElementById("pwError");
  
  if (pwTitle) pwTitle.textContent = title;
  if (pwSub) pwSub.textContent = sub;
  if (pwInput) pwInput.value = "";
  if (pwError) pwError.textContent = "";
  openOverlay("pwOverlay");
  setTimeout(() => {
    const input = document.getElementById("pwInput");
    if (input) input.focus();
  }, 300);
}

function confirmPassword() {
  const val = document.getElementById("pwInput").value;
  if (val !== APP_PASSWORD) {
    const pwError = document.getElementById("pwError");
    const pwInput = document.getElementById("pwInput");
    if (pwError) pwError.textContent = "Неверный пароль. Попробуйте снова.";
    if (pwInput) {
      pwInput.value = "";
      pwInput.focus();
      pwInput.style.borderColor = "var(--danger)";
      pwInput.style.boxShadow = "0 0 0 3px var(--danger-bg)";
      setTimeout(() => { 
        pwInput.style.borderColor = ""; 
        pwInput.style.boxShadow = ""; 
      }, 1200);
    }
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
  const el = document.getElementById(id);
  if (el) el.classList.add("open");
}
function closeOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("open");
}
function closeAllModals() {
  ["viewOverlay","editOverlay","pwOverlay","deleteOverlay"].forEach(closeOverlay);
}

// ─── EVENT LISTENERS ─────────────────────────────────────────

// Lock screen
const lockBtn = document.getElementById("lockBtn");
const lockPassword = document.getElementById("lockPassword");
const lockError = document.getElementById("lockError");

if (lockBtn) {
  lockBtn.addEventListener("click", () => {
    const pw = lockPassword.value;
    if (pw === APP_PASSWORD) {
      login();
    } else {
      if (lockError) lockError.textContent = "Неверный пароль";
      if (lockPassword) {
        lockPassword.value = "";
        lockPassword.style.borderColor = "var(--danger)";
        lockPassword.style.boxShadow = "0 0 0 3px var(--danger-bg)";
        setTimeout(() => { 
          if (lockPassword) {
            lockPassword.style.borderColor = ""; 
            lockPassword.style.boxShadow = ""; 
          }
        }, 1200);
      }
    }
  });
}

if (lockPassword) {
  lockPassword.addEventListener("keydown", e => {
    if (e.key === "Enter" && lockBtn) lockBtn.click();
  });
}

// Logout
const logoutBtn = document.getElementById("btnLogout");
if (logoutBtn) logoutBtn.addEventListener("click", logout);

// FAB / add top button — требуют пароль
const fabAdd = document.getElementById("fabAdd");
const btnAddTop = document.getElementById("btnAddTop");
if (fabAdd) fabAdd.addEventListener("click", startAdd);
if (btnAddTop) btnAddTop.addEventListener("click", startAdd);

// View modal actions
const vBtnClose = document.getElementById("vBtnClose");
const vBtnEdit = document.getElementById("vBtnEdit");
const vBtnDelete = document.getElementById("vBtnDelete");
const btnMarkPaid = document.getElementById("btnMarkPaid");

if (vBtnClose) vBtnClose.addEventListener("click", closeViewModal);
if (vBtnEdit) {
  vBtnEdit.addEventListener("click", () => {
    if (currentViewId) startEdit(currentViewId);
  });
}
if (vBtnDelete) {
  vBtnDelete.addEventListener("click", () => {
    if (currentViewId) startDelete(currentViewId);
  });
}
if (btnMarkPaid) btnMarkPaid.addEventListener("click", markPaid);

// Edit modal
const editCancel = document.getElementById("editCancel");
const editSave = document.getElementById("editSave");
if (editCancel) editCancel.addEventListener("click", () => closeOverlay("editOverlay"));
if (editSave) editSave.addEventListener("click", saveEdit);

// Password modal
const pwConfirm = document.getElementById("pwConfirm");
const pwCancel = document.getElementById("pwCancel");
const pwInput = document.getElementById("pwInput");
if (pwConfirm) pwConfirm.addEventListener("click", confirmPassword);
if (pwCancel) {
  pwCancel.addEventListener("click", () => {
    closeOverlay("pwOverlay");
    pendingAction = null;
  });
}
if (pwInput) {
  pwInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && pwConfirm) confirmPassword();
  });
}

// Delete modal
const deleteConfirm = document.getElementById("deleteConfirm");
const deleteCancel = document.getElementById("deleteCancel");
if (deleteConfirm) {
  deleteConfirm.addEventListener("click", () => {
    if (pendingDeleteId) executeDelete(pendingDeleteId);
  });
}
if (deleteCancel) {
  deleteCancel.addEventListener("click", () => {
    closeOverlay("deleteOverlay");
    pendingDeleteId = null;
  });
}

// Close overlays on backdrop click
["viewOverlay","editOverlay","pwOverlay","deleteOverlay"].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("click", e => {
      if (e.target === e.currentTarget) {
        closeOverlay(id);
        if (id === "pwOverlay") pendingAction = null;
        if (id === "deleteOverlay") pendingDeleteId = null;
      }
    });
  }
});

// ESC
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeAllModals();
});

// ─── INIT ────────────────────────────────────────────────────
// Ждём загрузки Firebase
setTimeout(() => {
  firebaseReady = true;
  loadFromFirebase();
}, 500);

if (isLoggedIn()) {
  document.getElementById("lockScreen").style.display = "none";
  document.getElementById("app").style.display = "block";
} else {
  // Показываем lock screen
  setTimeout(() => {
    const lockPw = document.getElementById("lockPassword");
    if (lockPw) lockPw.focus();
  }, 400);
}

// Авто-обновление каждую минуту
setInterval(() => {
  if (isLoggedIn()) renderAll();
}, 60_000);
