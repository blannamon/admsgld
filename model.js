const products = window.PRODUCTS || [];
const LANGUAGE_KEY = "adamas-language";
const languageButtons = document.querySelectorAll(".language-button");
const cartToggleButtons = document.querySelectorAll("[data-cart-label]");
const translations = window.AdamasTranslations?.model || {};

const state = {
  lang: window.localStorage.getItem(LANGUAGE_KEY) || "ru",
};

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat(state.lang === "ru" ? "ru-RU" : "ro-RO").format(value);
}

function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

function renderMissingState() {
  document.title = translations[state.lang].missingTitle;
  const shell = document.querySelector(".model-page-shell");
  if (!shell) {
    return;
  }

  shell.innerHTML = `
    <div class="model-missing">
      <h1>${translations[state.lang].missingHeading}</h1>
      <p>${translations[state.lang].missingText}</p>
      <a class="primary-button" href="index.html#catalog">${translations[state.lang].missingAction}</a>
    </div>
  `;
}

function renderModel(product) {
  document.title = `Adamas Gold | ${product.type[state.lang]}`;

  const image = document.querySelector("#model-image");
  const breadcrumb = document.querySelector("#model-breadcrumb");
  const title = document.querySelector("#model-title");
  const subtitle = document.querySelector("#model-subtitle");
  const price = document.querySelector("#model-price");
  const type = document.querySelector("#model-type");
  const material = document.querySelector("#model-material");
  const stones = document.querySelector("#model-stones");
  const modelId = document.querySelector("#model-id");
  const navLinks = document.querySelectorAll(".main-nav a");
  const breadcrumbLinks = document.querySelectorAll(".breadcrumbs a");
  const eyebrow = document.querySelector(".model-summary-card .eyebrow");
  const specTerms = document.querySelectorAll(".model-specs dt");
  const orderButton = document.querySelector(".model-actions .primary-button");

  if (!image || !breadcrumb || !title || !subtitle || !price || !type || !material || !stones || !modelId) {
    return;
  }

  image.src = `renders/model${product.id}.png`;
  image.alt = product.title[state.lang];
  image.loading = "eager";
  image.fetchPriority = "high";
  image.decoding = "async";
  breadcrumb.textContent = product.title[state.lang];
  title.textContent = product.type[state.lang];
  subtitle.textContent = product.stones[state.lang];
  price.textContent = `от ${formatPrice(product.price)} леев`;
  if (state.lang === "ru") {
    price.textContent = `${translations[state.lang].priceFrom} ${formatPrice(product.price)} ${translations[state.lang].priceCurrency}`;
  } else {
    price.textContent = `${translations[state.lang].priceFrom} ${formatPrice(product.price)} ${translations[state.lang].priceCurrency}`;
  }

  type.textContent = product.type[state.lang];
  material.textContent = product.material[state.lang];
  stones.textContent = product.stones[state.lang];
  modelId.textContent = product.title[state.lang];

  if (navLinks.length === 4) {
    navLinks[0].textContent = translations[state.lang].nav.catalog;
    navLinks[1].textContent = translations[state.lang].nav.studio;
    navLinks[2].textContent = translations[state.lang].nav.news;
    navLinks[3].textContent = translations[state.lang].nav.contacts;
  }

  if (breadcrumbLinks.length >= 2) {
    breadcrumbLinks[0].textContent = translations[state.lang].breadcrumbs.home;
    breadcrumbLinks[1].textContent = translations[state.lang].breadcrumbs.catalog;
  }

  if (eyebrow) {
    eyebrow.textContent = translations[state.lang].eyebrow;
  }

  if (specTerms.length === 4) {
    specTerms[0].textContent = translations[state.lang].specs.type;
    specTerms[1].textContent = translations[state.lang].specs.material;
    specTerms[2].textContent = translations[state.lang].specs.features;
    specTerms[3].textContent = translations[state.lang].specs.code;
  }

  if (orderButton) {
    orderButton.textContent = translations[state.lang].orderButton;
  }
}

function updateLanguageButtons() {
  languageButtons.forEach((button) => {
    const isActive = button.dataset.lang === state.lang;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive.toString());
  });

  cartToggleButtons.forEach((button) => {
    button.setAttribute("aria-label", translations[state.lang].cartLabel);
  });

  document.documentElement.lang = state.lang;
}

const product = products.find((item) => item.id === getProductId());

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.lang = button.dataset.lang;
    window.localStorage.setItem(LANGUAGE_KEY, state.lang);
    updateLanguageButtons();

    if (!product) {
      renderMissingState();
      return;
    }

    renderModel(product);
  });
});

if (!product) {
  renderMissingState();
} else {
  renderModel(product);
}

updateLanguageButtons();
refreshIcons();
