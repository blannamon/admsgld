const products = window.PRODUCTS || [];
const LANGUAGE_KEY = "adamas-language";
const translations = window.AdamasTranslations?.catalog || {};

const state = {
  category: "all",
  query: "",
  sort: "new",
  lang: window.localStorage.getItem(LANGUAGE_KEY) || "ru",
  favorites: new Set(),
};

const grid = document.querySelector(".product-grid");
const countNode = document.querySelector("#model-count");
const searchInput = document.querySelector("#site-search");
const sortSelect = document.querySelector("#sort-models");
const sortLabel = document.querySelector(".toolbar-controls label");
const categoryTabs = document.querySelectorAll(".category-tab");
const languageButtons = document.querySelectorAll(".language-button");
const translatableNodes = document.querySelectorAll("[data-i18n]");
const cartToggleButtons = document.querySelectorAll("[data-cart-label]");
const siteHeader = document.querySelector(".site-header");
const categorySection = document.querySelector(".category-section");

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function syncHeaderOffset() {
  if (!siteHeader) {
    return;
  }

  document.documentElement.style.setProperty("--header-offset", `${siteHeader.offsetHeight}px`);
}

function syncCategoryStickyOffset() {
  if (!categorySection) {
    return;
  }

  const styles = window.getComputedStyle(categorySection);
  const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
  const visibleStickyHeight = Math.max(categorySection.offsetHeight - paddingTop, 0);
  document.documentElement.style.setProperty("--category-sticky-offset", `${visibleStickyHeight}px`);
}

function syncProductCartButtons() {
  document.querySelectorAll(".product-cart-button[data-product-id]").forEach((button) => {
    const productId = Number(button.dataset.productId);
    const isActive = Boolean(window.AdamasCart && typeof window.AdamasCart.has === "function" && window.AdamasCart.has(productId));
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive.toString());
    button.setAttribute("aria-label", isActive ? "Убрать из корзины" : "Добавить в корзину");
  });
}

function formatPrice(value) {
  return new Intl.NumberFormat(state.lang === "ru" ? "ru-RU" : "ro-RO").format(value);
}

function normalize(value) {
  return value.toLowerCase().trim();
}

function getTranslation(path) {
  return path.split(".").reduce((acc, key) => {
    if (acc == null) {
      return undefined;
    }

    if (Array.isArray(acc)) {
      return acc[Number(key)];
    }

    return acc[key];
  }, translations[state.lang]);
}

function productMatches(product) {
  const inCategory = state.category === "all" || product.category === state.category;
  const query = normalize(state.query);

  if (!query) {
    return inCategory;
  }

  const searchable = [
    product.id,
    product.title.ru,
    product.title.ro,
    product.type.ru,
    product.type.ro,
    product.material.ru,
    product.material.ro,
    product.stones.ru,
    product.stones.ro,
  ]
    .join(" ")
    .toLowerCase();

  return inCategory && searchable.includes(query);
}

function sortProducts(items) {
  const sorted = [...items];

  if (state.sort === "popular") {
    sorted.sort((a, b) => b.popular - a.popular);
  }

  if (state.sort === "price") {
    sorted.sort((a, b) => a.price - b.price);
  }

  if (state.sort === "new") {
    sorted.sort((a, b) => b.id - a.id);
  }

  return sorted;
}

function createProductCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";
  article.dataset.category = product.category;
  article.setAttribute("role", "link");
  article.tabIndex = 0;
  const detailUrl = `model.html?id=${product.id}`;
  const imagePath = `renders/model${product.id}.png`;

  function openDetail() {
    window.location.href = detailUrl;
  }

  article.addEventListener("click", (event) => {
    if (event.target.closest("button")) {
      return;
    }
    openDetail();
  });

  article.addEventListener("keydown", (event) => {
    if (event.target.closest("button")) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail();
    }
  });

  const favorite = document.createElement("button");
  favorite.className = "favorite-button";
  favorite.type = "button";
  favorite.setAttribute("aria-label", `${product.title[state.lang]} в избранное`);
  favorite.setAttribute("aria-pressed", state.favorites.has(product.id).toString());
  favorite.innerHTML = '<i data-lucide="heart" aria-hidden="true"></i>';

  if (state.favorites.has(product.id)) {
    favorite.classList.add("active");
  }

  favorite.addEventListener("click", () => {
    if (state.favorites.has(product.id)) {
      state.favorites.delete(product.id);
      favorite.classList.remove("active");
      favorite.setAttribute("aria-pressed", "false");
    } else {
      state.favorites.add(product.id);
      favorite.classList.add("active");
      favorite.setAttribute("aria-pressed", "true");
    }
  });

  favorite.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  const visual = document.createElement("div");
  visual.className = "model-visual";

  const image = document.createElement("img");
  image.className = "model-image";
  image.src = imagePath;
  image.alt = product.title[state.lang];
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("load", () => {
    visual.classList.add("is-loaded");
  });
  visual.append(image);

  const info = document.createElement("div");
  info.className = "product-info";

  const copy = document.createElement("div");
  copy.className = "product-copy";

  const nameRow = document.createElement("div");
  nameRow.className = "product-name-row";

  const name = document.createElement("h3");
  name.className = "product-name";
  name.textContent = product.type[state.lang];

  const nameChevron = document.createElement("span");
  nameChevron.className = "product-name-chevron";
  nameChevron.setAttribute("aria-hidden", "true");
  nameChevron.innerHTML = '<i data-lucide="chevron-right"></i>';

  const description = document.createElement("p");
  description.className = "product-description";
  description.textContent = product.stones[state.lang];

  const priceRow = document.createElement("div");
  priceRow.className = "price-row";
  const priceLead = document.createElement("span");
  priceLead.className = "price-lead";
  priceLead.innerHTML = '<i data-lucide="coins" aria-hidden="true"></i>';

  const price = document.createElement("p");
  price.className = "price";
  price.textContent =
    state.lang === "ru"
      ? `от ${formatPrice(product.price)} леев`
      : `de la ${formatPrice(product.price)} MDL`;
  priceLead.append(price);
  priceRow.append(priceLead);

  const sku = document.createElement("p");
  sku.className = "product-sku";
  sku.textContent = `${translations[state.lang].skuLabel} ${product.id}`;
  priceRow.append(sku);

  const cartButton = document.createElement("button");
  cartButton.className = "product-cart-button";
  cartButton.type = "button";
  cartButton.dataset.productId = String(product.id);
  cartButton.setAttribute("aria-label", `${product.title[state.lang]} в корзину`);
  cartButton.setAttribute("aria-pressed", "false");
  cartButton.innerHTML = '<i data-lucide="shopping-cart" aria-hidden="true"></i>';
  cartButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (window.AdamasCart && typeof window.AdamasCart.toggle === "function") {
      window.AdamasCart.toggle(product);
    }
  });

  nameRow.append(name, nameChevron);
  copy.append(nameRow, description);
  info.append(copy, cartButton, priceRow);
  article.append(favorite, visual, info);

  return article;
}

function renderProducts() {
  const visibleProducts = sortProducts(products.filter(productMatches));
  grid.replaceChildren();
  if (countNode) {
    countNode.textContent = visibleProducts.length;
  }

  if (visibleProducts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div>
        <h3>${translations[state.lang].noResultsTitle}</h3>
        <p>${translations[state.lang].noResultsText}</p>
      </div>
    `;
    grid.append(empty);
    return;
  }

  visibleProducts.forEach((product) => {
    grid.append(createProductCard(product));
  });

  refreshIcons();
  syncProductCartButtons();
}

function updateCategoryTabs() {
  categoryTabs.forEach((tab) => {
    const isActive = tab.dataset.category === state.category;
    const icon = tab.querySelector(".tab-icon");
    tab.textContent = translations[state.lang].categories[tab.dataset.category];
    tab.prepend(icon);
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive.toString());
  });
}

function updateLanguage() {
  document.documentElement.lang = state.lang;
  document.title = translations[state.lang].pageTitle;
  searchInput.placeholder = translations[state.lang].searchPlaceholder;
  translatableNodes.forEach((node) => {
    const value = getTranslation(node.dataset.i18n);
    if (typeof value !== "string") {
      return;
    }

    if (node.dataset.i18nMode === "html") {
      node.innerHTML = value;
      return;
    }

    node.textContent = value;
  });

  cartToggleButtons.forEach((button) => {
    button.setAttribute("aria-label", translations[state.lang].cartLabel);
  });
  const modelsTitle = document.querySelector("#models-title");

  if (modelsTitle) {
    modelsTitle.firstChild.textContent = `${translations[state.lang].found} `;
  }

  if (sortLabel) {
    sortLabel.textContent = translations[state.lang].sortLabel;
  }

  [...sortSelect.options].forEach((option) => {
    option.textContent = translations[state.lang].sort[option.value];
  });

  languageButtons.forEach((button) => {
    const isActive = button.dataset.lang === state.lang;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive.toString());
  });

  updateCategoryTabs();
  renderProducts();
  syncCategoryStickyOffset();
}

categoryTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.category = tab.dataset.category;
    updateCategoryTabs();
    renderProducts();
  });
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderProducts();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderProducts();
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.lang = button.dataset.lang;
    window.localStorage.setItem(LANGUAGE_KEY, state.lang);
    updateLanguage();
  });
});

document.addEventListener("adamas-cart-change", syncProductCartButtons);
window.addEventListener("resize", syncHeaderOffset);
window.addEventListener("resize", syncCategoryStickyOffset);

refreshIcons();
syncHeaderOffset();
syncCategoryStickyOffset();
updateLanguage();
