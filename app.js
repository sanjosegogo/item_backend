const CONFIG = {
  apiBaseUrl: "https://script.google.com/macros/s/AKfycbwaSKimOWvuUWTVNOojwwBryLr5yLLX5TIWzpPFTolKmCHQlgl1hNqGvpgu4C6QC4ei/exec",
  googleClientId: "424188945884-c9vlb5ck5cqk409jetlo03nvlbqcaftj.apps.googleusercontent.com",
  demoModeWhenUnconfigured: true,
};

const state = {
  token: "",
  user: null,
  products: [],
  marquee: [],
  filter: "all",
  query: "",
  demoMode: false,
};

const sampleProducts = [
  {
    id: 1,
    active: true,
    saleLabel: "當週新品",
    discount: 0.8,
    specialDiscount: 0,
    name: "TORY BURCH 防刮皮革名片夾-焦糖色",
    marketPrice: 3400,
    salePrice: 2720,
    specialPrice: "",
    size: "約長10CM、高7CM",
    brand: "TORY BURCH",
    postUrl: "",
    images: [
      "https://assets.breezeonline.com/online/production/product/6332b933-f155-4323-8e82-a5f714e92fd0.jpg",
    ],
  },
  {
    id: 2,
    active: true,
    saleLabel: "📣下殺折扣",
    discount: 0.7,
    specialDiscount: 0.65,
    name: "MICHAEL KORS Lita 小牛皮 皮革金鏈掀蓋斜背包(黑色)",
    marketPrice: 9000,
    salePrice: 6300,
    specialPrice: 4095,
    size: "F",
    brand: "MICHAEL KORS",
    postUrl: "",
    images: [
      "https://tw.buy.yahoo.com/res/gdsale/st_pic/1019/st-10190516-1.jpg",
    ],
  },
  {
    id: 3,
    active: false,
    saleLabel: "",
    discount: 0.8,
    specialDiscount: 0,
    name: "Kate Spade Whiskers 專櫃白色貓咪款",
    marketPrice: 3900,
    salePrice: 3120,
    specialPrice: "",
    size: "約寬20CM，高10CM",
    brand: "Kate Spade",
    postUrl: "",
    images: [
      "https://katespade.scene7.com/is/image/KateSpade/KI714_001?$desktopProductZoom$",
    ],
  },
];

const sampleMarquee = [
  {
    active: true,
    text: "臉書成立9年感恩回饋",
    url: "https://www.facebook.com/groups/183038802197503/",
    expiresAt: "2026-12-31",
  },
];

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindEvents();
  setupAuth();
  refreshIcons();
});

function bindElements() {
  [
    "auth-view",
    "app-view",
    "google-login",
    "demo-login",
    "auth-message",
    "sync-button",
    "search-input",
    "product-list",
    "empty-state",
    "count-live",
    "count-paused",
    "count-sale",
    "add-product-button",
    "marquee-button",
    "product-dialog",
    "product-form",
    "dialog-title",
    "save-product-button",
    "marquee-dialog",
    "marquee-list",
    "add-marquee-row",
    "save-marquee-button",
    "toast",
  ].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });
}

function bindEvents() {
  els.demoLogin.addEventListener("click", enterDemoMode);
  els.syncButton.addEventListener("click", loadAdminData);
  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderProducts();
  });
  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderProducts();
    });
  });
  els.addProductButton.addEventListener("click", () => openProductDialog());
  els.marqueeButton.addEventListener("click", openMarqueeDialog);
  els.saveProductButton.addEventListener("click", saveProduct);
  els.addMarqueeRow.addEventListener("click", () => addMarqueeRow({ active: true }));
  els.saveMarqueeButton.addEventListener("click", saveMarquee);
}

function setupAuth() {
  if (!isConfigured()) {
    if (CONFIG.demoModeWhenUnconfigured) {
      els.authMessage.textContent = "目前是未串接狀態，可先預覽介面。";
    }
    return;
  }

  window.google?.accounts.id.initialize({
    client_id: CONFIG.googleClientId,
    callback: async (response) => {
      state.token = response.credential;
      await loadAdminData();
    },
  });

  window.google?.accounts.id.renderButton(els.googleLogin, {
    theme: "outline",
    size: "large",
    width: "100%",
    text: "signin_with",
    shape: "rectangular",
  });
}

function isConfigured() {
  return !CONFIG.apiBaseUrl.includes("PASTE_") && !CONFIG.googleClientId.includes("PASTE_");
}

function enterDemoMode() {
  state.demoMode = true;
  state.products = structuredClone(sampleProducts);
  state.marquee = structuredClone(sampleMarquee);
  showApp();
  renderAll();
  toast("已進入預覽模式");
}

async function loadAdminData() {
  try {
    if (state.demoMode || !isConfigured()) {
      state.products = structuredClone(sampleProducts);
      state.marquee = structuredClone(sampleMarquee);
      state.demoMode = true;
      showApp();
      renderAll();
      toast("已載入預覽資料");
      return;
    }

    const result = await apiRequest("admin_list", {});
    state.products = result.products || [];
    state.marquee = result.marquee || [];
    showApp();
    renderAll();
    toast("已同步");
  } catch (error) {
    els.authMessage.textContent = error.message;
    toast(error.message);
  }
}

function showApp() {
  els.authView.classList.add("hidden");
  els.appView.classList.remove("hidden");
}

function renderAll() {
  renderCounts();
  renderProducts();
  refreshIcons();
}

function renderCounts() {
  els.countLive.textContent = state.products.filter((item) => item.active).length;
  els.countPaused.textContent = state.products.filter((item) => !item.active).length;
  els.countSale.textContent = state.products.filter((item) => item.saleLabel).length;
}

function renderProducts() {
  const products = filteredProducts();
  els.productList.innerHTML = "";
  els.emptyState.classList.toggle("hidden", products.length > 0);

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <img class="product-thumb" src="${escapeAttr(product.images?.[0] || "")}" alt="">
      <div class="product-main">
        <div class="product-line">
          <h2 class="product-title">${escapeHtml(product.name)}</h2>
        </div>
        <p class="product-price">${formatPrice(product.specialPrice || product.salePrice)}</p>
        <div class="product-meta">
          <span class="pill ${product.active ? "live" : "paused"}">${product.active ? "上架" : "下架"}</span>
          <span class="pill">${escapeHtml(product.brand || "其他")}</span>
          ${product.saleLabel ? `<span class="pill sale">${escapeHtml(product.saleLabel)}</span>` : ""}
        </div>
        <div class="card-actions">
          <button class="toggle-button ${product.active ? "live" : "paused"}" type="button">
            ${product.active ? "目前上架" : "目前下架"}
          </button>
          <button class="edit-button" type="button" aria-label="編輯">
            <i data-lucide="pencil"></i>
          </button>
        </div>
      </div>
    `;
    card.querySelector(".toggle-button").addEventListener("click", () => toggleProduct(product.id));
    card.querySelector(".edit-button").addEventListener("click", () => openProductDialog(product));
    els.productList.appendChild(card);
  });

  refreshIcons();
}

function filteredProducts() {
  return state.products.filter((product) => {
    const matchesFilter =
      state.filter === "all" ||
      (state.filter === "live" && product.active) ||
      (state.filter === "paused" && !product.active) ||
      (state.filter === "sale" && product.saleLabel);

    const haystack = [product.name, product.brand, product.saleLabel, product.size]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesFilter && (!state.query || haystack.includes(state.query));
  });
}

async function toggleProduct(id) {
  const product = state.products.find((item) => String(item.id) === String(id));
  if (!product) return;
  product.active = !product.active;
  renderAll();
  await persistProduct(product, "上下架已更新");
}

function openProductDialog(product = null) {
  const isNew = !product;
  const nextId = Math.max(0, ...state.products.map((item) => Number(item.id) || 0)) + 1;
  const value = product || {
    id: nextId,
    active: true,
    saleLabel: "",
    discount: "",
    specialDiscount: "",
    name: "",
    marketPrice: "",
    salePrice: "",
    specialPrice: "",
    size: "F",
    brand: "",
    postUrl: "",
    images: [],
  };

  els.dialogTitle.textContent = isNew ? "新增商品" : "編輯商品";
  setField("id", value.id);
  setField("active", value.active ? "TRUE" : "FALSE");
  setField("brand", value.brand);
  setField("name", value.name);
  setField("size", value.size);
  setField("sale-label", value.saleLabel);
  setField("market-price", value.marketPrice);
  setField("sale-price", value.salePrice);
  setField("special-price", value.specialPrice);
  setField("discount", value.discount);
  setField("special-discount", value.specialDiscount);
  setField("post-url", value.postUrl);
  for (let index = 1; index <= 5; index += 1) {
    setField(`image-${index}`, value.images?.[index - 1] || "");
  }
  els.productDialog.showModal();
}

async function saveProduct() {
  if (!els.productForm.reportValidity()) return;
  const product = readProductForm();
  const index = state.products.findIndex((item) => String(item.id) === String(product.id));
  if (index >= 0) state.products[index] = product;
  else state.products.unshift(product);
  els.productDialog.close();
  renderAll();
  await persistProduct(product, "商品已儲存");
}

async function persistProduct(product, message) {
  try {
    if (!state.demoMode) await apiRequest("admin_save_product", { product });
    toast(message);
  } catch (error) {
    toast(error.message);
  }
}

function readProductForm() {
  return {
    id: getField("id"),
    active: getField("active") === "TRUE",
    saleLabel: getField("sale-label"),
    discount: getField("discount"),
    specialDiscount: getField("special-discount"),
    name: getField("name"),
    marketPrice: getField("market-price"),
    salePrice: getField("sale-price"),
    specialPrice: getField("special-price"),
    size: getField("size") || "F",
    brand: getField("brand") || "其他",
    postUrl: getField("post-url"),
    images: [1, 2, 3, 4, 5].map((index) => getField(`image-${index}`)).filter(Boolean),
  };
}

function openMarqueeDialog() {
  els.marqueeList.innerHTML = "";
  const rows = state.marquee.length ? state.marquee : [{ active: true }];
  rows.forEach(addMarqueeRow);
  els.marqueeDialog.showModal();
  refreshIcons();
}

function addMarqueeRow(row = {}) {
  const node = document.createElement("article");
  node.className = "marquee-row";
  node.innerHTML = `
    <label>
      <span>狀態</span>
      <select data-key="active">
        <option value="TRUE" ${row.active !== false ? "selected" : ""}>啟用</option>
        <option value="FALSE" ${row.active === false ? "selected" : ""}>停用</option>
      </select>
    </label>
    <label>
      <span>文案</span>
      <input data-key="text" value="${escapeAttr(row.text || "")}">
    </label>
    <label>
      <span>連結</span>
      <input data-key="url" type="url" value="${escapeAttr(row.url || "")}">
    </label>
    <label>
      <span>到期日</span>
      <input data-key="expiresAt" type="date" value="${escapeAttr(formatDateInput(row.expiresAt))}">
    </label>
  `;
  els.marqueeList.appendChild(node);
}

async function saveMarquee() {
  state.marquee = [...els.marqueeList.querySelectorAll(".marquee-row")].map((row) => ({
    active: row.querySelector('[data-key="active"]').value === "TRUE",
    text: row.querySelector('[data-key="text"]').value.trim(),
    url: row.querySelector('[data-key="url"]').value.trim(),
    expiresAt: row.querySelector('[data-key="expiresAt"]').value,
  })).filter((row) => row.text);

  els.marqueeDialog.close();
  try {
    if (!state.demoMode) await apiRequest("admin_save_marquee", { marquee: state.marquee });
    toast("跑馬燈已儲存");
  } catch (error) {
    toast(error.message);
  }
}

async function apiRequest(action, payload) {
  const response = await fetch(CONFIG.apiBaseUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action,
      token: state.token,
      payload,
    }),
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.message || "操作失敗");
  return result.data || {};
}

function getField(name) {
  return document.getElementById(`field-${name}`).value.trim();
}

function setField(name, value) {
  document.getElementById(`field-${name}`).value = value ?? "";
}

function formatPrice(value) {
  const num = Number(String(value || "").replace(/[^\d]/g, ""));
  return num ? `NT$ ${num.toLocaleString("zh-TW")}` : "電洽";
}

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function refreshIcons() {
  window.lucide?.createIcons();
}

function toCamel(id) {
  return id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
