(function () {
  const STORAGE_KEY = "adamas-cart";
  const products = window.PRODUCTS || [];

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function formatPrice(value) {
    return new Intl.NumberFormat("ru-RU").format(value);
  }

  function readCart() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }

      // Normalize legacy quantity-based payloads into a simple unique selection list.
      return parsed
        .map((item) => {
          if (typeof item === "number") {
            return { id: item, comment: "" };
          }
          if (item && typeof item.id === "number") {
            return {
              id: item.id,
              comment: typeof item.comment === "string" ? item.comment : "",
            };
          }
          return null;
        })
        .filter(Boolean)
        .filter((item, index, array) => array.findIndex((entry) => entry.id === item.id) === index);
    } catch {
      return [];
    }
  }

  function writeCart(items) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function getProduct(id) {
    return products.find((product) => product.id === id);
  }

  function getTotalCount(items) {
    return items.length;
  }

  function updateItemComment(id, comment) {
    const items = readCart();
    const item = items.find((entry) => entry.id === id);

    if (!item) {
      return;
    }

    item.comment = comment;
    writeCart(items);
  }

  function emitCartChange() {
    document.dispatchEvent(new CustomEvent("adamas-cart-change", { detail: { items: readCart() } }));
  }

  function removeBadgeBurst(badge) {
    badge.querySelector(".cart-count-badge-burst")?.remove();
    delete badge.dataset.pendingCount;
  }

  function finishBadgeAnimation(badge) {
    const value = badge.querySelector(".cart-count-badge-value");
    const finalCount = Number(badge.dataset.pendingCount || badge.dataset.count || "0");

    if (value) {
      value.textContent = String(finalCount);
    }

    badge.dataset.count = String(finalCount);
    removeBadgeBurst(badge);
  }

  function playBadgeBurst(badge, nextCount) {
    const value = badge.querySelector(".cart-count-badge-value");
    const previousCount = Number(badge.dataset.count || "0");
    const burst = document.createElement("span");

    burst.className = "cart-count-badge-burst";
    burst.textContent = String(nextCount);

    removeBadgeBurst(badge);
    badge.dataset.pendingCount = String(nextCount);
    badge.append(burst);

    if (value) {
      value.textContent = String(previousCount);
    }

    burst.addEventListener(
      "animationend",
      () => {
        if (!badge.isConnected) {
          return;
        }

        finishBadgeAnimation(badge);
      },
      { once: true }
    );
  }

  function ensureShell() {
    if (document.querySelector(".cart-sidebar-shell")) {
      return;
    }

    const shell = document.createElement("div");
    shell.className = "cart-sidebar-shell";
    shell.innerHTML = `
      <button class="cart-backdrop" type="button" aria-label="Закрыть корзину"></button>
      <aside class="cart-sidebar" aria-label="Корзина">
        <div class="cart-sidebar-header">
          <div class="cart-sidebar-title">
            <h2>Корзина</h2>
            <p class="cart-sidebar-count">Выбрано моделей: <strong data-cart-total>0</strong></p>
          </div>
          <button class="cart-close-button" type="button" aria-label="Закрыть корзину">
            <i data-lucide="x" aria-hidden="true"></i>
          </button>
        </div>
        <div class="cart-sidebar-body"></div>
      </aside>
    `;

    document.body.append(shell);

    shell.querySelector(".cart-backdrop")?.addEventListener("click", closeCart);
    shell.querySelector(".cart-close-button")?.addEventListener("click", closeCart);
  }

  function renderCart() {
    ensureShell();

    const items = readCart();
    const body = document.querySelector(".cart-sidebar-body");
    const badges = document.querySelectorAll(".cart-count-badge");
    const totalNode = document.querySelector("[data-cart-total]");
    const total = getTotalCount(items);

    if (totalNode) {
      totalNode.textContent = String(total);
    }

    badges.forEach((badge) => {
      const value = badge.querySelector(".cart-count-badge-value");
      if (badge.dataset.pendingCount) {
        finishBadgeAnimation(badge);
      }

      const previousCount = Number(badge.dataset.count || "0");

      if (total === 0) {
        badge.classList.remove("is-visible");
        removeBadgeBurst(badge);
        badge.dataset.count = "0";
        badge.hidden = true;
        if (value) {
          value.textContent = "0";
        }
        return;
      }

      if (badge.hidden) {
        badge.hidden = false;
        if (value) {
          value.textContent = String(total);
        }
        badge.classList.remove("is-visible");
        void badge.offsetWidth;
        badge.classList.add("is-visible");
        badge.dataset.count = String(total);
        return;
      }

      if (total > previousCount && previousCount > 0) {
        playBadgeBurst(badge, total);
        return;
      }

      removeBadgeBurst(badge);
      if (value) {
        value.textContent = String(total);
      }
      badge.dataset.count = String(total);
    });

    if (!body) {
      refreshIcons();
      return;
    }

    if (items.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <i data-lucide="shopping-cart" aria-hidden="true"></i>
          <h3>Корзина пуста</h3>
          <p>Добавьте модели из каталога, чтобы оформить заказ.</p>
        </div>
      `;
      refreshIcons();
      return;
    }

    const rows = items
      .map((item) => {
        const product = getProduct(item.id);
        if (!product) {
          return "";
        }

        return `
          <article class="cart-item" data-id="${product.id}">
            <img class="cart-item-image" src="renders/model${product.id}.png" alt="${product.title.ru}" />
            <div class="cart-item-copy">
              <h3>${product.type.ru}</h3>
              <p>${product.stones.ru}</p>
              <div class="cart-item-meta">
                <strong><i data-lucide="coins" aria-hidden="true"></i>от ${formatPrice(product.price)} леев</strong>
              </div>
            </div>
            <button class="cart-remove-button" type="button" data-remove-id="${product.id}" aria-label="Удалить ${product.title.ru} из корзины">
              <i data-lucide="trash-2" aria-hidden="true"></i>
            </button>
            <div class="cart-item-comment">
              <label class="cart-item-comment-label" for="cart-comment-${product.id}">Комментарий</label>
              <textarea
                class="cart-item-comment-input"
                id="cart-comment-${product.id}"
                data-comment-id="${product.id}"
                rows="2"
                placeholder="Опционально: размер, желаемые камни, металл или другие пожелания"
              ></textarea>
            </div>
          </article>
        `;
      })
      .join("");

    body.innerHTML = `
      <div class="cart-items">${rows}</div>
      <div class="cart-summary">
        <a class="primary-button" href="index.html#contacts">Оформить запрос</a>
      </div>
    `;

    body.querySelectorAll("[data-remove-id]").forEach((button) => {
      button.addEventListener("click", () => {
        removeFromCart(Number(button.dataset.removeId));
      });
    });

    body.querySelectorAll(".cart-item-comment-input[data-comment-id]").forEach((field) => {
      const itemId = Number(field.dataset.commentId);
      const item = items.find((entry) => entry.id === itemId);

      field.value = item?.comment || "";
      field.addEventListener("input", () => {
        updateItemComment(itemId, field.value);
      });
    });

    refreshIcons();
  }

  function openCart() {
    ensureShell();
    renderCart();
    document.body.classList.add("cart-open");
  }

  function closeCart() {
    document.body.classList.remove("cart-open");
  }

  function toggleCart() {
    if (document.body.classList.contains("cart-open")) {
      closeCart();
    } else {
      openCart();
    }
  }

  function addToCart(product) {
    if (!product || typeof product.id !== "number") {
      return;
    }

    const items = readCart();
    const existing = items.find((item) => item.id === product.id);

    if (!existing) {
      items.push({ id: product.id, comment: "" });
    }

    writeCart(items);
    renderCart();
    emitCartChange();
  }

  function removeFromCart(id) {
    const items = readCart().filter((item) => item.id !== id);
    writeCart(items);
    renderCart();
    emitCartChange();
  }

  function hasInCart(id) {
    return readCart().some((item) => item.id === id);
  }

  function toggleCartItem(product) {
    if (!product || typeof product.id !== "number") {
      return;
    }

    if (hasInCart(product.id)) {
      removeFromCart(product.id);
      return;
    }

    addToCart(product);
  }

  function initCart() {
    ensureShell();
    document.querySelectorAll("[data-cart-toggle]").forEach((button) => {
      button.addEventListener("click", toggleCart);
    });
    renderCart();
  }

  window.AdamasCart = {
    add: addToCart,
    close: closeCart,
    has: hasInCart,
    open: openCart,
    render: renderCart,
    remove: removeFromCart,
    toggle: toggleCartItem,
  };

  initCart();
})();
