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
const DEFAULT_TAGLINE = 'هوم وير فاخر';
const CART_STORAGE_KEY = 'elite_home_ware_cart_v1';
const OPEN_CART_FLAG_KEY = 'elite_home_open_cart_after_nav';

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
  season: document.getElementById('productSeason'),
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
  openCartBtn: document.getElementById('productOpenCartBtn'),
  qtyInput: document.getElementById('productQtyInput'),
  qtyPlus: document.getElementById('productQtyPlus'),
  qtyMinus: document.getElementById('productQtyMinus'),
  pieceQtyInput: document.getElementById('productPieceQtyInput'),
  pieceQtyPlus: document.getElementById('productPiecePlus'),
  pieceQtyMinus: document.getElementById('productPieceMinus'),
  addToCartBtn: document.getElementById('productAddToCartBtn'),
};

const state = {
  currentProduct: null,
  cart: loadLocalJSON(CART_STORAGE_KEY, []),
};

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

  const products = productsSnap.docs.map((entry) => ({ id: entry.id, ...entry.data() })).filter((item) => item.visible !== false);
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
  el.pieceQtyPlus?.addEventListener('click', () => setDesiredPieceQty(readDesiredPieceQty() + 1));
  el.pieceQtyMinus?.addEventListener('click', () => setDesiredPieceQty(readDesiredPieceQty() - 1));
  el.pieceQtyInput?.addEventListener('input', () => setDesiredPieceQty(el.pieceQtyInput.value));
  el.addToCartBtn?.addEventListener('click', addCurrentProductToCart);
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
  setDesiredPieceQty(0);
  const brand = ctx.company.companyName || ctx.storefront.companyName || DEFAULT_BRAND;
  const urls = normalizeImageUrls(product.imageUrls);
  const imageUrl = urls[0] || `${SITE_URL}assets/icon-512.png`;
  const title = product.name || `موديل ${product.model || ''}`.trim();
  const category = getCodeCategoryLabel(product.codeCategory, ctx.categories);
  const subCategory = getProductSubCategory(product);
  const productUrl = getProductPageUrl(product);
  const description = buildProductDescription(product, brand, category);
  const modelLabel = product.model || '-';
  const lead = [category, subCategory, product.season].filter(Boolean).join(' • ');

  document.title = `${title} | ${brand} | أدوات منزلية`;
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
  el.lead.textContent = lead || 'تفاصيل المنتج';
  el.model.textContent = modelLabel;
  el.sizes.textContent = product.sizes || getSeriesLabel(product);
  el.category.textContent = category;
  el.season.textContent = product.season || 'الرئيسية';
  el.price.textContent = formatCurrency(getDisplayPrice(product));
  el.piecePrice.textContent = `سعر القطعة ${formatCurrency(getPiecePrice(product))} • ${getSeriesLabel(product)}`;
  const basePrice = getSeriesBasePrice(product);
  if (hasDiscount(product) && basePrice > getDisplayPrice(product)) {
    el.basePrice.textContent = formatCurrency(basePrice);
    el.basePrice.classList.remove('hidden');
  } else {
    el.basePrice.classList.add('hidden');
  }
  el.description.textContent = description;
  el.heroImage.src = imageUrl;
  el.heroImage.alt = buildProductAlt(product, brand, category);
  renderThumbs(urls.length ? urls : [imageUrl], title, brand, category);
  renderBadges(product, category);
  el.openInStoreBtn.href = getStorefrontUrl(null, getProductAnchorId(product));
  el.whatsappOrderBtn.href = buildWhatsAppLink(ctx.company.whatsapp || ctx.company.phone1, title, modelLabel, productUrl);
  const cartHref = getStorefrontUrl({ cart: 1 });
  if (el.cartBtn) el.cartBtn.href = cartHref;
  if (el.openCartBtn) el.openCartBtn.href = cartHref;
  syncStructuredData(product, brand, category, description, imageUrl, productUrl, ctx.company);
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


function readDesiredPieceQty() {
  const value = Math.floor(toNumber(el.pieceQtyInput?.value || 0));
  return value >= 0 ? value : 0;
}

function setDesiredPieceQty(value) {
  const safeValue = Math.max(0, Math.floor(toNumber(value) || 0));
  if (el.pieceQtyInput) el.pieceQtyInput.value = String(safeValue);
}



function addCurrentProductToCart() {
  const product = state.currentProduct;
  if (!product) return;
  const packQty = readDesiredQty();
  const pieceQty = readDesiredPieceQty();
  if (packQty <= 0 && pieceQty <= 0) return showToast('اختر عدد الدست أو عدد القطع');
  const existing = state.cart.find((item) => item.id === product.id);
  if (existing) {
    existing.packQty = getSeriesCount(existing) + packQty;
    existing.looseQty = getLoosePieceCount(existing) + pieceQty;
    existing.qty = existing.packQty;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      model: product.model,
      unitPrice: getDisplayPrice(product),
      originalPrice: getSeriesBasePrice(product),
      pricePiece: getPiecePrice(product),
      discountPercent: toNumber(product.discountPercent || 0),
      imageUrl: normalizeImageUrls(product.imageUrls)[0] || '',
      packQty,
      looseQty: pieceQty,
      qty: packQty,
      seriesQtyText: getSeriesQtyText(product),
    });
  }
  saveLocalJSON(CART_STORAGE_KEY, state.cart);
  syncCartBadge();
  showToast('تمت إضافة المنتج إلى السلة');
}



function syncCartBadge() {
  const count = state.cart.reduce((sum, item) => sum + getSeriesCount(item) + getLoosePieceCount(item), 0);
  if (el.cartCount) el.cartCount.textContent = String(count);
  if (el.cartSummaryText) el.cartSummaryText.textContent = count ? `${count} اختيار في السلة` : '0 عنصر في السلة';
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
  [category, getProductSubCategory(product), product.season, product.badgeText, hasDiscount(product) ? `خصم ${Math.round(toNumber(product.discountPercent))}%` : ''].filter(Boolean).forEach((text) => {
    const node = document.createElement('span');
    node.className = 'badge';
    node.textContent = text;
    el.badges.appendChild(node);
  });
}

function renderRelatedProducts(currentProduct, products, brand, categories) {
  const related = products
    .filter((item) => item.id !== currentProduct.id)
    .filter((item) => String(item.codeCategory || '') === String(currentProduct.codeCategory || '') || String(item.season || '') === String(currentProduct.season || ''))
    .slice(0, 8);

  el.relatedProducts.innerHTML = '';
  if (!related.length) {
    el.relatedProducts.innerHTML = '<div class="empty-card" style="grid-column:1/-1">لا توجد منتجات مشابهة الآن.</div>';
    return;
  }

  related.forEach((product) => {
    const urls = normalizeImageUrls(product.imageUrls);
    const imageUrl = urls[0] || `${SITE_URL}assets/icon-512.png`;
    const category = getCodeCategoryLabel(product.codeCategory, categories);
    const title = product.name || `موديل ${product.model || ''}`.trim();
    const article = document.createElement('article');
    article.className = 'product-card';
    article.innerHTML = `
      <a class="product-media" href="${escapeAttr(getProductPageUrl(product))}" aria-label="${escapeAttr(title)}">
        <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(buildProductAlt(product, brand, category))}" loading="lazy" decoding="async" />
      </a>
      <div class="product-body">
        <div class="badges-row"><span class="badge">${escapeHTML(category)}</span>${getProductSubCategory(product) ? `<span class="badge">${escapeHTML(getProductSubCategory(product))}</span>` : ''}</div>
        <h3 class="product-title"><a href="${escapeAttr(getProductPageUrl(product))}">${escapeHTML(title)}</a></h3>
        <div class="product-sub"><span>موديل ${escapeHTML(product.model || '-')}</span><span>${escapeHTML(product.sizes || '')}</span></div>
        <p class="product-desc">${escapeHTML(buildProductDescription(product, brand, category))}</p>
        <div class="price-stack">
          <div class="price-main"><small>سعر الدستة</small><strong>${formatCurrency(getDisplayPrice(product))}</strong></div>
          <div class="muted">سعر القطعة ${formatCurrency(getPiecePrice(product))}</div>
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
          priceCurrency: 'SYP',
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
  document.title = 'الموديل غير موجود | إيليت هوم وير';
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
  const seriesPrice = toNumber(product.priceWholesale || product.unitPrice || 0);
  return seriesQty > 0 ? round2(seriesPrice / seriesQty) : round2(seriesPrice);
}

function getSeriesQtyText(product) {
  const value = String(product?.seriesQtyText ?? product?.packQtyText ?? product?.minQty ?? '').trim();
  return value || '1';
}


function getSeriesCount(item) {
  const value = toInt(item?.packQty ?? item?.qty ?? item?.seriesCount ?? 0);
  return value > 0 ? value : 0;
}

function getLoosePieceCount(item) {
  const value = toInt(item?.looseQty ?? item?.pieceOnlyQty ?? 0);
  return value > 0 ? value : 0;
}


function getSeriesQtyNumber(product) {
  const match = String(getSeriesQtyText(product)).match(/\d+(?:\.\d+)?/);
  const qty = match ? Number(match[0]) : 1;
  return qty > 0 ? qty : 1;
}


function getSeriesLabel(product) {
  const text = getSeriesQtyText(product);
  return /^\d+(?:\.\d+)?$/.test(text) ? `${text} قطعة في الدستة` : text;
}


function buildProductDescription(product, brand, category) {
  return [
    product.description || '',
    product.sizes ? `المقاسات: ${product.sizes}` : '',
    product.season ? `المجموعة: ${product.season}` : '',
    category ? `التصنيف: ${category}` : '',
    `المتجر: ${brand}`,
  ].filter(Boolean).join(' • ').slice(0, 500);
}

function buildProductAlt(product, brand, category) {
  return [
    product.name || '',
    product.model ? `موديل ${product.model}` : '',
    category || '',
    product.season || '',
    'هوم وير',
    brand,
  ].filter(Boolean).join(' | ');
}

function getCodeCategoryLabel(code, categories) {
  const match = categories.find((item) => item.type === 'code' && String(item.code || item.label) === String(code));
  return match?.label || (code ? `تصنيف ${code}` : 'هوم وير');
}

function getProductSubCategory(product) {
  return String(product.subCategory || product.type || '').trim();
}

function buildWhatsAppLink(phone, title, model, url) {
  const number = normalizeSyrianPhoneNumber(phone);
  if (!number) return './';
  const text = encodeURIComponent(`مرحبًا، أريد الاستفسار عن ${title} - موديل ${model}\n${url}`);
  return `https://wa.me/${number}?text=${text}`;
}

function normalizeSyrianPhoneNumber(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('963')) return digits;
  if (digits.startsWith('0')) return `963${digits.slice(1)}`;
  if (digits.startsWith('9')) return `963${digits}`;
  return '';
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
  return `${num.toLocaleString('en-US')} ل.س`;
}


function initials(value) {
  return String(value || 'JK').trim().split(/\s+/).slice(0, 2).map((item) => item[0] || '').join('').toUpperCase() || 'JK';
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
