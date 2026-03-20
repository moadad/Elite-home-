import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, onSnapshot, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCZcb9hCxkK-e5qIkxK_PFDUkJ4KReEInU',
  authDomain: 'crm-score.firebaseapp.com',
  projectId: 'crm-score',
  storageBucket: 'crm-score.firebasestorage.app',
  messagingSenderId: '647988191164',
  appId: '1:647988191164:web:31b4a33a5a828376c355b9',
};

const ADMIN_UID = 'U110toUCcCMR3kdrbTXy3JNagI83';
const ADMIN_EMAILS = ['Admin@elite.home', 'admin@elite.home'];
const CLOUDINARY_CLOUD_NAME = 'elitehome';
const CART_STORAGE_KEY = 'elitehome_cart_piece_dozen_v1';
const PRODUCT_PAGE_SIZE = 24;
const APP_SW_VERSION = 'elitehome-production-ultra-v16';
const APP_ROOT_URL = new URL('./', window.location.href);
const SITE_URL = APP_ROOT_URL.href;
const OPEN_CART_FLAG_KEY = 'elitehome_open_cart_after_nav';
const SITE_NAME_AR = 'إيليت هوم وير';
const SITE_NAME_EN = 'Elite Home Ware';

const DEFAULT_PAYMENT_POLICY = `طريقة الدفع الحالية
1- كاش فقط
2- يمكن إضافة طرق دفع أخرى لاحقًا من لوحة التحكم
3- يتم اعتماد الطلب بعد المراجعة والتأكيد من الإدارة`;

const DEFAULT_RETURN_POLICY = `يمكنك طلب الاستبدال أو الاسترجاع خلال 7 أيام من الاستلام، وفي حالات عيوب الصناعة خلال 10 أيام من تاريخ الوصول.

عند الإرجاع يجب أن يكون المنتج بحالته الأصلية مع العبوة والملحقات كاملة وغير مستخدم.

يتم تطبيق سياسة الاستبدال والاسترجاع وفق حالة المنتج والمراجعة النهائية من الإدارة.`;

const DEFAULT_SHIPPING_POLICY = `تنويه عند رجوع البضاعه بدون تبليغنا قبل الاسترجاع ب 3 ايام على الاقل سوف يتم خصم قيمه الشحن ذهاب و اياب من العربون المدفوع لدينا.

لديك 7 يوم من تاريخ إستلامك أي سلعة لتقدم طلب ارجاعها.`;

const DEFAULT_TERMS_POLICY = `البيع بالقطعة أو الدستة أو كليهما حسب المنتج.
الأسعار قابلة للتحديث وفق السياسة التجارية.
تأكيد الطلب مرتبط بتوافر المنتج وقت المراجعة.
يحق للإدارة تحديث المنتجات والسياسات من لوحة التحكم.`;

const DEFAULT_PAYMENT_METHODS = [
  { key: 'cash', label: 'كاش', icon: 'fa-solid fa-money-bill-wave' },
];


const DEFAULT_STOREFRONT = {
  companyName: 'Elite Home Ware',
  tagline: 'Homeware & Kitchen',
  heroTitle: 'Elite Home Ware',
  heroSubtitle: 'أدوات منزلية ومطبخ بهوية راقية، وتنظيم احترافي للبيع بالقطعة والدستة.',
  heroBadge: 'قطعة • دستة',
  logoUrl: '',
  accentColor: '#c7a24b',
  accentColor2: '#0b4b3d',
  featuredLimit: 8,
  installEnabled: true,
  floatingWhatsappEnabled: true,
  currencySymbol: 'ل.س',
};


const DEFAULT_COMPANY = {
  companyName: 'Elite Home Ware',
  tagline: 'أدوات منزلية بتصميم راقٍ',
  phone1: '',
  phone2: '',
  whatsapp: '',
  address: '',
  instagram: '',
  facebook: '',
  telegram: '',
  factoryMap: '',
  shopMap: '',
  cloudinaryCloudName: 'elitehome',
  cloudinaryPreset: 'dueuyivqo',
  about: '',
};

const DEFAULT_STORE_SETTINGS = {
  returnPolicy: DEFAULT_RETURN_POLICY,
  shippingPolicy: DEFAULT_SHIPPING_POLICY,
  termsPolicy: DEFAULT_TERMS_POLICY,
  mainCategories: ['المطبخ', 'الضيافة والتقديم', 'التخزين والتنظيم', 'التنظيف'],
  codeCategoryLabels: {},
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

function normalizeStoreSettings(settings = {}) {
  return {
    ...DEFAULT_STORE_SETTINGS,
    ...settings,
    mainCategories: [...new Set([...(Array.isArray(settings?.mainCategories) ? settings.mainCategories : []), ...(Array.isArray(settings?.seasons) ? settings.seasons : []), ...DEFAULT_STORE_SETTINGS.mainCategories].map((item) => String(item || '').trim()).filter(Boolean))],
  };
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  products: [],
  orders: [],
  categories: [],
  company: { ...DEFAULT_COMPANY },
  storefront: { ...DEFAULT_STOREFRONT },
  storeSettings: { ...DEFAULT_STORE_SETTINGS },
  payments: { policyText: DEFAULT_PAYMENT_POLICY, methods: [...DEFAULT_PAYMENT_METHODS] },
  cart: loadLocalJSON(CART_STORAGE_KEY, []),
  authUser: null,
  isAdmin: false,
  editingProductId: null,
  productImagesDraft: [],
  featuredOnlyAdmin: false,
  gallery: { urls: [], index: 0 },
  filter: { search: '', category: 'all', subCategory: 'all', season: 'all', offersOnly: false, sort: 'featured' },
  deferredInstallPrompt: null,
  assetTargetInputId: '',
  filteredProducts: [],
  renderedCount: PRODUCT_PAGE_SIZE,
  renderScheduled: false,
  catalog: { step: 'seasons', selectedSeason: '', selectedCategory: 'all', selectedSubCategory: 'all', hydratedFromUrl: false },
  invoicePreview: { order: null, blob: null, url: '' },
  cache: {
    visibleProductsSource: null,
    visibleProducts: [],
    filterSignature: '',
    filteredProducts: [],
  },
};

const el = {
  siteContent: id('siteContent'),
  overlay: id('overlay'),
  toast: id('toast'),
  menuToggle: id('menuToggle'),
  closeMenu: id('closeMenu'),
  menuDrawer: id('menuDrawer'),
  cartDrawer: id('cartDrawer'),
  adminDrawer: id('adminDrawer'),
  brandTrigger: id('brandTrigger'),
  brandName: id('brandName'),
  brandTagline: id('brandTagline'),
  footerBrandName: id('footerBrandName'),
  brandLogoImage: id('brandLogoImage'),
  brandLogoMark: id('brandLogoMark'),
  installBtn: id('installBtn'),
  menuInstallBtn: id('menuInstallBtn'),
  menuHomeBtn: id('menuHomeBtn'),
  contactBtn: id('contactBtn'),
  cartToggle: id('cartToggle'),
  cartCount: id('cartCount'),
  heroTitle: id('heroTitle'),
  heroSubtitle: id('heroSubtitle'),
  heroBadge: id('heroBadge'),
  catalogFlowStage: id('catalogFlowStage'),
  catalogFlow: id('catalogFlow'),
  toolbarWrap: id('toolbarWrap'),
  productsHeadingRow: id('productsHeadingRow'),
  productsSectionTitle: id('productsSectionTitle'),
  productsCounter: id('productsCounter'),
  categoriesCounter: id('categoriesCounter'),
  subCategoriesCounter: id('subCategoriesCounter'),
  companyAbout: id('companyAbout'),
  searchInput: id('searchInput'),
  sortFilter: id('sortFilter'),
  clearFiltersBtn: id('clearFiltersBtn'),
  visibleCount: id('visibleCount'),
  productsGrid: id('productsGrid'),
  seoCatalog: id('seoCatalog'),
  loadMoreWrap: id('loadMoreWrap'),
  loadMoreBtn: id('loadMoreBtn'),
  emptyState: id('emptyState'),
  menuCategoryList: id('menuCategoryList'),
  menuSeasonList: id('menuSeasonList'),
  menuOffersBtn: id('menuOffersBtn'),
  menuContactBtn: id('menuContactBtn'),
  menuNoticeBtn: id('menuNoticeBtn'),
  menuPaymentBtn: id('menuPaymentBtn'),
  menuReturnBtn: id('menuReturnBtn'),
  menuTermsBtn: id('menuTermsBtn'),
  menuAdminBtn: id('menuAdminBtn'),
  paymentIcons: id('paymentIcons'),
  instagramLink: id('instagramLink'),
  facebookLink: id('facebookLink'),
  telegramLink: id('telegramLink'),
  whatsappLink: id('whatsappLink'),
  modalInstagramLink: id('modalInstagramLink'),
  modalFacebookLink: id('modalFacebookLink'),
  modalTelegramLink: id('modalTelegramLink'),
  modalWhatsappLink: id('modalWhatsappLink'),
  modalFactoryMapLink: id('modalFactoryMapLink'),
  modalShopMapLink: id('modalShopMapLink'),
  floatingWhatsApp: id('floatingWhatsApp'),
  closeCart: id('closeCart'),
  cartItems: id('cartItems'),
  cartItemsCount: id('cartItemsCount'),
  cartTotal: id('cartTotal'),
  checkoutBtn: id('checkoutBtn'),
  closeAdmin: id('closeAdmin'),
  adminLoginSection: id('adminLoginSection'),
  adminContent: id('adminContent'),
  adminEmail: id('adminEmail'),
  adminPassword: id('adminPassword'),
  adminLoginBtn: id('adminLoginBtn'),
  adminLogoutBtn: id('adminLogoutBtn'),
  authStatus: id('authStatus'),
  adminProductsCount: id('adminProductsCount'),
  adminOrdersCount: id('adminOrdersCount'),
  adminCategoriesCount: id('adminCategoriesCount'),
  adminOrdersTotal: id('adminOrdersTotal'),
  adminProductsList: id('adminProductsList'),
  adminOrdersList: id('adminOrdersList'),
  adminTabs: [...document.querySelectorAll('.tab-btn')],
  tabsPanels: [...document.querySelectorAll('.tab-panel')],
  saveAppearanceBtn: id('saveAppearanceBtn'),
  companyNameInput: id('companyNameInput'),
  companyTaglineInput: id('companyTaglineInput'),
  heroTitleInput: id('heroTitleInput'),
  heroSubtitleInput: id('heroSubtitleInput'),
  heroBadgeInput: id('heroBadgeInput'),
  logoUrlInput: id('logoUrlInput'),
  accentColorInput: id('accentColorInput'),
  accentColor2Input: id('accentColor2Input'),
  featuredLimitInput: id('featuredLimitInput'),
  installEnabledInput: id('installEnabledInput'),
  floatingWhatsappInput: id('floatingWhatsappInput'),
  currencySymbolInput: id('currencySymbolInput'),
  saveCompanyBtn: id('saveCompanyBtn'),
  companyPhoneInput: id('companyPhoneInput'),
  companyPhone2Input: id('companyPhone2Input'),
  companyWhatsappInput: id('companyWhatsappInput'),
  companyCloudinaryNameInput: id('companyCloudinaryNameInput'),
  companyAddressInput: id('companyAddressInput'),
  companyInstagramInput: id('companyInstagramInput'),
  companyFacebookInput: id('companyFacebookInput'),
  companyTelegramInput: id('companyTelegramInput'),
  factoryMapInput: id('factoryMapInput'),
  shopMapInput: id('shopMapInput'),
  cloudinaryPresetInput: id('cloudinaryPresetInput'),
  companyAboutInput: id('companyAboutInput'),
  paymentPolicyInput: id('paymentPolicyInput'),
  paymentMethodsInput: id('paymentMethodsInput'),
  defaultPaymentLabelInput: id('defaultPaymentLabelInput'),
  returnPolicyInput: id('returnPolicyInput'),
  shippingPolicyInput: id('shippingPolicyInput'),
  termsPolicyInput: id('termsPolicyInput'),
  savePoliciesBtn: id('savePoliciesBtn'),
  mainCategoriesInput: id('mainCategoriesInput'),
  saveMainCategoriesBtn: id('saveMainCategoriesBtn'),
  categoryManagerList: id('categoryManagerList'),
  productFormTitle: id('productFormTitle'),
  productNameInput: id('productNameInput'),
  productModelInput: id('productModelInput'),
  productPriceInput: id('productPriceInput'),
  productWholesalePriceInput: id('productWholesalePriceInput'),
  productDiscountInput: id('productDiscountInput'),
  productMainCategoryInput: id('productMainCategoryInput'),
  productSaleModeInput: id('productSaleModeInput'),
  productSubCategoryInput: id('productSubCategoryInput'),
  productSizesInput: id('productSizesInput'),
  productPackQtyInput: id('productPackQtyInput'),
  productBadgeInput: id('productBadgeInput'),
  productPinnedInput: id('productPinnedInput'),
  productVisibleInput: id('productVisibleInput'),
  productDescriptionInput: id('productDescriptionInput'),
  productImageUrlsInput: id('productImageUrlsInput'),
  productImagesInput: id('productImagesInput'),
  saveProductBtn: id('saveProductBtn'),
  resetProductBtn: id('resetProductBtn'),
  uploadStatus: id('uploadStatus'),
  productImagesPreview: id('productImagesPreview'),
  togglePinnedFilterBtn: id('togglePinnedFilterBtn'),
  exportOrdersBtn: id('exportOrdersBtn'),
  exportProductsBtn: id('exportProductsBtn'),
  excelImportInput: id('excelImportInput'),
  deleteProductsBtn: id('deleteProductsBtn'),
  deleteOrdersBtn: id('deleteOrdersBtn'),
  deleteAllDataBtn: id('deleteAllDataBtn'),
  contactModal: id('contactModal'),
  policyModal: id('policyModal'),
  policyModalTitle: id('policyModalTitle'),
  policyModalContent: id('policyModalContent'),
  imageModal: id('imageModal'),
  modalImage: id('modalImage'),
  galleryPrev: id('galleryPrev'),
  galleryNext: id('galleryNext'),
  galleryThumbs: id('galleryThumbs'),
  checkoutModal: id('checkoutModal'),
  invoiceModal: id('invoiceModal'),
  invoicePreviewImage: id('invoicePreviewImage'),
  invoiceDownloadBtn: id('invoiceDownloadBtn'),
  invoiceWhatsappBtn: id('invoiceWhatsappBtn'),
  quickProductModal: id('quickProductModal'),
  quickProductImage: id('quickProductImage'),
  quickProductName: id('quickProductName'),
  quickProductModel: id('quickProductModel'),
  quickProductPriceLabel: id('quickProductPriceLabel'),
  quickProductPrice: id('quickProductPrice'),
  quickProductSeries: id('quickProductSeries'),
  quickProductSizes: id('quickProductSizes'),
  quickProductCategory: id('quickProductCategory'),
  quickProductSeason: id('quickProductSeason'),
  quickProductOpenPage: id('quickProductOpenPage'),
  quickProductAddBtn: id('quickProductAddBtn'),
  customerNameInput: id('customerNameInput'),
  customerPhoneInput: id('customerPhoneInput'),
  customerCityInput: id('customerCityInput'),
  customerAddressInput: id('customerAddressInput'),
  paymentMethodInput: id('paymentMethodInput'),
  shippingMethodInput: id('shippingMethodInput'),
  customerNotesInput: id('customerNotesInput'),
  checkoutItemsCount: id('checkoutItemsCount'),
  checkoutPreviewItems: id('checkoutPreviewItems'),
  checkoutPreviewTotal: id('checkoutPreviewTotal'),
  cartScreenTotalText: id('cartScreenTotalText'),
  submitOrderBtn: id('submitOrderBtn'),
  singleAssetUploader: id('singleAssetUploader'),
  uploadTriggers: [...document.querySelectorAll('.upload-trigger')],
};

ensureButtonTypes();

function ensureButtonTypes() {
  document.querySelectorAll('button:not([type])').forEach((button) => {
    button.type = 'button';
  });
}

function bindPress(target, handler) {
  if (!target || typeof handler !== 'function') return;
  let lastPointerTs = 0;
  target.addEventListener('pointerup', (event) => {
    lastPointerTs = Date.now();
    event.preventDefault();
    handler(event);
  }, { passive: false });
  target.addEventListener('click', (event) => {
    if (Date.now() - lastPointerTs < 450) {
      event.preventDefault();
      return;
    }
    handler(event);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => queueMicrotask(boot), { once: true });
} else {
  queueMicrotask(boot);
}

function boot() {
  setPersistence(auth, browserSessionPersistence).catch(console.error);
  bindUI();
  syncDrawerAccessibility('');
  hydrateCatalogFromUrl();
  initTabs();
  subscribeData();
  renderCart();
  applyTheme();
  renderStorefront();
  handleInitialCartRoute();
  onAuthStateChanged(auth, handleAuthChange);
  setupInstallPrompt();
  registerServiceWorker();
}

function bindUI() {
  const debouncedSearch = debounce(() => { state.filter.search = el.searchInput.value.trim().toLowerCase(); resetRenderedProducts(); applyFilters(); }, 120);
  bindPress(el.menuToggle, () => openDrawer('menu'));
  bindPress(el.closeMenu, closeDrawers);
  bindPress(el.brandTrigger, () => openDrawer('admin'));
  if (el.menuAdminBtn) {
    el.menuAdminBtn.hidden = true;
    el.menuAdminBtn.setAttribute('aria-hidden', 'true');
    el.menuAdminBtn.setAttribute('tabindex', '-1');
  }
  bindPress(el.cartToggle, () => openDrawer('cart'));
  bindPress(el.closeCart, closeDrawers);
  bindPress(el.closeAdmin, closeDrawers);
  // Important: do not stop events on the admin drawer during capture phase.
  // Doing that prevents inner buttons like login, save, tabs and delete from receiving clicks.
  ['click', 'pointerup', 'touchend'].forEach((type) => {
    el.adminDrawer.addEventListener(type, (event) => {
      if (event.target === el.adminDrawer) event.stopPropagation();
    });
  });
  ['menuDrawer', 'cartDrawer', 'adminDrawer'].forEach((drawerKey) => {
    const drawer = el[drawerKey];
    if (!drawer) return;
    drawer.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('button, a, input, textarea, select, label, summary, [role="button"], .cart-item, .admin-item, .category-item, .order-item, .panel-card, .auth-box, .tab-panel, .menu-link-btn, .chip-grid, .drawer-screen-card, .qty-box')) return;
      if (target.closest('.drawer-head-copy, .drawer-kicker, h3, strong, span.muted')) return;
      closeDrawers();
    });
  });
  el.overlay.addEventListener('click', closeDrawers);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('drawer-open')) closeDrawers();
  });
  window.addEventListener('hashchange', handleInitialCartRoute);
  el.contactBtn.addEventListener('click', () => openModal('contactModal'));
  el.menuHomeBtn.addEventListener('click', () => { goToSeasonsView({ closeAfter: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  el.menuContactBtn.addEventListener('click', () => { closeDrawers(); openModal('contactModal'); });
  el.menuNoticeBtn.addEventListener('click', () => openPolicy('التنويه', state.storeSettings.shippingPolicy || DEFAULT_SHIPPING_POLICY));
  el.menuPaymentBtn.addEventListener('click', () => openPolicy('سياسة الدفع', state.payments.policyText || DEFAULT_PAYMENT_POLICY));
  el.menuReturnBtn.addEventListener('click', () => openPolicy('سياسة الاستبدال والاسترجاع', state.storeSettings.returnPolicy || DEFAULT_RETURN_POLICY));
  el.menuTermsBtn.addEventListener('click', () => openPolicy('الشروط', state.storeSettings.termsPolicy || DEFAULT_TERMS_POLICY));
  el.menuOffersBtn.addEventListener('click', () => {
    if (state.catalog.step !== 'products') {
      state.catalog.step = 'products';
      state.filter.season = state.catalog.selectedSeason || 'all';
      state.filter.category = state.catalog.selectedCategory || 'all';
    }
    state.filter.offersOnly = !state.filter.offersOnly;
    resetRenderedProducts();
    applyFilters();
    closeDrawers();
    scrollProductsTop();
  });
  el.installBtn.addEventListener('click', installPwa);
  el.menuInstallBtn.addEventListener('click', installPwa);
  el.searchInput.addEventListener('input', debouncedSearch);
  el.sortFilter.addEventListener('change', () => { state.filter.sort = el.sortFilter.value; resetRenderedProducts(); applyFilters(); });
  el.clearFiltersBtn.addEventListener('click', clearFilters);
  el.loadMoreBtn.addEventListener('click', renderMoreProducts);
  el.floatingWhatsApp.addEventListener('click', openWhatsAppDirect);
  bindExternalLinkButton(el.instagramLink, () => state.company.instagram);
  bindExternalLinkButton(el.facebookLink, () => state.company.facebook);
  bindExternalLinkButton(el.telegramLink, () => state.company.telegram);
  bindExternalLinkButton(el.whatsappLink, () => buildWhatsAppLink());
  bindExternalLinkButton(el.modalInstagramLink, () => state.company.instagram);
  bindExternalLinkButton(el.modalFacebookLink, () => state.company.facebook);
  bindExternalLinkButton(el.modalTelegramLink, () => state.company.telegram);
  bindExternalLinkButton(el.modalWhatsappLink, () => buildWhatsAppLink());
  bindExternalLinkButton(el.modalFactoryMapLink, () => state.company.factoryMap);
  bindExternalLinkButton(el.modalShopMapLink, () => state.company.shopMap);
  el.checkoutBtn.addEventListener('click', () => {
    if (!state.cart.length) return showToast('السلة فارغة');
    openModal('checkoutModal');
  });
  el.submitOrderBtn.addEventListener('click', submitOrder);
  el.invoiceDownloadBtn?.addEventListener('click', () => downloadActiveInvoice());
  el.invoiceWhatsappBtn?.addEventListener('click', () => openInvoiceWhatsApp());
  ['click', 'pointerup', 'touchend'].forEach((eventName) => {
    el.adminLoginBtn.addEventListener(eventName, (e) => {
      e.preventDefault();
      adminLogin();
    }, { passive: false });
    el.adminLogoutBtn.addEventListener(eventName, (e) => {
      e.preventDefault();
      adminLogout();
    }, { passive: false });
  });
  [el.adminEmail, el.adminPassword].forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        adminLogin();
      }
    });
  });
  el.saveAppearanceBtn.addEventListener('click', saveAppearance);
  el.saveCompanyBtn.addEventListener('click', saveCompanyData);
  el.savePoliciesBtn.addEventListener('click', savePolicies);
  el.saveMainCategoriesBtn.addEventListener('click', saveMainCategories);
  el.saveProductBtn.addEventListener('click', saveProduct);
  el.resetProductBtn.addEventListener('click', resetProductForm);
  el.productImageUrlsInput.addEventListener('input', syncDraftImagesFromTextarea);
  el.productImagesInput.addEventListener('change', handleProductFileUpload);
  el.exportProductsBtn.addEventListener('click', exportProductsExcel);
  el.exportOrdersBtn.addEventListener('click', exportOrdersExcel);
  el.excelImportInput.addEventListener('change', importProductsExcel);
  el.deleteProductsBtn.addEventListener('click', () => deleteCollectionDocs('products', 'اكتب حذف المنتجات'));
  el.deleteOrdersBtn.addEventListener('click', () => deleteCollectionDocs('orders', 'اكتب حذف الطلبات'));
  el.deleteAllDataBtn.addEventListener('click', deleteAllData);
  el.togglePinnedFilterBtn.addEventListener('click', togglePinnedAdminFilter);
  el.galleryPrev.addEventListener('click', () => changeGallery(-1));
  el.galleryNext.addEventListener('click', () => changeGallery(1));
  el.singleAssetUploader.addEventListener('change', handleSingleAssetUpload);
  el.uploadTriggers.forEach((btn) => btn.addEventListener('click', () => {
    if (!guardAdmin()) return;
    state.assetTargetInputId = btn.dataset.targetInput;
    el.singleAssetUploader.click();
  }));
  document.querySelectorAll('.modal-close').forEach((btn) => {
    ['click', 'pointerup', 'touchend'].forEach((eventName) => {
      btn.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeModal(e.currentTarget.dataset.close);
      }, { passive: false });
    });
  });
  [el.contactModal, el.policyModal, el.imageModal, el.checkoutModal, el.invoiceModal, el.quickProductModal].filter(Boolean).forEach((modal) => {
    ['click', 'pointerup', 'touchend'].forEach((eventName) => {
      modal.addEventListener(eventName, (e) => {
        if (e.target === modal) {
          e.preventDefault();
          closeModal(modal.id);
        }
      }, { passive: false });
    });
  });
  el.quickProductAddBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const productId = e.currentTarget.dataset.productId;
    const saleUnit = e.currentTarget.dataset.saleUnit || '';
    if (!productId) return;
    addToCart(productId, saleUnit);
  });
  el.quickProductImage?.addEventListener('click', () => {
    const src = el.quickProductImage?.dataset.fullImage || el.quickProductImage?.src;
    if (!src) return;
    openGallery([src], 0);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.querySelector('.modal.show')) {
      const activeModal = document.querySelector('.modal.show');
      if (activeModal?.id) closeModal(activeModal.id);
    }
  });
}

function initTabs() {
  el.adminTabs.forEach((btn) => btn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    el.adminTabs.forEach((item) => item.classList.toggle('active', item === btn));
    el.tabsPanels.forEach((panel) => panel.classList.toggle('active', panel.id === btn.dataset.tab));
  }));
}

function subscribeData() {
  onSnapshot(collection(db, 'products'), (snapshot) => {
    state.products = snapshot.docs.map((entry) => enrichProduct(normalizeProductRecord({ id: entry.id, ...entry.data() })));
    state.products.sort((a, b) => toMillis(b.createdAt || b.updatedAt) - toMillis(a.createdAt || a.updatedAt));
    state.cache.visibleProductsSource = null;
    state.cache.filterSignature = '';
    state.cache.filteredProducts = [];
    resetRenderedProducts();
    scheduleRenderEverything();
  }, console.error);
  onSnapshot(collection(db, 'categories'), (snapshot) => {
    state.categories = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    scheduleRenderEverything();
  }, console.error);
  onSnapshot(doc(db, 'company', 'main'), (entry) => {
    state.company = { ...DEFAULT_COMPANY, ...(entry.exists() ? entry.data() : {}) };
    scheduleRenderEverything();
  }, console.error);
  onSnapshot(doc(db, 'settings', 'storefront'), (entry) => {
    state.storefront = { ...DEFAULT_STOREFRONT, ...(entry.exists() ? entry.data() : {}) };
    applyTheme();
    scheduleRenderEverything();
  }, console.error);
  onSnapshot(doc(db, 'settings', 'store'), (entry) => {
    state.storeSettings = normalizeStoreSettings(entry.exists() ? entry.data() : {});
    scheduleRenderEverything();
  }, console.error);
  onSnapshot(doc(db, 'payments', 'default'), (entry) => {
    const rawPayments = { policyText: DEFAULT_PAYMENT_POLICY, methods: [...DEFAULT_PAYMENT_METHODS], ...(entry.exists() ? entry.data() : {}) };
    state.payments = { ...rawPayments, methods: normalizePaymentMethods(rawPayments.methods, rawPayments.defaultMethodLabel || 'كاش') };
    scheduleRenderEverything();
  }, console.error);
  onSnapshot(doc(db, 'shipping', 'default'), (entry) => {
    const data = entry.exists() ? entry.data() : {};
    state.storeSettings.shippingPolicy = data.policyText || state.storeSettings.shippingPolicy || DEFAULT_SHIPPING_POLICY;
    scheduleRenderEverything();
  }, console.error);
}

let unsubscribeOrders = null;

function scheduleRenderEverything() {
  if (state.renderScheduled) return;
  state.renderScheduled = true;
  requestAnimationFrame(() => {
    state.renderScheduled = false;
    renderEverything();
  });
}

function subscribeOrdersIfAdmin() {
  if (!state.isAdmin) {
    if (unsubscribeOrders) {
      unsubscribeOrders();
      unsubscribeOrders = null;
    }
    state.orders = [];
    scheduleRenderEverything();
    return;
  }
  if (unsubscribeOrders) return;
  unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
    state.orders = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    state.orders.sort((a, b) => toMillis(b.createdAt || b.updatedAt) - toMillis(a.createdAt || a.updatedAt));
    scheduleRenderEverything();
  }, (error) => {
    console.error(error);
    state.orders = [];
    scheduleRenderEverything();
    showToast('لا يمكن عرض الطلبات إلا بعد دخول الأدمن');
  });
}

function renderAll() { renderEverything(); }

function renderEverything() {
  renderStorefront();
  rebuildSeasonOptions();
  renderCategoryManager();
  renderAdminForms();
  renderAdminProducts();
  renderAdminOrders();
  applyFilters();
  renderCart();
}

function renderStorefront() {
  const companyName = state.company.companyName || state.storefront.companyName || DEFAULT_COMPANY.companyName;
  const tagline = state.company.tagline || state.storefront.tagline || DEFAULT_COMPANY.tagline;
  el.brandName.textContent = companyName;
  el.brandTagline.textContent = tagline;
  el.footerBrandName.textContent = companyName;
  el.heroTitle.textContent = state.storefront.heroTitle || DEFAULT_STOREFRONT.heroTitle;
  el.heroSubtitle.textContent = state.storefront.heroSubtitle || DEFAULT_STOREFRONT.heroSubtitle;
  el.heroBadge.textContent = state.storefront.heroBadge || DEFAULT_STOREFRONT.heroBadge;
  el.companyAbout.textContent = state.company.about || '';
  const logoUrl = state.storefront.logoUrl || '';
  if (logoUrl) {
    el.brandLogoImage.src = logoUrl;
    el.brandLogoImage.classList.remove('hidden');
    el.brandLogoMark.classList.add('hidden');
  } else {
    el.brandLogoImage.classList.add('hidden');
    el.brandLogoMark.classList.remove('hidden');
    el.brandLogoMark.textContent = initials(companyName);
  }
  setActionLink(el.instagramLink, '');
  setActionLink(el.facebookLink, '');
  setActionLink(el.telegramLink, '');
  setActionLink(el.whatsappLink, '');
  setActionLink(el.modalInstagramLink, state.company.instagram);
  setActionLink(el.modalFacebookLink, state.company.facebook);
  setActionLink(el.modalTelegramLink, state.company.telegram);
  setActionLink(el.modalWhatsappLink, buildWhatsAppLink());
  setActionLink(el.modalFactoryMapLink, state.company.factoryMap);
  setActionLink(el.modalShopMapLink, state.company.shopMap);
  const visibleProducts = getVisibleProducts();
  el.productsCounter.textContent = visibleProducts.length.toLocaleString('en-US');
  el.categoriesCounter.textContent = getSeasonOptions().length.toLocaleString('en-US');
  el.subCategoriesCounter.textContent = getSubCategoryKeys().length.toLocaleString('en-US');
  el.floatingWhatsApp.classList.toggle('hidden', !state.storefront.floatingWhatsappEnabled || !normalizeWhatsAppNumber(state.company.whatsapp || state.company.phone1));
  const showInstall = state.storefront.installEnabled && Boolean(state.deferredInstallPrompt);
  el.installBtn.classList.toggle('hidden', !showInstall);
  el.menuInstallBtn.classList.toggle('hidden', !showInstall);
  renderPaymentIcons();
  hydrateCheckoutPaymentMethods();
  syncSiteMeta();
  syncDynamicStructuredData();
}

function renderPaymentIcons() {
  const methods = Array.isArray(state.payments.methods) && state.payments.methods.length ? state.payments.methods : DEFAULT_PAYMENT_METHODS;
  el.paymentIcons.innerHTML = '';
  methods.forEach((method) => {
    const item = document.createElement('div');
    item.className = `pay-icon ${method.key}`;
    item.innerHTML = `<i class="${method.icon || 'fa-solid fa-wallet'}"></i><span>${escapeHTML(method.label || '')}</span>`;
    el.paymentIcons.appendChild(item);
  });
}


function hydrateCheckoutPaymentMethods() {
  if (!el.paymentMethodInput) return;
  const methods = normalizePaymentMethods(state.payments.methods, state.payments.defaultMethodLabel || 'كاش');
  const currentValue = String(state.payments.defaultMethodLabel || el.paymentMethodInput.value || methods[0]?.label || 'كاش').trim() || 'كاش';
  el.paymentMethodInput.innerHTML = methods.map((method) => `<option value="${escapeAttr(method.label)}">${escapeHTML(method.label)}</option>`).join('');
  const matched = methods.find((method) => method.label === currentValue);
  el.paymentMethodInput.value = matched?.label || methods[0]?.label || 'كاش';
}

function parsePaymentMethodsText(text, defaultLabel = 'كاش') {
  const labels = String(text || '').split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  const seed = labels.length ? labels : [String(defaultLabel || 'كاش').trim() || 'كاش'];
  return normalizePaymentMethods(seed.map((label) => ({ key: slugifyKey(label), label, icon: getPaymentIconForLabel(label) })), defaultLabel);
}

function normalizePaymentMethods(methods, defaultLabel = 'كاش') {
  const normalized = (Array.isArray(methods) ? methods : []).map((method) => {
    if (typeof method === 'string') {
      const label = method.trim();
      if (!label) return null;
      return { key: slugifyKey(label), label, icon: getPaymentIconForLabel(label) };
    }
    const label = String(method?.label || '').trim();
    if (!label) return null;
    return {
      key: String(method?.key || slugifyKey(label)).trim() || slugifyKey(label),
      label,
      icon: method?.icon || getPaymentIconForLabel(label),
    };
  }).filter(Boolean);
  if (!normalized.length) {
    const fallback = String(defaultLabel || 'كاش').trim() || 'كاش';
    return [{ key: slugifyKey(fallback), label: fallback, icon: getPaymentIconForLabel(fallback) }];
  }
  const seen = new Set();
  return normalized.filter((item) => {
    const token = `${item.key}|${item.label}`;
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
}

function slugifyKey(value) {
  return String(value || 'cash').trim().toLowerCase()
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'cash';
}

function getPaymentIconForLabel(label) {
  const text = String(label || '').toLowerCase();
  if (text.includes('كاش') || text.includes('cash') || text.includes('نقد')) return 'fa-solid fa-money-bill-wave';
  if (text.includes('bank') || text.includes('بنك') || text.includes('تحويل')) return 'fa-solid fa-building-columns';
  if (text.includes('محفظ') || text.includes('wallet') || text.includes('pay')) return 'fa-solid fa-wallet';
  return 'fa-solid fa-credit-card';
}

function renderMenu() {
  const selectedSeason = String(state.filter.season || 'all').trim() || 'all';
  const selectedSubCategory = String(state.filter.subCategory || 'all').trim() || 'all';
  const safeSeason = selectedSeason === 'all' ? '' : selectedSeason;
  const menuSubCategories = getSubCategoryKeys({ season: safeSeason, category: 'all' });
  const seasonOptions = getSeasonOptions();

  el.menuCategoryList.innerHTML = '';
  el.menuCategoryList.appendChild(makeFilterChip('الكل', selectedSubCategory === 'all', () => {
    if (selectedSeason !== 'all') {
      activateCatalogProducts(selectedSeason, 'all', { closeAfter: true, preserveSort: true, subCategory: 'all' });
    } else {
      goToSeasonsView({ closeAfter: true });
    }
  }, { countBadge: menuSubCategories.length || 0 }));
  menuSubCategories.forEach((label) => {
    const count = getVisibleProducts().filter((item) => {
      const seasonMatches = !safeSeason || String(getProductMainCategory(item) || '').trim() === safeSeason;
      return seasonMatches && getProductSubCategory(item) === label;
    }).length;
    el.menuCategoryList.appendChild(makeFilterChip(label, selectedSubCategory === label, () => {
      activateCatalogProducts(safeSeason, 'all', { closeAfter: true, preserveSort: true, subCategory: label });
    }, { countBadge: count || null }));
  });

  el.menuSeasonList.innerHTML = '';
  el.menuSeasonList.appendChild(makeFilterChip('الكل', selectedSeason === 'all', () => {
    goToSeasonsView({ closeAfter: true });
  }));
  seasonOptions.forEach((section) => {
    const count = getProductsForSeason(section).length;
    el.menuSeasonList.appendChild(makeFilterChip(section, selectedSeason === section, () => {
      activateCatalogProducts(section, 'all', { closeAfter: true, preserveSort: true, subCategory: 'all' });
    }, { countBadge: count || null }));
  });
  el.menuOffersBtn.classList.toggle('active', state.filter.offersOnly);
}

function makeFilterChip(label, active, onClick, options = {}) {
  const { countBadge = null } = options;
  const btn = document.createElement('button');
  btn.className = `filter-chip ${active ? 'active' : ''}`;
  btn.innerHTML = countBadge !== null && countBadge !== undefined && countBadge !== ''
    ? `<span>${escapeHTML(label)}</span><b>${escapeHTML(String(countBadge))}</b>`
    : `<span>${escapeHTML(label)}</span>`;
  btn.addEventListener('click', onClick);
  return btn;
}

function hydrateCatalogFromUrl() {
  if (state.catalog.hydratedFromUrl) return;
  const url = new URL(window.location.href);
  const mainCategory = String(url.searchParams.get('category') || url.searchParams.get('season') || '').trim();
  const subCategory = String(url.searchParams.get('subcat') || '').trim();
  if (mainCategory) {
    state.catalog.selectedSeason = mainCategory;
    state.catalog.selectedCategory = 'all';
    state.catalog.selectedSubCategory = subCategory || 'all';
    state.catalog.step = 'products';
    state.filter.season = mainCategory;
    state.filter.category = 'all';
    state.filter.subCategory = subCategory || 'all';
  }
  state.catalog.hydratedFromUrl = true;
}

function syncCatalogRoute() {
  if (!window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.delete('season');
  url.searchParams.delete('prefix');
  url.searchParams.delete('subcat');
  url.searchParams.delete('screen');
  url.searchParams.delete('category');
  if (state.catalog.step === 'products' && state.catalog.selectedSeason) {
    url.searchParams.set('screen', 'products');
    url.searchParams.set('category', state.catalog.selectedSeason);
    if (state.catalog.selectedSubCategory && state.catalog.selectedSubCategory !== 'all') {
      url.searchParams.set('subcat', state.catalog.selectedSubCategory);
    }
  }
  window.history.replaceState(null, '', url.toString());
}

function resetCatalogSearch(preserveSort = false) {
  state.filter.search = '';
  state.filter.offersOnly = false;
  el.searchInput.value = '';
  if (!preserveSort) {
    state.filter.sort = 'featured';
    el.sortFilter.value = 'featured';
  }
}

function goToSeasonsView({ closeAfter = false } = {}) {
  state.catalog.step = 'seasons';
  state.catalog.selectedSeason = '';
  state.catalog.selectedCategory = 'all';
  state.catalog.selectedSubCategory = 'all';
  resetCatalogSearch(true);
  state.filter.season = 'all';
  state.filter.category = 'all';
  state.filter.subCategory = 'all';
  resetRenderedProducts();
  if (closeAfter) closeDrawers();
  applyFilters();
  requestAnimationFrame(scrollCatalogTop);
}

function goToSeasonPrefixes(season, { closeAfter = false } = {}) {
  const safeSeason = String(season || '').trim();
  if (!safeSeason) return goToSeasonsView({ closeAfter });
  activateCatalogProducts(safeSeason, 'all', { closeAfter, preserveSort: true, subCategory: 'all' });
}

function activateCatalogProducts(season = '', category = 'all', options = {}) {
  const { closeAfter = false, scrollIntoView = true, preserveSort = false, subCategory = 'all' } = options || {};
  const safeSeason = String(season || '').trim();
  const safeSubCategory = normalizeSubCategory(subCategory) || 'all';
  state.catalog.step = 'products';
  state.catalog.selectedSeason = safeSeason;
  state.catalog.selectedCategory = 'all';
  state.catalog.selectedSubCategory = safeSubCategory;
  resetCatalogSearch(preserveSort);
  state.filter.season = safeSeason || 'all';
  state.filter.category = 'all';
  state.filter.subCategory = safeSubCategory;
  resetRenderedProducts();
  if (closeAfter) closeDrawers();
  applyFilters();
  if (scrollIntoView) requestAnimationFrame(scrollProductsTop);
}

function scrollCatalogTop() {
  el.catalogFlowStage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollProductsTop() {
  (el.productsHeadingRow || el.toolbarWrap || el.productsGrid)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getProductsForSeason(season) {
  const safeSeason = String(season || '').trim();
  return getVisibleProducts().filter((item) => !safeSeason || String(getProductMainCategory(item) || '').trim() === safeSeason);
}

function getCategoryKeysForSeason(season) {
  return [...new Set(getProductsForSeason(season).map((item) => String(item.codeCategory || deriveCodeCategory(item.model))).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

function normalizeSubCategory(value) {
  return String(value || '').trim();
}

function getProductSubCategory(product) {
  return normalizeSubCategory(product?.subCategory || product?.subcategory || product?.groupLabel || '');
}

function getSubCategoryKeys({ season = '', category = 'all' } = {}) {
  const safeSeason = String(season || '').trim();
  const safeCategory = String(category || 'all').trim() || 'all';
  return [...new Set(
    getVisibleProducts()
      .filter((item) => !safeSeason || String(getProductMainCategory(item) || '').trim() === safeSeason)
      .filter((item) => safeCategory === 'all' || String(item.codeCategory || deriveCodeCategory(item.model)) === safeCategory)
      .map((item) => getProductSubCategory(item))
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'ar', { numeric: true, sensitivity: 'base' }));
}

function getRepresentativeImage(items = []) {
  for (const item of items) {
    const url = normalizeImageUrls(item?.imageUrls)[0];
    if (url) return getProductThumbUrl(url);
  }
  return '';
}

function getSeasonIcon(season) {
  const value = String(season || '').trim();
  if (/صيف/i.test(value)) return 'fa-sun';
  if (/شت/i.test(value)) return 'fa-snowflake';
  if (/خريف/i.test(value)) return 'fa-leaf';
  if (/ربيع/i.test(value)) return 'fa-seedling';
  if (/رمضان|ضيافة|مائدة/i.test(value)) return 'fa-champagne-glasses';
  return 'fa-kitchen-set';
}

function getPrefixIcon(code, label) {
  const text = `${label || ''} ${code || ''}`;
  if (/مطبخ|طبخ|أواني/i.test(text)) return 'fa-kitchen-set';
  if (/تنظيم|تخزين/i.test(text)) return 'fa-box-open';
  if (/ضيافة|تقديم/i.test(text)) return 'fa-champagne-glasses';
  if (/تنظيف/i.test(text)) return 'fa-pump-soap';
  const icons = ['fa-kitchen-set', 'fa-layer-group', 'fa-box-open', 'fa-tags', 'fa-bag-shopping', 'fa-wine-glass'];
  const seed = String(code || label || '0').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return icons[seed % icons.length];
}

function buildCatalogCard({ kind = 'season', title = '', subtitle = '', meta = '', count = 0, icon = 'fa-kitchen-set', image = '', season = '', category = '', action = '', accent = '' }) {
  const mediaStyle = image ? ` style="background-image:url('${escapeAttr(image)}')"` : '';
  const accentClass = accent ? ` ${accent}` : '';
  return `
    <button class="catalog-card ${kind === 'season' ? 'catalog-card--season' : 'catalog-card--prefix'}${accentClass}" data-action="${escapeAttr(action)}" data-season="${escapeAttr(season)}" data-category="${escapeAttr(category)}">
      <span class="catalog-card__media"${mediaStyle}>
        <span class="catalog-card__veil"></span>
        <span class="catalog-card__icon"><i class="fa-solid ${escapeAttr(icon)}"></i></span>
      </span>
      <span class="catalog-card__body">
        <strong>${escapeHTML(title)}</strong>
        <span class="catalog-card__subtitle">${escapeHTML(subtitle)}</span>
        <span class="catalog-card__meta">
          <small>${escapeHTML(meta)}</small>
          <b>${Number(count || 0).toLocaleString('en-US')}</b>
        </span>
      </span>
    </button>`;
}

function syncCatalogHero() {
  const step = state.catalog.step;
  const selectedMainCategory = state.catalog.selectedSeason;
  const selectedSubCategory = state.catalog.selectedSubCategory;
  const defaultTitle = state.storefront.heroTitle || DEFAULT_STOREFRONT.heroTitle;
  const defaultSubtitle = state.storefront.heroSubtitle || DEFAULT_STOREFRONT.heroSubtitle;
  const defaultBadge = state.storefront.heroBadge || DEFAULT_STOREFRONT.heroBadge;
  let title = defaultTitle;
  let subtitle = defaultSubtitle;
  let badge = defaultBadge;
  let sectionTitle = 'المنتجات';
  if (step === 'seasons') {
    title = 'الأقسام الرئيسية';
    subtitle = 'اختر القسم المناسب ثم انتقل مباشرة إلى المنتجات والتصنيفات الفرعية.';
    badge = 'تنظيم فاخر';
    sectionTitle = 'المنتجات';
  } else if (step === 'products') {
    title = selectedSubCategory && selectedSubCategory !== 'all' ? selectedSubCategory : (selectedMainCategory || defaultTitle);
    subtitle = selectedSubCategory && selectedSubCategory !== 'all'
      ? `${selectedMainCategory} • ${selectedSubCategory}`
      : (selectedMainCategory ? `عرض منظم لكل منتجات قسم ${selectedMainCategory}.` : defaultSubtitle);
    badge = selectedSubCategory && selectedSubCategory !== 'all' ? 'تصنيف فرعي' : (selectedMainCategory ? 'قسم رئيسي' : defaultBadge);
    sectionTitle = selectedSubCategory && selectedSubCategory !== 'all' ? selectedSubCategory : (selectedMainCategory ? `منتجات ${selectedMainCategory}` : 'المنتجات');
  }
  el.heroTitle.textContent = title;
  el.heroSubtitle.textContent = subtitle;
  el.heroBadge.textContent = badge;
  if (el.productsSectionTitle) el.productsSectionTitle.textContent = sectionTitle;
}

function renderCatalogFlow() {
  if (!el.catalogFlow) return;
  const step = state.catalog.step;
  const selectedMainCategory = state.catalog.selectedSeason;
  const selectedSubCategory = state.catalog.selectedSubCategory || 'all';
  const mainCategoryOptions = getSeasonOptions();
  const sectionCards = mainCategoryOptions.map((section) => {
    const items = getProductsForSeason(section);
    return buildCatalogCard({
      kind: 'season',
      title: section,
      subtitle: 'ادخل إلى منتجات القسم',
      meta: 'منتج',
      count: items.length,
      icon: getSeasonIcon(section),
      image: getRepresentativeImage(items),
      season: section,
      action: 'season'
    });
  }).join('');

  let html = '';
  if (step === 'seasons') {
    html = `
      <div class="catalog-browser-card catalog-browser-card--ultra">
        <div class="catalog-browser-head">
          <div>
            <span class="catalog-kicker">Elite Home Ware</span>
            <h2>الأقسام الرئيسية</h2>
            <p>تنظيم احترافي للأدوات المنزلية حسب القسم ثم التصنيف الفرعي.</p>
          </div>
        </div>
        <div class="catalog-browser-grid season-grid">${sectionCards}</div>
      </div>`;
  } else {
    const categoryItems = selectedMainCategory ? getProductsForSeason(selectedMainCategory) : getVisibleProducts();
    const subCategoryKeys = getSubCategoryKeys({ season: selectedMainCategory, category: 'all' });
    const subCategoryChips = ['all', ...subCategoryKeys].map((label) => {
      const isAll = label === 'all';
      const count = isAll
        ? categoryItems.length
        : categoryItems.filter((item) => getProductSubCategory(item) === label).length;
      return `<button class="prefix-filter-chip ${selectedSubCategory === label ? 'active' : ''}" data-action="filter-subcategory" data-season="${escapeAttr(selectedMainCategory)}" data-subcategory="${escapeAttr(label)}"><span>${escapeHTML(isAll ? 'كل التصنيفات' : label)}</span><b>${count.toLocaleString('en-US')}</b></button>`;
    }).join('');

    const title = selectedSubCategory !== 'all' ? selectedSubCategory : (selectedMainCategory || 'المتجر');
    const description = selectedSubCategory !== 'all'
      ? `عرض منتجات ${selectedSubCategory} داخل قسم ${selectedMainCategory}.`
      : `جميع منتجات قسم ${selectedMainCategory} مع تصفية ذكية حسب التصنيف الفرعي.`;

    html = `
      <div class="catalog-browser-card catalog-browser-card--ultra">
        <div class="catalog-breadcrumb">
          <button class="crumb-btn" data-action="go-seasons">الأقسام الرئيسية</button>
          ${selectedMainCategory ? `<span class="crumb-sep"><i class="fa-solid fa-angle-left"></i></span><span class="crumb-pill active">${escapeHTML(selectedMainCategory)}</span>` : ''}
          ${selectedSubCategory !== 'all' ? `<span class="crumb-sep"><i class="fa-solid fa-angle-left"></i></span><span class="crumb-pill active">${escapeHTML(selectedSubCategory)}</span>` : ''}
        </div>
        <div class="catalog-browser-head catalog-browser-head--split">
          <div>
            <span class="catalog-kicker">${escapeHTML(selectedMainCategory || 'Elite Home Ware')}</span>
            <h2>${escapeHTML(title)}</h2>
            <p>${escapeHTML(description)}</p>
          </div>
          <button class="catalog-back-btn" data-action="go-seasons">
            <i class="fa-solid fa-grid-2"></i>
            <span>كل الأقسام</span>
          </button>
        </div>
        <div class="prefix-filters-stack">
          <div class="prefix-filters-bar">${subCategoryChips}</div>
        </div>
      </div>`;
  }

  el.catalogFlow.innerHTML = html;
  el.catalogFlow.querySelectorAll('[data-action="season"]').forEach((btn) => btn.addEventListener('click', () => activateCatalogProducts(btn.dataset.season, 'all', { preserveSort: true })));
  el.catalogFlow.querySelectorAll('[data-action="filter-subcategory"]').forEach((btn) => btn.addEventListener('click', () => activateCatalogProducts(btn.dataset.season, 'all', { preserveSort: true, subCategory: btn.dataset.subcategory || 'all' })));
  el.catalogFlow.querySelectorAll('[data-action="go-seasons"]').forEach((btn) => btn.addEventListener('click', () => goToSeasonsView()));

  const showProducts = step === 'products';
  document.body.classList.toggle('catalog-products-view', showProducts);
  document.body.classList.toggle('catalog-browser-view', !showProducts);
  el.toolbarWrap?.classList.toggle('hidden', !showProducts);
  el.productsHeadingRow?.classList.toggle('hidden', !showProducts);
  el.productsGrid?.classList.toggle('hidden', !showProducts);
  if (!showProducts) {
    el.loadMoreWrap?.classList.add('hidden');
    el.emptyState?.classList.add('hidden');
  }
  syncCatalogHero();
  syncCatalogRoute();
}

function applyFilters() {
  const search = state.filter.search;
  const signature = JSON.stringify({
    productsLength: state.products.length,
    search,
    season: state.filter.season,
    subCategory: state.filter.subCategory,
    offersOnly: state.filter.offersOnly,
    sort: state.filter.sort,
  });
  let items;
  if (state.cache.filterSignature === signature && Array.isArray(state.cache.filteredProducts)) {
    items = [...state.cache.filteredProducts];
  } else {
    items = getVisibleProducts().filter((product) => {
      const haystack = product._searchText || '';
      if (search && !haystack.includes(search)) return false;
      if (state.filter.season !== 'all' && String(getProductMainCategory(product) || '') !== state.filter.season) return false;
      if (state.filter.subCategory !== 'all' && getProductSubCategory(product) !== state.filter.subCategory) return false;
      if (state.filter.offersOnly && !hasDiscount(product)) return false;
      return true;
    });
    items.sort((a, b) => {
      const sort = state.filter.sort;
      if (sort === 'priceAsc') return getDisplayPrice(a) - getDisplayPrice(b);
      if (sort === 'priceDesc') return getDisplayPrice(b) - getDisplayPrice(a);
      if (sort === 'offers') {
        const offers = Number(hasDiscount(b)) - Number(hasDiscount(a));
        if (offers) return offers;
        return toMillis(b.createdAt || b.updatedAt) - toMillis(a.createdAt || a.updatedAt);
      }
      if (sort === 'modelAsc') return String(a.model || '').localeCompare(String(b.model || ''), 'en', { numeric: true });
      if (sort === 'newest') return toMillis(b.createdAt || b.updatedAt) - toMillis(a.createdAt || a.updatedAt);
      const pinDelta = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinDelta) return pinDelta;
      return toMillis(b.createdAt || b.updatedAt) - toMillis(a.createdAt || a.updatedAt);
    });
    state.cache.filterSignature = signature;
    state.cache.filteredProducts = [...items];
  }
  state.filteredProducts = items;
  renderProducts();
  renderMenu();
  renderSeoCatalog();
  syncDynamicStructuredData();
  syncSiteMeta();
  renderCatalogFlow();
}

function renderProducts() {
  const items = state.filteredProducts || [];
  const renderedItems = items.slice(0, state.renderedCount);
  el.productsGrid.innerHTML = '';
  el.visibleCount.textContent = items.length > renderedItems.length ? `${renderedItems.length.toLocaleString('en-US')} من ${items.length.toLocaleString('en-US')} منتج` : `${items.length.toLocaleString('en-US')} منتج`;
  el.emptyState.classList.toggle('hidden', items.length > 0);
  el.loadMoreWrap.classList.toggle('hidden', renderedItems.length >= items.length || items.length === 0);
  const fragment = document.createDocumentFragment();
  renderedItems.forEach((product, index) => {
    const card = document.createElement('article');
    card.className = 'product-card product-card--minimal';
    const urls = normalizeImageUrls(product.imageUrls);
    const originalUrl = urls[0] || placeholderImage(product.name || product.model || 'Elite Home Ware');
    const thumbUrl = getProductThumbUrl(originalUrl);
    const productAlt = buildProductAlt(product);
    const productLabel = product.name || `موديل ${product.model || ''}`.trim() || 'منتج';
    card.id = getProductAnchorId(product);
    card.setAttribute('data-product-id', String(product.id || ''));
    card.setAttribute('data-model', String(product.model || ''));
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `فتح تفاصيل ${productLabel}`);
    card.innerHTML = `
      <div class="product-media">
        <img src="${escapeAttr(thumbUrl)}" alt="${escapeAttr(productAlt)}" title="${escapeAttr(productAlt)}" loading="lazy" decoding="async" fetchpriority="${index < 4 ? 'high' : 'low'}" />
      </div>
      <div class="product-body">
        <div class="product-heading">
          <h3 class="product-title"></h3>
          <div class="product-model-line"></div>
        </div>
        <div class="piece-price-row">
          <span class="piece-price-label"></span>
          <strong class="piece-price-value"></strong>
        </div>
        <div class="card-actions single-action">
          <button class="primary-btn add-btn" aria-label="أضف ${escapeAttr(productLabel)} إلى السلة"><i class="fa-solid fa-cart-plus"></i><span>إضافة للسلة</span></button>
        </div>
      </div>`;
    card.querySelector('.product-title').textContent = product.name || 'بدون اسم';
    card.querySelector('.product-model-line').textContent = getProductSubCategory(product) ? `موديل ${product.model || '-'} • ${getProductSubCategory(product)}` : `موديل ${product.model || '-'}`;
    card.querySelector('.piece-price-label').textContent = getStoreCardPriceLabel(product);
    card.querySelector('.piece-price-value').textContent = getStoreCardPriceValue(product);
    card.querySelector('.add-btn span').textContent = getStoreCardActionText(product);
    const open = () => openQuickProduct(product);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
    const addBtn = card.querySelector('.add-btn');
    addBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (getSaleMode(product) === 'both') return window.location.href = getProductPageUrl(product);
      addToCart(product.id, getPrimarySaleUnit(product));
    });
    fragment.appendChild(card);
  });
  el.productsGrid.appendChild(fragment);
}

function getBrandDisplayName() {
  return state.company.companyName || state.storefront.companyName || DEFAULT_COMPANY.companyName || SITE_NAME_AR;
}

function getCanonicalUrl() {
  return SITE_URL;
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
  const id = String(product?.id || '').trim();
  url.searchParams.set('id', id);
  return url.href;
}

function slugifyArabic(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function getProductAnchorId(product) {
  const base = product?.model ? `product-${slugifyArabic(product.model)}` : `product-${slugifyArabic(product?.id || product?.name || 'item')}`;
  return base || 'product-item';
}

function buildProductAlt(product) {
  const brand = getBrandDisplayName();
  const bits = [
    product?.name || '',
    product?.model ? `موديل ${product.model}` : '',
    getProductMainCategory(product) ? `القسم ${getProductMainCategory(product)}` : '',
    getProductSubCategory(product) ? `التصنيف الفرعي ${getProductSubCategory(product)}` : '',
    'أدوات منزلية',
    brand,
  ].filter(Boolean);
  return bits.join(' | ');
}

function buildProductDescription(product) {
  const brand = getBrandDisplayName();
  const parts = [
    product?.description || '',
    product?.sizes ? `التفاصيل: ${product.sizes}` : '',
    getProductMainCategory(product) ? `القسم الرئيسي: ${getProductMainCategory(product)}` : '',
    getProductSubCategory(product) ? `التصنيف الفرعي: ${getProductSubCategory(product)}` : '',
    `المتجر: ${brand}`
  ].filter(Boolean);
  return parts.join(' • ').slice(0, 500);
}

function syncMetaTag(selector, attr, value) {
  const node = document.querySelector(selector);
  if (node && value) node.setAttribute(attr, value);
}

function syncSiteMeta() {
  const brand = getBrandDisplayName();
  const visibleCount = getVisibleProducts().length;
  const title = `${brand} | أدوات منزلية والمنزل`;
  const description = `${brand} للأدوات المنزلية. ${visibleCount.toLocaleString('en-US')} منتج متاح مع صور واضحة وطرق طلب سهلة.`;
  document.title = title;
  syncMetaTag('meta[name="description"]', 'content', description);
  syncMetaTag('meta[property="og:title"]', 'content', title);
  syncMetaTag('meta[property="og:description"]', 'content', description);
  syncMetaTag('meta[name="twitter:title"]', 'content', title);
  syncMetaTag('meta[name="twitter:description"]', 'content', description);
  syncMetaTag('link[rel="canonical"]', 'href', getCanonicalUrl());
  syncMetaTag('meta[property="og:url"]', 'content', getCanonicalUrl());
  syncMetaTag('meta[property="og:site_name"]', 'content', brand);
}

function renderSeoCatalog() {
  if (!el.seoCatalog) return;
  const visibleProducts = getVisibleProducts();
  const brand = getBrandDisplayName();
  const lines = [
    `<h2>${escapeHTML(brand)} - فهرس موديلات الأدوات المنزلية</h2>`,
    `<p>${escapeHTML(brand)} يقدم ${visibleProducts.length.toLocaleString('en-US')} منتجاً من الأدوات المنزلية مع عرض منظم حسب القسم الرئيسي والتصنيف الفرعي.</p>`
  ];
  visibleProducts.forEach((product) => {
    const title = product.name || `موديل ${product.model || ''}`.trim();
    const productUrl = getProductPageUrl(product);
    lines.push(`<article><h3><a href="${escapeAttr(productUrl)}">${escapeHTML(title)}</a></h3><p>${escapeHTML(buildProductDescription(product))}</p></article>`);
  });
  el.seoCatalog.innerHTML = lines.join('');
}

function getPublicImageUrl(product) {
  const urls = normalizeImageUrls(product?.imageUrls);
  return urls[0] || 'https://moadad.github.io/Elite-home-/assets/icon-512.png';
}

function getSameAsLinks() {
  return [state.company.instagram, state.company.facebook, state.company.telegram].filter((url) => /^https?:\/\//i.test(String(url || '').trim()));
}

function syncDynamicStructuredData() {
  const script = document.getElementById('dynamicStructuredData');
  if (!script) return;
  const brand = getBrandDisplayName();
  const visibleProducts = getVisibleProducts();
  const topProducts = visibleProducts.slice(0, 60);
  const graph = [
    {
      '@type': 'Store',
      '@id': `${SITE_URL}#store`,
      name: brand,
      url: SITE_URL,
      image: state.storefront.logoUrl || 'https://moadad.github.io/Elite-home-/assets/icon-512.png',
      description: `${brand} لالأدوات المنزلية`,
      sameAs: getSameAsLinks(),
      telephone: state.company.phone1 || undefined
    },
    {
      '@type': 'ItemList',
      '@id': `${SITE_URL}#products`,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      numberOfItems: visibleProducts.length,
      itemListElement: topProducts.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: getProductPageUrl(product),
        name: product.name || `موديل ${product.model || ''}`.trim()
      }))
    },
    ...topProducts.map((product) => ({
      '@type': 'Product',
      '@id': `${SITE_URL}#${getProductAnchorId(product)}-data`,
      name: product.name || `موديل ${product.model || ''}`.trim(),
      image: [getPublicImageUrl(product)],
      description: buildProductDescription(product),
      sku: String(product.model || product.id || ''),
      category: getProductMainCategory(product) || getCodeCategoryLabel(product.codeCategory) || 'أدوات منزلية',
      brand: { '@type': 'Brand', name: brand },
      itemCondition: 'https://schema.org/NewCondition',
      url: getProductPageUrl(product),
      offers: {
        '@type': 'Offer',
        priceCurrency: 'SYP',
        price: String(getDisplayPrice(product)),
        availability: 'https://schema.org/InStock',
        url: getProductPageUrl(product)
      }
    }))
  ];
  script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}


function renderCart() {
  saveLocalJSON(CART_STORAGE_KEY, state.cart);
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  el.cartCount.textContent = String(count);
  el.cartItemsCount.textContent = getCartHeaderCountLabel();
  if (el.cartScreenTotalText) el.cartScreenTotalText.textContent = count ? `${count} عنصر داخل السلة` : 'جاهزة للطلب';
  el.cartItems.innerHTML = '';
  if (!state.cart.length) {
    el.cartItems.innerHTML = '<div class="cart-item cart-item-empty"><div class="cart-empty-copy"><strong>السلة فارغة</strong><span class="muted">أضف المنتجات ثم أكمل الطلب.</span></div></div>';
    el.cartTotal.textContent = formatCurrency(0);
    renderCheckoutPreview();
    return;
  }
  let total = 0;
  state.cart.forEach((item) => {
    total += getLineTotal(item);
    const unit = getCartSaleUnit(item);
    const unitLabel = getSaleUnitLabel(unit);
    const card = document.createElement('div');
    card.className = 'cart-item';
    card.innerHTML = `
      <img class="cart-thumb" src="${escapeAttr(getMiniImageUrl(item.imageUrl || placeholderImage(item.name || 'Elite Home Ware')))}" alt="${escapeAttr(buildProductAlt(item))}" loading="lazy" decoding="async" />
      <div>
        <h4>${escapeHTML(item.name || '')}</h4>
        <div class="muted">موديل ${escapeHTML(item.model || '')}</div>
        <div class="muted">الوحدة: ${escapeHTML(unitLabel)}${unit === 'dozen' ? ` • ${escapeHTML(getSeriesLabel(item))}` : ''}</div>
        <div class="muted">سعر القطعة ${formatCurrency(getPiecePrice(item))}</div>
        ${canSellByDozen(item) ? `<div class="muted">سعر الدستة ${formatCurrency(getDozenPrice(item))}</div>` : ''}
        <strong>${escapeHTML(getUnitPricingLabel(unit))} ${formatCurrency(toNumber(item.unitPrice))}</strong>
      </div>
      <div class="qty-box">
        <button data-action="plus">+</button>
        <span>${item.qty}</span>
        <button data-action="minus">-</button>
      </div>`;
    const itemKey = item.itemKey || buildCartItemKey(item.id, item.saleUnit);
    card.querySelector('[data-action="plus"]').addEventListener('click', () => changeCartQty(itemKey, 1));
    card.querySelector('[data-action="minus"]').addEventListener('click', () => changeCartQty(itemKey, -1));
    card.querySelector('.cart-thumb').addEventListener('click', () => openGallery(item.imageUrl ? [item.imageUrl] : [placeholderImage(item.name || 'Elite Home Ware')], 0));
    el.cartItems.appendChild(card);
  });
  el.cartTotal.textContent = formatCurrency(total);
  if (el.cartScreenTotalText) el.cartScreenTotalText.textContent = `${count} عنصر • ${formatCurrency(total)}`;
  renderCheckoutPreview();
}


function getCartHeaderCountLabel() {
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  if (!count) return '0 سيري';
  const saleUnits = new Set(state.cart.map((item) => getCartSaleUnit(item)));
  if (saleUnits.size === 1 && saleUnits.has('dozen')) return `${count} سيري`;
  if (saleUnits.size === 1 && saleUnits.has('piece')) return `${count} قطعة`;
  return `${count} عنصر`;
}

function renderCheckoutPreview() {
  if (!el.checkoutPreviewItems || !el.checkoutPreviewTotal || !el.checkoutItemsCount) return;
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  el.checkoutItemsCount.textContent = `${count} عنصر`;
  el.checkoutPreviewItems.innerHTML = '';
  if (!state.cart.length) {
    el.checkoutPreviewItems.innerHTML = '<div class="checkout-preview-empty">السلة فارغة</div>';
    el.checkoutPreviewTotal.textContent = formatCurrency(0);
    return;
  }
  let total = 0;
  state.cart.forEach((item) => {
    total += getLineTotal(item);
    const unit = getCartSaleUnit(item);
    const unitLabel = getSaleUnitLabel(unit);
    const row = document.createElement('div');
    row.className = 'checkout-preview-item';
    row.innerHTML = `
      <div class="checkout-preview-thumb-wrap">
        <img class="checkout-preview-thumb" src="${escapeAttr(getMiniImageUrl(item.imageUrl || placeholderImage(item.name || 'Elite Home Ware')))}" alt="${escapeAttr(buildProductAlt(item))}" loading="lazy" decoding="async" />
      </div>
      <div class="checkout-preview-copy">
        <strong>${escapeHTML(item.name || '')}</strong>
        <span>موديل ${escapeHTML(item.model || '')}</span>
        <small>${escapeHTML(unitLabel)} × ${item.qty}</small>
      </div>
      <div class="checkout-preview-price">${formatCurrency(getLineTotal(item))}</div>`;
    el.checkoutPreviewItems.appendChild(row);
  });
  el.checkoutPreviewTotal.textContent = formatCurrency(total);
}

function renderAdminForms() {
  el.companyNameInput.value = state.company.companyName || state.storefront.companyName || '';
  el.companyTaglineInput.value = state.company.tagline || state.storefront.tagline || '';
  el.heroTitleInput.value = state.storefront.heroTitle || '';
  el.heroSubtitleInput.value = state.storefront.heroSubtitle || '';
  el.heroBadgeInput.value = state.storefront.heroBadge || '';
  el.logoUrlInput.value = state.storefront.logoUrl || '';
  el.accentColorInput.value = state.storefront.accentColor || DEFAULT_STOREFRONT.accentColor;
  el.accentColor2Input.value = state.storefront.accentColor2 || DEFAULT_STOREFRONT.accentColor2;
  el.featuredLimitInput.value = String(state.storefront.featuredLimit ?? 8);
  el.installEnabledInput.value = String(Boolean(state.storefront.installEnabled));
  el.floatingWhatsappInput.value = String(Boolean(state.storefront.floatingWhatsappEnabled));
  el.currencySymbolInput.value = state.storefront.currencySymbol || 'ل.س';
  el.companyPhoneInput.value = state.company.phone1 || '';
  el.companyPhone2Input.value = state.company.phone2 || '';
  el.companyWhatsappInput.value = state.company.whatsapp || '';
  el.companyCloudinaryNameInput.value = state.company.cloudinaryCloudName || DEFAULT_COMPANY.cloudinaryCloudName || '';
  el.companyAddressInput.value = state.company.address || '';
  el.companyInstagramInput.value = state.company.instagram || '';
  el.companyFacebookInput.value = state.company.facebook || '';
  el.companyTelegramInput.value = state.company.telegram || '';
  el.factoryMapInput.value = state.company.factoryMap || '';
  el.shopMapInput.value = state.company.shopMap || '';
  el.cloudinaryPresetInput.value = state.company.cloudinaryPreset || DEFAULT_COMPANY.cloudinaryPreset;
  el.companyAboutInput.value = state.company.about || '';
  el.paymentPolicyInput.value = state.payments.policyText || DEFAULT_PAYMENT_POLICY;
  el.paymentMethodsInput.value = normalizePaymentMethods(state.payments.methods, state.payments.defaultMethodLabel || 'كاش').map((item) => item.label).join('\n');
  el.defaultPaymentLabelInput.value = state.payments.defaultMethodLabel || 'كاش';
  el.returnPolicyInput.value = state.storeSettings.returnPolicy || DEFAULT_RETURN_POLICY;
  el.shippingPolicyInput.value = state.storeSettings.shippingPolicy || DEFAULT_SHIPPING_POLICY;
  el.termsPolicyInput.value = state.storeSettings.termsPolicy || DEFAULT_TERMS_POLICY;
  el.mainCategoriesInput.value = getSeasonOptions().join(', ');
  el.adminProductsCount.textContent = String(state.products.length);
  el.adminOrdersCount.textContent = String(state.orders.length);
  el.adminCategoriesCount.textContent = String(getCodeCategoryKeys().length);
  el.adminOrdersTotal.textContent = formatCurrency(state.orders.reduce((sum, item) => sum + getOrderTotals(item).total, 0));
}

function rebuildSeasonOptions() {
  const options = getSeasonOptions();
  const current = el.productMainCategoryInput.value;
  el.productMainCategoryInput.innerHTML = '';
  options.forEach((season) => {
    const option = document.createElement('option');
    option.value = season;
    option.textContent = season;
    el.productMainCategoryInput.appendChild(option);
  });
  el.productMainCategoryInput.value = options.includes(current) ? current : (options[0] || 'عام');
}

function renderCategoryManager() {
  el.categoryManagerList.innerHTML = '';
  const keys = getCodeCategoryKeys();
  if (!keys.length) {
    el.categoryManagerList.innerHTML = '<div class="category-item"><div class="muted">لا توجد تصنيفات بعد</div></div>';
    return;
  }
  keys.forEach((key) => {
    const categoryDoc = state.categories.find((item) => item.type === 'code' && String(item.code || item.label) === String(key));
    const fallbackLabel = state.storeSettings?.codeCategoryLabels?.[String(key)] || '';
    const wrapper = document.createElement('div');
    wrapper.className = 'category-item';
    const inputId = `cat-${key}`;
    wrapper.innerHTML = `<div class="category-code">${escapeHTML(key)}</div><div class="field"><label for="${escapeAttr(inputId)}">الاسم الظاهر</label><input id="${escapeAttr(inputId)}" type="text" value="${escapeAttr(categoryDoc?.label || fallbackLabel)}" placeholder="اسم التصنيف" /></div><button class="ghost-btn" type="button">حفظ</button>`;
    const input = wrapper.querySelector('input');
    const saveBtn = wrapper.querySelector('button');
    const saveCurrent = () => saveCodeCategoryLabel(key, input.value);
    saveBtn.addEventListener('click', saveCurrent);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveCurrent();
      }
    });
    el.categoryManagerList.appendChild(wrapper);
  });
}

function renderAdminProducts() {
  el.adminProductsList.innerHTML = '';
  let products = [...state.products];
  if (state.featuredOnlyAdmin) products = products.filter((item) => item.pinned);
  products.forEach((product) => {
    const urls = normalizeImageUrls(product.imageUrls);
    const item = document.createElement('div');
    item.className = 'admin-item admin-product-item';
    item.innerHTML = `
      <img class="admin-product-thumb" src="${escapeAttr(getMiniImageUrl(urls[0] || placeholderImage(product.name || product.model || 'Elite Home Ware')))}" alt="${escapeAttr(buildProductAlt(product))}" loading="lazy" decoding="async" />
      <div>
        <h4>${escapeHTML(product.name || '')}</h4>
        <div class="muted">موديل ${escapeHTML(product.model || '')}${getProductMainCategory(product) ? ` • ${escapeHTML(getProductMainCategory(product))}` : ''}${getProductSubCategory(product) ? ` • ${escapeHTML(getProductSubCategory(product))}` : ''}</div>
        <div class="muted">${hasDiscount(product) ? `خصم ${Math.round(toNumber(product.discountPercent))}% • ` : ''}${escapeHTML(getAdminPriceSummary(product))}</div>
      </div>
      <div class="admin-actions"><button class="ghost-btn" data-edit>تعديل</button><button class="ghost-btn" data-pin>${product.pinned ? 'إلغاء التثبيت' : 'تثبيت'}</button><button class="danger-btn" data-del>حذف</button></div>`;
    item.querySelector('[data-edit]').addEventListener('click', () => populateProductForm(product));
    item.querySelector('[data-pin]').addEventListener('click', () => togglePinned(product));
    item.querySelector('[data-del]').addEventListener('click', () => deleteProduct(product.id));
    el.adminProductsList.appendChild(item);
  });
}

function renderAdminOrders() {
  el.adminOrdersList.innerHTML = '';
  if (!state.orders.length) {
    el.adminOrdersList.innerHTML = '<div class="order-item"><div class="muted">لا توجد طلبات</div></div>';
    return;
  }
  state.orders.forEach((order) => {
    const card = document.createElement('div');
    card.className = 'order-item order-card';
    const orderRef = getOrderReference(order);
    const createdLabel = formatOrderDate(order);
    const totals = getOrderTotals(order);
    const rows = (order.items || []).map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(item.model || '—')}</td>
        <td>${escapeHTML(resolveInvoiceProductName(item))}</td>
        <td>${getSeriesCount(item)}</td>
        <td>${escapeHTML(getSaleUnitLabel(getCartSaleUnit(item)))}</td>
        <td>${getPieceQuantity(item)}</td>
        <td>${escapeHTML(formatCurrency(getSeriesValue(item)))}</td>
        <td>${escapeHTML(formatCurrency(getLineTotal(item)))}</td>
      </tr>`).join('');
    card.innerHTML = `
      <div class="order-header-meta">
        <div>
          <h4>${escapeHTML(order.customerName || 'طلب جديد')}</h4>
          <div class="muted">${escapeHTML(createdLabel)}</div>
        </div>
        <span class="order-id-chip"><i class="fa-solid fa-receipt"></i><span>${escapeHTML(orderRef)}</span></span>
      </div>
      <div class="order-overview-grid">
        <div class="order-overview-card"><span>الهاتف</span><strong>${escapeHTML(order.customerPhone || '—')}</strong></div>
        <div class="order-overview-card"><span>المدينة</span><strong>${escapeHTML(order.city || '—')}</strong></div>
        <div class="order-overview-card"><span>طريقة الدفع</span><strong>${escapeHTML(order.paymentMethod || '—')}</strong></div>
        <div class="order-overview-card"><span>طريقة الاستلام</span><strong>${escapeHTML(order.shippingMethod || '—')}</strong></div>
      </div>
      <div class="order-address-bar">${escapeHTML(order.address || '—')}</div>
      ${order.notes ? `<div class="order-address-bar order-notes-bar"><strong>ملاحظات:</strong> ${escapeHTML(order.notes)}</div>` : ''}
      <div class="order-lines-wrap">
        <table class="order-lines-table">
          <thead>
            <tr>
              <th>م</th>
              <th>رقم الموديل</th>
              <th>الصنف</th>
              <th>العدد</th>
              <th>الوحدة</th>
              <th>كمية القطع</th>
              <th>سعر الوحدة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8" class="muted">لا توجد أصناف داخل الطلب</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">إجمالي الفاتورة</td>
              <td>${totals.series}</td>
              <td>—</td>
              <td>${totals.pieces}</td>
              <td colspan="2">${escapeHTML(formatCurrency(totals.total))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="order-actions" style="margin-top:12px">
        <select data-status>${['جديد', 'قيد المراجعة', 'مكتمل', 'ملغي'].map((status) => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select>
        <button class="ghost-btn" data-preview><i class="fa-regular fa-image"></i><span>معاينة الفاتورة</span></button>
        <button class="ghost-btn" data-download><i class="fa-solid fa-file-arrow-down"></i><span>تنزيل الفاتورة</span></button>
        <button class="ghost-btn" data-copy><i class="fa-brands fa-whatsapp"></i><span>نسخ واتساب</span></button>
        <button class="danger-btn" data-del>حذف</button>
      </div>`;
    card.querySelector('[data-status]').addEventListener('change', (e) => updateOrderStatus(order.id, e.target.value));
    card.querySelector('[data-preview]').addEventListener('click', () => previewOrderInvoice(order));
    card.querySelector('[data-download]').addEventListener('click', () => downloadInvoiceForOrder(order));
    card.querySelector('[data-copy]').addEventListener('click', () => copyText(buildWhatsAppOrderMessage(order)));
    card.querySelector('[data-del]').addEventListener('click', () => deleteOrder(order.id));
    el.adminOrdersList.appendChild(card);
  });
}

function normalizeAdminEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function isAllowedAdminUser(user) {
  if (!user) return false;
  const email = normalizeAdminEmail(user.email || '');
  return user.uid === ADMIN_UID || ADMIN_EMAILS.includes(email);
}

async function ensureAdminSession(options = {}) {
  const { silent = false } = options;
  const user = auth.currentUser;
  if (!isAllowedAdminUser(user)) {
    state.authUser = user || null;
    state.isAdmin = false;
    el.authStatus.textContent = user ? (user.email || user.uid || 'غير مسجل') : 'غير مسجل';
    el.adminContent.classList.add('hidden');
    subscribeOrdersIfAdmin();
    if (!silent) {
      showToast('سجل الدخول بحساب الأدمن الصحيح ثم أعد المحاولة');
      openDrawer('admin');
    }
    return false;
  }
  try {
    await user.getIdToken(true);
  } catch (error) {
    console.warn('Token refresh failed', error);
  }
  state.authUser = user;
  state.isAdmin = true;
  el.authStatus.textContent = user.email || user.uid || 'غير مسجل';
  el.adminContent.classList.remove('hidden');
  subscribeOrdersIfAdmin();
  return true;
}

async function adminLogin() {
  const email = el.adminEmail.value.trim();
  const password = el.adminPassword.value;
  if (!email || !password) return showToast('أدخل البريد وكلمة المرور');
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    if (!isAllowedAdminUser(user)) {
      await signOut(auth).catch(() => {});
      return showToast('هذا الحساب ليس أدمن');
    }
    await ensureAdminSession({ silent: true });
    showToast('تم تسجيل الدخول');
  } catch (error) {
    console.error(error);
    showToast('تعذر تسجيل الدخول');
  }
}

async function adminLogout() {
  try {
    await signOut(auth);
    showToast('تم تسجيل الخروج');
  } catch (error) {
    console.error(error);
    showToast('تعذر تسجيل الخروج');
  }
}

function handleAuthChange(user) {
  if (user && !isAllowedAdminUser(user)) {
    state.authUser = null;
    state.isAdmin = false;
    el.authStatus.textContent = 'غير مصرح';
    el.adminContent.classList.add('hidden');
    subscribeOrdersIfAdmin();
    signOut(auth).catch(() => {});
    showToast('هذا الحساب ليس له صلاحية الإدارة');
    return;
  }
  state.authUser = user;
  state.isAdmin = Boolean(user && isAllowedAdminUser(user));
  el.authStatus.textContent = user ? (user.email || user.uid) : 'غير مسجل';
  el.adminContent.classList.toggle('hidden', !state.isAdmin);
  subscribeOrdersIfAdmin();
}

async function saveAppearance() {
  if (!(await ensureAdminSession())) return;
  try {
    await Promise.all([
      setDoc(doc(db, 'company', 'main'), { companyName: el.companyNameInput.value.trim(), tagline: el.companyTaglineInput.value.trim(), updatedAt: serverTimestamp() }, { merge: true }),
      setDoc(doc(db, 'settings', 'storefront'), {
        companyName: el.companyNameInput.value.trim(),
        tagline: el.companyTaglineInput.value.trim(),
        heroTitle: el.heroTitleInput.value.trim(),
        heroSubtitle: el.heroSubtitleInput.value.trim(),
        heroBadge: el.heroBadgeInput.value.trim(),
        logoUrl: el.logoUrlInput.value.trim(),
        accentColor: el.accentColorInput.value,
        accentColor2: el.accentColor2Input.value,
        featuredLimit: Math.max(0, toInt(el.featuredLimitInput.value || '0')),
        installEnabled: el.installEnabledInput.value === 'true',
        floatingWhatsappEnabled: el.floatingWhatsappInput.value === 'true',
        currencySymbol: (el.currencySymbolInput.value || 'ل.س').trim() || 'ل.س',
        updatedAt: serverTimestamp(),
      }, { merge: true }),
    ]);
    showToast('تم حفظ الواجهة');
  } catch (error) {
    console.error(error);
    showToast('تعذر حفظ الواجهة');
  }
}

async function saveCompanyData() {
  if (!(await ensureAdminSession())) return;
  try {
    await setDoc(doc(db, 'company', 'main'), {
      companyName: el.companyNameInput.value.trim(),
      tagline: el.companyTaglineInput.value.trim(),
      phone1: el.companyPhoneInput.value.trim(),
      phone2: el.companyPhone2Input.value.trim(),
      whatsapp: el.companyWhatsappInput.value.trim(),
      address: el.companyAddressInput.value.trim(),
      instagram: el.companyInstagramInput.value.trim(),
      facebook: el.companyFacebookInput.value.trim(),
      telegram: el.companyTelegramInput.value.trim(),
      factoryMap: el.factoryMapInput.value.trim(),
      shopMap: el.shopMapInput.value.trim(),
      cloudinaryCloudName: sanitizeCloudName(el.companyCloudinaryNameInput.value.trim()) || 'elitehome',
      cloudinaryPreset: el.cloudinaryPresetInput.value.trim() || 'dueuyivqo',
      about: el.companyAboutInput.value.trim(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    showToast('تم حفظ بيانات الشركة');
  } catch (error) {
    console.error(error);
    showToast('تعذر حفظ بيانات الشركة');
  }
}

async function savePolicies() {
  if (!(await ensureAdminSession())) return;
  const methods = parsePaymentMethodsText(el.paymentMethodsInput?.value || '', el.defaultPaymentLabelInput?.value || 'كاش');
  const defaultMethodLabel = String(el.defaultPaymentLabelInput?.value || methods[0]?.label || 'كاش').trim() || 'كاش';
  try {
    await Promise.all([
      setDoc(doc(db, 'payments', 'default'), { policyText: el.paymentPolicyInput.value.trim(), methods, defaultMethodLabel, updatedAt: serverTimestamp() }, { merge: true }),
      setDoc(doc(db, 'settings', 'store'), {
        returnPolicy: el.returnPolicyInput.value.trim(),
        shippingPolicy: el.shippingPolicyInput.value.trim(),
        termsPolicy: el.termsPolicyInput.value.trim(),
        mainCategories: parseCommaList(el.mainCategoriesInput.value),
        updatedAt: serverTimestamp(),
      }, { merge: true }),
      setDoc(doc(db, 'shipping', 'default'), { policyText: el.shippingPolicyInput.value.trim(), updatedAt: serverTimestamp() }, { merge: true }),
    ]);
    state.payments = { ...state.payments, policyText: el.paymentPolicyInput.value.trim(), methods, defaultMethodLabel };
    hydrateCheckoutPaymentMethods();
    renderPaymentIcons();
    showToast('تم حفظ السياسات');
  } catch (error) {
    console.error(error);
    showToast('تعذر حفظ السياسات');
  }
}

async function saveMainCategories() {
  if (!(await ensureAdminSession())) return;
  const mainCategories = parseCommaList(el.mainCategoriesInput.value);
  try {
    await setDoc(doc(db, 'settings', 'store'), { mainCategories, updatedAt: serverTimestamp() }, { merge: true });
    for (const mainCategory of mainCategories) {
      await setDoc(doc(db, 'categories', `main-category-${mainCategory}`), { type: 'mainCategory', mainCategory, label: mainCategory, updatedAt: serverTimestamp() }, { merge: true });
    }
    showToast('تم حفظ الأقسام');
  } catch (error) {
    console.error(error);
    showToast('تعذر حفظ الأقسام');
  }
}

async function saveCodeCategoryLabel(code, label) {
  if (!(await ensureAdminSession())) return;
  const cleanCode = String(code || '').trim();
  const cleanLabel = String(label || '').trim();
  const categoryLabels = { ...(state.storeSettings?.codeCategoryLabels || {}) };
  try {
    if (!cleanCode) return showToast('رمز التصنيف غير صالح');
    if (!cleanLabel) {
      delete categoryLabels[cleanCode];
      await Promise.all([
        deleteDoc(doc(db, 'categories', `code-${cleanCode}`)).catch(() => null),
        setDoc(doc(db, 'settings', 'store'), { codeCategoryLabels: categoryLabels, updatedAt: serverTimestamp() }, { merge: true }),
      ]);
      state.categories = state.categories.filter((item) => !(item.type === 'code' && String(item.code || item.label) === cleanCode));
      state.storeSettings.codeCategoryLabels = categoryLabels;
      renderAll();
      showToast('تم مسح اسم التصنيف');
      return;
    }
    const payload = { type: 'code', code: cleanCode, label: cleanLabel, updatedAt: new Date().toISOString() };
    categoryLabels[cleanCode] = cleanLabel;
    await Promise.all([
      setDoc(doc(db, 'categories', `code-${cleanCode}`), payload, { merge: true }),
      setDoc(doc(db, 'settings', 'store'), { codeCategoryLabels: categoryLabels, updatedAt: serverTimestamp() }, { merge: true }),
    ]);
    const existingIndex = state.categories.findIndex((item) => item.type === 'code' && String(item.code || item.label) === cleanCode);
    if (existingIndex >= 0) state.categories[existingIndex] = { ...state.categories[existingIndex], ...payload };
    else state.categories.push(payload);
    state.storeSettings.codeCategoryLabels = categoryLabels;
    renderAll();
    showToast('تم حفظ التصنيف');
  } catch (error) {
    console.error(error);
    showToast(getActionErrorMessage(error, 'تعذر حفظ التصنيف'));
  }
}

function syncDraftImagesFromTextarea() {
  state.productImagesDraft = textareaLines(el.productImageUrlsInput.value);
  renderProductPreview();
}

async function handleProductFileUpload(event) {
  if (!(await ensureAdminSession())) return;
  const files = [...(event.target.files || [])];
  if (!files.length) return;
  try {
    const folder = sanitizePathSegment(el.productModelInput.value || 'products');
    const urls = await uploadFilesToCloudinary(files, folder);
    state.productImagesDraft = [...state.productImagesDraft, ...urls];
    el.productImageUrlsInput.value = state.productImagesDraft.join('\n');
    renderProductPreview();
    showToast('تم رفع الصور');
  } catch (error) {
    console.error(error);
    showToast(getFriendlyUploadError(error));
  } finally {
    el.productImagesInput.value = '';
    el.uploadStatus.textContent = '';
  }
}

async function handleSingleAssetUpload(event) {
  if (!(await ensureAdminSession())) return;
  const file = event.target.files?.[0];
  if (!file || !state.assetTargetInputId) return;
  try {
    const [url] = await uploadFilesToCloudinary([file], 'branding');
    const target = id(state.assetTargetInputId);
    if (target) target.value = url;
    showToast('تم رفع الصورة');
  } catch (error) {
    console.error(error);
    showToast(getFriendlyUploadError(error));
  } finally {
    el.singleAssetUploader.value = '';
    state.assetTargetInputId = '';
    el.uploadStatus.textContent = '';
  }
}

async function uploadFilesToCloudinary(files, folder) {
  const cloudName = sanitizeCloudName(state.company.cloudinaryCloudName || el.companyCloudinaryNameInput?.value || CLOUDINARY_CLOUD_NAME);
  const preset = (state.company.cloudinaryPreset || el.cloudinaryPresetInput.value || 'dueuyivqo').trim();
  const urls = [];
  for (const file of files) {
    el.uploadStatus.textContent = `جارٍ رفع ${file.name}...`;
    const body = new FormData();
    body.append('file', file);
    body.append('upload_preset', preset);
    body.append('folder', `elite-home/${folder}`);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = data?.error?.message || data?.message || response.statusText || 'Cloudinary upload failed';
      throw new Error(msg);
    }
    urls.push(data.secure_url);
  }
  return urls;
}

function getFriendlyUploadError(error) {
  const message = String(error?.message || '').trim();
  if (!message) return 'تعذر رفع الصورة';
  if (message.includes('Upload preset must be specified')) return 'يجب إدخال اسم Upload Preset من Cloudinary داخل لوحة التحكم';
  if (message.includes('Upload preset not found')) return 'اسم Upload Preset غير صحيح أو غير موجود في Cloudinary';
  if (message.includes('must be unsigned')) return 'الـ Upload Preset يجب أن يكون Unsigned وليس Signed';
  if (message.includes('File size too large')) return 'حجم الصورة أكبر من المسموح في إعدادات Cloudinary';
  if (message.includes('Invalid image file')) return 'الملف ليس صورة صالحة';
  return `تعذر الرفع: ${message}`;
}


async function saveProduct() {
  if (!(await ensureAdminSession())) return;
  const name = el.productNameInput.value.trim();
  const model = el.productModelInput.value.trim();
  const rawPricePiece = el.productPriceInput.value.trim();
  const rawPriceDozen = el.productWholesalePriceInput.value.trim();
  const saleMode = String(el.productSaleModeInput.value || 'piece').trim();
  const mainCategory = el.productMainCategoryInput.value || getMainCategoryOptions()[0] || 'المطبخ';
  const discountPercent = clamp(toNumber(el.productDiscountInput.value), 0, 99);
  const packQtyText = el.productPackQtyInput.value.trim() || '12';
  const packQtyNumber = getPackQtyNumber({ packQtyText });
  const pricePiece = rawPricePiece !== '' ? toNumber(rawPricePiece) : (rawPriceDozen !== '' ? round2(toNumber(rawPriceDozen) / Math.max(1, packQtyNumber)) : 0);
  const priceDozen = rawPriceDozen !== '' ? toNumber(rawPriceDozen) : round2(pricePiece * Math.max(1, packQtyNumber));
  if (!name || !model) return showToast('الاسم والموديل مطلوبان');
  if (saleMode === 'piece' && rawPricePiece === '') return showToast('أدخل سعر القطعة');
  if (saleMode === 'dozen' && rawPriceDozen === '' && rawPricePiece === '') return showToast('أدخل سعر الدستة أو سعر القطعة');
  if (saleMode === 'both' && rawPricePiece === '' && rawPriceDozen === '') return showToast('أدخل سعر القطعة أو سعر الدستة');
  const payload = {
    name,
    model,
    saleMode,
    pricePiece,
    priceDozen,
    discountPercent,
    mainCategory,
    subCategory: normalizeSubCategory(el.productSubCategoryInput.value),
    sizes: el.productSizesInput.value.trim(),
    packQtyText,
    badgeText: el.productBadgeInput.value.trim(),
    pinned: el.productPinnedInput.value === 'true',
    visible: el.productVisibleInput.value === 'true',
    description: el.productDescriptionInput.value.trim(),
    codeCategory: deriveCodeCategory(model),
    imageUrls: normalizeImageUrls(state.productImagesDraft),
    updatedAt: serverTimestamp(),
  };
  try {
    if (state.editingProductId) {
      await updateDoc(doc(db, 'products', state.editingProductId), payload);
      showToast('تم تحديث المنتج');
    } else {
      await addDoc(collection(db, 'products'), { ...payload, createdAt: serverTimestamp() });
      showToast('تمت إضافة المنتج');
    }
    resetProductForm();
  } catch (error) {
    console.error(error);
    showToast(getActionErrorMessage(error, 'تعذر حفظ المنتج'));
  }
}

function populateProductForm(product) {
  state.editingProductId = product.id;
  el.productFormTitle.textContent = `تعديل ${product.name || ''}`;
  el.productNameInput.value = product.name || '';
  el.productModelInput.value = product.model || '';
  el.productPriceInput.value = String(getPiecePrice(product));
  el.productWholesalePriceInput.value = String(getDozenBasePrice(product));
  el.productDiscountInput.value = String(toInt(product.discountPercent || 0));
  el.productMainCategoryInput.value = getProductMainCategory(product) || getMainCategoryOptions()[0] || 'المطبخ';
  el.productSaleModeInput.value = getSaleMode(product);
  el.productSubCategoryInput.value = getProductSubCategory(product);
  el.productSizesInput.value = product.sizes || '';
  el.productPackQtyInput.value = getPackQtyText(product);
  el.productBadgeInput.value = product.badgeText || '';
  el.productPinnedInput.value = String(Boolean(product.pinned));
  el.productVisibleInput.value = String(product.visible !== false);
  el.productDescriptionInput.value = product.description || '';
  state.productImagesDraft = normalizeImageUrls(product.imageUrls);
  el.productImageUrlsInput.value = state.productImagesDraft.join('\n');
  renderProductPreview();
  openDrawer('admin');
}

function resetProductForm() {
  state.editingProductId = null;
  el.productFormTitle.textContent = 'إضافة منتج';
  el.productNameInput.value = '';
  el.productModelInput.value = '';
  el.productPriceInput.value = '';
  el.productWholesalePriceInput.value = '';
  el.productDiscountInput.value = '0';
  el.productMainCategoryInput.value = getMainCategoryOptions()[0] || 'المطبخ';
  el.productSaleModeInput.value = 'piece';
  el.productSubCategoryInput.value = '';
  el.productSizesInput.value = '';
  el.productPackQtyInput.value = '12';
  el.productBadgeInput.value = '';
  el.productPinnedInput.value = 'true';
  el.productVisibleInput.value = 'true';
  el.productDescriptionInput.value = '';
  el.productImageUrlsInput.value = '';
  state.productImagesDraft = [];
  renderProductPreview();
}

function renderProductPreview() {
  el.productImagesPreview.innerHTML = '';
  state.productImagesDraft.forEach((url, index) => {
    const item = document.createElement('div');
    item.className = 'preview-image';
    item.innerHTML = `<img src="${escapeAttr(url)}" alt="preview" /><button class="preview-remove"><i class="fa-solid fa-xmark"></i></button>`;
    item.querySelector('button').addEventListener('click', () => {
      state.productImagesDraft.splice(index, 1);
      el.productImageUrlsInput.value = state.productImagesDraft.join('\n');
      renderProductPreview();
    });
    el.productImagesPreview.appendChild(item);
  });
}

async function togglePinned(product) {
  if (!(await ensureAdminSession())) return;
  try {
    await updateDoc(doc(db, 'products', product.id), { pinned: !product.pinned, updatedAt: serverTimestamp() });
  } catch (error) {
    console.error(error);
    showToast('تعذر تحديث التثبيت');
  }
}

async function deleteProduct(productId) {
  if (!(await ensureAdminSession())) return;
  if (!confirm('حذف هذا المنتج؟')) return;
  try {
    await deleteDoc(doc(db, 'products', productId));
    showToast('تم حذف المنتج');
  } catch (error) {
    console.error(error);
    showToast('تعذر حذف المنتج');
  }
}

function togglePinnedAdminFilter() {
  state.featuredOnlyAdmin = !state.featuredOnlyAdmin;
  el.togglePinnedFilterBtn.textContent = state.featuredOnlyAdmin ? 'كل المنتجات' : 'المثبت فقط';
  renderAdminProducts();
}


async function addToCart(productId, requestedUnit = '') {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  const saleUnit = normalizeSaleUnit(requestedUnit || getPrimarySaleUnit(product), product);
  const itemKey = buildCartItemKey(product.id, saleUnit);
  const existing = state.cart.find((item) => (item.itemKey || buildCartItemKey(item.id, item.saleUnit)) === itemKey);
  const unitPrice = getDisplayPrice(product, saleUnit);
  const unitLabel = getSaleUnitLabel(saleUnit);
  if (existing) existing.qty += 1;
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
    qty: 1,
    seriesQtyText: getSeriesQtyText(product),
    saleMode: getSaleMode(product),
  });
  renderCart();
  showToast(`تمت إضافة ${unitLabel} إلى السلة`);
}

function changeCartQty(productId, delta) {
  const item = state.cart.find((entry) => (entry.itemKey || buildCartItemKey(entry.id, entry.saleUnit)) === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter((entry) => entry.id !== productId);
  renderCart();
}

async function submitOrder() {
  const customerName = el.customerNameInput.value.trim();
  const customerPhone = el.customerPhoneInput.value.trim();
  const city = el.customerCityInput.value.trim();
  const address = el.customerAddressInput.value.trim();
  const paymentMethod = el.paymentMethodInput.value || state.payments.defaultMethodLabel || 'كاش';
  const shippingMethod = el.shippingMethodInput.value;
  const notes = el.customerNotesInput.value.trim();
  if (!customerName || !customerPhone || !city || !address) return showToast('أكمل بيانات العميل');
  if (!state.cart.length) return showToast('السلة فارغة');
  const createdAtClient = new Date().toISOString();
  const orderNo = generateOrderNumber(createdAtClient);
  const items = state.cart.map((item) => ({
    productId: item.id,
    name: item.name,
    model: item.model,
    unitPrice: getSeriesValue(item),
    pricePiece: getPiecePrice(item),
    priceWholesale: getDozenBasePrice(item),
    saleUnit: getCartSaleUnit(item),
    qty: getSeriesCount(item),
    pieceQty: getPieceQuantity(item),
    piecesPerSeries: getPiecesPerSeries(item),
    lineTotal: getLineTotal(item),
    seriesQtyText: getSeriesQtyText(item),
    imageUrl: item.imageUrl,
  }));
  const total = round2(items.reduce((sum, item) => sum + toNumber(item.lineTotal || 0), 0));
  const order = {
    orderNo,
    customerName,
    customerPhone,
    city,
    address,
    paymentMethod,
    shippingMethod,
    notes,
    total,
    status: 'جديد',
    items,
    createdAtClient,
    createdAt: serverTimestamp(),
  };
  try {
    el.submitOrderBtn.disabled = true;
    const docRef = await addDoc(collection(db, 'orders'), order);
    const savedOrder = { ...order, id: docRef.id };
    closeModal('checkoutModal');
    closeDrawers();
    await openInvoicePreview(savedOrder);
    state.cart = [];
    renderCart();
    ['customerNameInput', 'customerPhoneInput', 'customerCityInput', 'customerAddressInput', 'customerNotesInput'].forEach((key) => el[key].value = '');
    showToast('تم حفظ الطلب وتجهيز الفاتورة');
  } catch (error) {
    console.error(error);
    showToast(getActionErrorMessage(error, 'تعذر إرسال الطلب'));
  } finally {
    el.submitOrderBtn.disabled = false;
  }
}

async function updateOrderStatus(orderId, status) {
  if (!(await ensureAdminSession())) return;
  try {
    await updateDoc(doc(db, 'orders', orderId), { status, updatedAt: serverTimestamp() });
    showToast('تم تحديث الطلب');
  } catch (error) {
    console.error(error);
    showToast('تعذر تحديث الطلب');
  }
}

async function deleteOrder(orderId) {
  if (!(await ensureAdminSession())) return;
  if (!confirm('حذف هذا الطلب؟')) return;
  try {
    await deleteDoc(doc(db, 'orders', orderId));
    showToast('تم حذف الطلب');
  } catch (error) {
    console.error(error);
    showToast('تعذر حذف الطلب');
  }
}

function exportProductsExcel() {
  const rows = state.products.map((product) => ({ name: product.name || '', model: product.model || '', pricePiece: getPiecePrice(product), priceDozen: getSeriesBasePrice(product), discountPercent: toNumber(product.discountPercent || 0), mainCategory: getProductMainCategory(product), subCategory: getProductSubCategory(product), sizes: product.sizes || '', packQtyText: getPackQtyText(product), badgeText: product.badgeText || '', pinned: Boolean(product.pinned), visible: product.visible !== false, description: product.description || '', imageUrls: normalizeImageUrls(product.imageUrls).join('\n') }));
  exportWorkbook([{ name: 'products', rows }], 'products');
}

function exportOrdersExcel() {
  const summaryRows = state.orders.map((order) => {
    const totals = getOrderTotals(order);
    return {
      orderNo: getOrderReference(order),
      orderDate: formatOrderDate(order),
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      city: order.city || '',
      address: order.address || '',
      paymentMethod: order.paymentMethod || '',
      shippingMethod: order.shippingMethod || '',
      status: order.status || '',
      notes: order.notes || '',
      modelsCount: totals.models,
      seriesCount: totals.series,
      piecesCount: totals.pieces,
      orderTotal: totals.total,
    };
  });
  const itemRows = state.orders.flatMap((order) => {
    const totals = getOrderTotals(order);
    return (order.items || []).map((item, index) => ({
      orderNo: getOrderReference(order),
      orderDate: formatOrderDate(order),
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      city: order.city || '',
      address: order.address || '',
      paymentMethod: order.paymentMethod || '',
      shippingMethod: order.shippingMethod || '',
      status: order.status || '',
      notes: order.notes || '',
      lineNo: index + 1,
      model: item.model || '',
      productName: resolveInvoiceProductName(item),
      seriesCount: getSeriesCount(item),
      pieceQty: getPieceQuantity(item),
      piecesPerSeries: getPiecesPerSeries(item),
      seriesQtyText: getSeriesQtyText(item),
      seriesValue: getSeriesValue(item),
      lineTotal: getLineTotal(item),
      orderSeriesTotal: totals.series,
      orderPiecesTotal: totals.pieces,
      orderTotal: totals.total,
    }));
  });
  exportWorkbook([
    { name: 'orders_summary', rows: summaryRows },
    { name: 'order_items', rows: itemRows },
  ], 'orders');
}

function exportWorkbook(sheets, filename) {
  if (window.XLSX) {
    const workbook = XLSX.utils.book_new();
    sheets.forEach((entry, index) => {
      const safeName = sanitizeSheetName(entry?.name || `sheet_${index + 1}`);
      const rows = Array.isArray(entry?.rows) && entry.rows.length ? entry.rows : [{ info: 'لا توجد بيانات' }];
      const sheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, sheet, safeName);
    });
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    return;
  }
  const firstSheet = Array.isArray(sheets) ? sheets[0] : null;
  const rows = Array.isArray(firstSheet?.rows) ? firstSheet.rows : [];
  const csv = convertRowsToCsv(rows);
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

function sanitizeSheetName(value = '') {
  return String(value || 'sheet').replace(/[\/?*\[\]:]/g, '_').slice(0, 31) || 'sheet';
}

async function importProductsExcel(event) {
  if (!(await ensureAdminSession())) return;
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const rows = await readExcelRows(file);
    if (!rows.length) return showToast('الملف فارغ');
    const batch = writeBatch(db);
    rows.forEach((row) => {
      const name = firstValue(row, ['name', 'اسم المنتج', 'productName']);
      const model = firstValue(row, ['model', 'موديل']);
      const saleMode = String(firstValue(row, ['saleMode', 'طريقة البيع']) || 'piece').trim().toLowerCase();
      const packQtyText = String(firstValue(row, ['packQtyText', 'dozenQtyText', 'seriesQtyText', 'seriesQty', 'عدد القطع في الدستة', 'كمية السيري', 'السيري', 'minQty', 'الحد الأدنى']) || '12').trim();
      const packQtyNumber = getPackQtyNumber({ packQtyText });
      const piecePriceRaw = firstValue(row, ['pricePiece', 'piecePrice', 'سعر القطعة']);
      const seriesPriceRaw = firstValue(row, ['priceDozen', 'priceWholesale', 'priceSeries', 'price', 'سعر الدستة', 'سعر الجملة', 'سعر السيري']);
      const pricePiece = piecePriceRaw !== undefined && piecePriceRaw !== '' ? Number(piecePriceRaw) : round2(Number(seriesPriceRaw || 0) / packQtyNumber);
      const priceDozen = seriesPriceRaw !== undefined && seriesPriceRaw !== '' ? Number(seriesPriceRaw) : round2(pricePiece * packQtyNumber);
      if (!name || !model || Number.isNaN(pricePiece) || Number.isNaN(priceDozen)) return;
      const ref = doc(collection(db, 'products'));
      batch.set(ref, {
        name: String(name).trim(),
        model: String(model).trim(),
        pricePiece,
        priceDozen,
        saleMode: ['piece','dozen','both'].includes(saleMode) ? saleMode : 'piece',
        discountPercent: clamp(Number(firstValue(row, ['discountPercent', 'discount', 'نسبة الخصم']) || 0), 0, 99),
        mainCategory: String(firstValue(row, ['mainCategory', 'القسم الرئيسي', 'season', 'الموسم']) || getMainCategoryOptions()[0] || 'المطبخ').trim(),
        subCategory: normalizeSubCategory(firstValue(row, ['subCategory', 'subcategory', 'groupLabel', 'التصنيف الداخلي', 'التصنيف الفرعي', 'الفئة'])),
        sizes: String(firstValue(row, ['sizes', 'المقاسات']) || '').trim(),
        packQtyText,
        badgeText: String(firstValue(row, ['badgeText', 'شارة']) || '').trim(),
        pinned: toBool(firstValue(row, ['pinned', 'تثبيت']) || false),
        visible: String(firstValue(row, ['visible', 'إظهار']) || 'true').trim() === '' ? true : toBool(firstValue(row, ['visible', 'إظهار']) || true),
        description: String(firstValue(row, ['description', 'الوصف']) || '').trim(),
        codeCategory: deriveCodeCategory(model),
        imageUrls: normalizeImageUrls(textareaLines(firstValue(row, ['imageUrls', 'الصور']) || '').concat(parseMaybeArray(firstValue(row, ['imageUrl', 'صورة']) || ''))),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    showToast('تم استيراد المنتجات');
  } catch (error) {
    console.error(error);
    showToast('تعذر استيراد الملف');
  } finally {
    el.excelImportInput.value = '';
  }
}

async function deleteCollectionDocs(collectionName, confirmText) {
  if (!(await ensureAdminSession())) return;
  const answer = prompt(`للتأكيد ${confirmText}`);
  if (answer !== confirmText) return;
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    snapshot.docs.forEach((entry) => batch.delete(entry.ref));
    if (!snapshot.empty) await batch.commit();
    showToast('تم الحذف');
  } catch (error) {
    console.error(error);
    showToast('تعذر الحذف');
  }
}

async function deleteAllData() {
  if (!(await ensureAdminSession())) return;
  const answer = prompt('للتأكيد النهائي اكتب حذف كل البيانات');
  if (answer !== 'حذف كل البيانات') return;
  try {
    for (const name of ['products', 'orders', 'categories']) {
      const snapshot = await getDocs(collection(db, name));
      const batch = writeBatch(db);
      snapshot.docs.forEach((entry) => batch.delete(entry.ref));
      if (!snapshot.empty) await batch.commit();
    }
    await Promise.all([
      setDoc(doc(db, 'company', 'main'), DEFAULT_COMPANY),
      setDoc(doc(db, 'settings', 'storefront'), DEFAULT_STOREFRONT),
      setDoc(doc(db, 'settings', 'store'), DEFAULT_STORE_SETTINGS),
      setDoc(doc(db, 'payments', 'default'), { policyText: DEFAULT_PAYMENT_POLICY, methods: DEFAULT_PAYMENT_METHODS }),
      setDoc(doc(db, 'shipping', 'default'), { policyText: DEFAULT_SHIPPING_POLICY }),
    ]);
    state.cart = [];
    renderCart();
    showToast('تمت إعادة ضبط البيانات');
  } catch (error) {
    console.error(error);
    showToast('تعذر حذف البيانات');
  }
}

const DRAWER_MAP = {
  menu: { drawer: el.menuDrawer, bodyClass: 'menu-drawer-open', trigger: el.menuToggle },
  cart: { drawer: el.cartDrawer, bodyClass: 'cart-drawer-open', trigger: el.cartToggle },
  admin: { drawer: el.adminDrawer, bodyClass: 'admin-drawer-open', trigger: el.brandTrigger },
};

function syncDrawerAccessibility(activeKey = '') {
  Object.entries(DRAWER_MAP).forEach(([key, config]) => {
    const isOpen = key === activeKey;
    config.drawer?.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    config.trigger?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

function openDrawer(which) {
  const target = DRAWER_MAP[which];
  if (!target?.drawer) return;

  el.overlay.classList.add('show');
  Object.values(DRAWER_MAP).forEach(({ drawer }) => drawer?.classList.remove('show'));
  document.body.classList.add('drawer-open', 'screen-open');
  document.body.classList.remove('menu-drawer-open', 'cart-drawer-open', 'admin-drawer-open');

  target.drawer.classList.add('show');
  document.body.classList.add(target.bodyClass);
  syncDrawerAccessibility(which);
  try { target.drawer.scrollTo({ top: 0, behavior: 'instant' }); } catch {}
  queueMicrotask(() => target.drawer.focus?.());
}

function closeDrawers() {
  Object.values(DRAWER_MAP).forEach(({ drawer }) => drawer?.classList.remove('show'));
  el.overlay.classList.remove('show');
  document.body.classList.remove('drawer-open', 'screen-open', 'menu-drawer-open', 'cart-drawer-open', 'admin-drawer-open');
  syncDrawerAccessibility('');
}

function handleInitialCartRoute() {
  if (!shouldOpenCartFromRoute()) return;
  queueMicrotask(() => openDrawer('cart'));
  cleanupCartRouteState();
}

function shouldOpenCartFromRoute() {
  const url = new URL(window.location.href);
  return url.searchParams.get('cart') === '1' || url.hash === '#cart' || consumePendingCartOpenFlag();
}

function consumePendingCartOpenFlag() {
  try {
    if (sessionStorage.getItem(OPEN_CART_FLAG_KEY) === '1') {
      sessionStorage.removeItem(OPEN_CART_FLAG_KEY);
      return true;
    }
  } catch {}
  return false;
}

function cleanupCartRouteState() {
  try { sessionStorage.removeItem(OPEN_CART_FLAG_KEY); } catch {}
  const url = new URL(window.location.href);
  let changed = false;
  if (url.searchParams.get('cart') === '1') {
    url.searchParams.delete('cart');
    changed = true;
  }
  if (url.hash === '#cart') {
    url.hash = '';
    changed = true;
  }
  if (changed) history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function openModal(modalId) {
  if (modalId === 'checkoutModal') renderCheckoutPreview();
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.classList.toggle('show', modal.id === modalId);
  });
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
}
function closeModal(modalId) {
  if (modalId) id(modalId)?.classList.remove('show');
  if (modalId === 'invoiceModal') cleanupInvoicePreview();
  if (!document.querySelector('.modal.show')) {
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
  }
}

function openPolicy(title, text) {
  closeDrawers();
  el.policyModalTitle.textContent = title;
  el.policyModalContent.textContent = text || '';
  openModal('policyModal');
}


function openQuickProduct(product) {
  if (!product || !el.quickProductModal) return;
  const urls = normalizeImageUrls(product.imageUrls);
  const originalUrl = urls[0] || placeholderImage(product.name || product.model || 'Elite Home Ware');
  const thumbUrl = getProductThumbUrl(originalUrl);
  const productLabel = product.name || `موديل ${product.model || ''}`.trim() || 'منتج';
  const mainCategoryLabel = getProductMainCategory(product) || '—';
  const subCategoryLabel = getProductSubCategory(product);
  const metaLabel = subCategoryLabel || 'قسم رئيسي';
  const sizesLabel = product.sizes || '—';
  const seriesLabel = getSeriesLabel(product);
  const productPageUrl = getProductPageUrl(product);
  el.quickProductImage.src = thumbUrl;
  el.quickProductImage.alt = buildProductAlt(product);
  el.quickProductImage.dataset.fullImage = originalUrl;
  el.quickProductName.textContent = product.name || 'بدون اسم';
  el.quickProductModel.textContent = `موديل ${product.model || '-'}`;
  el.quickProductPriceLabel.textContent = getStoreCardPriceLabel(product);
  el.quickProductPrice.textContent = getStoreCardPriceValue(product);
  el.quickProductSeries.textContent = seriesLabel;
  el.quickProductSizes.textContent = sizesLabel;
  el.quickProductCategory.textContent = mainCategoryLabel;
  el.quickProductSeason.textContent = subCategoryLabel || metaLabel;
  el.quickProductOpenPage.href = productPageUrl;
  el.quickProductOpenPage.setAttribute('aria-label', `فتح صفحة ${productLabel}`);
  el.quickProductAddBtn.dataset.productId = String(product.id || '');
  const quickAddSpan = el.quickProductAddBtn.querySelector('span');
  if (quickAddSpan) quickAddSpan.textContent = getStoreCardActionText(product);
  openModal('quickProductModal');
}

function openGallery(urls, index = 0) {
  state.gallery.urls = urls;
  state.gallery.index = index;
  syncGallery();
  openModal('imageModal');
}

function changeGallery(delta) {
  if (!state.gallery.urls.length) return;
  state.gallery.index = (state.gallery.index + delta + state.gallery.urls.length) % state.gallery.urls.length;
  syncGallery();
}

function syncGallery() {
  const rawUrl = String(state.gallery.urls[state.gallery.index] || '').trim();
  const optimizedUrl = getGalleryImageUrl(rawUrl);
  const fallbackUrl = rawUrl || placeholderImage('Elite Home Ware');
  el.modalImage.alt = `صورة منتج ${state.gallery.index + 1} - ${getBrandDisplayName()}`;
  el.modalImage.dataset.fallbackUrl = fallbackUrl;
  el.modalImage.dataset.failedOnce = '0';
  el.modalImage.onerror = () => {
    if (el.modalImage.dataset.failedOnce === '1') {
      el.modalImage.onerror = null;
      el.modalImage.src = placeholderImage('Elite Home Ware');
      return;
    }
    el.modalImage.dataset.failedOnce = '1';
    el.modalImage.src = fallbackUrl;
  };
  el.modalImage.src = optimizedUrl || fallbackUrl;
  el.galleryThumbs.innerHTML = '';
  state.gallery.urls.forEach((imageUrl, index) => {
    const button = document.createElement('button');
    button.className = index === state.gallery.index ? 'active' : '';
    button.innerHTML = `<img src="${escapeAttr(getMiniImageUrl(imageUrl) || imageUrl || placeholderImage('Elite Home Ware'))}" alt="صورة مصغرة للمنتج ${index + 1}" loading="lazy" decoding="async" />`;
    button.addEventListener('click', () => { state.gallery.index = index; syncGallery(); });
    el.galleryThumbs.appendChild(button);
  });
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    const showInstall = state.storefront.installEnabled;
    el.installBtn.classList.toggle('hidden', !showInstall);
    el.menuInstallBtn.classList.toggle('hidden', !showInstall);
  });
}

async function installPwa() {
  closeDrawers();
  if (!state.deferredInstallPrompt) return showToast('التثبيت غير متاح الآن');
  state.deferredInstallPrompt.prompt();
  await state.deferredInstallPrompt.userChoice.catch(() => null);
  state.deferredInstallPrompt = null;
  el.installBtn.classList.add('hidden');
  el.menuInstallBtn.classList.add('hidden');
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register(`./service-worker.js?v=${APP_SW_VERSION}`).catch(console.error));
  }
}

function openWhatsAppDirect() {
  const link = buildWhatsAppLink();
  if (!link) return showToast('رقم الواتساب غير متوفر');
  safeOpenExternal(link);
}

function buildWhatsAppLink(message = '') {
  const phone = normalizeWhatsAppNumber(state.company.whatsapp || state.company.phone1 || '');
  if (!phone) return '';
  return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

function getActionErrorMessage(error, fallback = 'تعذر تنفيذ العملية') {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').trim();
  if (code.includes('permission-denied') || message.includes('Missing or insufficient permissions')) {
    return 'لا توجد صلاحية للحفظ. تم تحديث النظام لقراءة حساب الأدمن بالبريد أو UID. إذا استمرت الرسالة فحدّث قواعد Firestore من الملف المرفق ثم أعد تسجيل الدخول';
  }
  if (code.includes('unavailable')) return 'تعذر الاتصال بقاعدة البيانات الآن. أعد المحاولة بعد قليل';
  if (code.includes('failed-precondition')) return 'قاعدة البيانات تحتاج إلى الإعداد المطلوب داخل Firebase ثم إعادة المحاولة';
  return fallback;
}


function getOrderTotals(order) {
  return (Array.isArray(order?.items) ? order.items : []).reduce((acc, item) => {
    acc.models += 1;
    acc.series += getSeriesCount(item);
    acc.pieces += getLinePiecesTotal(item);
    acc.total += getLineTotal(item);
    return acc;
  }, { models: 0, series: 0, pieces: 0, total: 0 });
}

function buildWhatsAppOrderMessage(order) {
  const brandName = String(state.storefront.companyName || state.company.companyName || 'Elite Home Ware').trim();
  const separator = '━━━━━━━━━━━━━━━━';
  const lines = [
    `*${brandName}*`,
    '*تفاصيل الطلبية*',
    separator,
    `رقم الطلب: ${getOrderReference(order)}`,
    `العميل: ${order.customerName || ''}`,
    `الهاتف: ${order.customerPhone || ''}`,
    `المدينة: ${order.city || ''}`,
    `العنوان: ${order.address || ''}`,
  ];
  if (order.shippingMethod) lines.push(`طريقة الاستلام: ${order.shippingMethod}`);
  if (order.paymentMethod) lines.push(`طريقة الدفع: ${order.paymentMethod}`);
  lines.push(separator, '*الأصناف:*');
  (order.items || []).forEach((item, index) => {
    lines.push(
      `*${index + 1}*`,
      `الصنف: ${resolveInvoiceProductName(item)}`,
      `رقم الموديل: ${item.model || '—'}`,
      `العدد: ${getSeriesCount(item)} ${getSaleUnitLabel(getCartSaleUnit(item))}`,
      `كمية القطع: ${getPieceQuantity(item)}`,
      separator
    );
  });
  if (order.notes) lines.push(`ملاحظات: ${order.notes}`);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function generateOrderNumber(isoString = '') {
  const date = new Date(isoString || Date.now());
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yy}${mm}${dd}-${hh}${min}${ss}`;
}

function getOrderReference(order) {
  return String(order?.orderNo || order?.id || '—');
}

function formatOrderDate(order) {
  const source = order?.createdAtClient || order?.createdAt || order?.updatedAt || Date.now();
  const date = new Date(typeof source?.toMillis === 'function' ? source.toMillis() : source);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function resolveInvoiceProductName(item) {
  return String(item?.name || `موديل ${item?.model || ''}` || 'منتج').replace(/\s+/g, ' ').trim();
}

function buildInvoiceFilename(order) {
  const ref = sanitizePathSegment(getOrderReference(order) || 'order');
  return `invoice-${ref}.png`;
}

function cleanupInvoicePreview() {
  if (state.invoicePreview.url) URL.revokeObjectURL(state.invoicePreview.url);
  state.invoicePreview = { order: null, blob: null, url: '' };
  if (el.invoicePreviewImage) el.invoicePreviewImage.src = '';
}

async function openInvoicePreview(order) {
  const blob = await createInvoiceImageBlob(order);
  if (!blob) throw new Error('invoice blob not created');
  if (state.invoicePreview.url) URL.revokeObjectURL(state.invoicePreview.url);
  const url = URL.createObjectURL(blob);
  state.invoicePreview = { order, blob, url };
  if (el.invoicePreviewImage) el.invoicePreviewImage.src = url;
  openModal('invoiceModal');
}

async function previewOrderInvoice(order) {
  try {
    await openInvoicePreview(order);
  } catch (error) {
    console.error(error);
    showToast('تعذر تجهيز الفاتورة');
  }
}

async function downloadActiveInvoice() {
  const active = state.invoicePreview;
  if (!active?.order) return showToast('لا توجد فاتورة جاهزة');
  if (active.blob) {
    downloadBlob(active.blob, buildInvoiceFilename(active.order));
    return;
  }
  await downloadInvoiceForOrder(active.order);
}

async function downloadInvoiceForOrder(order) {
  try {
    const blob = await createInvoiceImageBlob(order);
    if (!blob) return showToast('تعذر تجهيز الفاتورة');
    downloadBlob(blob, buildInvoiceFilename(order));
  } catch (error) {
    console.error(error);
    showToast('تعذر تنزيل الفاتورة');
  }
}

function openInvoiceWhatsApp() {
  const order = state.invoicePreview.order;
  if (!order) return showToast('لا توجد بيانات للطلب');
  const link = buildWhatsAppLink(buildWhatsAppOrderMessage(order));
  if (!link) return showToast('رقم الواتساب غير متوفر');
  safeOpenExternal(link);
}

async function createInvoiceImageBlob(order) {
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch {}
  }
  const canvas = await buildInvoiceCanvas(order);
  return await canvasToBlob(canvas);
}

async function buildInvoiceCanvas(order) {
  const width = 1720;
  const margin = 68;
  const contentWidth = width - (margin * 2);
  const invoiceItems = (Array.isArray(order?.items) ? order.items : []).map((item, index) => ({
    ...item,
    serial: index + 1,
    productName: resolveInvoiceProductName(item),
    seriesCount: getSeriesCount(item),
    pieceQty: getPieceQuantity(item),
    seriesValue: getSeriesValue(item),
    lineTotal: getLineTotal(item),
  }));
  const totals = getOrderTotals(order);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = 400;
  const measure = tempCanvas.getContext('2d');
  setupInvoiceContext(measure);

  const fixedWidths = 92 + 170 + 120 + 120 + 150 + 190 + 220;
  const cols = [
    { key: 'serial', title: 'م', width: 92, align: 'center' },
    { key: 'model', title: 'رقم الموديل', width: 170, align: 'center' },
    { key: 'name', title: 'الصنف', width: contentWidth - fixedWidths, align: 'right' },
    { key: 'seriesCount', title: 'العدد', width: 120, align: 'center' },
    { key: 'saleUnit', title: 'الوحدة', width: 120, align: 'center' },
    { key: 'pieceQty', title: 'كمية القطع', width: 150, align: 'center' },
    { key: 'seriesValue', title: 'سعر الوحدة', width: 190, align: 'center' },
    { key: 'lineTotal', title: 'الإجمالي', width: 220, align: 'center' },
  ];

  const rowHeights = invoiceItems.map((item) => {
    measure.font = '600 32px Cairo, sans-serif';
    const lines = wrapCanvasText(measure, item.productName, cols[2].width - 40, 3);
    return Math.max(94, 30 + (lines.length * 38));
  });

  const tableHeight = 84 + rowHeights.reduce((sum, value) => sum + value, 0);
  const headerHeight = 206;
  const infoHeight = 182;
  const summaryHeight = 182;
  const height = Math.max(1660, margin + headerHeight + 26 + infoHeight + 28 + tableHeight + 28 + summaryHeight + margin);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  setupInvoiceContext(ctx);

  drawInvoiceBackground(ctx, width, height);
  const logoSource = getInvoiceLogoSource();
  const logoImage = logoSource ? await loadImageSafe(logoSource) : null;

  let y = margin;
  drawInvoiceHeader(ctx, { width, margin, contentWidth, y, order, logoImage, totals, headerHeight });
  y += headerHeight + 26;

  y = drawInvoiceInfoSection(ctx, { width, margin, contentWidth, y, order, infoHeight });
  y += 28;

  drawInvoiceTable(ctx, { width, margin, contentWidth, y, items: invoiceItems, cols, rowHeights });
  y += tableHeight + 28;

  drawInvoiceSummary(ctx, { width, margin, contentWidth, y, totals, order, summaryHeight });
  return canvas;
}

function setupInvoiceContext(ctx) {
  ctx.direction = 'rtl';
  ctx.textBaseline = 'alphabetic';
  ctx.imageSmoothingEnabled = true;
}

function drawInvoiceBackground(ctx, width, height) {
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#fffdf8');
  bg.addColorStop(1, '#fff8ef');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(194, 154, 63, 0.08)';
  for (let i = 0; i < 20; i += 1) {
    ctx.beginPath();
    ctx.arc((width * 0.12) + (i * 58), 80 + ((i % 4) * 8), 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#d4af5a';
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, width - 56, height - 56);
  ctx.strokeStyle = 'rgba(212,175,90,.55)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(46, 46, width - 92, height - 92);
}

function drawInvoiceHeader(ctx, { width, margin, contentWidth, y, order, logoImage, totals, headerHeight }) {
  drawRoundedRect(ctx, margin, y, contentWidth, headerHeight, 34, '#ffffff');
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,175,90,.42)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (logoImage) {
    ctx.drawImage(logoImage, width - margin - 196, y + 34, 132, 132);
  } else {
    ctx.fillStyle = '#6d28d9';
    ctx.beginPath();
    ctx.arc(width - margin - 128, y + 100, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '900 42px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(initials(getBrandDisplayName() || 'EH'), width - margin - 128, y + 113);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = '#5b2f0b';
  ctx.font = '900 64px Cairo, sans-serif';
  ctx.fillText('فاتورة الطلب', width - margin - 232, y + 90);
  ctx.fillStyle = '#7c6240';
  ctx.font = '700 28px Cairo, sans-serif';
  ctx.fillText(getBrandDisplayName() || SITE_NAME_AR, width - margin - 232, y + 136);
  ctx.fillStyle = '#b78b2d';
  ctx.font = '800 30px Cairo, sans-serif';
  ctx.fillText(`إجمالي الفاتورة: ${formatCurrency(totals.total)}`, width - margin - 232, y + 178);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#6b7280';
  ctx.font = '700 24px Cairo, sans-serif';
  ctx.fillText(`رقم الطلب: ${getOrderReference(order)}`, margin + 28, y + 70);
  ctx.fillText(`التاريخ: ${formatOrderDate(order)}`, margin + 28, y + 108);
  ctx.fillText(`عدد الموديلات: ${totals.models}`, margin + 28, y + 146);
  ctx.fillText(`إجمالي القطع: ${totals.pieces}`, margin + 28, y + 184);
}

function drawInvoiceInfoSection(ctx, { width, margin, contentWidth, y, order, infoHeight }) {
  const gap = 20;
  const boxWidth = (contentWidth - gap) / 2;
  drawInvoiceInfoCard(ctx, width - margin - boxWidth, y, boxWidth, infoHeight, 'بيانات العميل', [
    `العميل: ${order.customerName || '—'}`,
    `الهاتف: ${order.customerPhone || '—'}`,
    `المدينة: ${order.city || '—'}`,
  ]);
  drawInvoiceInfoCard(ctx, margin, y, boxWidth, infoHeight, 'بيانات الطلب', [
    `العنوان: ${order.address || '—'}`,
    `طريقة الدفع: ${order.paymentMethod || '—'}`,
    `طريقة الاستلام: ${order.shippingMethod || '—'}`,
  ]);
  return y + infoHeight;
}

function drawInvoiceInfoCard(ctx, x, y, w, h, title, lines, align = 'right') {
  drawRoundedRect(ctx, x, y, w, h, 24, 'rgba(255,255,255,.96)');
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,175,90,.34)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = '#b78b2d';
  ctx.font = '800 28px Cairo, sans-serif';
  ctx.textAlign = align === 'right' ? 'right' : 'left';
  const textX = align === 'right' ? x + w - 24 : x + 24;
  ctx.fillText(title, textX, y + 42);
  ctx.fillStyle = '#1f2937';
  ctx.font = '600 25px Cairo, sans-serif';
  lines.forEach((line, index) => {
    const maxWidth = w - 48;
    const wrapped = wrapCanvasText(ctx, line, maxWidth, 2);
    const yy = y + 88 + (index * 31);
    wrapped.forEach((part, partIndex) => ctx.fillText(part, textX, yy + (partIndex * 29)));
  });
}

function drawInvoiceTable(ctx, { width, margin, contentWidth, y, items, cols, rowHeights }) {
  const startX = margin;
  let cursorX = width - margin;
  ctx.fillStyle = '#c79b3b';
  drawRoundedRect(ctx, startX, y, contentWidth, 84, 22, '#c79b3b');
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '800 28px Cairo, sans-serif';

  const cells = cols.map((col) => {
    cursorX -= col.width;
    return { ...col, x: cursorX };
  });

  cells.forEach((cell) => {
    ctx.textAlign = cell.align === 'right' ? 'right' : 'center';
    const textX = cell.align === 'right' ? cell.x + cell.width - 20 : cell.x + (cell.width / 2);
    ctx.fillText(cell.title, textX, y + 52);
    ctx.strokeStyle = 'rgba(255,255,255,.24)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cell.x, y + 8);
    ctx.lineTo(cell.x, y + 76);
    ctx.stroke();
  });

  let currentY = y + 84;
  items.forEach((item, index) => {
    const rowHeight = rowHeights[index] || 94;
    drawRoundedRect(ctx, startX, currentY, contentWidth, rowHeight, 0, index % 2 === 0 ? 'rgba(255,255,255,.95)' : 'rgba(255,248,236,.92)');
    ctx.fill();
    ctx.strokeStyle = 'rgba(212,175,90,.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, currentY, contentWidth, rowHeight);
    cells.forEach((cell) => {
      ctx.strokeStyle = 'rgba(212,175,90,.18)';
      ctx.beginPath();
      ctx.moveTo(cell.x, currentY);
      ctx.lineTo(cell.x, currentY + rowHeight);
      ctx.stroke();
      ctx.fillStyle = '#18212f';
      ctx.font = cell.key === 'name' ? '600 32px Cairo, sans-serif' : '700 28px Cairo, sans-serif';
      ctx.textAlign = cell.align === 'right' ? 'right' : 'center';
      const textX = cell.align === 'right' ? cell.x + cell.width - 20 : cell.x + (cell.width / 2);
      if (cell.key === 'name') {
        const lines = wrapCanvasText(ctx, item.productName, cell.width - 40, 3);
        const lineStartY = currentY + 40;
        lines.forEach((line, idx) => ctx.fillText(line, textX, lineStartY + (idx * 34)));
      } else if (cell.key === 'seriesValue') {
        ctx.fillText(formatCurrency(item.seriesValue), textX, currentY + (rowHeight / 2) + 10);
      } else if (cell.key === 'lineTotal') {
        ctx.fillText(formatCurrency(item.lineTotal), textX, currentY + (rowHeight / 2) + 10);
      } else if (cell.key === 'serial') {
        ctx.fillText(String(item.serial || index + 1), textX, currentY + (rowHeight / 2) + 10);
      } else if (cell.key === 'model') {
        ctx.fillText(String(item.model || '—'), textX, currentY + (rowHeight / 2) + 10);
      } else if (cell.key === 'seriesCount') {
        ctx.fillText(String(item.seriesCount || 0), textX, currentY + (rowHeight / 2) + 10);
      } else if (cell.key === 'pieceQty') {
        ctx.fillText(String(item.pieceQty || 0), textX, currentY + (rowHeight / 2) + 10);
      }
    });
    currentY += rowHeight;
  });
}

function drawInvoiceSummary(ctx, { width, margin, contentWidth, y, totals, order, summaryHeight }) {
  const gap = 18;
  const totalCardWidth = 360;
  const smallCardWidth = (contentWidth - totalCardWidth - (gap * 3)) / 3;
  const summaryCards = [
    { title: 'عدد الموديلات', value: totals.models },
    { title: 'عدد الوحدات', value: totals.series },
    { title: 'إجمالي القطع', value: totals.pieces },
  ];
  summaryCards.forEach((card, index) => {
    const x = margin + ((smallCardWidth + gap) * index);
    drawRoundedRect(ctx, x, y, smallCardWidth, summaryHeight, 26, 'rgba(255,255,255,.96)');
    ctx.fill();
    ctx.strokeStyle = 'rgba(212,175,90,.34)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#b78b2d';
    ctx.font = '800 28px Cairo, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(card.title, x + smallCardWidth - 24, y + 52);
    ctx.fillStyle = '#18212f';
    ctx.font = '900 52px Cairo, sans-serif';
    ctx.fillText(String(card.value), x + smallCardWidth - 24, y + 122);
    ctx.fillStyle = '#6b7280';
    ctx.font = '700 22px Cairo, sans-serif';
    ctx.fillText(`مرجع الطلب ${getOrderReference(order)}`, x + smallCardWidth - 24, y + 158);
  });

  const totalX = width - margin - totalCardWidth;
  drawRoundedRect(ctx, totalX, y, totalCardWidth, summaryHeight, 30, '#1f2937');
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,175,90,.55)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = '#f4d27b';
  ctx.font = '800 30px Cairo, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('إجمالي الفاتورة', totalX + totalCardWidth - 28, y + 56);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 54px Cairo, sans-serif';
  ctx.fillText(formatCurrency(totals.total), totalX + totalCardWidth - 28, y + 126);
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  ctx.font = '700 24px Cairo, sans-serif';
  ctx.fillText('تشمل قيمة الوحدات والإجمالي النهائي', totalX + totalCardWidth - 28, y + 164);
}

function getInvoiceLogoSource() {
  const logo = String(state.storefront.logoUrl || '').trim();
  return logo || new URL('assets/icon-512.png', window.location.href).href;
}

function drawRoundedRect(ctx, x, y, w, h, r, fillStyle) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
  }
}

function wrapCanvasText(ctx, text, maxWidth, maxLines = 2) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ['—'];
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !current) {
      current = test;
      return;
    }
    lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const trimmed = lines.slice(0, maxLines);
  let last = trimmed[maxLines - 1];
  while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) last = last.slice(0, -1).trim();
  trimmed[maxLines - 1] = `${last}…`;
  return trimmed;
}

function loadImageSafe(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
    }, 'image/png', 1);
  });
}

function applyTheme() {
  const primary = state.storefront.accentColor || DEFAULT_STOREFRONT.accentColor;
  const secondary = state.storefront.accentColor2 || DEFAULT_STOREFRONT.accentColor2;
  document.documentElement.style.setProperty('--primary', primary);
  document.documentElement.style.setProperty('--primary-2', secondary);
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', secondary);
}



function clearFilters() {
  const season = state.catalog.selectedSeason || '';
  const category = state.catalog.step === 'products' ? (state.catalog.selectedCategory || 'all') : 'all';
  const subCategory = state.catalog.step === 'products' ? (state.catalog.selectedSubCategory || 'all') : 'all';
  state.filter = { search: '', category: category || 'all', subCategory: subCategory || 'all', season: season || 'all', offersOnly: false, sort: 'featured' };
  el.searchInput.value = '';
  el.sortFilter.value = 'featured';
  resetRenderedProducts();
  applyFilters();
}

function resetRenderedProducts() {
  state.renderedCount = PRODUCT_PAGE_SIZE;
}

function renderMoreProducts() {
  state.renderedCount += PRODUCT_PAGE_SIZE;
  renderProducts();
}

function buildProductSearchText(product) {
  return `${product.name || ''} ${product.model || ''} ${getProductMainCategory(product) || ''} ${product.sizes || ''} ${product.codeCategory || ''} ${getProductSubCategory(product)}`.toLowerCase();
}

function enrichProduct(product) {
  return { ...product, _searchText: buildProductSearchText(product) };
}

const hasDiscount = (product) => toNumber(product.discountPercent || 0) > 0;
const getVisibleProducts = () => {
  if (state.cache.visibleProductsSource === state.products && Array.isArray(state.cache.visibleProducts)) return state.cache.visibleProducts;
  state.cache.visibleProductsSource = state.products;
  state.cache.visibleProducts = state.products.filter((item) => item.visible !== false);
  return state.cache.visibleProducts;
};


function getCodeCategoryKeys() {
  return [...new Set(state.products.map((item) => String(item.codeCategory || deriveCodeCategory(item.model))).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

function getCodeCategoryLabel(code) {
  const safeCode = String(code || '').trim();
  const match = state.categories.find((item) => item.type === 'code' && String(item.code || item.label) === safeCode);
  const fallbackLabel = state.storeSettings?.codeCategoryLabels?.[safeCode];
  return match?.label || fallbackLabel || `تصنيف ${safeCode}`;
}

function getSeasonOptions() {
  return [...new Set([...(Array.isArray(state.storeSettings.mainCategories) ? state.storeSettings.mainCategories : (Array.isArray(state.storeSettings.seasons) ? state.storeSettings.seasons : [])), ...state.products.map((item) => getProductMainCategory(item)).filter(Boolean)])];
}

function getMainCategoryOptions() { return getSeasonOptions(); }

function deriveCodeCategory(modelValue) {
  const numeric = String(modelValue || '').replace(/\D/g, '');
  if (!numeric) return '0';
  return parseInt(numeric, 10) >= 1000 ? numeric.slice(0, 2) : numeric.slice(0, 1);
}

function parseMaybeArray(value) {
  if (Array.isArray(value)) return value;
  const text = String(value || '').trim();
  if (!text) return [];
  if (text.startsWith('[')) { try { return JSON.parse(text); } catch { return [text]; } }
  return [text];
}

const normalizeImageUrls = (list) => [...new Set((Array.isArray(list) ? list : [list]).flat().map((item) => String(item || '').trim()).filter(Boolean))];
const textareaLines = (value) => String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const parseCommaList = (value) => [...new Set(String(value || '').split(',').map((item) => item.trim()).filter(Boolean))];
const firstValue = (row, keys) => { for (const key of keys) { if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== '') return row[key]; } return ''; };
const toBool = (value) => ['true', '1', 'yes', 'نعم', 'y'].includes(String(value).trim().toLowerCase());
const initials = (text) => String(text || 'EH').trim().split(/\s+/).slice(0, 2).map((item) => item[0] || '').join('').toUpperCase() || 'EH';

function optimizeCloudinaryImage(url, { width = 720, height = 900, crop = 'fill' } = {}) {
  const raw = String(url || '').trim();
  if (!raw || !raw.includes('res.cloudinary.com') || !raw.includes('/image/upload/')) return raw;
  const parts = ['f_auto', 'q_auto', 'dpr_auto', `c_${crop}`];
  if (crop !== 'limit') parts.push('g_auto');
  if (Number.isFinite(width) && width > 0) parts.push(`w_${Math.round(width)}`);
  if (Number.isFinite(height) && height > 0) parts.push(`h_${Math.round(height)}`);
  return raw.replace('/image/upload/', `/image/upload/${parts.join(',')}/`);
}

function getProductThumbUrl(url) {
  return optimizeCloudinaryImage(url, { width: 560, height: 700, crop: 'fill' }) || url;
}

function getMiniImageUrl(url) {
  return optimizeCloudinaryImage(url, { width: 240, height: 300, crop: 'fill' }) || url;
}

function getGalleryImageUrl(url) {
  return optimizeCloudinaryImage(url, { width: 1600, height: NaN, crop: 'limit' }) || String(url || '').trim();
}

function placeholderImage(text, width = 900, height = 1125) {
  const bg1 = encodeURIComponent(state.storefront.accentColor || DEFAULT_STOREFRONT.accentColor);
  const bg2 = encodeURIComponent(state.storefront.accentColor2 || DEFAULT_STOREFRONT.accentColor2);
  const safeText = escapeHTML(text || 'Elite Home Ware');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="38" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.22)"/><text x="50%" y="50%" fill="white" font-family="Arial, sans-serif" font-size="48" text-anchor="middle" dominant-baseline="middle">${safeText}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function bindExternalLinkButton(button, getUrl) {
  if (!button) return;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (button.disabled || button.classList.contains('hidden') || button.offsetParent === null) return;
    if (document.body.classList.contains('admin-drawer-open') && !button.closest('#contactModal')) return;
    if (document.body.classList.contains('drawer-open') && !button.closest('#contactModal')) return;
    const url = typeof getUrl === 'function' ? getUrl() : '';
    if (!url) return showToast('الرابط غير متوفر');
    safeOpenExternal(url);
  });
}

function safeOpenExternal(url) {
  const clean = String(url || '').trim();
  if (!clean) return;
  window.open(clean, '_blank', 'noopener,noreferrer');
}

function setActionLink(button, url) {
  if (!button) return;
  button.dataset.url = url || '';
  const enabled = Boolean(url);
  button.disabled = !enabled;
  button.style.pointerEvents = enabled ? 'auto' : 'none';
  button.style.opacity = enabled ? '1' : '.45';
}

function makeBadge(text) { const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = text; return badge; }
function getCurrencySymbol() {
  return String(state.storefront?.currencySymbol || 'ل.س').trim() || 'ل.س';
}
const formatCurrency = (value) => `${round2(toNumber(value || 0)).toLocaleString('en-US')} ${getCurrencySymbol()}`;
const toNumber = (value) => { const num = Number(value); return Number.isFinite(num) ? num : 0; };
const toInt = (value) => parseInt(value, 10) || 0;
const toMillis = (value) => !value ? 0 : typeof value.toMillis === 'function' ? value.toMillis() : value instanceof Date ? value.getTime() : typeof value === 'number' ? value : new Date(value).getTime() || 0;
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const sanitizePathSegment = (value) => String(value || 'folder').trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'folder';
function normalizeWhatsAppNumber(value) { const digits = String(value || '').replace(/\D/g, ''); if (!digits) return ''; if (digits.startsWith('20')) return digits; if (digits.startsWith('0')) return `2${digits}`; return digits; }
function loadLocalJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
const saveLocalJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
function debounce(fn, wait = 120) { let timer = 0; return (...args) => { clearTimeout(timer); timer = window.setTimeout(() => fn(...args), wait); }; }
function showToast(message) { el.toast.textContent = message; el.toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.toast.classList.remove('show'), 2600); }
function guardAdmin() { if (state.isAdmin || isAllowedAdminUser(auth.currentUser)) return true; showToast('سجل الدخول أولاً'); openDrawer('admin'); return false; }
async function readExcelRows(file) { if (!window.XLSX) throw new Error('SheetJS not loaded'); const buffer = await file.arrayBuffer(); const workbook = XLSX.read(buffer, { type: 'array' }); return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' }); }
function convertRowsToCsv(rows) { if (!rows.length) return 'info\nلا توجد بيانات'; const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))]; return [headers.join(','), ...rows.map((row) => headers.map((key) => escapeCsv(row[key])).join(','))].join('\n'); }
function escapeCsv(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
function downloadBlob(blob, filename) { const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href); }
async function copyText(text) { try { await navigator.clipboard.writeText(text); showToast('تم النسخ'); } catch { showToast('تعذر النسخ'); } }
function id(value) { return document.getElementById(value); }
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function escapeAttr(value) { return escapeHTML(value).replace(/`/g, '&#96;'); }


function sanitizeCloudName(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function getSaleMode(product) {
  const raw = String(product?.saleMode || '').trim().toLowerCase();
  if (raw === 'piece' || raw === 'dozen' || raw === 'both') return raw;
  return getSeriesQtyNumber(product) > 1 ? 'dozen' : 'piece';
}

function canSellByPiece(product) {
  const mode = getSaleMode(product);
  return mode === 'piece' || mode === 'both';
}

function canSellByDozen(product) {
  const mode = getSaleMode(product);
  return mode === 'dozen' || mode === 'both';
}

function getPrimarySaleUnit(product) {
  return canSellByPiece(product) ? 'piece' : 'dozen';
}

function normalizeSaleUnit(unit, product) {
  const safe = String(unit || '').trim().toLowerCase();
  if (safe === 'piece' && canSellByPiece(product)) return 'piece';
  if (safe === 'dozen' && canSellByDozen(product)) return 'dozen';
  return getPrimarySaleUnit(product);
}

function getCartSaleUnit(item) {
  const safe = String(item?.saleUnit || '').trim().toLowerCase();
  if (safe === 'piece' || safe === 'dozen') return safe;
  return getPrimarySaleUnit(item);
}

function getSaleUnitLabel(unit) {
  return String(unit) === 'dozen' ? 'دستة' : 'قطعة';
}

function getUnitPricingLabel(unit) {
  return String(unit) === 'dozen' ? 'سعر الدستة' : 'سعر القطعة';
}

function buildCartItemKey(productId, saleUnit) {
  return `${productId || ''}__${saleUnit || 'piece'}`;
}

function getSeriesQtyText(product) {
  const value = String(product?.seriesQtyText ?? product?.packQtyText ?? product?.dozenQtyText ?? product?.minQty ?? '').trim();
  return value || '12';
}

function getSeriesQtyNumber(product) {
  const text = getSeriesQtyText(product);
  const match = String(text).match(/\d+(?:\.\d+)?/);
  const qty = match ? Number(match[0]) : 12;
  return qty > 0 ? qty : 12;
}

function getPiecePrice(product) {
  const explicit = product?.pricePiece ?? product?.piecePrice ?? product?.pricePerPiece;
  if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') return round2(toNumber(explicit));
  const dozenPrice = toNumber(product?.priceWholesale || product?.unitPrice || 0);
  const qty = getSeriesQtyNumber(product);
  return qty > 0 ? round2(dozenPrice / qty) : round2(dozenPrice);
}

function getDozenBasePrice(product) {
  const explicit = product?.priceDozen ?? product?.priceWholesale ?? product?.unitPrice;
  if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') return round2(toNumber(explicit));
  return round2(getPiecePrice(product) * getSeriesQtyNumber(product));
}

function getBasePrice(product, unit = getPrimarySaleUnit(product)) {
  return unit === 'dozen' ? getDozenBasePrice(product) : getPiecePrice(product);
}

function getDisplayPrice(product, unit = getPrimarySaleUnit(product)) {
  const price = getBasePrice(product, unit);
  const discount = clamp(toNumber(product?.discountPercent || 0), 0, 99);
  return round2(price - (price * discount / 100));
}

function getDozenPrice(product) {
  return getDisplayPrice(product, 'dozen');
}

function getSeriesBasePrice(product) {
  return getDozenBasePrice(product);
}

function getSeriesLabel(product) {
  const text = getSeriesQtyText(product);
  return /^\d+(?:\.\d+)?$/.test(text) ? `${text} قطعة في الدستة` : text;
}

function getSeriesCount(item) {
  const value = toInt(item?.qty ?? item?.seriesCount ?? 1);
  return value > 0 ? value : 1;
}

function getPiecesPerSeries(item) {
  if (getCartSaleUnit(item) === 'piece') return 1;
  const explicit = toInt(item?.piecesPerSeries ?? item?.pieceQtyPerSeries ?? item?.packQty ?? 0);
  if (explicit > 0) return explicit;
  return getSeriesQtyNumber(item);
}

function getPieceQuantity(item) {
  return getSeriesCount(item) * getPiecesPerSeries(item);
}

function getSeriesValue(item) {
  const explicit = item?.unitPrice ?? item?.priceDozen ?? item?.priceWholesale ?? item?.seriesPrice;
  if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') return round2(toNumber(explicit));
  return round2(getDisplayPrice(item, getCartSaleUnit(item)));
}

function getLineTotal(item) {
  return round2(getSeriesCount(item) * getSeriesValue(item));
}

function getLinePiecesTotal(item) {
  return getPieceQuantity(item);
}

function getSeriesCountLabel(count) {
  const safe = Math.max(0, toInt(count || 0));
  return `${safe} عنصر`;
}

function getAdminPriceSummary(product) {
  const parts = [];
  if (canSellByPiece(product)) parts.push(`سعر القطعة ${formatCurrency(getDisplayPrice(product, 'piece'))}`);
  if (canSellByDozen(product)) parts.push(`سعر الدستة ${formatCurrency(getDisplayPrice(product, 'dozen'))}`);
  if (canSellByDozen(product)) parts.push(getSeriesLabel(product));
  return parts.join(' • ');
}

function getQuickProductPriceText(product) {
  if (getSaleMode(product) === 'both') return `${formatCurrency(getDisplayPrice(product, 'piece'))} / ${formatCurrency(getDisplayPrice(product, 'dozen'))}`;
  return formatCurrency(getDisplayPrice(product, getPrimarySaleUnit(product)));
}

function getStoreCardPriceLabel(product) {
  const mode = getSaleMode(product);
  if (mode === 'piece') return 'سعر القطعة';
  if (mode === 'dozen') return 'سعر الدستة';
  return 'قطعة / دستة';
}

function getStoreCardPriceValue(product) {
  const mode = getSaleMode(product);
  if (mode === 'piece') return formatCurrency(getDisplayPrice(product, 'piece'));
  if (mode === 'dozen') return formatCurrency(getDisplayPrice(product, 'dozen'));
  return `${formatCurrency(getDisplayPrice(product, 'piece'))} • ${formatCurrency(getDisplayPrice(product, 'dozen'))}`;
}

function getStoreCardActionText(product) {
  const mode = getSaleMode(product);
  if (mode === 'piece') return 'أضف قطعة';
  if (mode === 'dozen') return 'أضف دستة';
  return 'اختر البيع';
}
