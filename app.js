const CONFIG = {
  apiBaseUrl: "https://script.google.com/macros/s/AKfycbwWislHB2kK-MLyLs7fhWT3wbcjxThJYxUDmeaj_zyGE0NYLOny8F1fGb2tBEWIfE7D/exec",
  googleClientId: "424188945884-c9vlb5ck5cqk409jetlo03nvlbqcaftj.apps.googleusercontent.com",
};

const state = {
  token: "",
  user: null,
  products: [],
  marquee: [],
  filter: "all",
  query: "",
  customBrands: [],
  customSaleLabels: [],
  uploadedImages: new Map(),
};

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
    "auth-retry",
    "auth-message",
    "user-label",
    "sync-button",
    "search-input",
    "product-list",
    "empty-state",
    "count-live",
    "count-paused",
    "count-sale",
    "sale-breakdown",
    "add-product-button",
    "marquee-button",
    "add-brand-option",
    "add-sale-option",
    "product-dialog",
    "product-form",
    "dialog-title",
    "save-product-button",
    "marquee-dialog",
    "marquee-list",
    "add-marquee-row",
    "save-marquee-button",
    "toast",
    "dialog-toast",
  ].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });
}

function bindEvents() {
  els.authRetry.addEventListener("click", setupAuth);
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
      renderCounts();
      renderProducts();
    });
  });
  els.addProductButton.addEventListener("click", () => openProductDialog());
  els.marqueeButton.addEventListener("click", openMarqueeDialog);
  els.addBrandOption.addEventListener("click", () => addOption("brand"));
  els.addSaleOption.addEventListener("click", () => addOption("saleLabel"));
  els.saveProductButton.addEventListener("click", saveProduct);
  els.addMarqueeRow.addEventListener("click", () => addMarqueeRow({ active: true }));
  els.saveMarqueeButton.addEventListener("click", saveMarquee);
  ["market-price", "sale-price", "special-price"].forEach((name) => {
    document.getElementById(`field-${name}`).addEventListener("input", updateDiscountFields);
  });
  document.querySelectorAll("[data-clear-field]").forEach((button) => {
    button.addEventListener("click", () => clearTextField(button.dataset.clearField));
  });
  document.querySelectorAll("[data-clear-image]").forEach((button) => {
    button.addEventListener("click", () => clearImageField(button.dataset.clearImage));
  });
}

async function setupAuth() {
  if (!isConfigured()) {
    els.authMessage.textContent = "尚未完成後台設定，請確認 API 與 Google Client ID。";
    return;
  }

  els.authRetry.classList.add("hidden");
  els.googleLogin.innerHTML = "";
  els.authMessage.textContent = "正在載入 Google 登入...";

  const googleIdentity = await loadGoogleIdentity();
  if (!googleIdentity) {
    els.authRetry.classList.remove("hidden");
    els.authMessage.textContent = "Google 登入載入失敗，請點重新載入登入，或換 Safari/Chrome 開啟。";
    return;
  }

  googleIdentity.initialize({
    client_id: CONFIG.googleClientId,
    callback: async (response) => {
      state.token = response.credential;
      await loadAdminData();
    },
  });

  googleIdentity.renderButton(els.googleLogin, {
    theme: "outline",
    size: "large",
    width: "100%",
    text: "signin_with",
    shape: "rectangular",
  });

  els.authMessage.textContent = "";
}

function isConfigured() {
  return !CONFIG.apiBaseUrl.includes("PASTE_") && !CONFIG.googleClientId.includes("PASTE_");
}

async function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return window.google.accounts.id;
  await injectGoogleIdentityScript();
  return waitForGoogleIdentity();
}

function injectGoogleIdentityScript() {
  return new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
      setTimeout(resolve, 2500);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

function waitForGoogleIdentity() {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        window.clearInterval(timer);
        resolve(window.google.accounts.id);
        return;
      }
      if (Date.now() - startedAt > 30000) {
        window.clearInterval(timer);
        resolve(null);
      }
    }, 120);
  });
}

async function loadAdminData() {
  try {
    const result = await apiRequest("admin_list", {});
    state.products = result.products || [];
    state.marquee = result.marquee || [];
    state.user = result.admin || state.user;
    showApp();
    renderAll();
    toast("已同步", "success");
  } catch (error) {
    els.authMessage.textContent = error.message;
    toast(error.message, "error");
  }
}

function showApp() {
  els.authView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  els.userLabel.textContent = state.user?.email ? `登入：${state.user.email}` : "已登入";
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
  renderSaleBreakdown();
}

function renderSaleBreakdown() {
  const counts = new Map();
  state.products.forEach((product) => {
    if (!product.saleLabel) return;
    counts.set(product.saleLabel, (counts.get(product.saleLabel) || 0) + 1);
  });

  const items = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hant"));
  els.saleBreakdown.innerHTML = items.map(([label, count]) => (
    `<button class="sale-count ${state.filter === `sale:${label}` ? "active" : ""}" type="button" data-sale-filter="${escapeAttr(label)}">${escapeHtml(label)}<strong>${count}</strong></button>`
  )).join("");
  els.saleBreakdown.classList.toggle("hidden", items.length === 0);
  els.saleBreakdown.querySelectorAll("[data-sale-filter]").forEach((button) => {
    button.addEventListener("click", () => applySaleFilter(button.dataset.saleFilter));
  });
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
          <span class="product-id">#${escapeHtml(product.id)}</span>
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
      (state.filter === "sale" && product.saleLabel) ||
      (state.filter.startsWith("sale:") && product.saleLabel === state.filter.slice(5));

    const haystack = [product.name, product.brand, product.saleLabel, product.size]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesFilter && (!state.query || haystack.includes(state.query));
  }).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
}

function applySaleFilter(label) {
  state.filter = state.filter === `sale:${label}` ? "all" : `sale:${label}`;
  document.querySelectorAll(".segment").forEach((item) => {
    item.classList.toggle("active", item.dataset.filter === state.filter);
  });
  renderCounts();
  renderProducts();
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
  populateOptionSelects(value);
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
  state.uploadedImages.clear();
  for (let index = 1; index <= 5; index += 1) {
    setField(`image-${index}`, value.images?.[index - 1] || "");
    const fileInput = document.getElementById(`file-image-${index}`);
    if (fileInput) {
      fileInput.value = "";
      delete fileInput.dataset.uploadedSignature;
      delete fileInput.dataset.uploadedUrl;
    }
  }
  updateDiscountFields();
  els.productDialog.showModal();
}

async function saveProduct() {
  if (!els.productForm.reportValidity()) return;
  try {
    await uploadSelectedImages();
  } catch (error) {
    toast(error.message, "error");
    return;
  }
  const product = readProductForm();
  if (!product.images[0]) {
    toast("圖片 1 為必填，請貼網址或上傳圖片", "error");
    return;
  }
  const index = state.products.findIndex((item) => String(item.id) === String(product.id));
  if (index >= 0) state.products[index] = product;
  else state.products.unshift(product);
  rememberOption("brand", product.brand);
  rememberOption("saleLabel", product.saleLabel);
  els.productDialog.close();
  renderAll();
  await persistProduct(product, "商品已儲存");
}

async function persistProduct(product, message) {
  try {
    await apiRequest("admin_save_product", { product });
    toast(message, "success");
  } catch (error) {
    toast(error.message, "error");
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

function populateOptionSelects(product = {}) {
  populateSelect(document.getElementById("field-brand"), getBrandOptions(), product.brand, "選擇品牌");
  populateSelect(document.getElementById("field-sale-label"), getSaleOptions(), product.saleLabel, "無活動");
}

function populateSelect(select, options, value, emptyLabel) {
  const normalizedValue = value || "";
  const allOptions = [...new Set(options.filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  if (normalizedValue && !allOptions.includes(normalizedValue)) allOptions.unshift(normalizedValue);
  select.innerHTML = `<option value="">${emptyLabel}</option>` + allOptions.map((option) => (
    `<option value="${escapeAttr(option)}">${escapeHtml(option)}</option>`
  )).join("");
  select.value = normalizedValue;
}

function updateDiscountFields() {
  const marketPrice = parseMoney(getField("market-price"));
  const salePrice = parseMoney(getField("sale-price"));
  const specialPrice = parseMoney(getField("special-price"));
  const discount = marketPrice > 0 && salePrice > 0 ? roundDiscount(salePrice / marketPrice) : "";
  const specialDiscount = salePrice > 0 && specialPrice > 0 ? roundDiscount(specialPrice / salePrice) : "";
  setField("discount", discount);
  setField("special-discount", specialDiscount);
  document.getElementById("discount-hint").textContent = discount
    ? `特價 ${salePrice.toLocaleString("zh-TW")} ÷ 專櫃價 ${marketPrice.toLocaleString("zh-TW")} = ${discount}`
    : "特價 ÷ 專櫃價";
  document.getElementById("special-discount-hint").textContent = specialDiscount
    ? `特賣金額 ${specialPrice.toLocaleString("zh-TW")} ÷ 特價 ${salePrice.toLocaleString("zh-TW")} = ${specialDiscount}`
    : "特賣金額 ÷ 特價";
}

function roundDiscount(value) {
  return Math.round(value * 100) / 100;
}

function parseMoney(value) {
  return Number(String(value || "").replace(/[^\d.]/g, "")) || 0;
}

function getBrandOptions() {
  return [...state.products.map((product) => product.brand), ...state.customBrands].filter(Boolean);
}

function getSaleOptions() {
  return [...state.products.map((product) => product.saleLabel), ...state.customSaleLabels].filter(Boolean);
}

function addOption(type) {
  const isBrand = type === "brand";
  const label = window.prompt(isBrand ? "新增品牌名稱" : "新增活動名稱");
  const value = label?.trim();
  if (!value) return;
  rememberOption(type, value);
  if (isBrand) {
    populateSelect(document.getElementById("field-brand"), getBrandOptions(), value, "選擇品牌");
  } else {
    populateSelect(document.getElementById("field-sale-label"), getSaleOptions(), value, "無活動");
  }
  refreshIcons();
}

function rememberOption(type, value) {
  if (!value) return;
  const target = type === "brand" ? state.customBrands : state.customSaleLabels;
  if (!target.includes(value)) target.push(value);
}

async function uploadSelectedImages() {
  for (let index = 1; index <= 5; index += 1) {
    const fileInput = document.getElementById(`file-image-${index}`);
    const file = fileInput?.files?.[0];
    if (!file) continue;
    const signature = fileSignature(file);
    const currentUrl = getField(`image-${index}`);

    if (fileInput.dataset.uploadedSignature === signature && fileInput.dataset.uploadedUrl && currentUrl === fileInput.dataset.uploadedUrl) {
      toast(`圖片 ${index} 已上傳完成；若要換圖，請重新選取新檔案。`, "info");
      continue;
    }

    toast(`正在上傳圖片 ${index}...`, "info");
    const image = await prepareImageUpload(file);
    const result = await apiRequest("admin_upload_image", image);
    setField(`image-${index}`, result.url);
    fileInput.dataset.uploadedSignature = signature;
    fileInput.dataset.uploadedUrl = result.url;
    fileInput.value = "";
    toast(`圖片 ${index} 上傳完成`, "success");
  }
}

async function clearTextField(name) {
  setField(name, "");
  toast("欄位已清空，記得儲存商品。", "info");
}

async function clearImageField(index) {
  const fieldName = `image-${index}`;
  const url = getField(fieldName);
  const fileId = extractDriveFileId(url);
  setField(fieldName, "");
  const fileInput = document.getElementById(`file-image-${index}`);
  if (fileInput) {
    fileInput.value = "";
    delete fileInput.dataset.uploadedSignature;
    delete fileInput.dataset.uploadedUrl;
  }
  if (!fileId) {
    toast(`圖片 ${index} 已清空，記得儲存商品。`, "info");
    return;
  }
  try {
    await apiRequest("admin_delete_image", { fileId });
    toast(`圖片 ${index} 已清空，Drive 檔案已移到垃圾桶。`, "success");
  } catch (error) {
    toast(`圖片已清空，但 Drive 刪除失敗：${error.message}`, "error");
  }
}

function fileSignature(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function extractDriveFileId(url) {
  const value = String(url || "");
  return value.match(/[?&]id=([^&]+)/)?.[1] || value.match(/\/d\/([^/]+)/)?.[1] || "";
}

async function prepareImageUpload(file) {
  const dataUrl = await resizeImage(file, 1600, 0.84);
  const [meta, base64] = dataUrl.split(",");
  const mimeType = meta.match(/data:(.*);base64/)?.[1] || "image/jpeg";
  return {
    fileName: file.name.replace(/\.[^.]+$/, "") + ".jpg",
    mimeType,
    base64,
  };
}

function resizeImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("圖片讀取失敗"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("圖片格式無法讀取"));
      img.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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
      <div class="clearable-field">
        <input data-key="text" value="${escapeAttr(row.text || "")}">
        <button class="mini-action clear-action" type="button" data-clear-marquee="text" aria-label="清空文案">
          <i data-lucide="x"></i>
        </button>
      </div>
    </label>
    <label>
      <span>連結</span>
      <div class="clearable-field">
        <input data-key="url" type="url" value="${escapeAttr(row.url || "")}">
        <button class="mini-action clear-action" type="button" data-clear-marquee="url" aria-label="清空連結">
          <i data-lucide="x"></i>
        </button>
      </div>
    </label>
    <label>
      <span>到期日</span>
      <div class="clearable-field">
        <input data-key="expiresAt" type="date" value="${escapeAttr(formatDateInput(row.expiresAt))}">
        <button class="mini-action clear-action" type="button" data-clear-marquee="expiresAt" aria-label="清空到期日">
          <i data-lucide="x"></i>
        </button>
      </div>
    </label>
    <div class="marquee-row-actions">
      <button class="secondary-action danger-action" type="button" data-delete-marquee>
        <i data-lucide="trash-2"></i>
        刪除這則跑馬燈
      </button>
    </div>
  `;
  node.querySelectorAll("[data-clear-marquee]").forEach((button) => {
    button.addEventListener("click", () => {
      node.querySelector(`[data-key="${button.dataset.clearMarquee}"]`).value = "";
      toast("跑馬燈欄位已清空，記得儲存。", "info");
    });
  });
  node.querySelector("[data-delete-marquee]").addEventListener("click", () => {
    node.remove();
    toast("跑馬燈已刪除，記得儲存。", "warn");
  });
  els.marqueeList.appendChild(node);
  refreshIcons();
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
    await apiRequest("admin_save_marquee", { marquee: state.marquee });
    toast("跑馬燈已儲存", "success");
  } catch (error) {
    toast(error.message, "error");
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

function toast(message, type = "info") {
  const target = getToastTarget();
  target.textContent = message;
  target.className = `${target.id === "dialog-toast" ? "dialog-toast" : "toast"} show ${type}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    target.className = target.id === "dialog-toast" ? "dialog-toast" : "toast";
  }, 3600);
}

function getToastTarget() {
  const productOpen = els.productDialog?.open;
  const marqueeOpen = els.marqueeDialog?.open;
  return productOpen || marqueeOpen ? els.dialogToast : els.toast;
}

function refreshIcons() {
  window.lucide?.createIcons();
}

function toCamel(id) {
  return id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
