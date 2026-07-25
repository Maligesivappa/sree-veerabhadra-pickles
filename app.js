import {
  db,
  auth,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp
} from "./firebase.js";

/* =========================================================
   SREE VEERABHADRA HOMEMADE FOODS
   Customer website JavaScript
========================================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  products: [],
  coupons: [],
  appliedCoupon: null,
  cart: JSON.parse(localStorage.getItem("sv_cart") || "[]"),
  category: "all",
  search: "",
  shippingCharge: null
};

const SHIPPING_RATES = {
  "Andhra Pradesh": 60,
  "Telangana": 70,
  "Karnataka": 80,
  "Tamil Nadu": 90,
  "Kerala": 100,
  "Maharashtra": 100
};

const BUSINESS_UPI_ID = "Q312612926@ybl";
const BUSINESS_UPI_NAME = "Sree Veerabhadra Homemade Foods";

function getShippingCharge(customerState) {
  return null;
}

function getCouponDiscount(subtotal) {
  const coupon = state.appliedCoupon;
  if (!coupon || coupon.active === false) return 0;
  return Math.min(Number(coupon.discountAmount) || 0, subtotal);
}

function getDeliveryEstimate(customerState) {
  if (!customerState) return "Select your state to calculate delivery.";
  if (["Andhra Pradesh", "Telangana"].includes(customerState)) return "Estimated delivery: 3–5 business days.";
  if (["Karnataka", "Tamil Nadu", "Kerala", "Maharashtra"].includes(customerState)) return "Estimated delivery: 4–7 business days.";
  return "Estimated delivery: 5–8 business days.";
}

function updateShippingSummary() {
  const customerState = $("#customerState")?.value || "";
  const subtotal = getCartTotal();
  const discount = getCouponDiscount(subtotal);
  const shippingCharge = null;
  const grandTotal = Math.max(0, subtotal - discount);

  state.shippingCharge = shippingCharge;
  if ($("#checkoutSubtotal")) $("#checkoutSubtotal").textContent = formatPrice(subtotal);
  if ($("#checkoutDiscount")) $("#checkoutDiscount").textContent = discount ? `-${formatPrice(discount)}` : formatPrice(0);
  if ($("#checkoutShipping")) $("#checkoutShipping").textContent = "Confirmed on WhatsApp";
  if ($("#checkoutGrandTotal")) $("#checkoutGrandTotal").textContent = formatPrice(grandTotal);
  if ($("#upiAmount")) $("#upiAmount").textContent = formatPrice(grandTotal);
  if ($("#deliveryEstimate")) $("#deliveryEstimate").textContent = getDeliveryEstimate(customerState);

  return { subtotal, discount, shippingCharge, grandTotal };
}

const PRODUCT_ALIASES = {
  "mango": "Mango Avakaya Pickle",
  "mango pickle": "Mango Avakaya Pickle",
  "avakaya": "Mango Avakaya Pickle",
  "tomato": "Tomato Pickle",
  "gongura": "Gongura Pickle",
  "lemon": "Lemon Pickle",
  "garlic": "Garlic Pickle",
  "amla": "Amla Pickle",
  "green chilli": "Green Chilli Pickle",
  "mixed vegetable": "Mixed Vegetable Pickle"
};

function canonicalProductName(value = "") {
  const cleanName = String(value).trim();
  return PRODUCT_ALIASES[cleanName.toLowerCase()] || cleanName;
}

function prepareProduct(product) {
  const originalName = product.name || product.title || "Homemade Product";
  const name = canonicalProductName(originalName);
  const savedImage = product.imageUrl || product.image || product.photo || "";

  return {
    ...product,
    name,
    imageUrl: savedImage || "logo.jpeg"
  };
}

function getProductVariants(product) {
  if (Array.isArray(product.variants) && product.variants.length) {
    return product.variants.map((variant) => ({
      weight: String(variant.weight || "").trim(),
      mrp: Number(variant.mrp || 0),
      offerPrice: Number(variant.offerPrice ?? variant.price ?? 0)
    }));
  }

  return [{
    weight: String(product.weight || product.size || "").trim(),
    mrp: Number(product.mrp ?? product.originalPrice ?? 0),
    offerPrice: Number(product.offerPrice ?? product.salePrice ?? product.price ?? 0)
  }];
}

/* =========================================================
   SAFE HELPERS
========================================================= */

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(value) {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

function saveCart() {
  localStorage.setItem("sv_cart", JSON.stringify(state.cart));
}

function showToast(message) {
  const toast = $("#toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(showToast.timer);

  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function downloadInvoice(order) {
  const itemRows = (order.items || []).map((item) => `<tr><td>${escapeHTML(item.name)} ${escapeHTML(item.weight || "")}</td><td>${item.quantity}</td><td>${formatPrice(item.price)}</td><td>${formatPrice(item.itemTotal)}</td></tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${order.orderReference}</title><style>body{font-family:Arial;max-width:800px;margin:30px auto;color:#222}h1{color:#8f2918}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px;border:1px solid #ddd;text-align:left}.total{text-align:right}.note{background:#fff4dd;padding:14px}</style></head><body><h1>Sree Veerabhadra Homemade Foods</h1><h2>Provisional Invoice / Order Receipt</h2><p><strong>Order:</strong> ${order.orderReference}</p><p><strong>Customer:</strong> ${escapeHTML(order.customer.name)}<br>${escapeHTML(order.customer.phone)}<br>${escapeHTML(order.customer.address)}, ${escapeHTML(order.customer.city)}, ${escapeHTML(order.customer.state)} - ${escapeHTML(order.customer.pincode)}</p><table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${itemRows}</tbody></table><p class="total">Subtotal: ${formatPrice(order.subtotal)}<br>Coupon discount: -${formatPrice(order.discount || 0)}<br><strong>Products total: ${formatPrice(order.total)}</strong></p><p class="note"><strong>Shipping:</strong> Shiprocket quote pending. Final payable total will be confirmed on WhatsApp.</p><p>WhatsApp: +91 99852 22440</p></body></html>`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  link.download = `${order.orderReference}-invoice.html`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function hideElement(element) {
  if (element) {
    element.classList.add("hidden");
  }
}

function showElement(element) {
  if (element) {
    element.classList.remove("hidden");
  }
}

/* =========================================================
   PRODUCT CATEGORY
========================================================= */

function getProductCategory(product) {
  return String(
    product.category ||
    product.type ||
    product.productCategory ||
    "Pickles"
  )
    .trim()
    .toLowerCase();
}

function normaliseCategory(category) {
  const value = String(category || "all")
    .trim()
    .toLowerCase();

  const categoryNames = {
    pickle: "pickles",
    pickles: "pickles",

    snack: "snacks",
    snacks: "snacks",
    "homemade snacks": "snacks",

    sweet: "sweets",
    sweets: "sweets",
    "traditional sweets": "sweets",

    chikki: "chikkis",
    chikkis: "chikkis",

    powder: "powders",
    powders: "powders",
    podi: "powders",
    "homemade powders": "powders",

    mix: "instant mixes",
    mixes: "instant mixes",
    "instant mix": "instant mixes",
    "instant mixes": "instant mixes"
  };

  return categoryNames[value] || value;
}

/* =========================================================
   PRODUCTS
========================================================= */

function getFilteredProducts() {
  const searchText = state.search.trim().toLowerCase();
  const selectedCategory = normaliseCategory(state.category);

  return state.products.filter((product) => {
    const productCategory = normaliseCategory(
      getProductCategory(product)
    );

    const matchesCategory =
      selectedCategory === "all" ||
      productCategory === selectedCategory;

    const searchableText = [
      product.name,
      product.title,
      product.description,
      product.weight,
      product.category,
      product.type
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !searchText || searchableText.includes(searchText);

    return matchesCategory && matchesSearch;
  });
}

function createProductCard(product) {
  const productName =
    product.name ||
    product.title ||
    "Homemade Product";

  const productDescription =
    product.description ||
    "Traditional homemade food prepared with care.";

  const variants = getProductVariants(product);
  const selectedVariant = variants[0];
  const productWeight = selectedVariant.weight;

  const productImage =
    product.image ||
    product.imageUrl ||
    product.photo ||
    "logo.jpeg";

  const price = selectedVariant.offerPrice;
  const mrp = selectedVariant.mrp;

  const stockValue =
    product.inStock ??
    product.available ??
    true;

  const isAvailable =
    stockValue !== false &&
    String(stockValue).toLowerCase() !== "false";

  const category =
    product.category ||
    product.type ||
    "Homemade Foods";

  const priceSection =
    mrp > price && price > 0
      ? `
        <div class="product-price">
          <strong>${formatPrice(price)}</strong>
          <del>${formatPrice(mrp)}</del>
        </div>
      `
      : `
        <div class="product-price">
          <strong>${formatPrice(price)}</strong>
        </div>
      `;

  return `
    <article class="product-card">
      <div class="product-image-wrap">
        <img
          class="product-image"
          src="${escapeHTML(productImage)}"
          alt="${escapeHTML(productName)}"
          loading="lazy"
          onerror="this.onerror=null;this.src='logo.jpeg';"
        >

        <span class="product-category">
          ${escapeHTML(category)}
        </span>
      </div>

      <div class="product-content">
        <h3>${escapeHTML(productName)}</h3>

        ${variants.length > 1
          ? `<label class="variant-picker-label">
              Choose weight
              <select class="product-variant" aria-label="Choose weight for ${escapeHTML(productName)}">
                ${variants.map((variant, index) => `
                  <option value="${index}" data-price="${variant.offerPrice}" data-mrp="${variant.mrp}">
                    ${escapeHTML(variant.weight)} — ${formatPrice(variant.offerPrice)}
                  </option>
                `).join("")}
              </select>
            </label>`
          : (productWeight ? `<p class="product-weight">${escapeHTML(productWeight)}</p>` : "")
        }

        <p class="product-description">
          ${escapeHTML(productDescription)}
        </p>

        <div class="variant-price-display">${priceSection}</div>

        <button
          class="btn primary full add-to-cart"
          type="button"
          data-product-id="${escapeHTML(product.id)}"
          ${isAvailable ? "" : "disabled"}
        >
          ${isAvailable ? "Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </article>
  `;
}

function renderProducts() {
  const productGrid = $("#productGrid");
  const loading = $("#loading");
  const emptyProducts = $("#emptyProducts");
  const emptyProductsTitle = $("#emptyProductsTitle");
  const emptyProductsMessage = $("#emptyProductsMessage");

  if (!productGrid) {
    console.error("Product grid element was not found.");
    return;
  }

  hideElement(loading);

  const filteredProducts = getFilteredProducts();

  if (filteredProducts.length === 0) {
    productGrid.innerHTML = "";
    const catalogueIsEmpty = state.products.length === 0;

    if (emptyProductsTitle) {
      emptyProductsTitle.textContent = catalogueIsEmpty
        ? "Products coming soon"
        : "No matching products";
    }

    if (emptyProductsMessage) {
      emptyProductsMessage.textContent = catalogueIsEmpty
        ? "We are preparing our fresh homemade products. Please check back soon."
        : "Try another product name or category.";
    }

    showElement(emptyProducts);
    return;
  }

  hideElement(emptyProducts);

  productGrid.innerHTML = filteredProducts
    .map(createProductCard)
    .join("");
}

/* =========================================================
   FIREBASE PRODUCT LOADING
========================================================= */

function loadProducts() {
  const loading = $("#loading");

  if (loading) {
    loading.textContent = "Loading delicious homemade foods...";
    showElement(loading);
  }

  /*
    Do not use orderBy here.

    Some older products may not contain createdAt.
    Loading the collection directly ensures every product appears.
  */

  onSnapshot(
    collection(db, "products"),

    (snapshot) => {
      const firebaseProducts = snapshot.docs.map((document) => prepareProduct({
        id: document.id,
        ...document.data()
      }));

      state.products = firebaseProducts;

      state.products.sort((firstProduct, secondProduct) => {
        const firstTime =
          firstProduct.createdAt?.seconds ||
          firstProduct.createdAt?.toMillis?.() ||
          0;

        const secondTime =
          secondProduct.createdAt?.seconds ||
          secondProduct.createdAt?.toMillis?.() ||
          0;

        return secondTime - firstTime;
      });

      console.log(
        `${state.products.length} products loaded from Firebase.`
      );

      renderProducts();
    },

    (error) => {
      console.error("Firebase product loading error:", error);

      if (loading) {
        loading.classList.remove("hidden");
        loading.innerHTML = `
          <strong>Unable to load products.</strong>
          <br>
          <small>${escapeHTML(error.message)}</small>
        `;
      }

      state.products = [];
    }
  );
}

function loadCoupons() {
  onSnapshot(collection(db, "coupons"), (snapshot) => {
    state.coupons = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));
  }, (error) => console.error("Coupon loading error:", error));
}

function applyCoupon() {
  const input = $("#couponCode");
  const message = $("#couponMessage");
  const code = String(input?.value || "").trim().toUpperCase();
  const subtotal = getCartTotal();
  const coupon = state.coupons.find((item) => String(item.code || "").toUpperCase() === code);

  state.appliedCoupon = null;
  if (!coupon || coupon.active === false) {
    if (message) message.textContent = "Coupon is invalid or inactive.";
  } else if (coupon.expiryDate && new Date(`${coupon.expiryDate}T23:59:59`) < new Date()) {
    if (message) message.textContent = "This coupon has expired.";
  } else if (subtotal < Number(coupon.minimumOrder || 0)) {
    if (message) message.textContent = `Minimum order is ${formatPrice(coupon.minimumOrder)}.`;
  } else {
    state.appliedCoupon = coupon;
    if (message) message.textContent = `${code} applied. You save ${formatPrice(coupon.discountAmount)}.`;
  }
  updateShippingSummary();
}

$("#applyCouponBtn")?.addEventListener("click", applyCoupon);

/* =========================================================
   SEARCH
========================================================= */

const searchInput = $("#search");

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value || "";
    renderProducts();
  });
}

/* =========================================================
   CATEGORY FILTER BUTTONS
========================================================= */

function getCategoryButtons() {
  return $$(
    [
      "[data-category]",
      ".category-filter",
      ".filter-btn",
      ".category-btn"
    ].join(",")
  );
}

getCategoryButtons().forEach((button) => {
  button.addEventListener("click", () => {
    const buttonCategory =
      button.dataset.category ||
      button.dataset.filter ||
      button.textContent.trim() ||
      "all";

    state.category = normaliseCategory(buttonCategory);

    getCategoryButtons().forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    renderProducts();
  });
});

/* =========================================================
   CART
========================================================= */

function getCartQuantity() {
  return state.cart.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
}

function getCartTotal() {
  return state.cart.reduce((total, item) => {
    return total + Number(item.price || 0) * Number(item.quantity || 0);
  }, 0);
}

function addToCart(productId, variantIndex = 0) {
  const product = state.products.find(
    (item) => item.id === productId
  );

  if (!product) {
    showToast("Product was not found.");
    return;
  }

  const variants = getProductVariants(product);
  const variant = variants[variantIndex] || variants[0];
  const cartItemId = `${productId}::${variant.weight || variantIndex}`;
  const existingItem = state.cart.find((item) => item.id === cartItemId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    state.cart.push({
      id: cartItemId,
      productId: product.id,
      name:
        product.name ||
        product.title ||
        "Homemade Product",
      price: Number(variant.offerPrice || 0),
      image:
        product.image ||
        product.imageUrl ||
        product.photo ||
        "logo.jpeg",
      weight: variant.weight,
      quantity: 1
    });
  }

  saveCart();
  renderCart();
  showToast("Product added to cart.");
}

function updateCartQuantity(productId, change) {
  const item = state.cart.find(
    (cartItem) => cartItem.id === productId
  );

  if (!item) {
    return;
  }

  item.quantity += change;

  if (item.quantity <= 0) {
    state.cart = state.cart.filter(
      (cartItem) => cartItem.id !== productId
    );
  }

  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(
    (item) => item.id !== productId
  );

  saveCart();
  renderCart();
  showToast("Product removed from cart.");
}

function renderCart() {
  const cartItems = $("#cartItems");
  const cartCount = $("#cartCount");
  const cartTotal = $("#cartTotal");

  if (cartCount) {
    cartCount.textContent = getCartQuantity();
  }

  const total = getCartTotal();

  if (cartTotal) {
    cartTotal.textContent = formatPrice(total);
  }

  updateShippingSummary();

  if (!cartItems) {
    return;
  }

  if (state.cart.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        <p>Your cart is empty.</p>
        <small>Add your favourite homemade foods.</small>
      </div>
    `;
    return;
  }

  cartItems.innerHTML = state.cart
    .map(
      (item) => `
        <div class="cart-item">
          <img
            src="${escapeHTML(item.image || "logo.jpeg")}"
            alt="${escapeHTML(item.name)}"
            onerror="this.onerror=null;this.src='logo.jpeg';"
          >

          <div class="cart-item-info">
            <strong>${escapeHTML(item.name)}</strong>

            ${
              item.weight
                ? `<small>${escapeHTML(item.weight)}</small>`
                : ""
            }

            <span>${formatPrice(item.price)}</span>

            <div class="quantity-controls">
              <button
                type="button"
                data-cart-action="decrease"
                data-product-id="${escapeHTML(item.id)}"
                aria-label="Decrease quantity"
              >
                −
              </button>

              <span>${Number(item.quantity)}</span>

              <button
                type="button"
                data-cart-action="increase"
                data-product-id="${escapeHTML(item.id)}"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <button
            class="remove-cart-item"
            type="button"
            data-cart-action="remove"
            data-product-id="${escapeHTML(item.id)}"
            aria-label="Remove product"
          >
            ×
          </button>
        </div>
      `
    )
    .join("");
}

/* Product and cart button handling */

document.addEventListener("click", (event) => {
  const addButton = event.target.closest(".add-to-cart");

  if (addButton) {
    const variantSelect = addButton.closest(".product-card")?.querySelector(".product-variant");
    addToCart(addButton.dataset.productId, Number(variantSelect?.value || 0));
    return;
  }

  const cartActionButton = event.target.closest(
    "[data-cart-action]"
  );

  if (!cartActionButton) {
    return;
  }

  const productId = cartActionButton.dataset.productId;
  const action = cartActionButton.dataset.cartAction;

  if (action === "increase") {
    updateCartQuantity(productId, 1);
  }

  if (action === "decrease") {
    updateCartQuantity(productId, -1);
  }

  if (action === "remove") {
    removeFromCart(productId);
  }
});

document.addEventListener("change", (event) => {
  const select = event.target.closest(".product-variant");
  if (!select) return;

  const option = select.selectedOptions[0];
  const price = Number(option.dataset.price || 0);
  const mrp = Number(option.dataset.mrp || 0);
  const priceDisplay = select.closest(".product-card")?.querySelector(".variant-price-display");
  if (!priceDisplay) return;

  priceDisplay.innerHTML = mrp > price && price > 0
    ? `<div class="product-price"><strong>${formatPrice(price)}</strong><del>${formatPrice(mrp)}</del></div>`
    : `<div class="product-price"><strong>${formatPrice(price)}</strong></div>`;
});

/* =========================================================
   DRAWER AND CHECKOUT
========================================================= */

const cartDrawer = $("#cartDrawer");
const checkoutModal = $("#checkoutModal");
const overlay = $("#overlay");

function openCart() {
  if (cartDrawer) {
    cartDrawer.classList.add("open");
  }

  if (overlay) {
    overlay.classList.add("show");
  }

  document.body.classList.add("no-scroll");
}

function closeCart() {
  if (cartDrawer) {
    cartDrawer.classList.remove("open");
  }

  if (!checkoutModal?.classList.contains("show")) {
    overlay?.classList.remove("show");
    document.body.classList.remove("no-scroll");
  }
}

function openCheckout() {
  if (state.cart.length === 0) {
    showToast("Your cart is empty.");
    return;
  }

  closeCart();

  if (checkoutModal) {
    checkoutModal.classList.add("show");
  }

  if (overlay) {
    overlay.classList.add("show");
  }

  document.body.classList.add("no-scroll");
  renderCart();
  updateShippingSummary();
}

function closeCheckout() {
  if (checkoutModal) {
    checkoutModal.classList.remove("show");
  }

  overlay?.classList.remove("show");
  document.body.classList.remove("no-scroll");
}

$("#cartBtn")?.addEventListener("click", openCart);
$("#closeCart")?.addEventListener("click", closeCart);
$("#checkoutBtn")?.addEventListener("click", openCheckout);
$("#closeCheckout")?.addEventListener("click", closeCheckout);

overlay?.addEventListener("click", () => {
  closeCart();
  closeCheckout();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCart();
    closeCheckout();
  }
});

/* =========================================================
   PAYMENT METHOD
========================================================= */

function updatePaymentSection() {
  const selectedPayment = $(
    'input[name="paymentMethod"]:checked, input[name="payment"]:checked'
  )?.value?.toLowerCase();

  const upiSection =
    $("#upiPaymentBox") ||
    $("#upiSection") ||
    $(".upi-section") ||
    $("[data-upi-section]");

  const transactionInput =
    $('input[name="transactionId"]') ||
    $('input[name="upiTransactionId"]') ||
    $("#upiTransactionId");

  const isUPI = selectedPayment?.includes("upi");

  if (upiSection) {
    upiSection.classList.toggle("hidden", !isUPI);
  }

  if (transactionInput) {
    transactionInput.required = false;
  }
}

$$('input[name="paymentMethod"], input[name="payment"]').forEach((input) => {
  input.addEventListener("change", updatePaymentSection);
});

updatePaymentSection();

$("#customerState")?.addEventListener("change", updateShippingSummary);

$("#upiPayBtn")?.addEventListener("click", () => {
  const customerState = $("#customerState")?.value || "";
  if (!customerState) {
    showToast("Please select your delivery state first.");
    $("#customerState")?.focus();
    return;
  }

  const { grandTotal } = updateShippingSummary();
  if (grandTotal <= 0) {
    showToast("Please add a product to your cart first.");
    return;
  }

  const paymentParams = new URLSearchParams({
    pa: BUSINESS_UPI_ID,
    pn: BUSINESS_UPI_NAME,
    am: grandTotal.toFixed(2),
    cu: "INR",
    tn: "Sree Veerabhadra order payment"
  });

  window.location.href = `upi://pay?${paymentParams.toString()}`;
});

/* =========================================================
   PLACE ORDER
========================================================= */

const checkoutForm = $("#checkoutForm");

if (checkoutForm) {
  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (state.cart.length === 0) {
      showToast("Your cart is empty.");
      return;
    }

    const submitButton = checkoutForm.querySelector(
      'button[type="submit"]'
    );

    const originalButtonText =
      submitButton?.textContent || "Place Order";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Placing Order...";
    }

    try {
      const formData = new FormData(checkoutForm);

      const customerName = String(
        formData.get("customerName") ||
        formData.get("name") ||
        formData.get("fullName") ||
        ""
      ).trim();

      const phone = String(
        formData.get("customerPhone") ||
        formData.get("phone") ||
        formData.get("mobile") ||
        ""
      )
        .replace(/\D/g, "")
        .trim();

      const email = String(
        formData.get("customerEmail") ||
        formData.get("email") || ""
      ).trim();

      const address = String(
        formData.get("customerAddress") ||
        formData.get("address") ||
        formData.get("fullAddress") ||
        ""
      ).trim();

      const city = String(
        formData.get("customerCity") ||
        formData.get("city") ||
        formData.get("town") ||
        ""
      ).trim();

      const customerState = String(
        formData.get("customerState") ||
        formData.get("state") || ""
      ).trim();

      const pincode = String(
        formData.get("customerPincode") ||
        formData.get("pincode") ||
        formData.get("pinCode") ||
        ""
      )
        .replace(/\D/g, "")
        .trim();

      const notes = String(
        formData.get("notes") ||
        formData.get("orderNotes") ||
        ""
      ).trim();

      const paymentMethod = String(
        formData.get("paymentMethod") ||
        formData.get("payment") ||
        "Cash on Delivery"
      ).trim();

      const transactionId = String(
        formData.get("transactionId") ||
        formData.get("upiTransactionId") ||
        ""
      ).trim();

      if (!customerName) {
        throw new Error("Please enter your full name.");
      }

      if (!/^[0-9]{10}$/.test(phone)) {
        throw new Error(
          "Please enter a valid 10-digit mobile number."
        );
      }

      if (!address) {
        throw new Error(
          "Please enter your complete delivery address."
        );
      }

      if (!city) {
        throw new Error("Please enter your city or town.");
      }

      if (!customerState) {
        throw new Error("Please select your delivery state.");
      }

      if (pincode && !/^[0-9]{6}$/.test(pincode)) {
        throw new Error(
          "Please enter a valid 6-digit PIN code."
        );
      }

      const orderItems = state.cart.map((item) => ({
        productId: item.productId || item.id,
        name: item.name,
        weight: item.weight || "",
        price: Number(item.price),
        quantity: Number(item.quantity),
        itemTotal:
          Number(item.price) * Number(item.quantity)
      }));

      const subtotal = getCartTotal();
      const discount = getCouponDiscount(subtotal);
      const shippingCharge = null;
      const orderTotal = Math.max(0, subtotal - discount);

      const orderReference =
        "SVHF-" +
        Date.now()
          .toString()
          .slice(-8);

      const orderData = {
        orderReference,
        userId: auth.currentUser?.uid || "",

        customer: {
          name: customerName,
          phone,
          email,
          address,
          city,
          state: customerState,
          pincode
        },

        name: customerName,
        phone,
        email,
        address,
        city,
        state: customerState,
        pincode,

        items: orderItems,
        subtotal,
        discount,
        couponCode: state.appliedCoupon?.code || "",
        total: orderTotal,
        shippingCharge,
        finalTotalPending: true,
        paymentMethod,
        paymentStatus: "Awaiting Shiprocket quote",
        transactionId: "",

        notes,
        status: "New",
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, "orders"), orderData);

      state.cart = [];
      state.appliedCoupon = null;
      saveCart();
      renderCart();

      checkoutForm.reset();
      updatePaymentSection();
      updateShippingSummary();
      closeCheckout();

      showToast(
        `Order placed successfully. Order ID: ${orderReference}`
      );
      downloadInvoice(orderData);

      window.setTimeout(() => {
        alert(
          `Order request received!\n\nOrder ID: ${orderReference}\nItems: ${formatPrice(subtotal)}\nCoupon discount: ${formatPrice(discount)}\nProducts total: ${formatPrice(orderTotal)}\n\nWe will check the exact Shiprocket charge and send the final total on WhatsApp before payment.`
        );
      }, 400);
    } catch (error) {
      console.error("Order placement error:", error);

      showToast(
        error.message ||
        "Unable to place the order. Please try again."
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}

/* =========================================================
   FAQ
========================================================= */

$$(
  ".faq-question, .faq-item button, [data-faq-question]"
).forEach((button) => {
  button.addEventListener("click", () => {
    const faqItem = button.closest(".faq-item");

    if (faqItem) {
      faqItem.classList.toggle("open");
    }
  });
});

/* =========================================================
   MOBILE MENU
========================================================= */

const menuButton =
  $("#menuBtn") ||
  $("#mobileMenuBtn") ||
  $(".menu-toggle");

const mobileMenu =
  $("#mobileMenu") ||
  $(".mobile-menu");

menuButton?.addEventListener("click", () => {
  mobileMenu?.classList.toggle("open");
});

mobileMenu
  ?.querySelectorAll("a")
  .forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
    });
  });

/* =========================================================
   FOOTER YEAR
========================================================= */

const yearElement = $("#year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

/* =========================================================
   START WEBSITE
========================================================= */

renderCart();
loadProducts();
loadCoupons();

console.log(
  "Sree Veerabhadra Homemade Foods website loaded."
);
