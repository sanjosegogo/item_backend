const CONFIG = {
  apiBaseUrl: "https://script.google.com/macros/s/AKfycbwaSKimOWvuUWTVNOojwwBryLr5yLLX5TIWzpPFTolKmCHQlgl1hNqGvpgu4C6QC4ei/exec",
  googleClientId: "424188945884-c9vlb5ck5cqk409jetlo03nvlbqcaftj.apps.googleusercontent.com",
};

const state = {
  token: "",
  user: null,
  products: [],
  marquee: [],
  brands: [],
  saleLabels: [],
  categories: [],
  themes: [],
  adminUsers: [],
  adminLogs: [],
  loginLogs: [],
  permissions: {},
  catalogTab: "saleLabels",
  permissionTab: "users",
  filter: "all",
  saleFilter: "",
  query: "",
  pendingQuery: "",
  logQuery: "",
  pendingLogQuery: "",
  loginLogQuery: "",
  pendingLoginLogQuery: "",
  productRenderLimit: 0,
  customBrands: [],
  customSaleLabels: [],
  customCategories: [],
  loginRecorded: false,
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
    "auth-view", "app-view", "google-login", "auth-retry", "auth-message", "user-label", "sync-button",
    "search-input", "product-list", "empty-state", "count-live", "count-paused", "count-sale", "sale-breakdown",
    "search-button", "sale-filter-select", "add-product-button", "marquee-button", "catalog-button", "theme-button", "permission-button",
    "archive-product-button", "add-brand-option", "add-sale-option", "add-category-option", "product-dialog", "product-form", "dialog-title",
    "save-product-button", "marquee-dialog", "marquee-list", "add-marquee-row", "save-marquee-button",
    "catalog-dialog", "catalog-list", "add-catalog-row", "save-catalog-button", "theme-dialog", "theme-list",
    "add-theme-row", "save-theme-button", "permission-dialog", "permission-scope", "permission-users-panel",
    "permission-logs-panel", "permission-login-panel", "permission-user-list", "permission-log-list",
    "permission-login-list", "log-search-input", "log-search-button", "login-log-search-input", "login-log-search-button",
    "add-permission-user", "save-permission-button", "toast", "dialog-toast",
  ].forEach((id) => {
    els[toCamel(id)] = document.getElementById(id);
  });
}

function bindEvents() {
  els.authRetry.addEventListener("click", setupAuth);
  els.syncButton.addEventListener("click", loadAdminData);
  els.searchInput.addEventListener("input", (event) => {
    state.pendingQuery = event.target.value.trim().toLowerCase();
  });
  els.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyProductSearch();
    }
  });
  els.searchButton.addEventListener("click", applyProductSearch);
  els.saleFilterSelect.addEventListener("change", (event) => {
    state.saleFilter = event.target.value;
    resetProductRenderLimit();
    renderProducts();
  });
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      resetProductRenderLimit();
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderAll();
    });
  });
  els.addProductButton.addEventListener("click", () => openProductDialog());
  els.marqueeButton.addEventListener("click", openMarqueeDialog);
  els.catalogButton.addEventListener("click", openCatalogDialog);
  els.themeButton.addEventListener("click", openThemeDialog);
  els.permissionButton.addEventListener("click", openPermissionDialog);
  els.addBrandOption.addEventListener("click", () => addOption("brand"));
  els.addSaleOption.addEventListener("click", () => addOption("saleLabel"));
  els.addCategoryOption.addEventListener("click", () => addOption("category"));
  els.saveProductButton.addEventListener("click", saveProduct);
  els.archiveProductButton.addEventListener("click", archiveCurrentProduct);
  els.addMarqueeRow.addEventListener("click", () => addMarqueeRow({ active: true }));
  els.saveMarqueeButton.addEventListener("click", saveMarquee);
  els.addCatalogRow.addEventListener("click", addCatalogRow);
  els.saveCatalogButton.addEventListener("click", saveCatalogs);
  els.addThemeRow.addEventListener("click", () => addThemeRow(makeTheme("新配色", false)));
  els.saveThemeButton.addEventListener("click", saveThemes);
  els.addPermissionUser.addEventListener("click", addPermissionUser);
  els.savePermissionButton.addEventListener("click", savePermissions);
  document.querySelectorAll("[data-catalog-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.catalogTab = button.dataset.catalogTab;
      document.querySelectorAll("[data-catalog-tab]").forEach((item) => item.classList.toggle("active", item === button));
      renderCatalogRows();
    });
  });
  document.querySelectorAll("[data-permission-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.permissionTab = button.dataset.permissionTab;
      document.querySelectorAll("[data-permission-tab]").forEach((item) => item.classList.toggle("active", item === button));
      renderPermissionPanels();
    });
  });
  els.logSearchInput.addEventListener("input", (event) => state.pendingLogQuery = event.target.value.trim().toLowerCase());
  els.logSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyLogSearch();
    }
  });
  els.logSearchButton.addEventListener("click", applyLogSearch);
  els.loginLogSearchInput.addEventListener("input", (event) => state.pendingLoginLogQuery = event.target.value.trim().toLowerCase());
  els.loginLogSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyLoginLogSearch();
    }
  });
  els.loginLogSearchButton.addEventListener("click", applyLoginLogSearch);
  ["market-price", "sale-price", "special-price"].forEach((name) => {
    document.getElementById(`field-${name}`).addEventListener("input", updateDiscountFields);
  });
  document.querySelectorAll("[data-clear-field]").forEach((button) => {
    button.addEventListener("click", () => clearTextField(button.dataset.clearField));
  });
  document.querySelectorAll("[data-clear-image]").forEach((button) => {
    button.addEventListener("click", () => clearImageField(button.dataset.clearImage));
  });
  for (let index = 1; index <= 5; index += 1) {
    document.getElementById(`field-image-${index}`).addEventListener("input", () => updateImagePreview(index));
    document.getElementById(`file-image-${index}`).addEventListener("change", () => handleImageFileSelected(index));
  }
}

function applyProductSearch() {
  state.query = state.pendingQuery;
  resetProductRenderLimit();
  renderProducts();
}

async function setupAuth() {
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
  googleIdentity.renderButton(els.googleLogin, { theme: "outline", size: "large", width: "100%", text: "signin_with", shape: "rectangular" });
  els.authMessage.textContent = "";
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
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", resolve, { once: true });
      setTimeout(resolve, 2500);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = resolve;
    document.head.appendChild(script);
  });
}

function waitForGoogleIdentity() {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (window.google?.accounts?.id || Date.now() - startedAt > 30000) {
        clearInterval(timer);
        resolve(window.google?.accounts?.id || null);
      }
    }, 120);
  });
}

async function loadAdminData() {
  try {
    const result = await apiRequest("admin_list", {});
    state.products = result.products || [];
    state.marquee = result.marquee || [];
    state.brands = normalizeCatalog(result.brands || [], "brand");
    state.saleLabels = normalizeCatalog(result.saleLabels || [], "saleLabel");
    state.categories = normalizeCatalog(result.categories || [], "category");
    state.themes = normalizeThemes(result.themes || []);
    state.user = result.admin || state.user;
    state.permissions = result.admin?.permissions || {};
    showApp();
    renderAll();
    recordLoginOnce();
    toast("已同步", "success");
  } catch (error) {
    els.authMessage.textContent = error.message;
    toast(error.message, "error");
  }
}

function showApp() {
  els.authView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  const roleText = state.user?.roleLabel ? ` / ${state.user.roleLabel}` : "";
  els.userLabel.textContent = state.user?.email ? `登入：${state.user.email}${roleText}` : "已登入";
  els.permissionButton.classList.toggle("hidden", !state.permissions.canManageUsers);
}

function renderAll() {
  renderCounts();
  renderSaleFilterOptions();
  renderProducts();
  refreshIcons();
}

function renderCounts() {
  els.countLive.textContent = state.products.filter((item) => item.active && !item.archived).length;
  els.countPaused.textContent = state.products.filter((item) => !item.active && !item.archived).length;
  els.countSale.textContent = state.products.filter((item) => item.saleLabel && !item.archived).length;
  renderSaleBreakdown();
}

function renderSaleBreakdown() {
  const counts = new Map();
  state.products.forEach((product) => {
    if (!product.saleLabel || product.archived) return;
    counts.set(product.saleLabel, (counts.get(product.saleLabel) || 0) + 1);
  });
  const items = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hant"));
  els.saleBreakdown.innerHTML = items.length ? `<div class="sale-breakdown-head"><span>活動統計</span><strong>全部 ${items.reduce((sum, item) => sum + item[1], 0)} 項</strong></div><div class="sale-count-scroll">${items.map(([label, count]) => `<span class="sale-count"><span>${escapeHtml(label)}</span><strong>${count}項</strong></span>`).join("")}</div>` : "";
  els.saleBreakdown.classList.toggle("hidden", items.length === 0);
}

function renderSaleFilterOptions() {
  const labels = [...new Set(state.products.filter((product) => product.saleLabel && !product.archived).map((product) => product.saleLabel))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  const current = state.saleFilter;
  els.saleFilterSelect.innerHTML = '<option value="">全部活動</option><option value="__none__">無活動</option>' + labels.map((label) => `<option value="${escapeAttr(label)}">${escapeHtml(label)}</option>`).join("");
  els.saleFilterSelect.value = labels.includes(current) || current === "__none__" ? current : "";
  state.saleFilter = els.saleFilterSelect.value;
}

function renderProducts() {
  const products = filteredProducts();
  if (!state.productRenderLimit) resetProductRenderLimit();
  const visibleProducts = products.slice(0, state.productRenderLimit);
  els.productList.innerHTML = "";
  els.emptyState.classList.toggle("hidden", products.length > 0);
  visibleProducts.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <img class="product-thumb" src="${escapeAttr(product.images?.[0] || "")}" alt="" loading="lazy" decoding="async">
      <div class="product-main">
        <div class="product-line"><h2 class="product-title">${escapeHtml(product.name)}</h2><span class="product-id">#${escapeHtml(product.id)}</span></div>
        ${product.productFeature ? `<p class="product-feature-line">${escapeHtml(product.productFeature)}</p>` : ""}
        <p class="product-price">${formatPrice(product.specialPrice || product.salePrice)}</p>
        <div class="product-meta">
          <span class="pill ${product.active ? "live" : "paused"}">${product.active ? "上架" : "下架"}</span>
          ${product.archived ? '<span class="pill paused">封存</span>' : ""}
          <span class="pill">${escapeHtml(product.category || "鞋包配飾")}</span>
          <span class="pill">${escapeHtml(product.brand || "其他")}</span>
          ${product.saleLabel ? `<span class="pill sale">${escapeHtml(product.saleLabel)}</span>` : ""}
        </div>
        <div class="card-actions">
          <button class="toggle-button ${product.active ? "live" : "paused"}" type="button">${product.archived ? "恢復商品" : product.active ? "目前上架" : "目前下架"}</button>
          <button class="edit-button" type="button" aria-label="編輯"><i data-lucide="pencil"></i></button>
        </div>
      </div>`;
    card.querySelector(".toggle-button").addEventListener("click", () => toggleProduct(product.id));
    card.querySelector(".edit-button").addEventListener("click", () => openProductDialog(product));
    els.productList.appendChild(card);
  });
  if (products.length > visibleProducts.length) {
    const more = document.createElement("button");
    more.className = "load-more-button";
    more.type = "button";
    more.textContent = `再顯示 ${Math.min(getProductRenderStep(), products.length - visibleProducts.length)} 件商品`;
    more.addEventListener("click", () => {
      state.productRenderLimit += getProductRenderStep();
      renderProducts();
    });
    els.productList.appendChild(more);
  }
  refreshIcons();
}

function resetProductRenderLimit() {
  state.productRenderLimit = getProductRenderStep();
}

function getProductRenderStep() {
  return window.matchMedia("(max-width: 680px)").matches ? 24 : 60;
}

function filteredProducts() {
  return state.products.filter((product) => {
    const matchesFilter = state.filter === "all" || (state.filter === "live" && product.active && !product.archived) || (state.filter === "paused" && !product.active && !product.archived) || (state.filter === "archived" && product.archived);
    const matchesSale = !state.saleFilter || (state.saleFilter === "__none__" && !product.saleLabel) || product.saleLabel === state.saleFilter;
    const haystack = [product.name, product.productFeature, product.category, product.brand, product.saleLabel, product.size].filter(Boolean).join(" ").toLowerCase();
    return matchesFilter && matchesSale && (state.filter === "archived" || !product.archived) && (!state.query || haystack.includes(state.query));
  }).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
}

async function toggleProduct(id) {
  const product = state.products.find((item) => String(item.id) === String(id));
  if (!product) return;
  if (product.archived) {
    product.archived = false;
    product.active = false;
    renderAll();
    await persistProduct(product, "商品已恢復為下架狀態");
    return;
  }
  product.active = !product.active;
  renderAll();
  await persistProduct(product, "上下架已更新");
}

async function persistProduct(product, message) {
  try {
    await apiRequest("admin_save_product", { product });
    toast(message, "success");
  } catch (error) {
    toast(error.message, "error");
  }
}

function openProductDialog(product = null) {
  const isNew = !product;
  const nextId = Math.max(0, ...state.products.map((item) => Number(item.id) || 0)) + 1;
  const value = product || { id: nextId, active: true, category: "鞋包配飾", saleLabel: "", discount: "", specialDiscount: "", name: "", productFeature: "", marketPrice: "", salePrice: "", specialPrice: "", size: "F", brand: "", postUrl: "", instagramUrl: "", facebookUrl: "", internalNote: "", archived: false, images: [] };
  els.dialogTitle.textContent = isNew ? "新增商品" : "編輯商品";
  populateOptionSelects(value);
  setField("id", value.id);
  setField("internal-note", value.internalNote);
  setField("active", value.active ? "TRUE" : "FALSE");
  setField("category", value.category || "鞋包配飾");
  setField("brand", value.brand);
  setField("name", value.name);
  setField("product-feature", value.productFeature);
  setField("size", value.size);
  setField("sale-label", value.saleLabel);
  setField("market-price", value.marketPrice);
  setField("sale-price", value.salePrice);
  setField("special-price", value.specialPrice);
  setField("discount", value.discount);
  setField("special-discount", value.specialDiscount);
  setField("post-url", value.postUrl);
  setField("instagram-url", value.instagramUrl);
  setField("facebook-url", value.facebookUrl);
  els.archiveProductButton.classList.toggle("hidden", isNew);
  els.archiveProductButton.innerHTML = value.archived ? '<i data-lucide="archive-restore"></i> 解除封存' : '<i data-lucide="archive"></i> 封存商品';
  for (let index = 1; index <= 5; index += 1) {
    setField(`image-${index}`, value.images?.[index - 1] || "");
    const fileInput = document.getElementById(`file-image-${index}`);
    fileInput.value = "";
    delete fileInput.dataset.uploadedSignature;
    delete fileInput.dataset.uploadedUrl;
    updateImagePreview(index);
  }
  updateDiscountFields();
  els.productDialog.showModal();
  refreshIcons();
}

async function saveProduct() {
  if (!els.productForm.reportValidity()) return;
  setButtonState(els.saveProductButton, "saving", "儲存中...");
  try {
    await uploadSelectedImages(els.saveProductButton, readProductForm());
    const product = readProductForm();
    if (!product.images[0]) throw new Error("缺少圖片 1");
    if (product.archived) product.active = false;
    await apiRequest("admin_save_product", { product });
    const index = state.products.findIndex((item) => String(item.id) === String(product.id));
    if (index >= 0) state.products[index] = product;
    else state.products.unshift(product);
    rememberOption("category", product.category);
    rememberOption("brand", product.brand);
    rememberOption("saleLabel", product.saleLabel);
    renderAll();
    setButtonState(els.saveProductButton, "success", "已儲存");
    setTimeout(() => {
      resetButtonState(els.saveProductButton, "儲存");
      els.productDialog.close();
    }, 700);
  } catch (error) {
    setButtonState(els.saveProductButton, "error", error.message.includes("圖片") ? error.message : "儲存失敗");
    toast(error.message, "error");
    setTimeout(() => resetButtonState(els.saveProductButton, "儲存"), 1800);
  }
}

function readProductForm() {
  const existing = state.products.find((item) => String(item.id) === String(getField("id")));
  return {
    id: getField("id"),
    active: getField("active") === "TRUE",
    saleLabel: getField("sale-label"),
    discount: getField("discount"),
    specialDiscount: getField("special-discount"),
    name: getField("name"),
    productFeature: getField("product-feature"),
    marketPrice: getField("market-price"),
    salePrice: getField("sale-price"),
    specialPrice: getField("special-price"),
    size: getField("size") || "F",
    category: getField("category") || "鞋包配飾",
    brand: getField("brand") || "其他",
    postUrl: getField("post-url"),
    instagramUrl: getField("instagram-url"),
    facebookUrl: getField("facebook-url"),
    internalNote: getField("internal-note"),
    archived: existing?.archived || false,
    images: [1, 2, 3, 4, 5].map((index) => getField(`image-${index}`)).filter(Boolean),
  };
}

async function archiveCurrentProduct() {
  const product = state.products.find((item) => String(item.id) === String(getField("id")));
  if (!product) return;
  if (!product.archived && !window.confirm("封存後商品會立即下架，並從一般商品列表隱藏。確定要封存嗎？")) return;
  product.archived = !product.archived;
  product.active = false;
  setButtonState(els.archiveProductButton, "saving", product.archived ? "封存中..." : "恢復中...");
  await persistProduct(product, product.archived ? "商品已封存並下架" : "商品已恢復為下架狀態");
  resetButtonState(els.archiveProductButton, "封存商品");
  els.productDialog.close();
  renderAll();
}

function populateOptionSelects(product = {}) {
  populateSelect(document.getElementById("field-category"), getCategoryOptions(), product.category || "鞋包配飾", "選擇分類");
  populateSelect(document.getElementById("field-brand"), getBrandOptions(), product.brand, "選擇品牌");
  populateSelect(document.getElementById("field-sale-label"), getSaleOptions(), product.saleLabel, "無活動");
}

function populateSelect(select, options, value, emptyLabel) {
  const allOptions = [...new Set(options.filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  if (value && !allOptions.includes(value)) allOptions.unshift(value);
  select.innerHTML = `<option value="">${emptyLabel}</option>` + allOptions.map((option) => `<option value="${escapeAttr(option)}">${escapeHtml(option)}</option>`).join("");
  select.value = value || "";
}

function getBrandOptions() {
  return [...state.brands.filter((item) => item.active).map((item) => item.name), ...state.products.map((product) => product.brand), ...state.customBrands].filter(Boolean);
}

function getSaleOptions() {
  return [...state.saleLabels.filter((item) => item.active).map((item) => item.name), ...state.products.map((product) => product.saleLabel), ...state.customSaleLabels].filter(Boolean);
}

function getCategoryOptions() {
  return [...state.categories.filter((item) => item.active).map((item) => item.name), ...state.products.map((product) => product.category), ...state.customCategories, "鞋包配飾"].filter(Boolean);
}

function addOption(type) {
  const labelMap = { brand: "新增品牌名稱", saleLabel: "新增活動名稱", category: "新增商品分類" };
  const value = window.prompt(labelMap[type] || "新增名稱")?.trim();
  if (!value) return;
  rememberOption(type, value);
  if (type === "brand") populateSelect(document.getElementById("field-brand"), getBrandOptions(), value, "選擇品牌");
  else if (type === "category") populateSelect(document.getElementById("field-category"), getCategoryOptions(), value, "選擇分類");
  else populateSelect(document.getElementById("field-sale-label"), getSaleOptions(), value, "無活動");
  refreshIcons();
}

function rememberOption(type, value) {
  if (!value) return;
  const target = type === "brand" ? state.customBrands : type === "category" ? state.customCategories : state.customSaleLabels;
  if (!target.includes(value)) target.push(value);
  const catalog = type === "brand" ? state.brands : type === "category" ? state.categories : state.saleLabels;
  if (!catalog.some((item) => item.name === value)) catalog.push(makeCatalogItem(value, catalog.length + 1));
}

function updateDiscountFields() {
  const marketPrice = parseMoney(getField("market-price"));
  const salePrice = parseMoney(getField("sale-price"));
  const specialPrice = parseMoney(getField("special-price"));
  const discount = marketPrice > 0 && salePrice > 0 ? roundDiscount(salePrice / marketPrice) : "";
  const specialDiscount = salePrice > 0 && specialPrice > 0 ? roundDiscount(specialPrice / salePrice) : "";
  setField("discount", discount);
  setField("special-discount", specialDiscount);
  document.getElementById("discount-hint").textContent = discount ? `特價 ${salePrice.toLocaleString("zh-TW")} ÷ 專櫃價 ${marketPrice.toLocaleString("zh-TW")} = ${discount}` : "特價 ÷ 專櫃價";
  document.getElementById("special-discount-hint").textContent = specialDiscount ? `特賣金額 ${specialPrice.toLocaleString("zh-TW")} ÷ 特價 ${salePrice.toLocaleString("zh-TW")} = ${specialDiscount}` : "特賣金額 ÷ 特價";
}

function roundDiscount(value) {
  return Math.round(value * 100) / 100;
}

function parseMoney(value) {
  return Number(String(value || "").replace(/[^\d.]/g, "")) || 0;
}

async function uploadSelectedImages(button, product) {
  for (let index = 1; index <= 5; index += 1) {
    const fileInput = document.getElementById(`file-image-${index}`);
    const file = fileInput?.files?.[0];
    if (!file) continue;
    const signature = `${file.name}-${file.size}-${file.lastModified}`;
    const currentUrl = getField(`image-${index}`);
    if (fileInput.dataset.uploadedSignature === signature && fileInput.dataset.uploadedUrl && currentUrl === fileInput.dataset.uploadedUrl) {
      setButtonState(button, "saving", `圖片 ${index} 已上傳`);
      continue;
    }
    setButtonState(button, "saving", `上傳圖片 ${index}...`);
    const image = await prepareImageUpload(file, index, product);
    const result = await apiRequest("admin_upload_image", image);
    setField(`image-${index}`, result.url);
    updateImagePreview(index);
    fileInput.dataset.uploadedSignature = signature;
    fileInput.dataset.uploadedUrl = result.url;
    fileInput.value = "";
  }
}

function handleImageFileSelected(index) {
  const file = document.getElementById(`file-image-${index}`)?.files?.[0];
  if (!file) return;
  const preview = document.getElementById(`preview-image-${index}`);
  preview.src = URL.createObjectURL(file);
  preview.classList.remove("hidden");
  const fileInput = document.getElementById(`file-image-${index}`);
  delete fileInput.dataset.uploadedSignature;
  delete fileInput.dataset.uploadedUrl;
}

function updateImagePreview(index) {
  const preview = document.getElementById(`preview-image-${index}`);
  const url = getField(`image-${index}`);
  if (!url) {
    preview.removeAttribute("src");
    preview.classList.add("hidden");
    return;
  }
  preview.src = url;
  preview.classList.remove("hidden");
}

async function clearTextField(name) {
  setField(name, "");
  toast("欄位已清空，記得儲存商品。", "info");
}

async function clearImageField(index) {
  const url = getField(`image-${index}`);
  const fileId = extractDriveFileId(url);
  setField(`image-${index}`, "");
  updateImagePreview(index);
  const fileInput = document.getElementById(`file-image-${index}`);
  fileInput.value = "";
  delete fileInput.dataset.uploadedSignature;
  delete fileInput.dataset.uploadedUrl;
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

function extractDriveFileId(url) {
  const value = String(url || "");
  return value.match(/[?&]id=([^&]+)/)?.[1] || value.match(/\/d\/([^/]+)/)?.[1] || "";
}

async function prepareImageUpload(file, imageIndex, product) {
  const isMobile = window.matchMedia("(max-width: 680px)").matches;
  const dataUrl = await resizeImage(file, isMobile ? 1280 : 1600, isMobile ? 0.78 : 0.84);
  const [meta, base64] = dataUrl.split(",");
  return { fileName: buildImageFileName(file, imageIndex, product), mimeType: meta.match(/data:(.*);base64/)?.[1] || "image/jpeg", base64 };
}

function buildImageFileName(file, imageIndex, product) {
  const id = sanitizeFilePart(product?.id || getField("id") || "new");
  const name = sanitizeFilePart(product?.name || getField("name") || "product").slice(0, 36);
  const original = sanitizeFilePart(file.name.replace(/\.[^.]+$/, "") || "upload").slice(0, 24);
  return `item-${id}-image-${imageIndex}-${name}-${original}.jpg`;
}

function sanitizeFilePart(value) {
  return String(value || "").trim().replace(/[\\/:*?"<>|#%&{}$!'@+=`~]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "item";
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
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function openMarqueeDialog() {
  els.marqueeList.innerHTML = "";
  (state.marquee.length ? state.marquee : [{ active: true }]).forEach(addMarqueeRow);
  els.marqueeDialog.showModal();
  refreshIcons();
}

function addMarqueeRow(row = {}) {
  const node = document.createElement("article");
  node.className = "marquee-row";
  node.innerHTML = `
    <label><span>狀態</span><select data-key="active"><option value="TRUE" ${row.active !== false ? "selected" : ""}>啟用</option><option value="FALSE" ${row.active === false ? "selected" : ""}>停用</option></select></label>
    <label><span>文案</span><div class="clearable-field"><input data-key="text" value="${escapeAttr(row.text || "")}"><button class="mini-action clear-action" type="button" data-clear-marquee="text"><i data-lucide="x"></i></button></div></label>
    <label><span>連結</span><div class="clearable-field"><input data-key="url" type="url" value="${escapeAttr(row.url || "")}"><button class="mini-action clear-action" type="button" data-clear-marquee="url"><i data-lucide="x"></i></button></div></label>
    <label><span>到期日</span><div class="clearable-field"><input data-key="expiresAt" type="date" value="${escapeAttr(formatDateInput(row.expiresAt))}"><button class="mini-action clear-action" type="button" data-clear-marquee="expiresAt"><i data-lucide="x"></i></button></div></label>
    <div class="marquee-row-actions"><button class="secondary-action danger-action" type="button" data-delete-marquee><i data-lucide="trash-2"></i> 刪除這則跑馬燈</button></div>`;
  node.querySelectorAll("[data-clear-marquee]").forEach((button) => button.addEventListener("click", () => {
    node.querySelector(`[data-key="${button.dataset.clearMarquee}"]`).value = "";
    toast("跑馬燈欄位已清空，記得儲存。", "info");
  }));
  node.querySelector("[data-delete-marquee]").addEventListener("click", () => {
    node.remove();
    toast("跑馬燈已刪除，記得儲存。", "warn");
  });
  els.marqueeList.appendChild(node);
  refreshIcons();
}

async function saveMarquee() {
  setButtonState(els.saveMarqueeButton, "saving", "儲存中...");
  state.marquee = [...els.marqueeList.querySelectorAll(".marquee-row")].map((row) => ({
    active: row.querySelector('[data-key="active"]').value === "TRUE",
    text: row.querySelector('[data-key="text"]').value.trim(),
    url: row.querySelector('[data-key="url"]').value.trim(),
    expiresAt: row.querySelector('[data-key="expiresAt"]').value,
  })).filter((row) => row.text);
  try {
    await apiRequest("admin_save_marquee", { marquee: state.marquee });
    setButtonState(els.saveMarqueeButton, "success", "已儲存");
    setTimeout(() => {
      resetButtonState(els.saveMarqueeButton, "儲存");
      els.marqueeDialog.close();
    }, 700);
  } catch (error) {
    setButtonState(els.saveMarqueeButton, "error", "儲存失敗");
    toast(error.message, "error");
    setTimeout(() => resetButtonState(els.saveMarqueeButton, "儲存"), 1800);
  }
}

function openCatalogDialog() {
  state.catalogTab = "saleLabels";
  document.querySelectorAll("[data-catalog-tab]").forEach((item) => item.classList.toggle("active", item.dataset.catalogTab === state.catalogTab));
  renderCatalogRows();
  els.catalogDialog.showModal();
  refreshIcons();
}

function renderCatalogRows() {
  const list = getActiveCatalogList();
  els.catalogList.innerHTML = "";
  list.forEach((item, index) => {
    const usage = countCatalogUsage(state.catalogTab, item.name);
    const row = document.createElement("article");
    row.className = "catalog-row";
    row.innerHTML = `<button class="catalog-status ${item.active ? "active" : ""}" type="button" data-toggle-catalog>${item.active ? "啟用" : "停用"}</button><input type="text" value="${escapeAttr(item.name)}" data-catalog-name><input class="catalog-sort-input" type="number" min="1" inputmode="numeric" value="${escapeAttr(item.sort || index + 1)}" data-catalog-sort aria-label="排序"><button class="mini-action danger-action" type="button" data-delete-catalog><i data-lucide="trash-2"></i></button><small class="field-hint">排序數字小的排前面｜使用中：${usage} 件</small>`;
    row.querySelector("[data-toggle-catalog]").addEventListener("click", () => {
      item.active = !item.active;
      renderCatalogRows();
    });
    row.querySelector("[data-catalog-name]").addEventListener("input", (event) => item.name = event.target.value.trim());
    row.querySelector("[data-catalog-sort]").addEventListener("input", (event) => item.sort = Number(event.target.value) || index + 1);
    row.querySelector("[data-delete-catalog]").addEventListener("click", () => {
      if (usage > 0) return toast(`此分類仍有 ${usage} 件商品使用中，請先改名或停用。`, "warn");
      list.splice(index, 1);
      renderCatalogRows();
    });
    els.catalogList.appendChild(row);
  });
  refreshIcons();
}

function addCatalogRow() {
  getActiveCatalogList().push(makeCatalogItem("", getActiveCatalogList().length + 1));
  renderCatalogRows();
}

async function saveCatalogs() {
  setButtonState(els.saveCatalogButton, "saving", "儲存中...");
  try {
    state.brands = cleanCatalog(state.brands);
    state.saleLabels = cleanCatalog(state.saleLabels);
    state.categories = cleanCatalog(state.categories);
    const result = await apiRequest("admin_save_catalogs", { brands: state.brands, saleLabels: state.saleLabels, categories: state.categories });
    state.products = result.products || state.products;
    state.brands = normalizeCatalog(result.brands || state.brands, "brand");
    state.saleLabels = normalizeCatalog(result.saleLabels || state.saleLabels, "saleLabel");
    state.categories = normalizeCatalog(result.categories || state.categories, "category");
    renderAll();
    setButtonState(els.saveCatalogButton, "success", "已儲存");
    setTimeout(() => {
      resetButtonState(els.saveCatalogButton, "儲存分類");
      els.catalogDialog.close();
    }, 700);
  } catch (error) {
    setButtonState(els.saveCatalogButton, "error", "儲存失敗");
    toast(error.message, "error");
    setTimeout(() => resetButtonState(els.saveCatalogButton, "儲存分類"), 1800);
  }
}

function getActiveCatalogList() {
  if (state.catalogTab === "brands") return state.brands;
  if (state.catalogTab === "categories") return state.categories;
  return state.saleLabels;
}

function countCatalogUsage(type, name) {
  const key = type === "brands" ? "brand" : type === "categories" ? "category" : "saleLabel";
  return name ? state.products.filter((product) => product[key] === name).length : 0;
}

function normalizeCatalog(items, fallbackType) {
  const sourceValues = fallbackType === "brand"
    ? state.products.map((product) => product.brand)
    : fallbackType === "category"
      ? [...state.products.map((product) => product.category), "鞋包配飾"]
      : state.products.map((product) => product.saleLabel);
  return cleanCatalog(items.length ? items : [...new Set(sourceValues.filter(Boolean))].map((name, index) => makeCatalogItem(name, index + 1)));
}

function cleanCatalog(items) {
  const seen = new Set();
  return items.map((item, index) => ({ active: item.active !== false, name: String(item.name || "").trim(), sort: Number(item.sort) || index + 1, note: item.note || "", originalName: item.originalName || item.name || "" })).filter((item) => item.name && !seen.has(item.name) && seen.add(item.name)).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "zh-Hant"));
}

function makeCatalogItem(name, sort) {
  return { active: true, name, sort, note: "", originalName: name };
}

function openThemeDialog() {
  if (!state.themes.length) state.themes = normalizeThemes([]);
  renderThemes();
  els.themeDialog.showModal();
  refreshIcons();
}

function renderThemes() {
  els.themeList.innerHTML = "";
  state.themes.forEach((theme, index) => addThemeRow(theme, index));
}

function addThemeRow(theme = makeTheme("新配色", false), existingIndex = null) {
  const index = existingIndex ?? state.themes.length;
  if (existingIndex === null) state.themes.push(theme);
  const row = document.createElement("article");
  row.className = "theme-row";
  row.innerHTML = `
    <div class="theme-row-head">
      <button class="catalog-status ${theme.active ? "active" : ""}" type="button" data-theme-active>${theme.active ? "啟用中" : "啟用"}</button>
      <label><span>配色名稱</span><input data-theme-key="name" value="${escapeAttr(theme.name)}"></label>
      <button class="mini-action danger-action" type="button" data-delete-theme><i data-lucide="trash-2"></i></button>
    </div>
    <div class="theme-preview">${["bg", "accent", "accentDark", "accentSoft", "soft", "text", "muted", "gold"].map((key) => `<span class="theme-chip" style="background:${escapeAttr(theme[key])}"></span>`).join("")}</div>
    <div class="theme-color-grid">
      ${themeColorInput("bg", "背景", theme.bg)}
      ${themeColorInput("accent", "主色", theme.accent)}
      ${themeColorInput("accentDark", "深主色", theme.accentDark)}
      ${themeColorInput("accentSoft", "淡主色", theme.accentSoft)}
      ${themeColorInput("soft", "邊框淡色", theme.soft)}
      ${themeColorInput("text", "文字", theme.text)}
      ${themeColorInput("muted", "次文字", theme.muted)}
      ${themeColorInput("gold", "點綴色", theme.gold)}
    </div>`;
  row.querySelector("[data-theme-active]").addEventListener("click", () => {
    state.themes.forEach((item) => item.active = false);
    theme.active = true;
    renderThemes();
  });
  row.querySelectorAll("[data-theme-key]").forEach((input) => input.addEventListener("input", (event) => {
    theme[event.target.dataset.themeKey] = event.target.value;
    row.querySelectorAll(`[data-theme-key="${event.target.dataset.themeKey}"]`).forEach((peer) => peer.value = event.target.value);
    renderThemePreview(row, theme);
  }));
  row.querySelector("[data-delete-theme]").addEventListener("click", () => {
    if (state.themes.length <= 1) return toast("至少要保留一組配色。", "warn");
    state.themes.splice(index, 1);
    if (!state.themes.some((item) => item.active)) state.themes[0].active = true;
    renderThemes();
  });
  els.themeList.appendChild(row);
  refreshIcons();
}

function themeColorInput(key, label, value) {
  return `<label><span>${label}</span><div class="theme-color-input"><input type="color" data-theme-key="${key}" value="${escapeAttr(value)}"><input data-theme-key="${key}" value="${escapeAttr(value)}"></div></label>`;
}

function renderThemePreview(row, theme) {
  row.querySelector(".theme-preview").innerHTML = ["bg", "accent", "accentDark", "accentSoft", "soft", "text", "muted", "gold"].map((key) => `<span class="theme-chip" style="background:${escapeAttr(theme[key])}"></span>`).join("");
}

async function saveThemes() {
  setButtonState(els.saveThemeButton, "saving", "儲存中...");
  try {
    state.themes = normalizeThemes(state.themes);
    const result = await apiRequest("admin_save_themes", { themes: state.themes });
    state.themes = normalizeThemes(result.themes || state.themes);
    renderThemes();
    setButtonState(els.saveThemeButton, "success", "已儲存");
    setTimeout(() => resetButtonState(els.saveThemeButton, "儲存配色"), 900);
  } catch (error) {
    setButtonState(els.saveThemeButton, "error", "儲存失敗");
    toast(error.message, "error");
    setTimeout(() => resetButtonState(els.saveThemeButton, "儲存配色"), 1800);
  }
}

function normalizeThemes(themes) {
  const input = themes.length ? themes : [makeTheme("暮光玫瑰粉", true), makeTheme("桃紅色", false, true)];
  let activeUsed = false;
  return input.map((theme) => {
    const active = theme.active === true && !activeUsed;
    if (active) activeUsed = true;
    return Object.assign(makeTheme(theme.name || "未命名配色", active), theme, { active });
  }).map((theme, index, list) => {
    if (!list.some((item) => item.active) && index === 0) theme.active = true;
    return theme;
  });
}

function makeTheme(name, active, pink = false) {
  return pink ? { active, name, bg: "#fdf8f5", accent: "#ec4899", accentDark: "#db2777", accentSoft: "#fff1f2", soft: "#fce7f3", text: "#374151", muted: "#9ca3af", gold: "#f59e0b", glow: "rgba(236, 72, 153, 0.16)" } : { active, name, bg: "#FDF9F6", accent: "#C39B9B", accentDark: "#9F7878", accentSoft: "#F7EEEE", soft: "#EFE2DE", text: "#2C2C2C", muted: "#7A6B68", gold: "#D4AF37", glow: "rgba(195, 155, 155, 0.18)" };
}

async function openPermissionDialog() {
  if (!state.permissions.canManageUsers) return toast("此帳號沒有權限管理功能。", "warn");
  state.permissionTab = "users";
  document.querySelectorAll("[data-permission-tab]").forEach((item) => item.classList.toggle("active", item.dataset.permissionTab === state.permissionTab));
  els.permissionDialog.showModal();
  els.permissionUserList.innerHTML = '<p class="scope-note">正在載入權限資料...</p>';
  try {
    const result = await apiRequest("admin_security", {});
    state.adminUsers = normalizeAdminUsers(result.users || []);
    state.adminLogs = result.logs || [];
    state.loginLogs = result.loginLogs || [];
    state.permissions = result.permissions || state.permissions;
    renderPermissions();
  } catch (error) {
    toast(error.message, "error");
    els.permissionDialog.close();
  }
}

function renderPermissions() {
  els.permissionScope.textContent = state.permissions.canManageOwner ? "最高管理員可查看所有操作紀錄，並管理所有使用者權限。" : "此帳號可查看與管理 sanjose.gogo.tw@gmail.com 以外的紀錄與使用者。";
  renderPermissionPanels();
  renderPermissionUsers();
  renderPermissionLogs();
  renderPermissionLoginLogs();
  refreshIcons();
}

function renderPermissionPanels() {
  const usersOpen = state.permissionTab === "users";
  els.permissionUsersPanel.classList.toggle("hidden", !usersOpen);
  els.permissionLogsPanel.classList.toggle("hidden", state.permissionTab !== "logs");
  els.permissionLoginPanel.classList.toggle("hidden", state.permissionTab !== "loginLogs");
  els.addPermissionUser.classList.toggle("hidden", !usersOpen);
  els.savePermissionButton.classList.toggle("hidden", !usersOpen);
}

function renderPermissionUsers() {
  els.permissionUserList.innerHTML = "";
  state.adminUsers.forEach((user, index) => {
    const row = document.createElement("article");
    row.className = "permission-user-row";
    row.innerHTML = `<button class="catalog-status ${user.active ? "active" : ""}" type="button" data-toggle-user>${user.active ? "啟用" : "停用"}</button><label><span>Email</span><input type="email" value="${escapeAttr(user.email)}" data-user-email ${user.locked ? "disabled" : ""}></label><label><span>權限</span><select data-user-role ${user.locked ? "disabled" : ""}><option value="staff" ${user.role === "staff" ? "selected" : ""}>一般管理</option><option value="manager" ${user.role === "manager" ? "selected" : ""}>權限管理</option>${state.permissions.canManageOwner ? `<option value="owner" ${user.role === "owner" ? "selected" : ""}>最高管理員</option>` : ""}</select></label><label><span>名稱/備註</span><input value="${escapeAttr(user.note || user.name || "")}" data-user-note ${user.locked ? "disabled" : ""}></label><button class="mini-action danger-action" type="button" data-delete-user ${user.locked ? "disabled" : ""}><i data-lucide="trash-2"></i></button>`;
    row.querySelector("[data-toggle-user]").addEventListener("click", () => {
      if (user.locked) return toast("此使用者是保留管理員，不能停用。", "warn");
      user.active = !user.active;
      renderPermissionUsers();
    });
    row.querySelector("[data-user-email]").addEventListener("input", (event) => user.email = event.target.value.trim().toLowerCase());
    row.querySelector("[data-user-role]").addEventListener("change", (event) => user.role = event.target.value);
    row.querySelector("[data-user-note]").addEventListener("input", (event) => user.note = event.target.value.trim());
    row.querySelector("[data-delete-user]").addEventListener("click", () => {
      state.adminUsers.splice(index, 1);
      renderPermissionUsers();
    });
    els.permissionUserList.appendChild(row);
  });
}

function renderPermissionLogs() {
  renderLogList(els.permissionLogList, filterLogs(state.adminLogs, state.logQuery, ["email", "action", "target", "summary", "details"]), (log) => `<div class="log-head"><strong>${escapeHtml(log.action || "操作")}</strong><span>${escapeHtml(formatLogTime(log.time))}</span></div><p>${escapeHtml(log.email || "")}</p><p>${escapeHtml(log.target || "")}${log.summary ? ` / ${escapeHtml(log.summary)}` : ""}</p>${log.details ? `<pre>${escapeHtml(log.details)}</pre>` : ""}`);
}

function renderPermissionLoginLogs() {
  renderLogList(els.permissionLoginList, filterLogs(state.loginLogs, state.loginLogQuery, ["email", "ip", "country", "city", "region", "deviceType", "browser", "os", "screen", "userAgent"]), (log) => `<div class="log-head"><strong>${escapeHtml(log.email || "登入")}</strong><span>${escapeHtml(formatLogTime(log.time))}</span></div><p>${escapeHtml([log.country, log.city].filter(Boolean).join(" / ") || "位置未知")}${log.ip ? ` / IP：${escapeHtml(log.ip)}` : ""}</p><p>${escapeHtml([log.deviceType, log.browser, log.os].filter(Boolean).join(" / ") || "裝置未知")}${log.screen ? ` / ${escapeHtml(log.screen)}` : ""}</p>${log.userAgent ? `<pre>${escapeHtml(log.userAgent)}</pre>` : ""}`);
}

function filterLogs(items, query, keys) {
  if (!query) return items;
  return items.filter((item) => keys.map((key) => item[key]).filter(Boolean).join(" ").toLowerCase().includes(query));
}

function applyLogSearch() {
  state.logQuery = state.pendingLogQuery;
  renderPermissionLogs();
}

function applyLoginLogSearch() {
  state.loginLogQuery = state.pendingLoginLogQuery;
  renderPermissionLoginLogs();
}

function renderLogList(container, items, template) {
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = '<p class="scope-note">目前沒有可查看的紀錄。</p>';
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("article");
    row.className = "permission-log-row";
    row.innerHTML = template(item);
    container.appendChild(row);
  });
}

function addPermissionUser() {
  state.adminUsers.push({ active: true, email: "", role: "staff", note: "", locked: false });
  renderPermissionUsers();
}

async function savePermissions() {
  setButtonState(els.savePermissionButton, "saving", "儲存中...");
  const users = [...els.permissionUserList.querySelectorAll(".permission-user-row")].map((row, index) => ({ active: state.adminUsers[index]?.locked ? true : row.querySelector("[data-toggle-user]").textContent.trim() === "啟用", email: row.querySelector("[data-user-email]").value.trim().toLowerCase(), role: row.querySelector("[data-user-role]").value, note: row.querySelector("[data-user-note]").value.trim(), locked: state.adminUsers[index]?.locked || false })).filter((user) => user.email);
  if (users.some((user) => !user.email.includes("@"))) {
    setButtonState(els.savePermissionButton, "error", "Email 不完整");
    return setTimeout(() => resetButtonState(els.savePermissionButton, "儲存權限"), 1800);
  }
  try {
    const result = await apiRequest("admin_save_users", { users });
    state.adminUsers = normalizeAdminUsers(result.users || users);
    state.adminLogs = result.logs || state.adminLogs;
    state.loginLogs = result.loginLogs || state.loginLogs;
    renderPermissions();
    setButtonState(els.savePermissionButton, "success", "已儲存");
    setTimeout(() => resetButtonState(els.savePermissionButton, "儲存權限"), 900);
  } catch (error) {
    setButtonState(els.savePermissionButton, "error", "儲存失敗");
    toast(error.message, "error");
    setTimeout(() => resetButtonState(els.savePermissionButton, "儲存權限"), 1800);
  }
}

function normalizeAdminUsers(users) {
  const seen = new Set();
  return users.map((user) => ({ active: user.active !== false, email: String(user.email || "").trim().toLowerCase(), role: user.role || "staff", note: user.note || "", name: user.name || "", locked: user.locked === true })).filter((user) => user.email && !seen.has(user.email) && seen.add(user.email));
}

async function recordLoginOnce() {
  if (state.loginRecorded || !state.token || !state.user?.email) return;
  state.loginRecorded = true;
  try {
    await apiRequest("admin_record_login", { client: await collectLoginClientInfo() });
  } catch (error) {
    console.warn("login log failed", error);
  }
}

async function collectLoginClientInfo() {
  const geo = await fetchGeoInfo();
  const ua = navigator.userAgent || "";
  const screen = `${window.screen?.width || ""}x${window.screen?.height || ""}`;
  return { ip: geo.ip || "", country: geo.country || geo.country_name || "", region: geo.region || "", city: geo.city || "", timezone: geo.timezone || "", org: geo.org || geo.asn || "", deviceType: detectDeviceModel(ua, screen), browser: detectBrowser(ua), os: detectOs(ua), language: navigator.language || "", screen, userAgent: ua };
}

async function fetchGeoInfo() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2600);
  try {
    const response = await fetch("https://ipapi.co/json/", { signal: controller.signal });
    return response.ok ? await response.json() : {};
  } catch (error) {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

function detectDeviceType(ua) {
  if (/ipad|tablet/i.test(ua)) return "平板";
  if (/mobile|iphone|android/i.test(ua)) return "手機";
  return "電腦";
}

function detectDeviceModel(ua, screen) {
  const samsungModel = ua.match(/\b(SM-[A-Z0-9]+)\b/i)?.[1]?.toUpperCase();
  const samsungMap = {
    "SM-S928": "Samsung Galaxy S24 Ultra",
    "SM-S926": "Samsung Galaxy S24+",
    "SM-S921": "Samsung Galaxy S24",
    "SM-S918": "Samsung Galaxy S23 Ultra",
    "SM-S916": "Samsung Galaxy S23+",
    "SM-S911": "Samsung Galaxy S23",
    "SM-F956": "Samsung Galaxy Z Fold6",
    "SM-F741": "Samsung Galaxy Z Flip6",
  };
  if (samsungModel) {
    const prefix = Object.keys(samsungMap).find((key) => samsungModel.startsWith(key));
    return prefix ? samsungMap[prefix] : `Samsung ${samsungModel}`;
  }

  if (/iPhone/.test(ua)) {
    const dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100;
    const normalized = screen.split("x").map((value) => Number(value)).sort((a, b) => a - b).join("x");
    const iPhoneMap = {
      "393x852@3": "iPhone 16 / 16 Pro（推測）",
      "402x874@3": "iPhone 16 Pro（推測）",
      "430x932@3": "iPhone 16 Plus / 15 Plus（推測）",
      "440x956@3": "iPhone 16 Pro Max（推測）",
      "390x844@3": "iPhone 15 / 14 / 13（推測）",
      "428x926@3": "iPhone 14 Plus / 13 Pro Max（推測）",
      "414x896@3": "iPhone 11 / XR / XS Max（推測）",
      "375x812@3": "iPhone X / XS / 11 Pro / 12 mini / 13 mini（推測）",
    };
    return iPhoneMap[`${normalized}@${dpr}`] || `iPhone（型號受瀏覽器限制，${screen} @${dpr}x）`;
  }

  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iPad";
  if (/Android/.test(ua)) {
    const model = ua.match(/Android [^;]+;\s*([^;)]+?)(?: Build|\))/i)?.[1]?.trim();
    return model ? `Android ${model}` : "Android 手機";
  }
  return detectDeviceType(ua);
}

function detectBrowser(ua) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/CriOS|Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
  if (/FxiOS|Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua) && !/CriOS/.test(ua)) return "Safari";
  return "未知瀏覽器";
}

function detectOs(ua) {
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  return "未知系統";
}

async function apiRequest(action, payload) {
  const response = await fetch(CONFIG.apiBaseUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, token: state.token, payload }) });
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

function setButtonState(button, type, label) {
  if (!button) return;
  button.disabled = type === "saving";
  button.dataset.state = type;
  button.innerHTML = `${type === "saving" ? '<i data-lucide="loader-2"></i>' : type === "success" ? '<i data-lucide="check"></i>' : type === "error" ? '<i data-lucide="circle-alert"></i>' : '<i data-lucide="save"></i>'} ${escapeHtml(label)}`;
  refreshIcons();
}

function resetButtonState(button, label) {
  if (!button) return;
  button.disabled = false;
  delete button.dataset.state;
  button.innerHTML = `<i data-lucide="save"></i> ${escapeHtml(label)}`;
  refreshIcons();
}

function formatPrice(value) {
  const num = Number(String(value || "").replace(/[^\d]/g, ""));
  return num ? `NT$ ${num.toLocaleString("zh-TW")}` : "電洽";
}

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toISOString().slice(0, 10);
}

function formatLogTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-TW", { hour12: false });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function toast(message, type = "info") {
  const target = (els.productDialog?.open || els.marqueeDialog?.open || els.themeDialog?.open || els.permissionDialog?.open) && els.dialogToast ? els.dialogToast : els.toast;
  target.textContent = message;
  target.className = `${target.id === "dialog-toast" ? "dialog-toast" : "toast"} show ${type}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => target.className = target.id === "dialog-toast" ? "dialog-toast" : "toast", 3600);
}

function refreshIcons() {
  window.lucide?.createIcons();
}

function toCamel(id) {
  return id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
