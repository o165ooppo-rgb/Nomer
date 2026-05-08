/**
 * Mone Manager — app.js v2
 * + Collapsible categories
 * + Sidebar with export/logout
 * + Role-based auth: manager (editor) / employee (read-only)
 * + Staff management (manager creates employee logins)
 * + Excel report export
 */

// ─── CONSTANTS ───────────────────────────────────────────────
const MANAGER_LOGIN    = "admin";
const MANAGER_PASSWORD = "admin123";
const STORAGE_KEY      = "monemanager_v1";
const SESSION_KEY      = "monemanager_session";
const EMPLOYEES_KEY    = "monemanager_employees";
const COLLAPSED_KEY    = "monemanager_collapsed";

// ─── STATE ───────────────────────────────────────────────────
let data            = { phone: [], wifi: [], car: [] };
let activePayType   = "cash";
let currentViewId   = null;
let currentViewCat  = null;
let currentEditId   = null;
let currentEditCat  = null;
let pendingAction   = null;
let pendingDeleteId  = null;
let pendingDeleteCat = null;
let firebaseReady   = false;
let fabOpen         = false;
let currentRole     = null; // 'manager' | 'employee'
let currentUserName = "";
let collapsedCats   = {};   // { phone: true/false, wifi: true/false, car: true/false }
let selectedRole    = "manager";

// ─── EMPLOYEES (stored in localStorage) ──────────────────────
function loadEmployees() {
  try { return JSON.parse(localStorage.getItem(EMPLOYEES_KEY)) || []; }
  catch { return []; }
}
function saveEmployees(list) {
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(list));
}

// ─── COLLAPSED STATE ─────────────────────────────────────────
function loadCollapsed() {
  try { collapsedCats = JSON.parse(localStorage.getItem(COLLAPSED_KEY)) || {}; }
  catch { collapsedCats = {}; }
}
function saveCollapsed() {
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsedCats));
}

// ─── STORAGE ─────────────────────────────────────────────────
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    data = raw ? JSON.parse(raw) : { phone: [], wifi: [], car: [] };
  } catch { data = { phone: [], wifi: [], car: [] }; }
  data.phone = data.phone || [];
  data.wifi  = data.wifi  || [];
  data.car   = data.car   || [];

  const savedMonth = localStorage.getItem("monemanager_month");
  const nowMonth   = new Date().getMonth() + "-" + new Date().getFullYear();
  if (savedMonth !== nowMonth) {
    allItems().forEach(item => item.paidThisMonth = false);
    localStorage.setItem("monemanager_month", nowMonth);
    saveData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (firebaseReady && window.db) {
    window.db.ref('monemanager').set(data).catch(e => console.error("Firebase save error:", e));
  }
}

function loadFromFirebase() {
  if (!window.db) { loadData(); renderAll(); return; }
  window.db.ref('monemanager').once('value', snapshot => {
    const fbData = snapshot.val();
    if (fbData && (fbData.phone || fbData.wifi || fbData.car)) {
      data = fbData;
      data.phone = data.phone || [];
      data.wifi  = data.wifi  || [];
      data.car   = data.car   || [];
      saveData();
    } else {
      loadData();
      window.db.ref('monemanager').set(data);
    }
    renderAll();
  }).catch(e => { console.error("Firebase load error:", e); loadData(); renderAll(); });
}

function allItems() { return [...data.phone, ...data.wifi, ...data.car]; }
function getPayType(item) { return item.payType || "cash"; }
function getItemByCat(cat, id) { return data[cat].find(i => i.id === id); }

// ─── SESSION ─────────────────────────────────────────────────
function isLoggedIn() {
  const s = sessionStorage.getItem(SESSION_KEY);
  return !!s;
}
function getSessionData() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null; }
  catch { return null; }
}

function login(role, name) {
  currentRole     = role;
  currentUserName = name;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role, name }));
  document.getElementById("lockScreen").style.display = "none";
  document.getElementById("app").style.display = "flex";
  applyRoleUI();
  if (window.db) {
    window.db.ref('monemanager').on('value', snapshot => {
      const fbData = snapshot.val();
      if (fbData && (fbData.phone || fbData.wifi || fbData.car)) {
        data = fbData;
        data.phone = data.phone || [];
        data.wifi  = data.wifi  || [];
        data.car   = data.car   || [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        renderAll();
      }
    });
  }
  renderAll();
  applyCollapsed();
}

function logout() { sessionStorage.removeItem(SESSION_KEY); location.reload(); }

function applyRoleUI() {
  if (currentRole === "employee") {
    document.body.classList.add("role-employee");
  } else {
    document.body.classList.remove("role-employee");
  }

  // Header role badge
  const badge = document.getElementById("headerRoleBadge");
  if (badge) {
    badge.className = `header-role-badge role-${currentRole}`;
    badge.textContent = currentRole === "manager" ? "👔 Менеджер" : "👤 Сотрудник";
  }

  // Sidebar user
  const sucName = document.getElementById("sucName");
  const sucRole = document.getElementById("sucRole");
  const sucAvatar = document.getElementById("sucAvatar");
  if (sucName) sucName.textContent = currentUserName;
  if (sucRole) sucRole.textContent = currentRole === "manager" ? "Администратор" : "Сотрудник";
  if (sucAvatar) sucAvatar.textContent = (currentUserName || "?")[0].toUpperCase();

  // Manager section visibility
  const managerSection = document.getElementById("sidebarManagerSection");
  if (managerSection) managerSection.style.display = currentRole === "manager" ? "" : "none";

  // Fab
  const fabWrap = document.getElementById("fabWrap");
  if (fabWrap) fabWrap.style.display = currentRole === "manager" ? "" : "none";
}

// ─── DATE UTILS ──────────────────────────────────────────────
function now() { return new Date(); }

function daysUntilPayment(item) {
  if (item.paidThisMonth) return 999;
  const n = now(), yr = n.getFullYear(), mo = n.getMonth();
  let next = new Date(yr, mo, item.payDay);
  if (next <= n) next = new Date(yr, mo + 1, item.payDay);
  return Math.ceil((next - n) / 864e5);
}

function cycleProgress(item) {
  const n = now(), yr = n.getFullYear(), mo = n.getMonth();
  let last = new Date(yr, mo, item.payDay);
  let next = new Date(yr, mo + 1, item.payDay);
  if (last > n) { last = new Date(yr, mo - 1, item.payDay); next = new Date(yr, mo, item.payDay); }
  return Math.min(100, Math.max(0, Math.round(((n - last) / (next - last)) * 100)));
}

function getStatus(item) {
  if (item.paidThisMonth) return "paid";
  const d = daysUntilPayment(item);
  if (d <= 3) return "danger";
  if (d <= 7) return "warn";
  return "ok";
}

// ─── PAYMENT TYPE TABS ───────────────────────────────────────
function switchPayType(type) {
  activePayType = type;
  document.querySelectorAll(".pay-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });
  renderAll();
}

// ─── RENDER ALL ──────────────────────────────────────────────
function renderAll() {
  updateHeaderDate();
  renderGlobalStats();
  renderBanner();
  renderColumn("phone");
  renderColumn("wifi");
  renderColumn("car");
  updateSidebarBadges();
}

function updateHeaderDate() {
  const el = document.getElementById("headerDate");
  if (el) el.textContent = now().toLocaleDateString("ru-RU", { weekday:"short", day:"numeric", month:"long", year:"numeric" });
}

function renderGlobalStats() {
  const all    = allItems().filter(i => getPayType(i) === activePayType);
  const warn   = all.filter(i => getStatus(i) === "warn").length;
  const danger = all.filter(i => getStatus(i) === "danger").length;
  setText("countTotal",   all.length);
  setText("countWarning", warn);
  setText("countDanger",  danger);
  show("pillWarn",   warn > 0);
  show("pillDanger", danger > 0);
}

function renderBanner() {
  const urgents = allItems().filter(i => getPayType(i) === activePayType && getStatus(i) === "danger");
  const el = document.getElementById("alertBanner");
  const alertText = document.getElementById("alertText");
  if (urgents.length && el && alertText) {
    alertText.textContent = `Срочная оплата (≤3 дня): ${urgents.map(i => i.name + " — " + i.company).join("  |  ")}`;
    el.style.display = "flex";
  } else if (el) {
    el.style.display = "none";
  }
}

function updateSidebarBadges() {
  const cats = ["phone", "wifi", "car"];
  cats.forEach(cat => {
    const items = (data[cat] || []).filter(i => getPayType(i) === activePayType);
    const el = document.getElementById(`snavBadge${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
    if (el) el.textContent = items.length;
  });
}

// ─── COLUMN RENDER ───────────────────────────────────────────
const COL_IDS   = { phone: "cardsPhone", wifi: "cardsWifi", car: "cardsCar" };
const STATS_IDS = { phone: "statsPhone", wifi: "statsWifi", car: "statsCar" };
const CAT_LABELS = { phone: "📱 Телефон", wifi: "📶 Wi-Fi", car: "🚗 Машина / GPS" };
const CAT_EMPTY  = { phone: "📱", wifi: "📶", car: "🚗" };

function renderColumn(cat) {
  const allCatItems = data[cat] || [];
  const items = allCatItems.filter(i => getPayType(i) === activePayType);

  const statsEl = document.getElementById(STATS_IDS[cat]);
  const cardsEl = document.getElementById(COL_IDS[cat]);
  if (!statsEl || !cardsEl) return;

  const total  = items.length;
  const ok     = items.filter(i => getStatus(i) === "ok").length;
  const warn   = items.filter(i => getStatus(i) === "warn").length;
  const danger = items.filter(i => getStatus(i) === "danger").length;
  const paid   = items.filter(i => getStatus(i) === "paid").length;

  let statsHtml = `<span class="col-stat-chip chip-total">${total} записей</span>`;
  if (ok)     statsHtml += `<span class="col-stat-chip chip-ok">✓ ${ok} ок</span>`;
  if (warn)   statsHtml += `<span class="col-stat-chip chip-warn">⚠ ${warn} скоро</span>`;
  if (danger) statsHtml += `<span class="col-stat-chip chip-danger">🔴 ${danger} срочно</span>`;
  if (paid)   statsHtml += `<span class="col-stat-chip chip-paid">✓ ${paid} опл.</span>`;
  statsEl.innerHTML = statsHtml;

  cardsEl.innerHTML = "";
  if (!items.length) {
    const typeLabel = activePayType === "cash" ? "наличных" : "перечисления";
    cardsEl.innerHTML = `<div class="col-empty"><div class="col-empty-emoji">${CAT_EMPTY[cat]}</div><p>Нет записей для ${typeLabel}.<br>${currentRole === "manager" ? 'Нажмите «+ Добавить»' : ''}</p></div>`;
    return;
  }

  const sorted = [...items].sort((a, b) => {
    const order = { danger:0, warn:1, ok:2, paid:3 };
    return order[getStatus(a)] - order[getStatus(b)];
  });

  sorted.forEach((item, i) => {
    const st       = getStatus(item);
    const days     = daysUntilPayment(item);
    const progress = cycleProgress(item);

    let badgeText, badgeClass;
    if (st === "paid")   { badgeText = "✓ Оплачено";           badgeClass = "badge-paid"; }
    else if (days === 0) { badgeText = "Сегодня!";             badgeClass = "badge-danger"; }
    else if (days <= 3)  { badgeText = `${days} дн. — СРОЧНО`; badgeClass = "badge-danger"; }
    else if (days <= 7)  { badgeText = `${days} дн.`;          badgeClass = "badge-warn"; }
    else                 { badgeText = `${days} дн.`;          badgeClass = "badge-ok"; }

    const dotClass  = st === "paid" ? "dot-paid" : `dot-${st}`;
    const progClass = st === "paid" ? "prog-paid" : `prog-${st}`;

    let detailHtml = "";
    if (cat === "phone")      detailHtml = `<div class="card-detail"><span class="card-detail-icon">📶</span>${escapeHtml(item.operator)} · ${escapeHtml(item.internet || "—")}</div>`;
    else if (cat === "wifi")  detailHtml = `<div class="card-detail"><span class="card-detail-icon">🏢</span>${escapeHtml(item.provider)} · ${escapeHtml(item.tariff || "—")}</div>`;
    else if (cat === "car")   detailHtml = `<div class="card-detail"><span class="card-detail-icon">👤</span>${escapeHtml(item.driver || "—")} · ${escapeHtml(item.type || "—")}</div>`;

    const card = document.createElement("div");
    card.className = `item-card status-${st === "paid" ? "ok" : st}`;
    card.dataset.id  = item.id;
    card.dataset.cat = cat;
    card.style.animationDelay = `${i * 40}ms`;
    card.innerHTML = `
      <div class="card-top">
        <span class="card-chip chip-${cat}">${CAT_LABELS[cat]}</span>
        <span class="card-dot ${dotClass}"></span>
      </div>
      <div class="card-name">${escapeHtml(item.name)}</div>
      <div class="card-company">${escapeHtml(item.company)}</div>
      ${detailHtml}
      <div class="card-footer">
        <div class="card-pay-info">день <b>${item.payDay}</b> · ${escapeHtml(getFee(item))}</div>
        <span class="card-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="card-progress">
        <div class="card-progress-inner ${progClass}" style="width:${progress}%"></div>
      </div>
    `;
    card.addEventListener("click", () => openViewModal(cat, item.id));
    cardsEl.appendChild(card);
  });
}

function getFee(item) { return item.abFee || item.fee || "—"; }

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

// ─── COLLAPSIBLE CATEGORIES ───────────────────────────────────
function initCollapsible() {
  loadCollapsed();
  const cats = ["phone", "wifi", "car"];
  cats.forEach(cat => {
    const colId  = { phone:"colPhones", wifi:"colWifi", car:"colCars" }[cat];
    const bodyId = `colBody${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
    const col    = document.getElementById(colId);
    const body   = document.getElementById(bodyId);
    if (!col || !body) return;

    const btn = col.querySelector(`.col-toggle-btn[data-cat="${cat}"]`);
    const header = col.querySelector(".col-header");

    // Apply saved state
    if (collapsedCats[cat]) {
      body.classList.add("collapsed");
      if (btn) btn.classList.add("collapsed");
      col.classList.add("is-collapsed");
    }

    // Click on toggle button
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleCategory(cat, col, body, btn);
      });
    }

    // Click on header row (but not on the add button)
    if (header) {
      header.addEventListener("click", (e) => {
        if (e.target.closest(".btn-col-add")) return;
        if (e.target.closest(".col-toggle-btn")) return;
        toggleCategory(cat, col, body, btn);
      });
    }
  });
}

function toggleCategory(cat, col, body, btn) {
  const isCollapsed = body.classList.contains("collapsed");
  if (isCollapsed) {
    body.classList.remove("collapsed");
    if (btn) btn.classList.remove("collapsed");
    col.classList.remove("is-collapsed");
    collapsedCats[cat] = false;
  } else {
    body.classList.add("collapsed");
    if (btn) btn.classList.add("collapsed");
    col.classList.add("is-collapsed");
    collapsedCats[cat] = true;
  }
  saveCollapsed();
}

function applyCollapsed() {
  const cats = ["phone", "wifi", "car"];
  cats.forEach(cat => {
    const colId  = { phone:"colPhones", wifi:"colWifi", car:"colCars" }[cat];
    const bodyId = `colBody${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
    const col    = document.getElementById(colId);
    const body   = document.getElementById(bodyId);
    if (!col || !body) return;
    const btn = col.querySelector(`.col-toggle-btn[data-cat="${cat}"]`);
    if (collapsedCats[cat]) {
      body.classList.add("collapsed");
      if (btn) btn.classList.add("collapsed");
      col.classList.add("is-collapsed");
    } else {
      body.classList.remove("collapsed");
      if (btn) btn.classList.remove("collapsed");
      col.classList.remove("is-collapsed");
    }
  });
}

// ─── VIEW MODAL ──────────────────────────────────────────────
function openViewModal(cat, id) {
  const item = getItemByCat(cat, id);
  if (!item) return;
  currentViewId  = id;
  currentViewCat = cat;

  const st   = getStatus(item);
  const days = daysUntilPayment(item);
  const prog = cycleProgress(item);

  const cb = document.getElementById("vCatBadge");
  if (cb) {
    const catMap = { phone:"vcb-phone", wifi:"vcb-wifi", car:"vcb-car" };
    cb.className = `view-cat-badge ${catMap[cat]}`;
    cb.textContent = CAT_LABELS[cat];
  }

  const sb = document.getElementById("vStatusBadge");
  const sbMap  = { ok:"vsb-ok", warn:"vsb-warn", danger:"vsb-danger", paid:"vsb-paid" };
  const sbText = { ok:`✓ В порядке (${days} дн.)`, warn:`⚠ Скоро (${days} дн.)`, danger:`🔴 СРОЧНО (${days} дн.)`, paid:"✓ Оплачено в этом месяце" };
  if (sb) { sb.className = `view-status-badge ${sbMap[st]}`; sb.textContent = sbText[st]; }

  setText("vNumber", item.name);
  const metaEl = document.getElementById("vMeta");
  if (metaEl) {
    const payLabel = getPayType(item) === "transfer" ? "🏦 Перечисление" : "💵 Наличные";
    if (cat === "phone")     metaEl.textContent = `${item.company}  •  ${item.operator}  •  ${payLabel}`;
    else if (cat === "wifi") metaEl.textContent = `${item.company}  •  ${item.provider}  •  ${payLabel}`;
    else if (cat === "car")  metaEl.textContent = `${item.company}  •  ${item.plate || "—"}  •  ${payLabel}`;
  }

  const cd = document.getElementById("vCountdown");
  if (cd) {
    if (st === "paid")      { cd.textContent = "✅ Оплата этого месяца отмечена"; cd.className = "view-countdown cd-paid"; }
    else if (days === 0)    { cd.textContent = "🔴 Оплатить СЕГОДНЯ!"; cd.className = "view-countdown cd-danger"; }
    else if (days <= 3)     { cd.textContent = `🔴 Осталось ${days} дн. — СРОЧНО ОПЛАТИТЬ`; cd.className = "view-countdown cd-danger"; }
    else if (days <= 7)     { cd.textContent = `⚠️ До оплаты ${days} дн. — скоро`; cd.className = "view-countdown cd-warn"; }
    else                    { cd.textContent = `✅ До оплаты ${days} дн. — всё в порядке`; cd.className = "view-countdown cd-ok"; }
  }

  let fields = [];
  if (cat === "phone") {
    fields = [
      { label:"👤 На чьё имя",       value: item.owner },
      { label:"🏢 Компания",          value: item.company },
      { label:"📶 Оператор",          value: item.operator },
      { label:"🌐 Интернет",          value: item.internet },
      { label:"📋 Тарифный план",     value: item.tariff },
      { label:"💳 Абонентская плата", value: item.abFee },
      { label:"📅 День оплаты",       value: `${item.payDay}-е число` },
      { label:"💰 Доп. сумма",        value: item.extra || "—" },
      { label:"💵 Тип оплаты",        value: getPayType(item) === "transfer" ? "🏦 Перечисление" : "💵 Наличные" },
      { label:"📍 Адрес",             value: item.address, wide: true },
      { label:"📝 Примечание",        value: item.note || "—", wide: true },
    ];
  } else if (cat === "wifi") {
    fields = [
      { label:"🏢 Компания",          value: item.company },
      { label:"🌐 Провайдер",         value: item.provider },
      { label:"⚡ Тариф / Скорость",  value: item.tariff },
      { label:"💳 Ежемесячная плата", value: item.fee },
      { label:"📅 День оплаты",       value: `${item.payDay}-е число` },
      { label:"📄 Договор",           value: item.contract || "—" },
      { label:"💵 Тип оплаты",        value: getPayType(item) === "transfer" ? "🏦 Перечисление" : "💵 Наличные" },
      { label:"📍 Адрес объекта",     value: item.address, wide: true },
      { label:"📝 Примечание",        value: item.note || "—", wide: true },
    ];
  } else if (cat === "car") {
    fields = [
      { label:"🏢 Компания",          value: item.company },
      { label:"🔧 Тип расхода",       value: item.type },
      { label:"👤 Водитель",          value: item.driver || "—" },
      { label:"🏷 Гос. номер",        value: item.plate || "—" },
      { label:"📡 Провайдер / Страховщик", value: item.provider },
      { label:"💳 Ежемесячная плата", value: item.fee },
      { label:"📅 День оплаты",       value: `${item.payDay}-е число` },
      { label:"💵 Тип оплаты",        value: getPayType(item) === "transfer" ? "🏦 Перечисление" : "💵 Наличные" },
      { label:"📝 Примечание",        value: item.note || "—", wide: true },
    ];
  }

  const vFields = document.getElementById("vFields");
  if (vFields) {
    vFields.innerHTML = fields.map(f =>
      `<div class="view-field${f.wide ? " wide" : ""}">
        <span class="vf-label">${f.label}</span>
        <span class="vf-value">${escapeHtml(f.value)}</span>
      </div>`
    ).join("");
  }

  const vProg = document.getElementById("vProgressFill");
  const vPct  = document.getElementById("vProgressPct");
  if (vProg) {
    const progClass = st === "paid" ? "prog-paid" : `prog-${st}`;
    vProg.className = `progress-fill ${progClass}`;
    vProg.style.width = prog + "%";
  }
  if (vPct) vPct.textContent = prog + "%";

  const btnPaid = document.getElementById("btnMarkPaid");
  if (btnPaid) {
    btnPaid.disabled = item.paidThisMonth;
    btnPaid.textContent = item.paidThisMonth ? "✓ Уже оплачено" : "✓ Отметить оплаченным";
  }

  openOverlay("viewOverlay");
}

function closeViewModal() {
  closeOverlay("viewOverlay");
  currentViewId  = null;
  currentViewCat = null;
}

// ─── PAID ────────────────────────────────────────────────────
function markPaid() {
  if (!currentViewId || !currentViewCat) return;
  const item = getItemByCat(currentViewCat, currentViewId);
  if (!item || item.paidThisMonth) return;
  pendingAction = { type:"paid", id:currentViewId, cat:currentViewCat };
  openPasswordConfirm("Подтвердить оплату", `Отметить «${item.name}» как оплаченный?`);
}

function executePaid(cat, id) {
  const idx = data[cat].findIndex(i => i.id === id);
  if (idx === -1) return;
  data[cat][idx].paidThisMonth = true;
  saveData();
  renderAll();
  openViewModal(cat, id);
}

// ─── EDIT ────────────────────────────────────────────────────
function startEdit(cat, id) {
  if (currentRole !== "manager") return;
  const item = getItemByCat(cat, id);
  pendingAction = { type:"edit", id, cat };
  openPasswordConfirm("Редактировать", `Редактировать «${item ? item.name : ""}»?`);
}

function openEditModal(cat, id = null) {
  currentEditId  = id;
  currentEditCat = cat;

  const titleEl = document.getElementById("editTitle");
  if (titleEl) titleEl.textContent = id ? "✏ Редактировать" : "+ Добавить";

  const indicator = document.getElementById("editCatIndicator");
  const catMap = { phone:"eci-phone 📱 Телефон / SIM-карта", wifi:"eci-wifi 📶 Wi-Fi / Интернет", car:"eci-car 🚗 Машина / GPS" };
  if (indicator) {
    const [cls, ...label] = catMap[cat].split(" ");
    indicator.className = `edit-cat-indicator ${cls}`;
    indicator.textContent = label.join(" ");
  }

  document.getElementById("formPhone").style.display = cat === "phone" ? "" : "none";
  document.getElementById("formWifi").style.display  = cat === "wifi"  ? "" : "none";
  document.getElementById("formCar").style.display   = cat === "car"   ? "" : "none";

  const item = id ? getItemByCat(cat, id) : null;

  if (cat === "phone") {
    setVal("ePhone",    item?.name    || "");
    setVal("eCompany",  item?.company || "");
    setVal("eOwner",    item?.owner   || "");
    setVal("eAddress",  item?.address || "");
    setVal("eTariff",   item?.tariff  || "");
    setVal("eInternet", item?.internet|| "");
    setVal("eAbFee",    item?.abFee   || "");
    setVal("ePayDay",   item?.payDay  || "");
    setVal("eExtra",    item?.extra   || "");
    setVal("eOperator", item?.operator|| "Ucell");
    setVal("eNote",     item?.note    || "");
  } else if (cat === "wifi") {
    setVal("wName",     item?.name    || "");
    setVal("wCompany",  item?.company || "");
    setVal("wProvider", item?.provider|| "Uztelecom");
    setVal("wTariff",   item?.tariff  || "");
    setVal("wAddress",  item?.address || "");
    setVal("wFee",      item?.fee     || "");
    setVal("wPayDay",   item?.payDay  || "");
    setVal("wContract", item?.contract|| "");
    setVal("wNote",     item?.note    || "");
  } else if (cat === "car") {
    setVal("cName",     item?.name    || "");
    setVal("cCompany",  item?.company || "");
    setVal("cType",     item?.type    || "GPS-трекер");
    setVal("cDriver",   item?.driver  || "");
    setVal("cProvider", item?.provider|| "");
    setVal("cFee",      item?.fee     || "");
    setVal("cPayDay",   item?.payDay  || "");
    setVal("cPlate",    item?.plate   || "");
    setVal("cNote",     item?.note    || "");
  }

  openOverlay("editOverlay");
}

function saveEdit() {
  const cat = currentEditCat;
  let newData = {};

  if (cat === "phone") {
    const name = getVal("ePhone").trim(), company = getVal("eCompany").trim();
    if (!name || !company) { alert("Заполните номер телефона и компанию."); return; }
    newData = { name, company, owner: getVal("eOwner").trim(), address: getVal("eAddress").trim(), tariff: getVal("eTariff").trim(), internet: getVal("eInternet").trim(), abFee: getVal("eAbFee").trim(), payDay: parseInt(getVal("ePayDay")) || 1, extra: getVal("eExtra").trim() || "—", operator: getVal("eOperator"), note: getVal("eNote").trim() };
  } else if (cat === "wifi") {
    const name = getVal("wName").trim(), company = getVal("wCompany").trim();
    if (!name || !company) { alert("Заполните название и компанию."); return; }
    newData = { name, company, provider: getVal("wProvider"), tariff: getVal("wTariff").trim(), address: getVal("wAddress").trim(), fee: getVal("wFee").trim(), payDay: parseInt(getVal("wPayDay")) || 1, contract: getVal("wContract").trim(), note: getVal("wNote").trim() };
  } else if (cat === "car") {
    const name = getVal("cName").trim(), company = getVal("cCompany").trim();
    if (!name || !company) { alert("Заполните название автомобиля и компанию."); return; }
    newData = { name, company, type: getVal("cType"), driver: getVal("cDriver").trim(), provider: getVal("cProvider").trim(), fee: getVal("cFee").trim(), payDay: parseInt(getVal("cPayDay")) || 1, plate: getVal("cPlate").trim(), note: getVal("cNote").trim() };
  }

  if (currentEditId) {
    const idx = data[cat].findIndex(i => i.id === currentEditId);
    if (idx !== -1) data[cat][idx] = { ...data[cat][idx], ...newData };
  } else {
    const newId = cat[0] + Date.now();
    data[cat].push({ id: newId, cat, paidThisMonth: false, payType: activePayType, ...newData });
  }

  saveData();
  renderAll();
  closeOverlay("editOverlay");
}

// ─── DELETE ──────────────────────────────────────────────────
function startDelete(cat, id) {
  if (currentRole !== "manager") return;
  const item = getItemByCat(cat, id);
  pendingAction = { type:"delete", id, cat };
  openPasswordConfirm("Удалить запись", `Удалить «${item ? item.name : ""}»?`);
}

function openDeleteConfirm(cat, id) {
  pendingDeleteId  = id;
  pendingDeleteCat = cat;
  const item = getItemByCat(cat, id);
  const deleteSub = document.getElementById("deleteSub");
  if (deleteSub) deleteSub.textContent = item ? `${item.name} — ${item.company}` : "Это действие нельзя отменить.";
  openOverlay("deleteOverlay");
}

function executeDelete(cat, id) {
  data[cat] = data[cat].filter(i => i.id !== id);
  saveData();
  renderAll();
  closeOverlay("deleteOverlay");
  closeViewModal();
}

// ─── PASSWORD CONFIRM ────────────────────────────────────────
function openPasswordConfirm(title, sub) {
  setTxt("pwTitle", title);
  setTxt("pwSub",   sub);
  setVal("pwInput", "");
  setTxt("pwError", "");
  openOverlay("pwOverlay");
  setTimeout(() => { const el = document.getElementById("pwInput"); if (el) el.focus(); }, 300);
}

function confirmPassword() {
  const val = getVal("pwInput");
  if (val !== MANAGER_PASSWORD) {
    setTxt("pwError", "Неверный пароль. Попробуйте снова.");
    const pwInput = document.getElementById("pwInput");
    if (pwInput) {
      pwInput.value = "";
      pwInput.focus();
      pwInput.style.borderColor = "var(--danger)";
      pwInput.style.boxShadow   = "0 0 0 3px var(--danger-bg)";
      setTimeout(() => { pwInput.style.borderColor = ""; pwInput.style.boxShadow = ""; }, 1200);
    }
    return;
  }

  closeOverlay("pwOverlay");
  if (!pendingAction) return;
  const { type, id, cat } = pendingAction;
  pendingAction = null;

  if (type === "edit")   { closeViewModal(); setTimeout(() => openEditModal(cat, id), 200); }
  else if (type === "delete") { openDeleteConfirm(cat, id); }
  else if (type === "paid")   { executePaid(cat, id); }
  else if (type === "add")    { closeViewModal(); setTimeout(() => openEditModal(cat, null), 200); }
}

// ─── START ADD ───────────────────────────────────────────────
function startAdd(cat) {
  if (currentRole !== "manager") return;
  pendingAction = { type:"add", id:null, cat };
  const typeLabel = activePayType === "cash" ? "Наличные" : "Перечисление";
  openPasswordConfirm("Добавить запись", `Введите пароль для добавления в «${typeLabel}» → «${CAT_LABELS[cat]}».`);
}

// ─── OVERLAY HELPERS ─────────────────────────────────────────
function openOverlay(id)  { const el = document.getElementById(id); if (el) el.classList.add("open"); }
function closeOverlay(id) { const el = document.getElementById(id); if (el) el.classList.remove("open"); }
function closeAllModals() { ["viewOverlay","editOverlay","pwOverlay","deleteOverlay","usersOverlay"].forEach(closeOverlay); }

// ─── DOM HELPERS ─────────────────────────────────────────────
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function setTxt(id, text)  { setText(id, text); }
function setVal(id, val)   { const el = document.getElementById(id); if (el) el.value = val; }
function getVal(id)        { const el = document.getElementById(id); return el ? el.value : ""; }
function show(id, visible) { const el = document.getElementById(id); if (el) el.style.display = visible ? "" : "none"; }

// ─── FAB TOGGLE ──────────────────────────────────────────────
function toggleFab() {
  fabOpen = !fabOpen;
  const fw = document.querySelector(".fab-wrap");
  if (fw) fw.classList.toggle("open", fabOpen);
}

// ─── SIDEBAR ─────────────────────────────────────────────────
function initSidebar() {
  const toggle   = document.getElementById("sidebarToggle");
  const sidebar  = document.getElementById("sidebar");

  // Create overlay for mobile
  const overlay = document.createElement("div");
  overlay.className = "sidebar-overlay";
  document.body.appendChild(overlay);

  toggle?.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
    overlay.classList.toggle("visible");
  });
  overlay.addEventListener("click", () => {
    sidebar?.classList.remove("open");
    overlay.classList.remove("visible");
  });

  // Sidebar nav items
  document.querySelectorAll(".sidebar-nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      document.querySelectorAll(".sidebar-nav-item").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      if (action === "scroll-phone") { document.getElementById("colPhones")?.scrollIntoView({ behavior:"smooth", block:"start" }); }
      else if (action === "scroll-wifi")  { document.getElementById("colWifi")?.scrollIntoView({ behavior:"smooth", block:"start" }); }
      else if (action === "scroll-car")   { document.getElementById("colCars")?.scrollIntoView({ behavior:"smooth", block:"start" }); }
      else if (action === "manage-users") { openUsersModal(); }

      // Close sidebar on mobile
      if (window.innerWidth < 900) {
        sidebar?.classList.remove("open");
        overlay.classList.remove("visible");
      }
    });
  });
}

// ─── MANAGE USERS ─────────────────────────────────────────────
function openUsersModal() {
  renderUsersList();
  openOverlay("usersOverlay");
}

function renderUsersList() {
  const list = loadEmployees();
  const container = document.getElementById("usersList");
  if (!container) return;
  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--t3);font-size:13px;">Сотрудников пока нет. Добавьте первого.</div>`;
    return;
  }
  container.innerHTML = list.map((emp, i) => `
    <div class="user-row">
      <div class="user-row-avatar">${emp.name[0].toUpperCase()}</div>
      <div class="user-row-info">
        <div class="user-row-name">${escapeHtml(emp.name)}</div>
        <div class="user-row-login">Логин: <b>${escapeHtml(emp.login)}</b></div>
        <div class="user-row-pw">Пароль: ${escapeHtml(emp.password)}</div>
      </div>
      <button class="user-row-delete" data-idx="${i}">🗑 Удалить</button>
    </div>
  `).join("");

  container.querySelectorAll(".user-row-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx);
      const list = loadEmployees();
      list.splice(idx, 1);
      saveEmployees(list);
      renderUsersList();
    });
  });
}

function addEmployee() {
  const login    = getVal("newUserLogin").trim();
  const password = getVal("newUserPassword").trim();
  const name     = getVal("newUserName").trim();
  if (!login || !password || !name) { alert("Заполните все поля."); return; }
  const list = loadEmployees();
  if (list.find(e => e.login === login)) { alert("Такой логин уже существует."); return; }
  list.push({ login, password, name });
  saveEmployees(list);
  setVal("newUserLogin", "");
  setVal("newUserPassword", "");
  setVal("newUserName", "");
  renderUsersList();
}

// ─── EXCEL EXPORT ─────────────────────────────────────────────
function exportToExcel() {
  const dt  = now();
  const monthName = dt.toLocaleDateString("ru-RU", { month:"long", year:"numeric" });

  // Build HTML table for Excel
  const catHeaders = {
    phone: ["Номер телефона", "Компания", "На чьё имя", "Оператор", "Интернет", "Тарифный план", "Абон. плата", "День оплаты", "Тип оплаты", "Статус", "Адрес", "Примечание"],
    wifi:  ["Название / Адрес", "Компания", "Провайдер", "Тариф / Скорость", "Ежемес. плата", "День оплаты", "Договор", "Тип оплаты", "Статус", "Адрес объекта", "Примечание"],
    car:   ["Автомобиль", "Компания", "Тип расхода", "Водитель", "Гос. номер", "Провайдер / Страховщик", "Ежемес. плата", "День оплаты", "Тип оплаты", "Статус", "Примечание"],
  };

  const statusLabel = (item) => {
    const s = getStatus(item);
    if (s === "paid")   return "✓ Оплачено";
    if (s === "danger") return "🔴 СРОЧНО";
    if (s === "warn")   return "⚠ Скоро";
    return "✓ В порядке";
  };

  const payTypeLabel = (item) => getPayType(item) === "transfer" ? "Перечисление" : "Наличные";

  const buildRows = (cat) => {
    return (data[cat] || []).map(item => {
      if (cat === "phone") return [item.name, item.company, item.owner || "—", item.operator, item.internet || "—", item.tariff || "—", item.abFee || "—", item.payDay, payTypeLabel(item), statusLabel(item), item.address || "—", item.note || "—"];
      if (cat === "wifi")  return [item.name, item.company, item.provider, item.tariff || "—", item.fee || "—", item.payDay, item.contract || "—", payTypeLabel(item), statusLabel(item), item.address || "—", item.note || "—"];
      if (cat === "car")   return [item.name, item.company, item.type || "—", item.driver || "—", item.plate || "—", item.provider || "—", item.fee || "—", item.payDay, payTypeLabel(item), statusLabel(item), item.note || "—"];
      return [];
    });
  };

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><style>
  body { font-family: Calibri, sans-serif; font-size: 11pt; }
  .title-row td { font-size: 14pt; font-weight: bold; background: #1a5276; color: #fff; padding: 8px 12px; }
  .section-row td { font-size: 12pt; font-weight: bold; background: #2980b9; color: #fff; padding: 6px 10px; }
  .header-row td { font-weight: bold; background: #d6eaf8; color: #1a5276; padding: 5px 10px; border: 1px solid #aed6f1; font-size: 10pt; }
  .data-row td { padding: 5px 10px; border: 1px solid #d5d8dc; font-size: 10pt; }
  .data-row:nth-child(even) td { background: #f8f9fa; }
  .paid td { color: #1e8449; }
  .danger td { color: #cb4335; font-weight: bold; }
  .warn td { color: #d35400; }
</style></head><body>
<table>
  <tr class="title-row"><td colspan="15">📊 Mone Manager — Отчёт за ${monthName}</td></tr>
  <tr><td colspan="15"></td></tr>`;

  const sections = [
    { cat: "phone", label: "📱 Телефоны" },
    { cat: "wifi",  label: "📶 Wi-Fi / Интернет" },
    { cat: "car",   label: "🚗 Машины / GPS" },
  ];

  sections.forEach(({ cat, label }) => {
    const rows = buildRows(cat);
    html += `<tr class="section-row"><td colspan="${catHeaders[cat].length}">${label}</td></tr>`;
    html += `<tr class="header-row">${catHeaders[cat].map(h => `<td>${h}</td>`).join("")}</tr>`;
    if (!rows.length) {
      html += `<tr class="data-row"><td colspan="${catHeaders[cat].length}" style="color:#aaa;text-align:center;">Нет данных</td></tr>`;
    } else {
      rows.forEach((row, i) => {
        const item = (data[cat] || [])[i];
        const st   = item ? getStatus(item) : "ok";
        const cls  = st === "paid" ? "paid" : st === "danger" ? "danger" : st === "warn" ? "warn" : "";
        html += `<tr class="data-row ${cls}">${row.map(cell => `<td>${escapeXml(cell)}</td>`).join("")}</tr>`;
      });
    }
    html += `<tr><td colspan="${catHeaders[cat].length}"></td></tr>`;
  });

  // Summary
  const allIt = allItems();
  const totalSum = allIt.reduce((acc, item) => {
    const fee = item.abFee || item.fee || "0";
    const num = parseFloat(String(fee).replace(/[^\d.]/g, "")) || 0;
    return acc + num;
  }, 0);

  html += `<tr class="section-row"><td colspan="10">📋 Итого</td></tr>
  <tr class="header-row"><td>Всего записей</td><td>Телефоны</td><td>Wi-Fi</td><td>Машины</td><td>Оплачено</td><td>Срочно</td><td colspan="4">Примерная сумма в мес.</td></tr>
  <tr class="data-row">
    <td>${allIt.length}</td>
    <td>${(data.phone||[]).length}</td>
    <td>${(data.wifi||[]).length}</td>
    <td>${(data.car||[]).length}</td>
    <td>${allIt.filter(i => i.paidThisMonth).length}</td>
    <td>${allIt.filter(i => getStatus(i) === "danger").length}</td>
    <td colspan="4">${totalSum.toLocaleString("ru-RU")} сум</td>
  </tr>
</table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `MoneManager_Отчёт_${dt.toLocaleDateString("ru-RU").replace(/\./g,"-")}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

// ─── EVENT LISTENERS ─────────────────────────────────────────

// Role tab selection on lock screen
document.querySelectorAll(".role-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedRole = btn.dataset.role;
    document.querySelectorAll(".role-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    // Show/hide login field
    const loginField = document.getElementById("lockLogin");
    if (loginField) loginField.style.display = selectedRole === "manager" ? "block" : "block";
    const hint = document.getElementById("lockHint");
    if (hint) hint.textContent = selectedRole === "manager" ? "Менеджер: admin / admin123" : "Введите логин и пароль, выданные менеджером";
  });
});

// Lock screen login
const lockBtn = document.getElementById("lockBtn");
const lockErr = document.getElementById("lockError");

if (lockBtn) {
  lockBtn.addEventListener("click", () => {
    const loginVal = (document.getElementById("lockLogin")?.value || "").trim();
    const passVal  = (document.getElementById("lockPassword")?.value || "");

    if (selectedRole === "manager") {
      if (loginVal === MANAGER_LOGIN && passVal === MANAGER_PASSWORD) {
        login("manager", "Менеджер");
      } else {
        if (lockErr) lockErr.textContent = "Неверный логин или пароль";
        shakeLoginError();
      }
    } else {
      // Employee login
      const employees = loadEmployees();
      const emp = employees.find(e => e.login === loginVal && e.password === passVal);
      if (emp) {
        login("employee", emp.name);
      } else {
        if (lockErr) lockErr.textContent = "Неверный логин или пароль";
        shakeLoginError();
      }
    }
  });
}

const lockPw = document.getElementById("lockPassword");
if (lockPw) lockPw.addEventListener("keydown", e => { if (e.key === "Enter" && lockBtn) lockBtn.click(); });
const lockLogin = document.getElementById("lockLogin");
if (lockLogin) lockLogin.addEventListener("keydown", e => { if (e.key === "Enter") lockPw?.focus(); });

function shakeLoginError() {
  [document.getElementById("lockLogin"), document.getElementById("lockPassword")].forEach(el => {
    if (!el) return;
    el.style.borderColor = "var(--danger)";
    el.style.boxShadow   = "0 0 0 3px var(--danger-bg)";
    setTimeout(() => { el.style.borderColor = ""; el.style.boxShadow = ""; }, 1200);
  });
}

// Logout
document.getElementById("btnLogout")?.addEventListener("click", logout);

// Export Excel
document.getElementById("btnExportXls")?.addEventListener("click", exportToExcel);

// FAB
document.getElementById("fabAdd")?.addEventListener("click", toggleFab);

document.querySelectorAll(".fab-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const cat = btn.dataset.cat;
    fabOpen = false;
    document.querySelector(".fab-wrap")?.classList.remove("open");
    if (cat) startAdd(cat);
  });
});

// Column add buttons
document.querySelectorAll(".btn-col-add").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const cat = btn.dataset.cat;
    if (cat) startAdd(cat);
  });
});

// Payment type tabs
document.querySelectorAll(".pay-tab").forEach(btn => {
  btn.addEventListener("click", () => switchPayType(btn.dataset.type));
});

// Close FAB on outside click
document.addEventListener("click", e => {
  if (fabOpen && !e.target.closest(".fab-wrap")) {
    fabOpen = false;
    document.querySelector(".fab-wrap")?.classList.remove("open");
  }
});

// View modal actions
document.getElementById("vBtnClose")?.addEventListener("click", closeViewModal);
document.getElementById("vBtnEdit")?.addEventListener("click", () => { if (currentViewId && currentViewCat) startEdit(currentViewCat, currentViewId); });
document.getElementById("vBtnDelete")?.addEventListener("click", () => { if (currentViewId && currentViewCat) startDelete(currentViewCat, currentViewId); });
document.getElementById("btnMarkPaid")?.addEventListener("click", markPaid);

// Edit modal
document.getElementById("editCancel")?.addEventListener("click", () => closeOverlay("editOverlay"));
document.getElementById("editSave")?.addEventListener("click", saveEdit);

// Password modal
document.getElementById("pwConfirm")?.addEventListener("click", confirmPassword);
document.getElementById("pwCancel")?.addEventListener("click", () => { closeOverlay("pwOverlay"); pendingAction = null; });
document.getElementById("pwInput")?.addEventListener("keydown", e => { if (e.key === "Enter") confirmPassword(); });

// Delete modal
document.getElementById("deleteConfirm")?.addEventListener("click", () => {
  if (pendingDeleteId && pendingDeleteCat) executeDelete(pendingDeleteCat, pendingDeleteId);
});
document.getElementById("deleteCancel")?.addEventListener("click", () => {
  closeOverlay("deleteOverlay"); pendingDeleteId = null; pendingDeleteCat = null;
});

// Users modal
document.getElementById("usersClose")?.addEventListener("click", () => closeOverlay("usersOverlay"));
document.getElementById("btnAddUser")?.addEventListener("click", addEmployee);

// Backdrop click closes overlays
["viewOverlay","editOverlay","pwOverlay","deleteOverlay","usersOverlay"].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("click", e => {
      if (e.target === e.currentTarget) {
        closeOverlay(id);
        if (id === "pwOverlay")     pendingAction = null;
        if (id === "deleteOverlay") { pendingDeleteId = null; pendingDeleteCat = null; }
      }
    });
  }
});

// ESC
document.addEventListener("keydown", e => { if (e.key === "Escape") closeAllModals(); });

// ─── INIT ────────────────────────────────────────────────────
loadCollapsed();
initCollapsible();
initSidebar();

setTimeout(() => {
  firebaseReady = true;
  loadFromFirebase();
}, 500);

if (isLoggedIn()) {
  const s = getSessionData();
  if (s) {
    currentRole     = s.role;
    currentUserName = s.name;
    document.getElementById("lockScreen").style.display = "none";
    document.getElementById("app").style.display = "flex";
    applyRoleUI();
    applyCollapsed();
  } else {
    setTimeout(() => { document.getElementById("lockLogin")?.focus(); }, 400);
  }
} else {
  setTimeout(() => { document.getElementById("lockLogin")?.focus(); }, 400);
}

// Auto-refresh
setInterval(() => { if (isLoggedIn()) renderAll(); }, 60_000);
