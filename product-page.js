import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore, collection, doc, getDocs, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCZcb9hCxkK-e5qIkxK_PFDUkJ4KReEInU',
  authDomain: 'crm-score.firebaseapp.com',
  projectId: 'crm-score',
  storageBucket: 'crm-score.firebasestorage.app',
  messagingSenderId: '647988191164',
  appId: '1:647988191164:web:31b4a33a5a828376c355b9',
};

const APP_ROOT_URL = new URL('./', window.location.href);
const SITE_URL = APP_ROOT_URL.href;
const DEFAULT_BRAND = 'إيليت هوم وير';
const DEFAULT_TAGLINE = 'أدوات منزلية بتصميم راقٍ';
const CART_STORAGE_KEY = 'elitehome_cart_piece_dozen_v1';
const OPEN_CART_FLAG_KEY = 'elitehome_open_cart_after_nav';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const qs = new URLSearchParams(window.location.search);
const targetModel = (qs.get('model') || '').trim();
const targetId = (qs.get('id') || '').trim();

const el = {
  brandLogo: document.getElementById('productBrandLogo'),
  brandMark: document.getElementById('productBrandMark'),
  brandName: document.getElementById('productBrandName'),
  brandTagline: document.getElementById('productBrandTagline'),
  heroImage: document.getElementById('productHeroImage'),
  thumbs: document.getElementById('productThumbs'),
  badges: document.getElementById('productBadges'),
  title: document.getElementById('productTitle'),
  lead: document.getElementById('productLead'),
  model: document.getElementById('productModel'),
  sizes: document.getElementById('productSizes'),
  category: document.getElementById('productCategory'),
  subCategory: document.getElementById('productSubCategory'),
  price: document.getElementById('productPrice'),
  basePrice: document.getElementById('productBasePrice'),
  piecePrice: document.getElementById('productPiecePrice'),
  description: document.getElementById('productDescription'),
  openInStoreBtn: document.getElementById('openInStoreBtn'),
  whatsappOrderBtn: document.getElementById('whatsappOrderBtn'),
  relatedProducts: document.getElementById('relatedProducts'),
  notFound: document.getElementById('productNotFound'),
  structuredData: document.getElementById('productStructuredData'),
  toast: document.getElementById('productToast'),
  cartBtn: document.getElementById('productCartBtn'),
  cartCount: document.getElementById('productCartCount'),
  cartSummaryText: document.getElementById('productCartSummaryText'),
  priceLabel: document.getElementById('productPriceLabel'),
  saleUnitSelect: document.getElementById('productSaleUnitSelect'),
  openCartBtn: document.getElementById('productOpenCartBtn'),
  qtyInput: document.getElementById('productQtyInput'),
  qtyPlus: document.getElementById('productQtyPlus'),
  qtyMinus: document.getElementById('productQtyMinus'),
  addToCartBtn: document.getElementById('productAddToCartBtn'),
};

const state = {
  currentProduct: null,
  saleUnit: 'piece',
  cart: loadLocalJSON(CART_STORAGE_KEY, []),
};

function getProductMainCategory(product) {
  return String(product?.mainCategory ?? product?.season ?? '').trim();
}

function getPackQtyText(product, fallback = '12') {
  const value = String(product?.packQtyText ?? product?.dozenQtyText ?? product?.seriesQtyText ?? product?.minQty ?? '').trim();
  return value || fallback;
}

function getPackQtyNumber(product, fallback = 12) {
  const match = String(getPackQtyText(product, String(fallback))).match(/\d+(?:\.\d+)?/);
  const qty = match ? Number(match[0]) : fallback;
  return qty > 0 ? qty : fallback;
}

function normalizeProductRecord(product = {}) {
  return {
    ...product,
    mainCategory: getProductMainCategory(product),
    packQtyText: getPackQtyText(product),
    priceDozen: product?.priceDozen ?? product?.priceWholesale ?? product?.unitPrice ?? '',
  };
}

ensureButtonTypes();

boot().catch((error) => {
  console.error(error);
  showNotFound();
});

async function boot() {
  bindCartUi();
  syncCartBadge();
  const [productsSnap, categoriesSnap, companySnap, storefrontSnap] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'categories')),
    getDoc(doc(db, 'company', 'main')),
    getDoc(doc(db, 'settings', 'storefront')),
  ]);

  const products = productsSnap.docs.map((entry) => normalizeProductRecord({ id: entry.id, ...entry.data() })).filter((item) => item.visible !== false);
  const categories = categoriesSnap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  const company = companySnap.exists() ? companySnap.data() : {};
  const storefront = storefrontSnap.exists() ? storefrontSnap.data() : {};
  applyBrand(company, storefront);

  const product = products.find((item) => String(item.model || '').trim() === targetModel) || products.find((item) => String(item.id || '').trim() === targetId);
  if (!product) {
    showNotFound();
    return;
  }

  renderProduct(product, { products, categories, company, storefront });
}

function ensureButtonTypes() {
  document.querySelectorAll('button:not([type])').forEach((button) => {
    button.type = 'button';
  });
}

function bindCartUi() {
  el.qtyPlus?.addEventListener('click', () => setDesiredQty(readDesiredQty() + 1));
  el.qtyMinus?.addEventListener('click', () => setDesiredQty(readDesiredQty() - 1));
  el.qtyInput?.addEventListener('input', () => setDesiredQty(el.qtyInput.value));
  el.addToCartBtn?.addEventListener('click', addCurrentProductToCart);
  el.saleUnitSelect?.addEventListener('change', () => {
    state.saleUnit = normalizeSaleUnit(el.saleUnitSelect.value, state.currentProduct);
    syncProductPricing(state.currentProduct);
  });
  [el.cartBtn, el.openCartBtn].forEach((link) => link?.addEventListener('click', markCartOpenRequest));
  window.addEventListener('storage', (event) => {
    if (event.key !== CART_STORAGE_KEY) return;
    state.cart = loadLocalJSON(CART_STORAGE_KEY, []);
    syncCartBadge();
  });
}

function applyBrand(company, storefront) {
  const name = company.companyName || storefront.companyName || DEFAULT_BRAND;
  const tagline = company.tagline || storefront.tagline || DEFAULT_TAGLINE;
  el.brandName.textContent = name;
  el.brandTagline.textContent = tagline;
  const logoUrl = storefront.logoUrl || '';
  if (logoUrl) {
    el.brandLogo.src = logoUrl;
    el.brandLogo.classList.remove('hidden');
    el.brandMark.classList.add('hidden');
  } else {
    el.brandLogo.classList.add('hidden');
    el.brandMark.classList.remove('hidden');
    el.brandMark.textContent = initials(name);
  }
}

function renderProduct(product, ctx) {
  state.currentProduct = product;
  setDesiredQty(1);
  const brand = ctx.company.companyName || ctx.storefront.companyName || DEFAULT_BRAND;
  const urls = normalizeImageUrls(product.imageUrls);
  const imageUrl = urls[0] || `${SITE_URL}assets/icon-512.png`;
  const title = product.name || `موديل ${product.model || ''}`.trim();
  const mainCategory = getProductMainCategory(product) || getCodeCategoryLabel(product.codeCategory, ctx.categories);
  const subCategory = getProductSubCategory(product);
  const productUrl = getProductPageUrl(product);
  const description = buildProductDescription(product, brand, mainCategory);
  const modelLabel = product.model || '-';
  const lead = [mainCategory, subCategory].filter(Boolean).join(' • ');

  document.title = `${title} | ${brand} | أدوات منزلية والمنزل`;
  setMeta('meta[name="description"]', 'content', description);
  setMeta('meta[property="og:title"]', 'content', document.title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]', 'content', productUrl);
  setMeta('meta[property="og:image"]', 'content', imageUrl);
  setMeta('meta[name="twitter:title"]', 'content', document.title);
  setMeta('meta[name="twitter:description"]', 'content', description);
  setMeta('meta[name="twitter:image"]', 'content', imageUrl);
  setMeta('link[rel="canonical"]', 'href', productUrl);

  el.title.textContent = title;
  el.lead.textContent = lead || 'تفاصيل الموديل';
  el.model.textContent = modelLabel;
  el.sizes.textContent = product.sizes || getSeriesLabel(product);
  el.category.textContent = mainCategory || 'غير محدد';
  el.subCategory.textContent = subCategory || '—';
  hydrateSaleUnitOptions(product);
  syncProductPricing(product);
  const basePrice = getBasePrice(product, state.saleUnit || getPrimarySaleUnit(product));
  if (hasDiscount(product) && basePrice > getDisplayPrice(product, state.saleUnit || getPrimarySaleUnit(product))) {
    el.basePrice.textContent = formatCurrency(basePrice);
    el.basePrice.classList.remove('hidden');
  } else {
    el.basePrice.classList.add('hidden');
  }
  el.description.textContent = description;
  el.heroImage.src = imageUrl;
  el.heroImage.alt = buildProductAlt(product, brand, mainCategory);
  renderThumbs(urls.length ? urls : [imageUrl], title, brand, mainCategory);
  renderBadges(product, mainCategory);
  el.openInStoreBtn.href = getStorefrontUrl(null, getProductAnchorId(product));
  el.whatsappOrderBtn.href = buildWhatsAppLink(ctx.company.whatsapp || ctx.company.phone1, title, modelLabel, productUrl);
  const cartHref = getStorefrontUrl({ cart: 1 });
  if (el.cartBtn) el.cartBtn.href = cartHref;
  if (el.openCartBtn) el.openCartBtn.href = cartHref;
  syncStructuredData(product, brand, mainCategory, description, imageUrl, productUrl, ctx.company);
  syncCartBadge();
  renderRelatedProducts(product, ctx.products, brand, ctx.categories);
}

function readDesiredQty() {
  const value = Math.floor(toNumber(el.qtyInput?.value || 1));
  return value >= 1 ? value : 1;
}

function setDesiredQty(value) {
  const safeValue = Math.max(1, Math.floor(toNumber(value) || 1));
  if (el.qtyInput) el.qtyInput.value = String(safeValue);
}

function addCurrentProductToCart() {
  const product = state.currentProduct;
  if (!product) return;
  const qty = readDesiredQty();
  const saleUnit = normalizeSaleUnit(state.saleUnit || getPrimarySaleUnit(product), product);
  const itemKey = buildCartItemKey(product.id, saleUnit);
  const existing = state.cart.find((item) => (item.itemKey || buildCartItemKey(item.id, item.saleUnit)) === itemKey);
  const unitPrice = getDisplayPrice(product, saleUnit);
  if (existing) existing.qty += qty;
  else state.cart.push({
    itemKey,
    id: product.id,
    name: product.name,
    model: product.model,
    saleUnit,
    unitPrice,
    originalPrice: getBasePrice(product, saleUnit),
    pricePiece: getPiecePrice(product),
    priceWholesale: getDozenBasePrice(product),
    discountPercent: toNumber(product.discountPercent || 0),
    imageUrl: normalizeImageUrls(product.imageUrls)[0] || '',
    qty,
    seriesQtyText: getSeriesQtyText(product),
  });
  saveLocalJSON(CART_STORAGE_KEY, state.cart);
  syncCartBadge();
  const unitLabel = getSaleUnitLabel(saleUnit);
  showToast(qty > 1 ? `تمت إضافة ${qty} ${unitLabel} إلى السلة` : `تمت إضافة ${unitLabel} إلى السلة`);
}

function syncCartBadge() {
  const count = state.cart.reduce((sum, item) => sum + Math.max(0, Number(item.qty) || 0), 0);
  if (el.cartCount) el.cartCount.textContent = String(count);
  if (el.cartSummaryText) el.cartSummaryText.textContent = count ? `${count} عنصر في السلة` : '0 عنصر في السلة';
}

function markCartOpenRequest() {
  try {
    sessionStorage.setItem(OPEN_CART_FLAG_KEY, '1');
  } catch {}
}

function showToast(message) {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    el.toast.classList.remove('show');
  }, 2200);
}

function renderThumbs(urls, title, brand, category) {
  el.thumbs.innerHTML = '';
  urls.forEach((url, index) => {
    const button = document.createElement('button');
    button.className = `product-thumb-btn${index === 0 ? ' active' : ''}`;
    button.type = 'button';
    button.innerHTML = `<img src="${escapeAttr(url)}" alt="${escapeAttr(`${title} - ${category} - ${brand}`)}" loading="lazy" decoding="async">`;
    button.addEventListener('click', () => {
      el.heroImage.src = url;
      [...el.thumbs.children].forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
    });
    el.thumbs.appendChild(button);
  });
}

function renderBadges(product, category) {
  el.badges.innerHTML = '';
  [...new Set([category, getProductSubCategory(product), product.badgeText, hasDiscount(product) ? `خصم ${Math.round(toNumber(product.discountPercent))}%` : ''].filter(Boolean))].forEach((text) => {
    const node = document.createElement('span');
    node.className = 'badge';
    node.textContent = text;
    el.badges.appendChild(node);
  });
}

function renderRelatedProducts(currentProduct, products, brand, categories) {
  const related = products
    .filter((item) => item.id !== currentProduct.id)
    .filter((item) => String(getProductMainCategory(item) || '') === String(getProductMainCategory(currentProduct) || '') || String(getProductSubCategory(item) || '') === String(getProductSubCategory(currentProduct) || ''))
    .slice(0, 8);

  el.relatedProducts.innerHTML = '';
  if (!related.length) {
    el.relatedProducts.innerHTML = '<div class="empty-card" style="grid-column:1/-1">لا توجد منتجات مشابهة الآن.</div>';
    return;
  }

  related.forEach((product) => {
    const urls = normalizeImageUrls(product.imageUrls);
    const imageUrl = urls[0] || `${SITE_URL}assets/icon-512.png`;
    const mainCategory = getProductMainCategory(product) || getCodeCategoryLabel(product.codeCategory, categories);
    const title = product.name || `موديل ${product.model || ''}`.trim();
    const article = document.createElement('article');
    article.className = 'product-card';
    article.innerHTML = `
      <a class="product-media" href="${escapeAttr(getProductPageUrl(product))}" aria-label="${escapeAttr(title)}">
        <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(buildProductAlt(product, brand, mainCategory))}" loading="lazy" decoding="async" />
      </a>
      <div class="product-body">
        <div class="badges-row"><span class="badge">${escapeHTML(mainCategory)}</span>${getProductSubCategory(product) ? `<span class="badge">${escapeHTML(getProductSubCategory(product))}</span>` : ''}</div>
        <h3 class="product-title"><a href="${escapeAttr(getProductPageUrl(product))}">${escapeHTML(title)}</a></h3>
        <div class="product-sub"><span>موديل ${escapeHTML(product.model || '-')}</span><span>${escapeHTML(product.sizes || '')}</span></div>
        <p class="product-desc">${escapeHTML(buildProductDescription(product, brand, mainCategory))}</p>
        <div class="price-stack">
          <div class="price-main"><small>${escapeHTML(getStoreCardPriceLabel(product))}</small><strong>${escapeHTML(getStoreCardPriceValue(product))}</strong></div>
          <div class="muted">${escapeHTML(getRelatedProductMeta(product))}</div>
        </div>
      </div>`;
    el.relatedProducts.appendChild(article);
  });
}

function syncStructuredData(product, brand, category, description, imageUrl, productUrl, company) {
  const payload = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: brand, item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: titleCase(category), item: `${SITE_URL}#${getProductAnchorId(product)}` },
          { '@type': 'ListItem', position: 3, name: product.name || `موديل ${product.model || ''}`.trim(), item: productUrl },
        ]
      },
      {
        '@type': 'Product',
        name: product.name || `موديل ${product.model || ''}`.trim(),
        image: normalizeImageUrls(product.imageUrls).length ? normalizeImageUrls(product.imageUrls) : [imageUrl],
        description,
        sku: String(product.model || product.id || ''),
        category,
        brand: { '@type': 'Brand', name: brand },
        itemCondition: 'https://schema.org/NewCondition',
        url: productUrl,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'EGP',
          price: String(getDisplayPrice(product)),
          availability: 'https://schema.org/InStock',
          url: productUrl,
        }
      },
      {
        '@type': 'Store',
        name: brand,
        url: SITE_URL,
        telephone: company.phone1 || undefined,
      }
    ]
  };
  el.structuredData.textContent = JSON.stringify(payload);
}

function showNotFound() {
  el.notFound.classList.remove('hidden');
  document.title = 'المنتج غير موجود | إيليت هوم وير';
}

function getStorefrontUrl(params = null, hash = '') {
  const url = new URL(SITE_URL);
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }
  if (hash) url.hash = hash.startsWith('#') ? hash : `#${hash}`;
  return url.href;
}

function getProductPageUrl(product) {
  const url = new URL('product.html', SITE_URL);
  const model = String(product?.model || '').trim();
  if (model) {
    url.searchParams.set('model', model);
    return url.href;
  }
  url.searchParams.set('id', String(product?.id || '').trim());
  return url.href;
}

function getProductAnchorId(product) {
  const raw = String(product?.model || product?.id || product?.name || 'product');
  return `product-${raw.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')}`;
}

function normalizeImageUrls(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  const text = String(value || '').trim();
  if (!text) return [];
  return text.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function hasDiscount(product) {
  return toNumber(product.discountPercent || 0) > 0;
}

function getDisplayPrice(product) {
  const price = getSeriesBasePrice(product);
  const discount = clamp(toNumber(product.discountPercent || 0), 0, 99);
  return round2(price - (price * discount / 100));
}

function getSeriesBasePrice(product) {
  if (product && product.pricePiece !== undefined && product.pricePiece !== null && String(product.pricePiece).trim() !== '') {
    return round2(getPiecePrice(product) * getSeriesQtyNumber(product));
  }
  return round2(toNumber(product.priceWholesale || product.unitPrice || 0));
}

function getPiecePrice(product) {
  const explicit = product.pricePiece ?? product.piecePrice ?? product.pricePerPiece;
  if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') return round2(toNumber(explicit));
  const seriesQty = getSeriesQtyNumber(product);
  const seriesPrice = toNumber(product.priceDozen ?? product.priceWholesale ?? product.unitPrice ?? 0);
  return seriesQty > 0 ? round2(seriesPrice / seriesQty) : round2(seriesPrice);
}

function getSeriesQtyText(product) {
  return getPackQtyText(product, '1');
}

function getSeriesQtyNumber(product) {
  return getPackQtyNumber(product, 1);
}

function getSeriesLabel(product) {
  const text = getSeriesQtyText(product);
  return /^\d+(?:\.\d+)?$/.test(text) ? `${text} قطعة في الدستة` : text;
}

function buildProductDescription(product, brand, category) {
  return [
    product.description || '',
    product.sizes ? `التفاصيل: ${product.sizes}` : '',
    category ? `القسم الرئيسي: ${category}` : '',
    getProductSubCategory(product) ? `التصنيف الفرعي: ${getProductSubCategory(product)}` : '',
    `المتجر: ${brand}`,
  ].filter(Boolean).join(' • ').slice(0, 500);
}

function buildProductAlt(product, brand, category) {
  return [
    product.name || '',
    product.model ? `موديل ${product.model}` : '',
    category || '',
    getProductSubCategory(product) || '',
    'أدوات منزلية',
    brand,
  ].filter(Boolean).join(' | ');
}

function getCodeCategoryLabel(code, categories) {
  const match = categories.find((item) => item.type === 'code' && String(item.code || item.label) === String(code));
  return match?.label || (code ? `تصنيف ${code}` : 'أدوات منزلية');
}

function getProductSubCategory(product) {
  return String(product.subCategory || product.type || '').trim();
}

function buildWhatsAppLink(phone, title, model, url) {
  const number = String(phone || '').replace(/\D/g, '');
  if (!number) return './';
  const text = encodeURIComponent(`مرحبًا، أريد الاستفسار عن ${title} - موديل ${model}\n${url}`);
  return `https://wa.me/${number}?text=${text}`;
}

function setMeta(selector, attr, value) {
  const node = document.querySelector(selector);
  if (node && value) node.setAttribute(attr, value);
}

function toNumber(value) {
  const num = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : 0;
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatCurrency(value) {
  const num = toNumber(value);
  return `${num.toLocaleString('en-US')} ج.م`;
}

function initials(value) {
  return String(value || 'EH').trim().split(/\s+/).slice(0, 2).map((item) => item[0] || '').join('').toUpperCase() || 'EH';
}

function escapeAttr(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHTML(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function titleCase(value) {
  return String(value || '').trim();
}

function loadLocalJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function saveLocalJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}


function getSaleMode(product) {
  const raw = String(product?.saleMode || '').trim().toLowerCase();
  if (raw === 'piece' || raw === 'dozen' || raw === 'both') return raw;
  return getSeriesQtyNumber(product) > 1 ? 'dozen' : 'piece';
}
function canSellByPiece(product) { const mode = getSaleMode(product); return mode === 'piece' || mode === 'both'; }
function canSellByDozen(product) { const mode = getSaleMode(product); return mode === 'dozen' || mode === 'both'; }
function getPrimarySaleUnit(product) { return canSellByPiece(product) ? 'piece' : 'dozen'; }
function normalizeSaleUnit(unit, product) { const safe = String(unit || '').trim().toLowerCase(); if (safe === 'piece' && canSellByPiece(product)) return 'piece'; if (safe === 'dozen' && canSellByDozen(product)) return 'dozen'; return getPrimarySaleUnit(product); }
function getSaleUnitLabel(unit) { return String(unit) === 'dozen' ? 'دستة' : 'قطعة'; }
function buildCartItemKey(productId, saleUnit) { return `${productId || ''}__${saleUnit || 'piece'}`; }
function getSeriesQtyText(product) { const value = String(product?.seriesQtyText ?? product?.packQtyText ?? product?.dozenQtyText ?? product?.minQty ?? '').trim(); return value || '12'; }
function getSeriesQtyNumber(product) { const match = String(getSeriesQtyText(product)).match(/\d+(?:\.\d+)?/); const qty = match ? Number(match[0]) : 12; return qty > 0 ? qty : 12; }
function getSeriesLabel(product) { const text = getSeriesQtyText(product); return /^\d+(?:\.\d+)?$/.test(text) ? `${text} قطعة في الدستة` : text; }
function getPiecePrice(product) { const explicit = product.pricePiece ?? product.piecePrice ?? product.pricePerPiece; if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') return round2(toNumber(explicit)); const qty = getSeriesQtyNumber(product); const dozenPrice = toNumber(product.priceDozen ?? product.priceWholesale ?? product.unitPrice ?? 0); return qty > 0 ? round2(dozenPrice / qty) : round2(dozenPrice); }
function getDozenBasePrice(product) { const explicit = product.priceDozen ?? product.priceWholesale ?? product.unitPrice; if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') return round2(toNumber(explicit)); return round2(getPiecePrice(product) * getSeriesQtyNumber(product)); }
function getBasePrice(product, unit = getPrimarySaleUnit(product)) { return unit === 'dozen' ? getDozenBasePrice(product) : getPiecePrice(product); }
function getDisplayPrice(product, unit = getPrimarySaleUnit(product)) { const price = getBasePrice(product, unit); const discount = clamp(toNumber(product.discountPercent || 0), 0, 99); return round2(price - (price * discount / 100)); }
function getSeriesBasePrice(product) { return getDozenBasePrice(product); }
function hydrateSaleUnitOptions(product) { if (!el.saleUnitSelect) return; const options = []; if (canSellByPiece(product)) options.push({ value: 'piece', label: 'بالقطعة' }); if (canSellByDozen(product)) options.push({ value: 'dozen', label: 'بالدستة' }); el.saleUnitSelect.innerHTML = options.map((item) => `<option value="${item.value}">${item.label}</option>`).join(''); state.saleUnit = normalizeSaleUnit(state.saleUnit || getPrimarySaleUnit(product), product); el.saleUnitSelect.value = state.saleUnit; }
function syncProductPricing(product) { if (!product) return; const saleUnit = normalizeSaleUnit(state.saleUnit || getPrimarySaleUnit(product), product); state.saleUnit = saleUnit; if (el.priceLabel) el.priceLabel.textContent = saleUnit === 'dozen' ? 'سعر الدستة' : 'سعر القطعة'; el.price.textContent = formatCurrency(getDisplayPrice(product, saleUnit)); const basePrice = getBasePrice(product, saleUnit); if (hasDiscount(product) && basePrice > getDisplayPrice(product, saleUnit)) { el.basePrice.textContent = formatCurrency(basePrice); el.basePrice.classList.remove('hidden'); } else { el.basePrice.classList.add('hidden'); } const parts = []; if (canSellByPiece(product)) parts.push(`سعر القطعة ${formatCurrency(getDisplayPrice(product, 'piece'))}`); if (canSellByDozen(product)) parts.push(`سعر الدستة ${formatCurrency(getDisplayPrice(product, 'dozen'))}`); if (canSellByDozen(product)) parts.push(getSeriesLabel(product)); el.piecePrice.textContent = parts.join(' • '); if (el.addToCartBtn) el.addToCartBtn.querySelector('span').textContent = saleUnit === 'dozen' ? 'إضافة دستة' : 'إضافة قطعة'; }
function getStoreCardPriceLabel(product) { const mode = getSaleMode(product); if (mode === 'piece') return 'سعر القطعة'; if (mode === 'dozen') return 'سعر الدستة'; return 'قطعة / دستة'; }
function getStoreCardPriceValue(product) { const mode = getSaleMode(product); if (mode === 'piece') return formatCurrency(getDisplayPrice(product, 'piece')); if (mode === 'dozen') return formatCurrency(getDisplayPrice(product, 'dozen')); return `${formatCurrency(getDisplayPrice(product, 'piece'))} • ${formatCurrency(getDisplayPrice(product, 'dozen'))}`; }
function getRelatedProductMeta(product) { const parts = []; if (canSellByPiece(product)) parts.push(`سعر القطعة ${formatCurrency(getDisplayPrice(product, 'piece'))}`); if (canSellByDozen(product)) parts.push(`سعر الدستة ${formatCurrency(getDisplayPrice(product, 'dozen'))}`); return parts.join(' • '); }
function buildProductDescription(product, brand, category) { return [product.name || `موديل ${product.model || ''}`.trim(), category, getProductSubCategory(product), product.description, `المتجر: ${brand}`].filter(Boolean).join(' • '); }
function getCodeCategoryLabel(code, categories = []) { const safeCode = String(code || '').trim(); const match = categories.find((item) => item.type === 'code' && String(item.code || item.label) === safeCode); return match?.label || (safeCode ? `تصنيف ${safeCode}` : 'أدوات منزلية'); }
