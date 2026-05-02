/**
 * SIM Manager — app.js
 * Полная логика: авторизация, CRUD, статусы, пароль на изменения
 * + Firebase Realtime Database синхронизация
 */

// ─── FIREBASE CONFIG & INIT ──────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  push,
  remove,
  onValue,
  update,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjf9MmH-h_x1IlGSeJ-yGH_NXruW6fvzY",
  authDomain: "nomer-a12fd.firebaseapp.com",
  databaseURL: "https://nomer-a12fd-default-rtdb.firebaseio.com",
  projectId: "nomer-a12fd",
  storageBucket: "nomer-a12fd.firebasestorage.app",
  messagingSenderId: "327818870146",
  appId: "1:327818870146:web:51940997c21eee7377e39b"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ─── КОНСТАНТЫ ───────────────────────────────────────────────
const APP_PASSWORD = "admin123";
const SESSION_KEY  = "simmanager_session";
const MONTH_KEY    = "simmanager_month";

// ─── DEMO DATA ───────────────────────────────────────────────
const DEFAULT_SIMS = [
  { phone:"+998 90 123 45 67", company:"ООО Альфа-Трейд",    owner:"Иванов Иван Иванович",    address:"г. Ташкент, ул. Навои 14",        tariff:"Бизнес Про",      internet:"50 ГБ / мес",  abFee:"95 000 сум",  payDay:5,  extra:"—",                    operator:"Ucell",   note:"Основной номер директора", paidThisMonth:false },
  { phone:"+998 93 234 56 78", company:"ИП Бета-Сервис",      owner:"Петрова Анна Борисовна",   address:"г. Ташкент, ул. Амира Темура 7",  tariff:"Корп Стандарт",   internet:"20 ГБ / мес",  abFee:"65 000 сум",  payDay:10, extra:"—",                    operator:"Beeline", note:"Бухгалтерия",             paidThisMonth:false },
  { phone:"+998 91 345 67 89", company:"ООО Гамма",           owner:"Сидоров Петр",             address:"г. Самарканд, ул. Регистан 3",    tariff:"Корп Лайт",       internet:"10 ГБ / мес",  abFee:"45 000 сум",  payDay:15, extra:"10 000 сум (SMS)",      operator:"Mobiuz",  note:"Склад Самарканд",         paidThisMonth:false },
  { phone:"+998 97 456 78 90", company:"ООО Дельта Логистик", owner:"Юсупов Бобур",             address:"г. Ташкент, ТИИТ, корп. 3",       tariff:"Бизнес Макс",     internet:"100 ГБ / мес", abFee:"140 000 сум", payDay:1,  extra:"—",                    operator:"Humans",  note:"Генеральный директор",    paidThisMonth:false },
  { phone:"+998 94 567 89 01", company:"ООО Эпсилон",         owner:"Каримова Зульфия",          address:"г. Ташкент, Чиланзар 9-кв.",      tariff:"Корп Стандарт",   internet:"20 ГБ / мес",  abFee:"65 000 сум",  payDay:20, extra:"—",                    operator:"UMS",     note:"HR отдел",                paidThisMonth:false },
  { phone:"+998 95 678 90 12", company:"ЧП Зета-Строй",       owner:"Рахимов Санжар",            address:"г. Бухара, ул. Гоголя 22",        tariff:"Бизнес Про",      internet:"50 ГБ / мес",  abFee:"95 000 сум",  payDay:25, extra:"5 000 сум (доп. мин)", operator:"Ucell",   note:"Прораб Бухара",           paidThisMonth:false },
  { phone:"+998 99 789 01 23", company:"ООО Эта-Медиа",       owner:"Азимов Джамшид",            address:"г. Ташкент, ул. Шота Руставели 9",tariff:"Корп Лайт",       internet:"10 ГБ / мес",  abFee:"45 000 сум",  payDay:28, extra:"—",                    operator:"Beeline", note:"SMM специалист",          paidThisMonth:false },
  { phone:"+998 98 890 12 34", company:"ООО Тета Импорт",     owner:"Хасанов Фаррух",            address:"г. Ташкент, АГМК офис",           tariff:"Бизнес Про",      internet:"50 ГБ / мес",  abFee:"95 000 сум",  payDay:3,  extra:"—",                    operator:"Mobiuz",  note:"Логистика импорт",        paidThisMonth:false },
  { phone:"+998 77 901 23 45", company:"ИП Йота-Тех",         owner:"Мусаев Улугбек",            address:"г. Ташкент, Яшнабад р-н",         tariff:"Корп Стандарт",   internet:"20 ГБ / мес",  abFee:"65 000 сум",  payDay:7,  extra:"15 000 сум (роуминг)", operator:"Humans",  note:"IT отдел",                paidThisMonth:false },
  { phone:"+998 71 012 34 56", company:"ООО Каппа Финанс",    owner:"Бекова Малика",             address:"г. Ташкент, Мирабад р-н",         tariff:"Бизнес Макс",     internet:"100 ГБ / мес", abFee:"140 000 сум", payDay:12, extra:"—",                    operator:"UMS",     note:"Финансовый директор",     paidThisMonth:false },
  { phone:"+998 90 111 22 33", company:"ООО Лямбда",          owner:"Норов Тимур",               address:"г. Наманган, Центр р-н",           tariff:"Корп Лайт",       internet:"10 ГБ / мес",  abFee:"45 000 сум",  payDay:18, extra:"—",                    operator:"Ucell",   note:"Офис Наманган",           paidThisMonth:false },
  { phone:"+998 93 222 33 44", company:"ИП Мю-Дизайн",        owner:"Файзиева Шахло",            address:"г. Ташкент, ул. Беруни 12",       tariff:"Корп Стандарт",   internet:"20 ГБ / мес",  abFee:"65 000 сум",  payDay:22, extra:"—",                    operator:"Beeline", note:"Дизайн отдел",            paidThisMonth:false },
];

// ─── STATE ───────────────────────────────────────────────────
let sims = [];                  // массив { firebaseKey, ...fields }
let currentViewId  = null;      // firebaseKey текущего просмотра
let currentEditId  = null;      // null = новый, строка = редактирование
let pendingAction  = null;
let pendingDeleteId = null;
let dbUnsubscribe  = null;      // функция отписки от onValue

// ─── FIREBASE HELPERS ────────────────────────────────────────

/** Слушаем /sims в реальном времени */
function subscribeToFirebase() {
  const simsRef = ref(db, "sims");
  dbUnsubscribe = onValue(simsRef, snapshot => {
    const data = snapshot.val();
    if (data) {
      sims = Object.entries(data).map(([key, val]) => ({ firebaseKey: key, ...val }));
    } else {
      sims = [];
    }
    checkMonthReset();
    if (isLoggedIn()) renderAll();
  });
}

/** Первый запуск — заливаем demo-данные если база пустая */
async function initFirebaseData() {
  const simsRef = ref(db, "sims");
  const snapshot = await get(simsRef);
  if (!snapshot.exists()) {
    showLoadingOverlay("Загрузка данных...");
    for (const sim of DEFAULT_SIMS) {
      await push(simsRef, sim);
    }
  }
  hideLoadingOverlay();
  subscribeToFirebase();
}

async function fbAdd(data) {
  const simsRef = ref(db, "sims");
  await push(simsRef, { ...data, paidThisMonth: false });
}

async function fbUpdate(firebaseKey, data) {
  const simRef = ref(db, `sims/${firebaseKey}`);
  await update(simRef, data);
}

async function fbDelete(firebaseKey) {
  const simRef = ref(db, `sims/${firebaseKey}`);
  await remove(simRef);
}

// ─── LOADING OVERLAY ─────────────────────────────────────────
function showLoadingOverlay(msg = "Загрузка...") {
  let el = document.getElementById("loadingOverlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "loadingOverlay";
    el.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;
      background:rgba(242,242,247,0.92);backdrop-filter:blur(20px);
    `;
    el.innerHTML = `
      <div style="width:40px;height:40px;border:3px solid rgba(0,122,255,0.2);border-top-color:#007aff;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <div id="loadingMsg" style="font-size:15px;font-weight:500;color:#3c3c43;">${msg}</div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    `;
    document.body.appendChild(el);
  } else {
    document.getElementById("loadingMsg").textContent = msg;
    el.style.display = "flex";
  }
}
function hideLoadingOverlay() {
  const el = document.getElementById("loadingOverlay");
  if (el) el.style.display = "none";
}

// ─── MONTH RESET ─────────────────────────────────────────────
function checkMonthReset() {
  const nowMonth = new Date().getMonth() + "-" + new Date().getFullYear();
  const savedMonth = localStorage.getItem(MONTH_KEY);
  if (savedMonth !== nowMonth) {
    localStorage.setItem(MONTH_KEY, nowMonth);
    // Сбрасываем paidThisMonth для всех в Firebase
    sims.forEach(sim => {
      if (sim.paidThisMonth) {
        fbUpdate(sim.firebaseKey, { paidThisMonth: false });
      }
    });
  }
}

// ─── SESSION ─────────────────────────────────────────────────
function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}
function login() {
  sessionStorage.setItem(SESSION_KEY, "1");
  document.getElementById("lockScreen").style.display = "none";
  document.getElementById("app").style.display = "block";
  renderAll();
}
function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}

// ─── DATE UTILS ──────────────────────────────────────────────
function now() { return new Date(); }

function daysUntilPayment(sim) {
  if (sim.paidThisMonth) return 999;
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
  document.getElementById("headerDate").textContent =
    now().toLocaleDateString("ru-RU", { weekday:"short", day:"numeric", month:"long", year:"numeric" });
}

function renderStats() {
  const warn   = sims.filter(s => getStatus(s) === "warn").length;
  const danger = sims.filter(s => getStatus(s) === "danger").length;
  document.getElementById("countTotal").textContent   = sims.length;
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
    if (st === "paid")   { badgeText = "✓ Оплачено";           badgeClass = "badge-paid"; }
    else if (days === 0) { badgeText = "Сегодня!";             badgeClass = "badge-danger"; }
    else if (days <= 3)  { badgeText = `${days} дн. — СРОЧНО`; badgeClass = "badge-danger"; }
    else if (days <= 7)  { badgeText = `${days} дн.`;          badgeClass = "badge-warn"; }
    else                 { badgeText = `${days} дн.`;          badgeClass = "badge-ok"; }

    const progClass = st === "paid" ? "prog-ok" : `prog-${st}`;
    const dotClass  = st === "paid" ? "dot-ok"  : `dot-${st}`;

    const card = document.createElement("div");
    card.className = `sim-card status-${st === "paid" ? "ok" : st}`;
    card.dataset.key = sim.firebaseKey;
    card.style.animationDelay = `${i * 40}ms`;
    card.innerHTML = `
      <div class="card-top">
        <span class="card-operator-chip">${sim.operator}</span>
        <span class="card-dot ${dotClass}"></span>
      </div>
      <div class="card-number">${sim.phone}</div>
      <div class="card-company">${sim.company}</div>
      <div class="card-owner">${sim.owner || "—"}</div>
      <div class="card-footer">
        <div class="card-pay-info">день <b>${sim.payDay}</b></div>
        <span class="card-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="card-progress">
        <div class="card-progress-inner ${progClass}" style="width:${progress}%"></div>
      </div>
    `;
    card.addEventListener("click", () => openViewModal(sim.firebaseKey));
    grid.appendChild(card);
  });
}

// ─── VIEW MODAL ──────────────────────────────────────────────
function openViewModal(firebaseKey) {
  const sim = sims.find(s => s.firebaseKey === firebaseKey);
  if (!sim) return;
  currentViewId = firebaseKey;

  const st   = getStatus(sim);
  const days = daysUntilPayment(sim);
  const prog = cycleProgress(sim);

  const sb = document.getElementById("vStatusBadge");
  const sbMap  = { ok:"vsb-ok", warn:"vsb-warn", danger:"vsb-danger", paid:"vsb-paid" };
  const sbText = { ok:`✓ В порядке (${days} дн.)`, warn:`⚠ Скоро (${days} дн.)`, danger:`🔴 СРОЧНО (${days} дн.)`, paid:"✓ Оплачено в этом месяце" };
  sb.className  = `view-status-badge ${sbMap[st]}`;
  sb.textContent = sbText[st];

  document.getElementById("vNumber").textContent = sim.phone;
  document.getElementById("vMeta").textContent   = `${sim.company}  •  ${sim.operator}`;

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

  const fill = document.getElementById("vProgressFill");
  fill.style.width      = prog + "%";
  fill.style.background = st === "ok" || st === "paid" ? "var(--ok)" : st === "warn" ? "var(--warn)" : "var(--danger)";
  document.getElementById("vProgressPct").textContent = prog + "%";

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
  const sim = sims.find(s => s.firebaseKey === currentViewId);
  if (!sim || sim.paidThisMonth) return;
  pendingAction = { type: "paid", id: currentViewId };
  openPasswordConfirm("Подтвердить оплату", `Отметить ${sim.phone} как оплаченный?`);
}

async function executePaid(firebaseKey) {
  showLoadingOverlay("Сохранение...");
  try {
    await fbUpdate(firebaseKey, { paidThisMonth: true });
  } finally {
    hideLoadingOverlay();
  }
  // onValue обновит sims, renderAll вызовется автоматически
  // Но нужно переоткрыть view modal с актуальными данными
  setTimeout(() => openViewModal(firebaseKey), 300);
}

// ─── EDIT ────────────────────────────────────────────────────
function startEdit(firebaseKey) {
  pendingAction = { type: "edit", id: firebaseKey };
  const sim = sims.find(s => s.firebaseKey === firebaseKey);
  openPasswordConfirm("Редактировать", `Редактировать номер ${sim ? sim.phone : ""}?`);
}

function openEditModal(firebaseKey = null) {
  currentEditId = firebaseKey;
  document.getElementById("editTitle").textContent = firebaseKey ? "✏ Редактировать номер" : "+ Добавить номер";

  const sim = firebaseKey ? sims.find(s => s.firebaseKey === firebaseKey) : null;
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

async function saveEdit() {
  const phone   = document.getElementById("ePhone").value.trim();
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

  showLoadingOverlay("Сохранение...");
  try {
    if (currentEditId) {
      await fbUpdate(currentEditId, data);
    } else {
      await fbAdd(data);
    }
  } finally {
    hideLoadingOverlay();
  }

  closeOverlay("editOverlay");
}

// ─── DELETE ──────────────────────────────────────────────────
function startDelete(firebaseKey) {
  pendingAction = { type: "delete", id: firebaseKey };
  const sim = sims.find(s => s.firebaseKey === firebaseKey);
  openPasswordConfirm("Удалить номер", `Удалить ${sim ? sim.phone + " (" + sim.company + ")" : "этот номер"}?`);
}

function openDeleteConfirm(firebaseKey) {
  pendingDeleteId = firebaseKey;
  const sim = sims.find(s => s.firebaseKey === firebaseKey);
  document.getElementById("deleteSub").textContent =
    sim ? `${sim.phone} — ${sim.company}` : "Это действие нельзя отменить.";
  openOverlay("deleteOverlay");
}

async function executeDelete(firebaseKey) {
  showLoadingOverlay("Удаление...");
  try {
    await fbDelete(firebaseKey);
  } finally {
    hideLoadingOverlay();
  }
  closeOverlay("deleteOverlay");
  closeViewModal();
}

// ─── PASSWORD CONFIRM MODAL ──────────────────────────────────
function openPasswordConfirm(title, sub) {
  document.getElementById("pwTitle").textContent = title;
  document.getElementById("pwSub").textContent   = sub;
  document.getElementById("pwInput").value       = "";
  document.getElementById("pwError").textContent = "";
  openOverlay("pwOverlay");
  setTimeout(() => document.getElementById("pwInput").focus(), 300);
}

function confirmPassword() {
  const val = document.getElementById("pwInput").value;
  if (val !== APP_PASSWORD) {
    document.getElementById("pwError").textContent = "Неверный пароль. Попробуйте снова.";
    document.getElementById("pwInput").value = "";
    document.getElementById("pwInput").focus();
    const inp = document.getElementById("pwInput");
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
function openOverlay(id)  { document.getElementById(id).classList.add("open"); }
function closeOverlay(id) { document.getElementById(id).classList.remove("open"); }
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

// FAB / add top — пароль
document.getElementById("fabAdd").addEventListener("click", startAdd);
document.getElementById("btnAddTop").addEventListener("click", startAdd);

// View modal
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

// Backdrop click
["viewOverlay","editOverlay","pwOverlay","deleteOverlay"].forEach(id => {
  document.getElementById(id).addEventListener("click", e => {
    if (e.target === e.currentTarget) {
      closeOverlay(id);
      if (id === "pwOverlay")     pendingAction = null;
      if (id === "deleteOverlay") pendingDeleteId = null;
    }
  });
});

// ESC
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeAllModals();
});

// ─── INIT ────────────────────────────────────────────────────
showLoadingOverlay("Подключение к базе данных...");
initFirebaseData().then(() => {
  if (isLoggedIn()) {
    document.getElementById("lockScreen").style.display = "none";
    document.getElementById("app").style.display = "block";
  } else {
    setTimeout(() => document.getElementById("lockPassword").focus(), 400);
  }
});

// Авто-обновление каждую минуту (Firebase сам обновляет, но пересчитаем статусы)
setInterval(() => {
  if (isLoggedIn()) renderAll();
}, 60_000);
