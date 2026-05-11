/**
 * Mone Manager — app.js v3
 * + Dynamic categories (manager can add/edit/delete columns and fields)
 * + RTKeeper (RTKeeper кассовая система) instead of GPS/Cars by default
 * + Professional mobile sidebar (smooth, accessible)
 * + Manager credentials editable in-app
 * + No password re-prompt for routine actions (only for credential changes)
 */

// ─── STORAGE KEYS ────────────────────────────────────────────
const STORAGE_KEY      = "monemanager_v1";
const SESSION_KEY      = "monemanager_session";
const EMPLOYEES_KEY    = "monemanager_employees";
const COLLAPSED_KEY    = "monemanager_collapsed";
const CATEGORIES_KEY   = "monemanager_categories";
const ADMIN_CREDS_KEY  = "monemanager_admin_creds";

// ─── DEFAULT ADMIN ───────────────────────────────────────────
const DEFAULT_ADMIN = { login: "admin", password: "admin123" };

// ─── DEFAULT CATEGORIES ──────────────────────────────────────
// Each category has: id, name, icon, sub, color (1-8), fields[]
// Fields: { key, label, type: 'text'|'number'|'select', options?, required?, primary? (used as card name), secondary? (used as card subtitle), payDay?, fee? }
const DEFAULT_CATEGORIES = [
  {
    id: "phone",
    name: "Телефоны",
    icon: "📱",
    sub: "SIM-карты и корпоративные номера",
    color: 1,
    fields: [
      { key: "name",     label: "Номер телефона",      type: "text",   required: true, primary: true },
      { key: "company",  label: "Компания",             type: "text",   required: true, secondary: true },
      { key: "operator", label: "Оператор",             type: "select", options: ["Ucell","Beeline","Mobiuz","Humans","UMS"] },
      { key: "owner",    label: "На чьё имя",           type: "text" },
      { key: "address",  label: "Адрес",                type: "text" },
      { key: "tariff",   label: "Тарифный план",        type: "text" },
      { key: "internet", label: "Интернет",             type: "text" },
      { key: "abFee",    label: "Абонентская плата",    type: "text",   fee: true },
      { key: "payDay",   label: "День оплаты (1-31)",   type: "number", payDay: true, required: true },
      { key: "extra",    label: "Доп. сумма / услуги",  type: "text" },
      { key: "note",     label: "Примечание",           type: "text" },
    ]
  },
  {
    id: "wifi",
    name: "Wi-Fi",
    icon: "📶",
    sub: "Интернет-провайдеры и точки доступа",
    color: 2,
    fields: [
      { key: "name",     label: "Название / Адрес точки", type: "text", required: true, primary: true },
      { key: "company",  label: "Компания",                type: "text", required: true, secondary: true },
      { key: "provider", label: "Провайдер",               type: "select", options: ["Uztelecom","Sarkor","Perfectum","Comnet","Ucell Broadband","Другой"] },
      { key: "tariff",   label: "Скорость / Тариф",        type: "text" },
      { key: "address",  label: "Адрес объекта",           type: "text" },
      { key: "fee",      label: "Ежемесячная оплата",      type: "text", fee: true },
      { key: "payDay",   label: "День оплаты (1-31)",      type: "number", payDay: true, required: true },
      { key: "contract", label: "Договор / Лицевой счёт",  type: "text" },
      { key: "note",     label: "Примечание",              type: "text" },
    ]
  },
  {
    id: "rtkeeper",
    name: "RTKeeper",
    icon: "🧾",
    sub: "Кассовая система — ежемесячный платёж",
    color: 3,
    fields: [
      { key: "name",     label: "Название точки / Кассы", type: "text", required: true, primary: true },
      { key: "company",  label: "Компания",                type: "text", required: true, secondary: true },
      { key: "terminal", label: "Номер терминала / Кассы", type: "text" },
      { key: "address",  label: "Адрес объекта",           type: "text" },
      { key: "tariff",   label: "Тариф / Версия лицензии", type: "text" },
      { key: "fee",      label: "Ежемесячная оплата",      type: "text", fee: true },
      { key: "payDay",   label: "День оплаты (1-31)",      type: "number", payDay: true, required: true },
      { key: "contract", label: "Договор / ИНН",           type: "text" },
      { key: "responsible", label: "Ответственный",        type: "text" },
      { key: "note",     label: "Примечание",              type: "text" },
    ]
  }
];

// ─── STATE ───────────────────────────────────────────────────
let categories      = [];                   // dynamic categories list
let data            = {};                   // { catId: [items...] }
let activePayType   = "cash";
let currentViewId   = null;
let currentViewCat  = null;
let currentEditId   = null;
let currentEditCat  = null;
let pendingDeleteId  = null;
let pendingDeleteCat = null;
let firebaseReady   = false;
let fabOpen         = false;
let currentRole     = null;
let currentUserName = "";
let currentUserLogin = "";
let collapsedCats   = {};
let selectedRole    = "manager";
let editingCategoryId = null;             // when editing an existing category
let categoryEditFields = [];              // working copy of fields while editing
let firebaseSyncSubscribed = false;

// ═══════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════

function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw) {
      categories = JSON.parse(raw);
      if (!Array.isArray(categories) || !categories.length) categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    } else {
      categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    }
  } catch {
    categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  }
}

function saveCategories() {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  if (firebaseReady && window.db) {
    window.db.ref('monemanager_categories').set(categories).catch(e => console.error("FB cat save:", e));
  }
}

function loadAdminCreds() {
  try {
    const raw = localStorage.getItem(ADMIN_CREDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ...DEFAULT_ADMIN };
}
function saveAdminCreds(creds) {
  localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(creds));
  if (firebaseReady && window.db) {
    window.db.ref('monemanager_admin').set(creds).catch(e => console.error("FB creds save:", e));
  }
}

function loadEmployees() {
  try { return JSON.parse(localStorage.getItem(EMPLOYEES_KEY)) || []; }
  catch { return []; }
}
function saveEmployees(list) {
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(list));
  if (firebaseReady && window.db) {
    window.db.ref('monemanager_employees').set(list).catch(e => console.error("FB emp save:", e));
  }
}

function loadCollapsed() {
  try { collapsedCats = JSON.parse(localStorage.getItem(COLLAPSED_KEY)) || {}; }
  catch { collapsedCats = {}; }
}
function saveCollapsed() {
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsedCats));
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    data = raw ? JSON.parse(raw) : {};
  } catch { data = {}; }
  ensureCategoryBuckets();

  const savedMonth = localStorage.getItem("monemanager_month");
  const nowMonth   = new Date().getMonth() + "-" + new Date().getFullYear();
  if (savedMonth !== nowMonth) {
    allItems().forEach(item => item.paidThisMonth = false);
    localStorage.setItem("monemanager_month", nowMonth);
    saveData();
  }
}

function ensureCategoryBuckets() {
  categories.forEach(cat => {
    if (!Array.isArray(data[cat.id])) data[cat.id] = [];
  });
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (firebaseReady && window.db) {
    window.db.ref('monemanager').set(data).catch(e => console.error("Firebase save error:", e));
  }
}

function loadFromFirebase() {
  if (!window.db) { loadData(); renderAll(); return; }
  // Load categories first
  window.db.ref('monemanager_categories').once('value', snap => {
    const fbCats = snap.val();
    if (Array.isArray(fbCats) && fbCats.length) {
      categories = fbCats;
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    }
    // Load admin
    window.db.ref('monemanager_admin').once('value', snap2 => {
      const fbAdmin = snap2.val();
      if (fbAdmin && fbAdmin.login && fbAdmin.password) {
        localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(fbAdmin));
      }
      // Load employees
      window.db.ref('monemanager_employees').once('value', snap3 => {
        const fbEmp = snap3.val();
        if (Array.isArray(fbEmp)) {
          localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(fbEmp));
        }
        // Load data
        window.db.ref('monemanager').once('value', snapshot => {
          const fbData = snapshot.val();
          if (fbData && typeof fbData === "object") {
            data = fbData;
            ensureCategoryBuckets();
            saveData();
          } else {
            loadData();
            window.db.ref('monemanager').set(data);
          }
          renderAll();
        }).catch(e => { console.error("Firebase load:", e); loadData(); renderAll(); });
      });
    });
  }).catch(e => { console.error("Firebase categories load:", e); loadData(); renderAll(); });
}

function allItems() {
  let arr = [];
  categories.forEach(cat => { arr = arr.concat(data[cat.id] || []); });
  return arr;
}
function getPayType(item) { return item.payType || "cash"; }
function getItemByCat(catId, id) { return (data[catId] || []).find(i => i.id === id); }
function getCategoryById(catId) { return categories.find(c => c.id === catId); }

// ═══════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════

function isLoggedIn() { return !!localStorage.getItem(SESSION_KEY); }
function getSessionData() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; }
  catch { return null; }
}

function login(role, name, loginVal) {
  currentRole     = role;
  currentUserName = name;
  currentUserLogin = loginVal || "";
  // Persist session in localStorage so user is not asked again
  localStorage.setItem(SESSION_KEY, JSON.stringify({ role, name, login: loginVal || "" }));

  document.getElementById("lockScreen").style.display = "none";
  document.getElementById("app").style.display = "flex";
  applyRoleUI();
  subscribeFirebase();
  renderAll();
  applyCollapsed();
}

function subscribeFirebase() {
  if (!window.db || firebaseSyncSubscribed) return;
  firebaseSyncSubscribed = true;

  window.db.ref('monemanager').on('value', snapshot => {
    const fbData = snapshot.val();
    if (fbData && typeof fbData === "object") {
      data = fbData;
      ensureCategoryBuckets();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      renderAll();
    }
  });

  window.db.ref('monemanager_categories').on('value', snapshot => {
    const fbCats = snapshot.val();
    if (Array.isArray(fbCats) && fbCats.length) {
      categories = fbCats;
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
      ensureCategoryBuckets();
      renderAll();
    }
  });

  window.db.ref('monemanager_employees').on('value', snapshot => {
    const fbEmp = snapshot.val();
    if (Array.isArray(fbEmp)) {
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(fbEmp));
    }
  });

  window.db.ref('monemanager_admin').on('value', snapshot => {
    const fbAdmin = snapshot.val();
    if (fbAdmin && fbAdmin.login && fbAdmin.password) {
      localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(fbAdmin));
    }
  });
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  location.reload();
}

function applyRoleUI() {
  if (currentRole === "employee") {
    document.body.classList.add("role-employee");
  } else {
    document.body.classList.remove("role-employee");
  }

  const badge = document.getElementById("headerRoleBadge");
  if (badge) {
    badge.className = `header-role-badge role-${currentRole}`;
    badge.textContent = currentRole === "manager" ? "👔 Менеджер" : "👤 Сотрудник";
  }

  const sucName = document.getElementById("sucName");
  const sucRole = document.getElementById("sucRole");
  const sucAvatar = document.getElementById("sucAvatar");
  if (sucName) sucName.textContent = currentUserName;
  if (sucRole) sucRole.textContent = currentRole === "manager" ? "Администратор" : "Сотрудник";
  if (sucAvatar) sucAvatar.textContent = (currentUserName || "?")[0].toUpperCase();

  const managerSection = document.getElementById("sidebarManagerSection");
  if (managerSection) managerSection.style.display = currentRole === "manager" ? "" : "none";

  const fabWrap = document.getElementById("fabWrap");
  if (fabWrap) fabWrap.style.display = currentRole === "manager" ? "" : "none";
}

// ═══════════════════════════════════════════════════════════
// DATE UTILS
// ═══════════════════════════════════════════════════════════

function now() { return new Date(); }

function daysUntilPayment(item) {
  if (item.paidThisMonth) return 999;
  const n = now(), yr = n.getFullYear(), mo = n.getMonth();
  const day = parseInt(item.payDay) || 1;
  let next = new Date(yr, mo, day);
  if (next <= n) next = new Date(yr, mo + 1, day);
  return Math.ceil((next - n) / 864e5);
}

function cycleProgress(item) {
  const n = now(), yr = n.getFullYear(), mo = n.getMonth();
  const day = parseInt(item.payDay) || 1;
  let last = new Date(yr, mo, day);
  let next = new Date(yr, mo + 1, day);
  if (last > n) { last = new Date(yr, mo - 1, day); next = new Date(yr, mo, day); }
  return Math.min(100, Math.max(0, Math.round(((n - last) / (next - last)) * 100)));
}

function getStatus(item) {
  if (item.paidThisMonth) return "paid";
  const d = daysUntilPayment(item);
  if (d <= 3) return "danger";
  if (d <= 7) return "warn";
  return "ok";
}

// ═══════════════════════════════════════════════════════════
// PAYMENT TYPE TABS
// ═══════════════════════════════════════════════════════════

function switchPayType(type) {
  activePayType = type;
  document.querySelectorAll(".pay-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });
  renderAll();
}

// ═══════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════

function renderAll() {
  ensureCategoryBuckets();
  updateHeaderDate();
  renderColumns();      // build columns container
  renderSidebarCategories();
  renderFabMenu();
  renderGlobalStats();
  renderBanner();
  categories.forEach(c => renderColumn(c.id));
}

function updateHeaderDate() {
  const el = document.getElementById("headerDate");
  if (el) el.textContent = now().toLocaleDateString("ru-RU", { weekday:"short", day:"numeric", month:"long", year:"numeric" });
}

function renderColumns() {
  const layout = document.getElementById("columnsLayout");
  if (!layout) return;
  // Build columns dynamically
  layout.innerHTML = categories.map(cat => `
    <div class="category-column" id="col-${cat.id}" data-color="${cat.color || 1}">
      <div class="col-header" data-toggle="${cat.id}">
        <div class="col-title-wrap">
          <span class="col-icon">${escapeHtml(cat.icon || "📦")}</span>
          <div class="col-title-text">
            <div class="col-title">${escapeHtml(cat.name)}</div>
            <div class="col-sub">${escapeHtml(cat.sub || "")}</div>
          </div>
        </div>
        <div class="col-header-actions">
          <button class="btn-col-add manager-only" data-cat="${cat.id}">+ Добавить</button>
          <button class="col-toggle-btn" data-cat="${cat.id}" title="Свернуть/Развернуть">▾</button>
        </div>
      </div>
      <div class="col-body" id="colBody-${cat.id}">
        <div class="col-stats" id="stats-${cat.id}"></div>
        <div class="col-cards" id="cards-${cat.id}"></div>
      </div>
    </div>
  `).join("");

  // Apply category color to each column header chip
  categories.forEach(cat => {
    const colEl = document.getElementById("col-" + cat.id);
    if (colEl) {
      const c = cat.color || 1;
      const headerEl = colEl.querySelector(".col-header");
      const iconEl = colEl.querySelector(".col-icon");
      if (headerEl) headerEl.style.borderBottomColor = `var(--cat-${c}-border)`;
      if (iconEl) iconEl.style.filter = `drop-shadow(0 0 4px var(--cat-${c}-bg))`;
    }
  });

  // Attach toggle/add handlers
  attachColumnHandlers();
  applyCollapsed();
}

function attachColumnHandlers() {
  document.querySelectorAll(".col-toggle-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const cat = btn.dataset.cat;
      const col = document.getElementById("col-" + cat);
      const body = document.getElementById("colBody-" + cat);
      if (col && body) toggleCategory(cat, col, body, btn);
    });
  });
  document.querySelectorAll(".col-header").forEach(h => {
    h.addEventListener("click", e => {
      if (e.target.closest(".btn-col-add")) return;
      if (e.target.closest(".col-toggle-btn")) return;
      const cat = h.dataset.toggle;
      const col = document.getElementById("col-" + cat);
      const body = document.getElementById("colBody-" + cat);
      const btn = col?.querySelector(`.col-toggle-btn[data-cat="${cat}"]`);
      if (col && body) toggleCategory(cat, col, body, btn);
    });
  });
  document.querySelectorAll(".btn-col-add").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const cat = btn.dataset.cat;
      if (cat) startAdd(cat);
    });
  });
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
    alertText.textContent = `Срочная оплата (≤3 дня): ${urgents.map(i => (i.name || "—") + " — " + (i.company || "—")).join("  |  ")}`;
    el.style.display = "flex";
  } else if (el) {
    el.style.display = "none";
  }
}

function renderSidebarCategories() {
  const container = document.getElementById("sidebarCategoryList");
  if (!container) return;
  container.innerHTML = categories.map(cat => {
    const items = (data[cat.id] || []).filter(i => getPayType(i) === activePayType);
    return `
      <button class="sidebar-nav-item" data-action="scroll" data-cat="${cat.id}">
        <span class="snav-icon">${escapeHtml(cat.icon || "📦")}</span>
        <span class="snav-label">${escapeHtml(cat.name)}</span>
        <span class="snav-badge">${items.length}</span>
      </button>
    `;
  }).join("");

  container.querySelectorAll(".sidebar-nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      document.querySelectorAll(".sidebar-nav-item").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const target = document.getElementById("col-" + cat);
      if (target) target.scrollIntoView({ behavior:"smooth", block:"start" });
      closeSidebarMobile();
    });
  });
}

function renderFabMenu() {
  const menu = document.getElementById("fabMenu");
  if (!menu) return;
  menu.innerHTML = categories.map(cat => `
    <button class="fab-item" data-cat="${cat.id}">${escapeHtml(cat.icon || "📦")} ${escapeHtml(cat.name)}</button>
  `).join("");
  menu.querySelectorAll(".fab-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      fabOpen = false;
      document.querySelector(".fab-wrap")?.classList.remove("open");
      if (cat) startAdd(cat);
    });
  });
}

function renderColumn(catId) {
  const cat = getCategoryById(catId);
  if (!cat) return;
  const allCatItems = data[catId] || [];
  const items = allCatItems.filter(i => getPayType(i) === activePayType);

  const statsEl = document.getElementById("stats-" + catId);
  const cardsEl = document.getElementById("cards-" + catId);
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
    cardsEl.innerHTML = `<div class="col-empty"><div class="col-empty-emoji">${escapeHtml(cat.icon || "📦")}</div><p>Нет записей для ${typeLabel}.<br>${currentRole === "manager" ? 'Нажмите «+ Добавить»' : ''}</p></div>`;
    return;
  }

  const sorted = [...items].sort((a, b) => {
    const order = { danger:0, warn:1, ok:2, paid:3 };
    return order[getStatus(a)] - order[getStatus(b)];
  });

  const primaryField = cat.fields.find(f => f.primary) || cat.fields[0];
  const secondaryField = cat.fields.find(f => f.secondary) || cat.fields[1];
  const feeField = cat.fields.find(f => f.fee);

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
    const c = cat.color || 1;

    const primaryVal   = item[primaryField.key]   || "—";
    const secondaryVal = secondaryField ? (item[secondaryField.key] || "—") : "";
    const feeVal       = feeField ? (item[feeField.key] || "—") : "—";
    const payDay       = item.payDay || "?";

    // pick a 3rd visible field for detail line
    const detailField = cat.fields.find(f => !f.primary && !f.secondary && !f.payDay && !f.fee && f.key !== "note");
    const detailHtml = detailField && item[detailField.key]
      ? `<div class="card-detail"><span class="card-detail-icon">📋</span>${escapeHtml(detailField.label)}: ${escapeHtml(item[detailField.key])}</div>`
      : "";

    const card = document.createElement("div");
    card.className = `item-card status-${st === "paid" ? "ok" : st}`;
    card.dataset.id  = item.id;
    card.dataset.cat = catId;
    card.style.animationDelay = `${i * 40}ms`;
    card.innerHTML = `
      <div class="card-top">
        <span class="card-chip" style="background:var(--cat-${c}-bg);color:var(--cat-${c});">${escapeHtml(cat.icon || "📦")} ${escapeHtml(cat.name)}</span>
        <span class="card-dot ${dotClass}"></span>
      </div>
      <div class="card-name">${escapeHtml(primaryVal)}</div>
      <div class="card-company">${escapeHtml(secondaryVal)}</div>
      ${detailHtml}
      <div class="card-footer">
        <div class="card-pay-info">день <b>${payDay}</b> · ${escapeHtml(feeVal)}</div>
        <span class="card-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="card-progress">
        <div class="card-progress-inner ${progClass}" style="width:${progress}%"></div>
      </div>
    `;
    card.addEventListener("click", () => openViewModal(catId, item.id));
    cardsEl.appendChild(card);
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ═══════════════════════════════════════════════════════════
// COLLAPSIBLE CATEGORIES
// ═══════════════════════════════════════════════════════════

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
  categories.forEach(cat => {
    const col  = document.getElementById("col-" + cat.id);
    const body = document.getElementById("colBody-" + cat.id);
    if (!col || !body) return;
    const btn = col.querySelector(`.col-toggle-btn[data-cat="${cat.id}"]`);
    if (collapsedCats[cat.id]) {
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

// ═══════════════════════════════════════════════════════════
// VIEW MODAL
// ═══════════════════════════════════════════════════════════

function openViewModal(catId, id) {
  const cat = getCategoryById(catId);
  const item = getItemByCat(catId, id);
  if (!item || !cat) return;
  currentViewId  = id;
  currentViewCat = catId;

  const st   = getStatus(item);
  const days = daysUntilPayment(item);
  const prog = cycleProgress(item);
  const c = cat.color || 1;

  const cb = document.getElementById("vCatBadge");
  if (cb) {
    cb.style.background = `var(--cat-${c}-bg)`;
    cb.style.color = `var(--cat-${c})`;
    cb.textContent = `${cat.icon || "📦"} ${cat.name}`;
  }

  const sb = document.getElementById("vStatusBadge");
  const sbMap  = { ok:"vsb-ok", warn:"vsb-warn", danger:"vsb-danger", paid:"vsb-paid" };
  const sbText = { ok:`✓ В порядке (${days} дн.)`, warn:`⚠ Скоро (${days} дн.)`, danger:`🔴 СРОЧНО (${days} дн.)`, paid:"✓ Оплачено в этом месяце" };
  if (sb) { sb.className = `view-status-badge ${sbMap[st]}`; sb.textContent = sbText[st]; }

  const primaryField = cat.fields.find(f => f.primary) || cat.fields[0];
  const secondaryField = cat.fields.find(f => f.secondary);

  setText("vNumber", item[primaryField.key] || "—");
  const metaEl = document.getElementById("vMeta");
  if (metaEl) {
    const payLabel = getPayType(item) === "transfer" ? "🏦 Перечисление" : "💵 Наличные";
    const sec = secondaryField ? (item[secondaryField.key] || "—") : "";
    metaEl.textContent = `${sec}  •  ${payLabel}`;
  }

  const cd = document.getElementById("vCountdown");
  if (cd) {
    if (st === "paid")      { cd.textContent = "✅ Оплата этого месяца отмечена"; cd.className = "view-countdown cd-paid"; }
    else if (days === 0)    { cd.textContent = "🔴 Оплатить СЕГОДНЯ!"; cd.className = "view-countdown cd-danger"; }
    else if (days <= 3)     { cd.textContent = `🔴 Осталось ${days} дн. — СРОЧНО ОПЛАТИТЬ`; cd.className = "view-countdown cd-danger"; }
    else if (days <= 7)     { cd.textContent = `⚠️ До оплаты ${days} дн. — скоро`; cd.className = "view-countdown cd-warn"; }
    else                    { cd.textContent = `✅ До оплаты ${days} дн. — всё в порядке`; cd.className = "view-countdown cd-ok"; }
  }

  // build fields dynamically — show all category fields except primary
  const fields = [];
  cat.fields.forEach(f => {
    if (f.primary) return;
    let val = item[f.key];
    if (f.payDay) val = val ? `${val}-е число` : "—";
    if (!val && val !== 0) val = "—";
    fields.push({
      label: f.label,
      value: val,
      wide: ["address", "note"].includes(f.key) || (f.label && f.label.length > 24)
    });
  });
  // payment type
  fields.push({
    label: "Тип оплаты",
    value: getPayType(item) === "transfer" ? "🏦 Перечисление" : "💵 Наличные"
  });

  const vFields = document.getElementById("vFields");
  if (vFields) {
    vFields.innerHTML = fields.map(f =>
      `<div class="view-field${f.wide ? " wide" : ""}">
        <span class="vf-label">${escapeHtml(f.label)}</span>
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

// ═══════════════════════════════════════════════════════════
// PAID
// ═══════════════════════════════════════════════════════════

function markPaid() {
  if (!currentViewId || !currentViewCat) return;
  const item = getItemByCat(currentViewCat, currentViewId);
  if (!item || item.paidThisMonth) return;
  // No password prompt — just mark
  item.paidThisMonth = true;
  saveData();
  renderAll();
  openViewModal(currentViewCat, currentViewId);
}

// ═══════════════════════════════════════════════════════════
// EDIT — DYNAMIC FORM
// ═══════════════════════════════════════════════════════════

function startEdit(catId, id) {
  if (currentRole !== "manager") return;
  // No password prompt — open directly
  closeViewModal();
  setTimeout(() => openEditModal(catId, id), 200);
}

function startAdd(catId) {
  if (currentRole !== "manager") return;
  // No password prompt — open directly
  closeViewModal();
  setTimeout(() => openEditModal(catId, null), 200);
}

function openEditModal(catId, id = null) {
  const cat = getCategoryById(catId);
  if (!cat) return;
  currentEditId  = id;
  currentEditCat = catId;

  const titleEl = document.getElementById("editTitle");
  if (titleEl) titleEl.textContent = id ? "✏ Редактировать запись" : "+ Добавить запись";

  const indicator = document.getElementById("editCatIndicator");
  const c = cat.color || 1;
  if (indicator) {
    indicator.style.color = `var(--cat-${c})`;
    indicator.textContent = `${cat.icon || "📦"} ${cat.name}`;
  }

  // build form dynamically
  const formEl = document.getElementById("dynamicEditForm");
  const item = id ? getItemByCat(catId, id) : null;

  // pair fields into rows of 2 where possible
  const fields = cat.fields;
  let rowsHtml = "";
  let i = 0;
  while (i < fields.length) {
    const f1 = fields[i];
    const f2 = fields[i+1];
    // Wide fields go solo
    const isWide1 = (f1.key === "address" || f1.key === "note");
    if (isWide1) {
      rowsHtml += renderFieldGroup(f1, item);
      i += 1;
    } else if (f2 && (f2.key !== "address" && f2.key !== "note")) {
      rowsHtml += `<div class="form-row">${renderFieldGroup(f1, item)}${renderFieldGroup(f2, item)}</div>`;
      i += 2;
    } else {
      rowsHtml += renderFieldGroup(f1, item);
      i += 1;
    }
  }

  formEl.innerHTML = rowsHtml;

  openOverlay("editOverlay");
}

function renderFieldGroup(field, item) {
  const val = item ? (item[field.key] ?? "") : "";
  const id = "field-" + field.key;
  if (field.type === "select" && Array.isArray(field.options)) {
    const opts = field.options.map(o => `<option value="${escapeHtml(o)}"${o === val ? " selected" : ""}>${escapeHtml(o)}</option>`).join("");
    return `<div class="form-group"><label>${escapeHtml(field.label)}${field.required ? " *" : ""}</label><select id="${id}">${opts}</select></div>`;
  }
  if (field.type === "number") {
    return `<div class="form-group"><label>${escapeHtml(field.label)}${field.required ? " *" : ""}</label><input type="number" id="${id}" value="${escapeHtml(val)}" /></div>`;
  }
  return `<div class="form-group"><label>${escapeHtml(field.label)}${field.required ? " *" : ""}</label><input type="text" id="${id}" value="${escapeHtml(val)}" /></div>`;
}

function saveEdit() {
  const catId = currentEditCat;
  const cat = getCategoryById(catId);
  if (!cat) return;

  const newData = {};
  let missing = [];
  cat.fields.forEach(f => {
    const el = document.getElementById("field-" + f.key);
    if (!el) return;
    let v = el.value;
    if (f.type === "number") v = v ? parseInt(v) : "";
    if (typeof v === "string") v = v.trim();
    if (f.required && !v && v !== 0) missing.push(f.label);
    newData[f.key] = v;
  });

  if (missing.length) {
    alert("Заполните обязательные поля:\n• " + missing.join("\n• "));
    return;
  }

  if (currentEditId) {
    const idx = (data[catId] || []).findIndex(i => i.id === currentEditId);
    if (idx !== -1) data[catId][idx] = { ...data[catId][idx], ...newData };
  } else {
    const newId = catId + "_" + Date.now();
    if (!data[catId]) data[catId] = [];
    data[catId].push({ id: newId, cat: catId, paidThisMonth: false, payType: activePayType, ...newData });
  }

  saveData();
  renderAll();
  closeOverlay("editOverlay");
}

// ═══════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════

function startDelete(catId, id) {
  if (currentRole !== "manager") return;
  // No password — just confirmation modal
  pendingDeleteId  = id;
  pendingDeleteCat = catId;
  const item = getItemByCat(catId, id);
  const primaryField = getCategoryById(catId)?.fields.find(f => f.primary);
  const primaryVal = primaryField ? item?.[primaryField.key] : "";
  const deleteSub = document.getElementById("deleteSub");
  if (deleteSub) deleteSub.textContent = item ? `${primaryVal || "—"}` : "Это действие нельзя отменить.";
  openOverlay("deleteOverlay");
}

function executeDelete(catId, id) {
  data[catId] = (data[catId] || []).filter(i => i.id !== id);
  saveData();
  renderAll();
  closeOverlay("deleteOverlay");
  closeViewModal();
}

// ═══════════════════════════════════════════════════════════
// CATEGORY MANAGEMENT
// ═══════════════════════════════════════════════════════════

function openCategoriesModal() {
  renderCategoriesList();
  openOverlay("categoriesOverlay");
}

function renderCategoriesList() {
  const container = document.getElementById("categoriesList");
  if (!container) return;
  if (!categories.length) {
    container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--t3);font-size:13px;">Категорий пока нет.</div>`;
    return;
  }
  container.innerHTML = categories.map((cat, i) => {
    const c = cat.color || 1;
    const itemCount = (data[cat.id] || []).length;
    return `
      <div class="cat-row">
        <div class="cat-row-icon" style="background:var(--cat-${c}-bg);color:var(--cat-${c});">${escapeHtml(cat.icon || "📦")}</div>
        <div class="cat-row-info">
          <div class="cat-row-name">${escapeHtml(cat.name)}</div>
          <div class="cat-row-sub">${escapeHtml(cat.sub || "")} · ${itemCount} записей · ${cat.fields.length} полей</div>
        </div>
        <div class="cat-row-actions">
          <button class="user-row-edit" data-edit-cat="${cat.id}">✏</button>
          <button class="user-row-delete" data-del-cat="${cat.id}" ${itemCount > 0 ? 'title="Сначала удалите записи в этой категории"' : ''}>🗑</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-edit-cat]").forEach(btn => {
    btn.addEventListener("click", () => openCategoryEdit(btn.dataset.editCat));
  });
  container.querySelectorAll("[data-del-cat]").forEach(btn => {
    btn.addEventListener("click", () => deleteCategoryConfirm(btn.dataset.delCat));
  });
}

function addCategoryFromForm() {
  const name = (getVal("newCatName") || "").trim();
  const icon = (getVal("newCatIcon") || "📦").trim();
  const sub  = (getVal("newCatSub") || "").trim();
  if (!name) { alert("Введите название категории."); return; }
  // generate id
  const id = "cat_" + Date.now();
  const usedColors = categories.map(c => c.color || 1);
  let color = 1;
  for (let i = 1; i <= 8; i++) { if (!usedColors.includes(i)) { color = i; break; } }
  if (color === 1 && usedColors.includes(1)) color = (categories.length % 8) + 1;

  const newCat = {
    id, name, icon: icon || "📦", sub, color,
    fields: [
      { key: "name",     label: "Название",            type: "text", required: true, primary: true },
      { key: "company",  label: "Компания",            type: "text", required: true, secondary: true },
      { key: "fee",      label: "Ежемесячная оплата", type: "text", fee: true },
      { key: "payDay",   label: "День оплаты (1-31)", type: "number", payDay: true, required: true },
      { key: "note",     label: "Примечание",          type: "text" }
    ]
  };
  categories.push(newCat);
  if (!data[id]) data[id] = [];
  saveCategories();
  saveData();
  setVal("newCatName", "");
  setVal("newCatIcon", "");
  setVal("newCatSub", "");
  renderAll();
  renderCategoriesList();
}

function deleteCategoryConfirm(catId) {
  const cat = getCategoryById(catId);
  if (!cat) return;
  const itemCount = (data[catId] || []).length;
  if (itemCount > 0) {
    if (!confirm(`В категории «${cat.name}» есть ${itemCount} записей. Удалить их вместе с категорией?`)) return;
  } else {
    if (!confirm(`Удалить категорию «${cat.name}»?`)) return;
  }
  categories = categories.filter(c => c.id !== catId);
  delete data[catId];
  delete collapsedCats[catId];
  saveCategories();
  saveData();
  saveCollapsed();
  renderAll();
  renderCategoriesList();
}

// ═══════════════════════════════════════════════════════════
// CATEGORY EDIT (rename + edit fields)
// ═══════════════════════════════════════════════════════════

function openCategoryEdit(catId) {
  const cat = getCategoryById(catId);
  if (!cat) return;
  editingCategoryId = catId;
  // working copy
  categoryEditFields = JSON.parse(JSON.stringify(cat.fields));

  setVal("catEditName", cat.name);
  setVal("catEditIcon", cat.icon || "📦");
  setVal("catEditSub", cat.sub || "");

  const indicator = document.getElementById("catEditIndicator");
  if (indicator) {
    const c = cat.color || 1;
    indicator.style.color = `var(--cat-${c})`;
    indicator.textContent = `${cat.icon || "📦"} ${cat.name}`;
  }

  renderCatFieldsList();
  openOverlay("catEditOverlay");
}

function renderCatFieldsList() {
  const container = document.getElementById("catFieldsList");
  if (!container) return;
  if (!categoryEditFields.length) {
    container.innerHTML = `<div style="text-align:center;padding:12px;color:var(--t3);font-size:12px;">Нет полей. Добавьте первое.</div>`;
    return;
  }
  container.innerHTML = categoryEditFields.map((f, i) => {
    const isCore = f.primary || f.secondary || f.payDay;
    const lockNote = isCore ? `<span class="field-required-flag">${f.primary ? "осн." : f.secondary ? "доп." : "день"}</span>` : "";
    return `
      <div class="field-row" data-idx="${i}">
        <input type="text" class="fr-label" value="${escapeHtml(f.label)}" data-prop="label" placeholder="Название поля" />
        <select class="fr-type" data-prop="type">
          <option value="text" ${f.type === "text" ? "selected" : ""}>Текст</option>
          <option value="number" ${f.type === "number" ? "selected" : ""}>Число</option>
        </select>
        ${lockNote}
        ${isCore ? '' : `<button class="fr-del" data-del="${i}">🗑</button>`}
      </div>
    `;
  }).join("");

  container.querySelectorAll("input[data-prop], select[data-prop]").forEach(el => {
    el.addEventListener("input", () => {
      const idx = parseInt(el.closest(".field-row").dataset.idx);
      const prop = el.dataset.prop;
      categoryEditFields[idx][prop] = el.value;
    });
  });
  container.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.del);
      categoryEditFields.splice(idx, 1);
      renderCatFieldsList();
    });
  });
}

function addNewField() {
  const newKey = "field_" + Date.now();
  categoryEditFields.push({ key: newKey, label: "Новое поле", type: "text" });
  renderCatFieldsList();
}

function saveCategoryEdit() {
  if (!editingCategoryId) return;
  const cat = getCategoryById(editingCategoryId);
  if (!cat) return;
  const name = (getVal("catEditName") || "").trim();
  const icon = (getVal("catEditIcon") || "").trim();
  const sub  = (getVal("catEditSub") || "").trim();
  if (!name) { alert("Введите название категории."); return; }

  cat.name = name;
  cat.icon = icon || "📦";
  cat.sub = sub;
  // sanitize fields: each must have a label
  cat.fields = categoryEditFields.filter(f => (f.label || "").trim().length > 0).map(f => ({
    ...f,
    label: f.label.trim()
  }));

  saveCategories();
  renderAll();
  renderCategoriesList();
  closeOverlay("catEditOverlay");
  editingCategoryId = null;
}

// ═══════════════════════════════════════════════════════════
// EMPLOYEES
// ═══════════════════════════════════════════════════════════

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
      <div class="user-row-avatar">${(emp.name || "?")[0].toUpperCase()}</div>
      <div class="user-row-info">
        <div class="user-row-name">${escapeHtml(emp.name)}</div>
        <div class="user-row-login">Логин: <b>${escapeHtml(emp.login)}</b></div>
        <div class="user-row-pw">Пароль: ${escapeHtml(emp.password)}</div>
      </div>
      <div class="user-row-actions">
        <button class="user-row-edit" data-idx="${i}">✏</button>
        <button class="user-row-delete" data-idx="${i}">🗑</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll(".user-row-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx);
      const list = loadEmployees();
      if (!confirm(`Удалить сотрудника «${list[idx]?.name}»?`)) return;
      list.splice(idx, 1);
      saveEmployees(list);
      renderUsersList();
    });
  });
  container.querySelectorAll(".user-row-edit").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx);
      const list = loadEmployees();
      const emp = list[idx];
      if (!emp) return;
      const newLogin = prompt("Новый логин:", emp.login);
      if (newLogin === null) return;
      const newPw = prompt("Новый пароль:", emp.password);
      if (newPw === null) return;
      const newName = prompt("Имя сотрудника:", emp.name);
      if (newName === null) return;
      list[idx] = { login: newLogin.trim(), password: newPw.trim(), name: newName.trim() };
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

// ═══════════════════════════════════════════════════════════
// MANAGER CREDENTIALS
// ═══════════════════════════════════════════════════════════

function openCredsModal() {
  const creds = loadAdminCreds();
  setVal("newAdminLogin", creds.login);
  setVal("newAdminPassword", creds.password);
  setText("credsError", "");
  openOverlay("credsOverlay");
}

function saveCreds() {
  const login = (getVal("newAdminLogin") || "").trim();
  const pw    = (getVal("newAdminPassword") || "").trim();
  if (!login || !pw) {
    setText("credsError", "Логин и пароль не должны быть пустыми.");
    return;
  }
  if (pw.length < 4) {
    setText("credsError", "Пароль должен быть минимум 4 символа.");
    return;
  }
  saveAdminCreds({ login, password: pw });
  // Force re-login since credentials changed
  alert(`Логин и пароль изменены.\nНовый логин: ${login}\nНовый пароль: ${pw}\n\nСистема сейчас попросит войти заново.`);
  logout();
}

// ═══════════════════════════════════════════════════════════
// OVERLAY HELPERS
// ═══════════════════════════════════════════════════════════

function openOverlay(id)  { const el = document.getElementById(id); if (el) el.classList.add("open"); }
function closeOverlay(id) { const el = document.getElementById(id); if (el) el.classList.remove("open"); }
function closeAllModals() {
  ["viewOverlay","editOverlay","deleteOverlay","usersOverlay","categoriesOverlay","catEditOverlay","credsOverlay"].forEach(closeOverlay);
}

// ═══════════════════════════════════════════════════════════
// DOM HELPERS
// ═══════════════════════════════════════════════════════════

function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function setVal(id, val)   { const el = document.getElementById(id); if (el) el.value = val; }
function getVal(id)        { const el = document.getElementById(id); return el ? el.value : ""; }
function show(id, visible) { const el = document.getElementById(id); if (el) el.style.display = visible ? "" : "none"; }

// ═══════════════════════════════════════════════════════════
// FAB
// ═══════════════════════════════════════════════════════════

function toggleFab() {
  fabOpen = !fabOpen;
  const fw = document.querySelector(".fab-wrap");
  if (fw) fw.classList.toggle("open", fabOpen);
}

// ═══════════════════════════════════════════════════════════
// ▓▓▓ SIDEBAR — ROCK-SOLID IMPLEMENTATION ▓▓▓
//
// Two distinct behaviors:
// • Desktop (≥ 901px): sidebar always visible — no JS needed for show/hide.
// • Mobile  (≤ 900px): hamburger toggles drawer + dark scrim.
//
// Key reliability fixes:
// • Overlay element created ONCE at init, never queried again from DOM.
// • Overlay uses inline style.display for show/hide (more reliable than class).
// • All interactive bits: -webkit-tap-highlight + pointer-events handled.
// • State is single source of truth (sidebar.is-open class).
// ═══════════════════════════════════════════════════════════

const MOBILE_BREAKPOINT = 900;

// Cached references (set in initSidebar)
let _sidebarEl = null;
let _sidebarOverlayEl = null;
let _sidebarToggleEl = null;
let _sidebarCloseEl = null;

function isMobileViewport() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function openSidebarMobile() {
  if (!isMobileViewport()) return;
  if (!_sidebarEl || !_sidebarOverlayEl) return;
  _sidebarEl.classList.add("is-open");
  _sidebarOverlayEl.classList.add("is-visible");
  _sidebarOverlayEl.style.display = "block";   // explicit show
  document.body.classList.add("sidebar-locked");
}

function closeSidebarMobile() {
  if (!_sidebarEl || !_sidebarOverlayEl) return;
  _sidebarEl.classList.remove("is-open");
  _sidebarOverlayEl.classList.remove("is-visible");
  _sidebarOverlayEl.style.display = "none";    // explicit hide
  document.body.classList.remove("sidebar-locked");
}

function isSidebarOpenMobile() {
  return !!(_sidebarEl && _sidebarEl.classList.contains("is-open"));
}

function initSidebar() {
  // ─── Cache DOM references ──────────────────────────────────
  _sidebarEl = document.getElementById("sidebar");
  _sidebarToggleEl = document.getElementById("sidebarToggle");
  _sidebarCloseEl = document.getElementById("sidebarCloseBtn");

  // ─── Create overlay if missing ────────────────────────────
  let overlay = document.querySelector(".sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    overlay.id = "sidebarOverlay";
    overlay.style.display = "none";  // start hidden
    document.body.appendChild(overlay);
  }
  _sidebarOverlayEl = overlay;

  // ─── Hamburger → open sidebar ──────────────────────────────
  if (_sidebarToggleEl) {
    _sidebarToggleEl.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (isSidebarOpenMobile()) {
        closeSidebarMobile();
      } else {
        openSidebarMobile();
      }
    });
  }

  // ─── ✕ button inside sidebar → close ──────────────────────
  if (_sidebarCloseEl) {
    _sidebarCloseEl.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeSidebarMobile();
    });
  }

  // ─── Tap on dark overlay → close ──────────────────────────
  _sidebarOverlayEl.addEventListener("click", function (e) {
    e.preventDefault();
    closeSidebarMobile();
  });

  // ─── ESC key → close ──────────────────────────────────────
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isSidebarOpenMobile()) {
      closeSidebarMobile();
    }
  });

  // ─── Manager-only sidebar items ───────────────────────────
  document.querySelectorAll('.sidebar-nav-item[data-action]').forEach(function (btn) {
    const action = btn.dataset.action;
    if (action === "manage-users") {
      btn.addEventListener("click", function () { closeSidebarMobile(); openUsersModal(); });
    } else if (action === "manage-categories") {
      btn.addEventListener("click", function () { closeSidebarMobile(); openCategoriesModal(); });
    } else if (action === "manage-credentials") {
      btn.addEventListener("click", function () { closeSidebarMobile(); openCredsModal(); });
    }
  });

  // ─── Auto-clean on resize to desktop ──────────────────────
  let resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!isMobileViewport()) {
        closeSidebarMobile();
      }
    }, 120);
  });

  // ─── Orientation change ───────────────────────────────────
  window.addEventListener("orientationchange", function () {
    setTimeout(closeSidebarMobile, 200);
  });
}

// ═══════════════════════════════════════════════════════════
// EXCEL EXPORT — DYNAMIC
// ═══════════════════════════════════════════════════════════

function exportToExcel() {
  const dt  = now();
  const monthName = dt.toLocaleDateString("ru-RU", { month:"long", year:"numeric" });

  const statusLabel = (item) => {
    const s = getStatus(item);
    if (s === "paid")   return "✓ Оплачено";
    if (s === "danger") return "🔴 СРОЧНО";
    if (s === "warn")   return "⚠ Скоро";
    return "✓ В порядке";
  };
  const payTypeLabel = (item) => getPayType(item) === "transfer" ? "Перечисление" : "Наличные";

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
  <tr class="title-row"><td colspan="20">📊 Mone Manager — Отчёт за ${escapeXml(monthName)}</td></tr>
  <tr><td colspan="20"></td></tr>`;

  categories.forEach(cat => {
    const items = data[cat.id] || [];
    const headers = [...cat.fields.map(f => f.label), "Тип оплаты", "Статус"];
    html += `<tr class="section-row"><td colspan="${headers.length}">${escapeXml(cat.icon || "📦")} ${escapeXml(cat.name)}</td></tr>`;
    html += `<tr class="header-row">${headers.map(h => `<td>${escapeXml(h)}</td>`).join("")}</tr>`;
    if (!items.length) {
      html += `<tr class="data-row"><td colspan="${headers.length}" style="color:#aaa;text-align:center;">Нет данных</td></tr>`;
    } else {
      items.forEach(item => {
        const st = getStatus(item);
        const cls = st === "paid" ? "paid" : st === "danger" ? "danger" : st === "warn" ? "warn" : "";
        const cells = cat.fields.map(f => {
          let v = item[f.key];
          if (v === undefined || v === null || v === "") return "—";
          return v;
        });
        cells.push(payTypeLabel(item), statusLabel(item));
        html += `<tr class="data-row ${cls}">${cells.map(c => `<td>${escapeXml(c)}</td>`).join("")}</tr>`;
      });
    }
    html += `<tr><td colspan="${headers.length}"></td></tr>`;
  });

  // Summary
  const allIt = allItems();
  const totalSum = allIt.reduce((acc, item) => {
    let fee = "";
    const cat = categories.find(c => c.id === item.cat);
    if (cat) {
      const feeField = cat.fields.find(f => f.fee);
      if (feeField) fee = item[feeField.key] || "";
    }
    if (!fee) fee = item.fee || item.abFee || "0";
    const num = parseFloat(String(fee).replace(/[^\d.]/g, "")) || 0;
    return acc + num;
  }, 0);

  html += `<tr class="section-row"><td colspan="10">📋 Итого</td></tr>
  <tr class="header-row"><td>Всего записей</td>${categories.map(c => `<td>${escapeXml(c.name)}</td>`).join("")}<td>Оплачено</td><td>Срочно</td><td>Сумма в мес.</td></tr>
  <tr class="data-row">
    <td>${allIt.length}</td>
    ${categories.map(c => `<td>${(data[c.id]||[]).length}</td>`).join("")}
    <td>${allIt.filter(i => i.paidThisMonth).length}</td>
    <td>${allIt.filter(i => getStatus(i) === "danger").length}</td>
    <td>${totalSum.toLocaleString("ru-RU")} сум</td>
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

// ═══════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

// Role tabs
document.querySelectorAll(".role-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedRole = btn.dataset.role;
    document.querySelectorAll(".role-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const hint = document.getElementById("lockHint");
    if (hint) hint.textContent = selectedRole === "manager" ? "Менеджер: введите свой логин и пароль" : "Введите логин и пароль, выданные менеджером";
  });
});

// Lock screen
const lockBtn = document.getElementById("lockBtn");
const lockErr = document.getElementById("lockError");
if (lockBtn) {
  lockBtn.addEventListener("click", () => {
    const loginVal = (document.getElementById("lockLogin")?.value || "").trim();
    const passVal  = (document.getElementById("lockPassword")?.value || "");

    if (selectedRole === "manager") {
      const creds = loadAdminCreds();
      if (loginVal === creds.login && passVal === creds.password) {
        login("manager", "Менеджер", loginVal);
      } else {
        if (lockErr) lockErr.textContent = "Неверный логин или пароль";
        shakeLoginError();
      }
    } else {
      const employees = loadEmployees();
      const emp = employees.find(e => e.login === loginVal && e.password === passVal);
      if (emp) {
        login("employee", emp.name, emp.login);
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

// Logout & Export
document.getElementById("btnLogout")?.addEventListener("click", logout);
document.getElementById("btnExportXls")?.addEventListener("click", () => { exportToExcel(); closeSidebarMobile(); });

// FAB
document.getElementById("fabAdd")?.addEventListener("click", toggleFab);

// Pay type
document.querySelectorAll(".pay-tab").forEach(btn => {
  btn.addEventListener("click", () => switchPayType(btn.dataset.type));
});

// Outside click closes FAB
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

// Categories modal
document.getElementById("categoriesClose")?.addEventListener("click", () => closeOverlay("categoriesOverlay"));
document.getElementById("btnAddCategory")?.addEventListener("click", addCategoryFromForm);

// Category edit modal
document.getElementById("catEditCancel")?.addEventListener("click", () => { closeOverlay("catEditOverlay"); editingCategoryId = null; });
document.getElementById("catEditSave")?.addEventListener("click", saveCategoryEdit);
document.getElementById("btnAddField")?.addEventListener("click", addNewField);

// Credentials modal
document.getElementById("credsCancel")?.addEventListener("click", () => closeOverlay("credsOverlay"));
document.getElementById("credsSave")?.addEventListener("click", saveCreds);

// Backdrop click closes overlays (except confirm-style)
["viewOverlay","editOverlay","deleteOverlay","usersOverlay","categoriesOverlay","catEditOverlay","credsOverlay"].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("click", e => {
      if (e.target === e.currentTarget) {
        closeOverlay(id);
        if (id === "deleteOverlay") { pendingDeleteId = null; pendingDeleteCat = null; }
        if (id === "catEditOverlay") editingCategoryId = null;
      }
    });
  }
});

// ESC closes modals
document.addEventListener("keydown", e => { if (e.key === "Escape") closeAllModals(); });

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════

loadCategories();
loadCollapsed();
loadData();
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
    currentUserLogin = s.login || "";
    document.getElementById("lockScreen").style.display = "none";
    document.getElementById("app").style.display = "flex";
    applyRoleUI();
    subscribeFirebase();
    renderAll();
    applyCollapsed();
  } else {
    setTimeout(() => { document.getElementById("lockLogin")?.focus(); }, 400);
  }
} else {
  setTimeout(() => { document.getElementById("lockLogin")?.focus(); }, 400);
}

// Auto-refresh every minute
setInterval(() => { if (isLoggedIn()) renderAll(); }, 60_000);
