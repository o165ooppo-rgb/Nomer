/**
 * Mone Manager — app.js
 * Three-category layout: Phones, Wi-Fi, Cars/GPS
 * Auth, CRUD, Firebase sync, payment tracking
 */

// ─── CONSTANTS ───────────────────────────────────────────────
const APP_PASSWORD  = "admin123";
const STORAGE_KEY   = "monemanager_v1";
const SESSION_KEY   = "monemanager_session";

// ─── DEMO DATA ───────────────────────────────────────────────
const DEFAULT_DATA = {
  phone: [
    { id: "p1", cat:"phone", name:"+998 90 123 45 67", company:"ООО Альфа-Трейд",    operator:"Ucell",   owner:"Иванов Иван",      address:"г. Ташкент, ул. Навои 14",    tariff:"Бизнес Про",    internet:"50 ГБ/мес",  abFee:"95 000 сум",  payDay:5,  extra:"—",                    note:"Директор",          paidThisMonth:false },
    { id: "p2", cat:"phone", name:"+998 93 234 56 78", company:"ИП Бета-Сервис",      operator:"Beeline", owner:"Петрова Анна",      address:"г. Ташкент, Амира Темура 7",  tariff:"Корп Стандарт", internet:"20 ГБ/мес",  abFee:"65 000 сум",  payDay:10, extra:"—",                    note:"Бухгалтерия",       paidThisMonth:false },
    { id: "p3", cat:"phone", name:"+998 91 345 67 89", company:"ООО Гамма",           operator:"Mobiuz",  owner:"Сидоров Петр",      address:"г. Самарканд, ул. Регистан 3",tariff:"Корп Лайт",     internet:"10 ГБ/мес",  abFee:"45 000 сум",  payDay:15, extra:"10 000 сум (SMS)",      note:"Склад Самарканд",   paidThisMonth:false },
    { id: "p4", cat:"phone", name:"+998 97 456 78 90", company:"ООО Дельта Логистик", operator:"Humans",  owner:"Юсупов Бобур",      address:"г. Ташкент, ТИИТ корп. 3",   tariff:"Бизнес Макс",   internet:"100 ГБ/мес", abFee:"140 000 сум", payDay:1,  extra:"—",                    note:"Генеральный директор", paidThisMonth:false },
    { id: "p5", cat:"phone", name:"+998 94 567 89 01", company:"ООО Эпсилон",         operator:"UMS",     owner:"Каримова Зульфия",  address:"г. Ташкент, Чиланзар 9-кв.", tariff:"Корп Стандарт", internet:"20 ГБ/мес",  abFee:"65 000 сум",  payDay:20, extra:"—",                    note:"HR отдел",          paidThisMonth:false },
    { id: "p6", cat:"phone", name:"+998 95 678 90 12", company:"ЧП Зета-Строй",       operator:"Ucell",   owner:"Рахимов Санжар",    address:"г. Бухара, ул. Гоголя 22",   tariff:"Бизнес Про",    internet:"50 ГБ/мес",  abFee:"95 000 сум",  payDay:25, extra:"5 000 сум (мин.)",     note:"Прораб Бухара",     paidThisMonth:false },
  ],
  wifi: [
    { id: "w1", cat:"wifi", name:"Офис центральный", company:"ООО Альфа-Трейд",    provider:"Uztelecom",      tariff:"100 Мбит/с — Безлимит", address:"г. Ташкент, ул. Навои 14",    fee:"250 000 сум", payDay:5,  contract:"№ 56789", note:"Основной офис",     paidThisMonth:false },
    { id: "w2", cat:"wifi", name:"Склад Самарканд",  company:"ООО Гамма",           provider:"Sarkor",         tariff:"50 Мбит/с — Безлимит",  address:"г. Самарканд, ул. Регистан 3",fee:"120 000 сум", payDay:15, contract:"№ 34521", note:"Склад",             paidThisMonth:false },
    { id: "w3", cat:"wifi", name:"Офис Бухара",      company:"ЧП Зета-Строй",       provider:"Comnet",         tariff:"30 Мбит/с — 100 ГБ",    address:"г. Бухара, ул. Гоголя 22",   fee:"90 000 сум",  payDay:1,  contract:"№ 12300", note:"—",                 paidThisMonth:false },
    { id: "w4", cat:"wifi", name:"Шоурум",           company:"ИП Мю-Дизайн",        provider:"Perfectum",      tariff:"200 Мбит/с — Безлимит", address:"г. Ташкент, ул. Беруни 12",  fee:"350 000 сум", payDay:22, contract:"№ 99001", note:"Дизайн и шоурум",   paidThisMonth:false },
  ],
  car: [
    { id: "c1", cat:"car", name:"Chevrolet Nexia 3 — 01 ABC 123", company:"ООО Альфа-Трейд",    type:"GPS-трекер",    driver:"Мусаев Алишер",   provider:"Uzauto GPS",    fee:"80 000 сум",  payDay:1,  plate:"01 A 123 BC", note:"Доставка",        paidThisMonth:false },
    { id: "c2", cat:"car", name:"Hyundai Tucson — 01 XYZ 789",    company:"ООО Дельта Логистик", type:"Страховка",     driver:"Юсупов Бобур",    provider:"Alfa Insurance",fee:"210 000 сум", payDay:10, plate:"01 X 789 YZ", note:"Директор",        paidThisMonth:false },
    { id: "c3", cat:"car", name:"Isuzu NQR — 01 GRZ 555",         company:"ООО Гамма",           type:"GPS-трекер",    driver:"Хасанов Фаррух",  provider:"FleetTrack UZ", fee:"95 000 сум",  payDay:5,  plate:"01 G 555 RZ", note:"Грузовой склад",  paidThisMonth:false },
    { id: "c4", cat:"car", name:"Chevrolet Cobalt — 01 MNO 321",  company:"ЧП Зета-Строй",       type:"Топливная карта",driver:"Рахимов Санжар",  provider:"Zaryadka Card", fee:"500 000 сум", payDay:25, plate:"01 M 321 NO", note:"Прораб, топливо", paidThisMonth:false },
  ]
};

// ─── STATE ───────────────────────────────────────────────────
let data = { phone: [], wifi: [], car: [] };
let currentViewId  = null;
let currentViewCat = null;
let currentEditId  = null;   // null = new
let currentEditCat = null;   // 'phone' | 'wifi' | 'car'
let pendingAction  = null;
let pendingDeleteId  = null;
let pendingDeleteCat = null;
let firebaseReady  = false;
let fabOpen = false;

// ─── STORAGE ─────────────────────────────────────────────────
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    data = raw ? JSON.parse(raw) : deepClone(DEFAULT_DATA);
  } catch {
    data = deepClone(DEFAULT_DATA);
  }
  // Reset paid flag on new month
  const savedMonth = localStorage.getItem("monemanager_month");
  const nowMonth = new Date().getMonth() + "-" + new Date().getFullYear();
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

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function allItems() {
  return [...data.phone, ...data.wifi, ...data.car];
}

function getItemByCat(cat, id) {
  return data[cat].find(i => i.id === id);
}

// ─── SESSION ─────────────────────────────────────────────────
function isLoggedIn() { return sessionStorage.getItem(SESSION_KEY) === "1"; }

function login() {
  sessionStorage.setItem(SESSION_KEY, "1");
  document.getElementById("lockScreen").style.display = "none";
  document.getElementById("app").style.display = "block";
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
}

function logout() { sessionStorage.removeItem(SESSION_KEY); location.reload(); }

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

// ─── RENDER ALL ──────────────────────────────────────────────
function renderAll() {
  updateHeaderDate();
  renderGlobalStats();
  renderBanner();
  renderColumn("phone");
  renderColumn("wifi");
  renderColumn("car");
}

function updateHeaderDate() {
  const el = document.getElementById("headerDate");
  if (el) el.textContent = now().toLocaleDateString("ru-RU", { weekday:"short", day:"numeric", month:"long", year:"numeric" });
}

function renderGlobalStats() {
  const all = allItems();
  const warn   = all.filter(i => getStatus(i) === "warn").length;
  const danger = all.filter(i => getStatus(i) === "danger").length;

  setText("countTotal",   all.length);
  setText("countWarning", warn);
  setText("countDanger",  danger);
  show("pillWarn",   warn > 0);
  show("pillDanger", danger > 0);
}

function renderBanner() {
  const urgents = allItems().filter(i => getStatus(i) === "danger");
  const el = document.getElementById("alertBanner");
  const alertText = document.getElementById("alertText");
  if (urgents.length && el && alertText) {
    alertText.textContent = `Срочная оплата (≤3 дня): ${urgents.map(i => i.name + " — " + i.company).join("  |  ")}`;
    el.style.display = "flex";
  } else if (el) {
    el.style.display = "none";
  }
}

// ─── COLUMN RENDER ───────────────────────────────────────────
const COL_IDS = { phone: "cardsPhone", wifi: "cardsWifi", car: "cardsCar" };
const STATS_IDS = { phone: "statsPhone", wifi: "statsWifi", car: "statsCar" };
const CAT_LABELS = { phone: "📱 Телефон", wifi: "📶 Wi-Fi", car: "🚗 Машина / GPS" };
const CAT_EMPTY  = { phone: "📱", wifi: "📶", car: "🚗" };

function renderColumn(cat) {
  const items = data[cat] || [];
  const statsEl = document.getElementById(STATS_IDS[cat]);
  const cardsEl = document.getElementById(COL_IDS[cat]);
  if (!statsEl || !cardsEl) return;

  // Stats chips
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

  // Cards
  cardsEl.innerHTML = "";
  if (!items.length) {
    cardsEl.innerHTML = `<div class="col-empty"><div class="col-empty-emoji">${CAT_EMPTY[cat]}</div><p>Нет записей. Нажмите «+ Добавить»</p></div>`;
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
    if (st === "paid")  { badgeText = "✓ Оплачено";           badgeClass = "badge-paid"; }
    else if (days === 0){ badgeText = "Сегодня!";             badgeClass = "badge-danger"; }
    else if (days <= 3) { badgeText = `${days} дн. — СРОЧНО`; badgeClass = "badge-danger"; }
    else if (days <= 7) { badgeText = `${days} дн.`;          badgeClass = "badge-warn"; }
    else                { badgeText = `${days} дн.`;          badgeClass = "badge-ok"; }

    const dotClass  = st === "paid" ? "dot-paid"  : `dot-${st}`;
    const progClass = st === "paid" ? "prog-paid"  : `prog-${st}`;

    // Secondary info per category
    let detailHtml = "";
    if (cat === "phone") {
      detailHtml = `<div class="card-detail"><span class="card-detail-icon">📶</span>${escapeHtml(item.operator)} · ${escapeHtml(item.internet || "—")}</div>`;
    } else if (cat === "wifi") {
      detailHtml = `<div class="card-detail"><span class="card-detail-icon">🏢</span>${escapeHtml(item.provider)} · ${escapeHtml(item.tariff || "—")}</div>`;
    } else if (cat === "car") {
      detailHtml = `<div class="card-detail"><span class="card-detail-icon">👤</span>${escapeHtml(item.driver || "—")} · ${escapeHtml(item.type || "—")}</div>`;
    }

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

function getFee(item) {
  return item.abFee || item.fee || "—";
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
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

  // Category badge
  const cb = document.getElementById("vCatBadge");
  if (cb) {
    const catMap  = { phone:"vcb-phone", wifi:"vcb-wifi", car:"vcb-car" };
    cb.className  = `view-cat-badge ${catMap[cat]}`;
    cb.textContent = CAT_LABELS[cat];
  }

  // Status badge
  const sb = document.getElementById("vStatusBadge");
  const sbMap  = { ok:"vsb-ok", warn:"vsb-warn", danger:"vsb-danger", paid:"vsb-paid" };
  const sbText = { ok:`✓ В порядке (${days} дн.)`, warn:`⚠ Скоро (${days} дн.)`, danger:`🔴 СРОЧНО (${days} дн.)`, paid:"✓ Оплачено в этом месяце" };
  if (sb) { sb.className = `view-status-badge ${sbMap[st]}`; sb.textContent = sbText[st]; }

  setText("vNumber", item.name);
  const metaEl = document.getElementById("vMeta");
  if (metaEl) {
    if (cat === "phone") metaEl.textContent = `${item.company}  •  ${item.operator}`;
    else if (cat === "wifi") metaEl.textContent = `${item.company}  •  ${item.provider}`;
    else if (cat === "car")  metaEl.textContent = `${item.company}  •  ${item.plate || "—"}`;
  }

  // Countdown
  const cd = document.getElementById("vCountdown");
  if (cd) {
    if (st === "paid")      { cd.textContent = "✅ Оплата этого месяца отмечена"; cd.className = "view-countdown cd-paid"; }
    else if (days === 0)    { cd.textContent = "🔴 Оплатить СЕГОДНЯ!"; cd.className = "view-countdown cd-danger"; }
    else if (days <= 3)     { cd.textContent = `🔴 Осталось ${days} дн. — СРОЧНО ОПЛАТИТЬ`; cd.className = "view-countdown cd-danger"; }
    else if (days <= 7)     { cd.textContent = `⚠️ До оплаты ${days} дн. — скоро`; cd.className = "view-countdown cd-warn"; }
    else                    { cd.textContent = `✅ До оплаты ${days} дн. — всё в порядке`; cd.className = "view-countdown cd-ok"; }
  }

  // Fields by category
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

  // Progress
  const fill = document.getElementById("vProgressFill");
  const pct  = document.getElementById("vProgressPct");
  if (fill) {
    fill.style.width = prog + "%";
    fill.style.background = st === "ok" || st === "paid" ? "var(--ok)" : st === "warn" ? "var(--warn)" : "var(--danger)";
  }
  if (pct) pct.textContent = prog + "%";

  // Paid button
  const paidBtn = document.getElementById("btnMarkPaid");
  if (paidBtn) {
    if (item.paidThisMonth) {
      paidBtn.textContent = "✓ Уже оплачено в этом месяце";
      paidBtn.classList.add("already-paid");
    } else {
      paidBtn.textContent = "✓ Отметить оплаченным";
      paidBtn.classList.remove("already-paid");
    }
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

  // Show correct form
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
    const name    = getVal("ePhone").trim();
    const company = getVal("eCompany").trim();
    if (!name || !company) { alert("Заполните номер телефона и компанию."); return; }
    newData = {
      name, company,
      owner:    getVal("eOwner").trim(),
      address:  getVal("eAddress").trim(),
      tariff:   getVal("eTariff").trim(),
      internet: getVal("eInternet").trim(),
      abFee:    getVal("eAbFee").trim(),
      payDay:   parseInt(getVal("ePayDay")) || 1,
      extra:    getVal("eExtra").trim() || "—",
      operator: getVal("eOperator"),
      note:     getVal("eNote").trim(),
    };
  } else if (cat === "wifi") {
    const name    = getVal("wName").trim();
    const company = getVal("wCompany").trim();
    if (!name || !company) { alert("Заполните название и компанию."); return; }
    newData = {
      name, company,
      provider: getVal("wProvider"),
      tariff:   getVal("wTariff").trim(),
      address:  getVal("wAddress").trim(),
      fee:      getVal("wFee").trim(),
      payDay:   parseInt(getVal("wPayDay")) || 1,
      contract: getVal("wContract").trim(),
      note:     getVal("wNote").trim(),
    };
  } else if (cat === "car") {
    const name    = getVal("cName").trim();
    const company = getVal("cCompany").trim();
    if (!name || !company) { alert("Заполните название автомобиля и компанию."); return; }
    newData = {
      name, company,
      type:     getVal("cType"),
      driver:   getVal("cDriver").trim(),
      provider: getVal("cProvider").trim(),
      fee:      getVal("cFee").trim(),
      payDay:   parseInt(getVal("cPayDay")) || 1,
      plate:    getVal("cPlate").trim(),
      note:     getVal("cNote").trim(),
    };
  }

  if (currentEditId) {
    const idx = data[cat].findIndex(i => i.id === currentEditId);
    if (idx !== -1) data[cat][idx] = { ...data[cat][idx], ...newData };
  } else {
    const newId = cat[0] + Date.now();
    data[cat].push({ id: newId, cat, paidThisMonth: false, ...newData });
  }

  saveData();
  renderAll();
  closeOverlay("editOverlay");
}

// ─── DELETE ──────────────────────────────────────────────────
function startDelete(cat, id) {
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
  if (val !== APP_PASSWORD) {
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

  if (type === "edit") {
    closeViewModal();
    setTimeout(() => openEditModal(cat, id), 200);
  } else if (type === "delete") {
    openDeleteConfirm(cat, id);
  } else if (type === "paid") {
    executePaid(cat, id);
  } else if (type === "add") {
    closeViewModal();
    setTimeout(() => openEditModal(cat, null), 200);
  }
}

// ─── START ADD ───────────────────────────────────────────────
function startAdd(cat) {
  pendingAction = { type:"add", id:null, cat };
  openPasswordConfirm("Добавить запись", `Введите пароль для добавления в категорию «${CAT_LABELS[cat]}».`);
}

// ─── OVERLAY HELPERS ─────────────────────────────────────────
function openOverlay(id)  { const el = document.getElementById(id); if (el) el.classList.add("open"); }
function closeOverlay(id) { const el = document.getElementById(id); if (el) el.classList.remove("open"); }
function closeAllModals() { ["viewOverlay","editOverlay","pwOverlay","deleteOverlay"].forEach(closeOverlay); }

// ─── DOM HELPERS ─────────────────────────────────────────────
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function setTxt(id, text)  { setText(id, text); }
function setVal(id, val)   { const el = document.getElementById(id); if (el) el.value = val; }
function getVal(id)        { const el = document.getElementById(id); return el ? el.value : ""; }
function show(id, visible) { const el = document.getElementById(id); if (el) el.style.display = visible ? "" : "none"; }

// ─── FAB TOGGLE ──────────────────────────────────────────────
function toggleFab() {
  fabOpen = !fabOpen;
  document.querySelector(".fab-wrap").classList.toggle("open", fabOpen);
}

// ─── EVENT LISTENERS ─────────────────────────────────────────

// Lock screen
const lockBtn  = document.getElementById("lockBtn");
const lockPw   = document.getElementById("lockPassword");
const lockErr  = document.getElementById("lockError");

if (lockBtn) {
  lockBtn.addEventListener("click", () => {
    if (lockPw.value === APP_PASSWORD) {
      login();
    } else {
      if (lockErr) lockErr.textContent = "Неверный пароль";
      lockPw.value = "";
      lockPw.style.borderColor = "var(--danger)";
      lockPw.style.boxShadow   = "0 0 0 3px var(--danger-bg)";
      setTimeout(() => { lockPw.style.borderColor = ""; lockPw.style.boxShadow = ""; }, 1200);
    }
  });
}
if (lockPw) lockPw.addEventListener("keydown", e => { if (e.key === "Enter" && lockBtn) lockBtn.click(); });

// Logout
const logoutBtn = document.getElementById("btnLogout");
if (logoutBtn) logoutBtn.addEventListener("click", logout);

// FAB main button
const fabAdd = document.getElementById("fabAdd");
if (fabAdd) fabAdd.addEventListener("click", toggleFab);

// FAB category items
document.querySelectorAll(".fab-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const cat = btn.dataset.cat;
    fabOpen = false;
    document.querySelector(".fab-wrap").classList.remove("open");
    if (cat) startAdd(cat);
  });
});

// Column add buttons
document.querySelectorAll(".btn-col-add").forEach(btn => {
  btn.addEventListener("click", () => {
    const cat = btn.dataset.cat;
    if (cat) startAdd(cat);
  });
});

// Close FAB on outside click
document.addEventListener("click", e => {
  if (fabOpen && !e.target.closest(".fab-wrap")) {
    fabOpen = false;
    document.querySelector(".fab-wrap").classList.remove("open");
  }
});

// View modal actions
const vBtnClose  = document.getElementById("vBtnClose");
const vBtnEdit   = document.getElementById("vBtnEdit");
const vBtnDelete = document.getElementById("vBtnDelete");
const btnMarkPaid = document.getElementById("btnMarkPaid");

if (vBtnClose)  vBtnClose.addEventListener("click", closeViewModal);
if (vBtnEdit)   vBtnEdit.addEventListener("click",   () => { if (currentViewId && currentViewCat) startEdit(currentViewCat, currentViewId); });
if (vBtnDelete) vBtnDelete.addEventListener("click", () => { if (currentViewId && currentViewCat) startDelete(currentViewCat, currentViewId); });
if (btnMarkPaid) btnMarkPaid.addEventListener("click", markPaid);

// Edit modal
const editCancel = document.getElementById("editCancel");
const editSave   = document.getElementById("editSave");
if (editCancel) editCancel.addEventListener("click", () => closeOverlay("editOverlay"));
if (editSave)   editSave.addEventListener("click", saveEdit);

// Password modal
const pwConfirm = document.getElementById("pwConfirm");
const pwCancel  = document.getElementById("pwCancel");
const pwInput   = document.getElementById("pwInput");
if (pwConfirm) pwConfirm.addEventListener("click", confirmPassword);
if (pwCancel)  pwCancel.addEventListener("click",  () => { closeOverlay("pwOverlay"); pendingAction = null; });
if (pwInput)   pwInput.addEventListener("keydown",  e => { if (e.key === "Enter") confirmPassword(); });

// Delete modal
const deleteConfirm = document.getElementById("deleteConfirm");
const deleteCancel  = document.getElementById("deleteCancel");
if (deleteConfirm) {
  deleteConfirm.addEventListener("click", () => {
    if (pendingDeleteId && pendingDeleteCat) executeDelete(pendingDeleteCat, pendingDeleteId);
  });
}
if (deleteCancel) {
  deleteCancel.addEventListener("click", () => { closeOverlay("deleteOverlay"); pendingDeleteId = null; pendingDeleteCat = null; });
}

// Backdrop click closes overlays
["viewOverlay","editOverlay","pwOverlay","deleteOverlay"].forEach(id => {
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
setTimeout(() => {
  firebaseReady = true;
  loadFromFirebase();
}, 500);

if (isLoggedIn()) {
  document.getElementById("lockScreen").style.display = "none";
  document.getElementById("app").style.display = "block";
} else {
  setTimeout(() => { const el = document.getElementById("lockPassword"); if (el) el.focus(); }, 400);
}

// Auto-refresh every minute
setInterval(() => { if (isLoggedIn()) renderAll(); }, 60_000);
