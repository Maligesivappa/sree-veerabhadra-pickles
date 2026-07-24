import {
  db,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp
} from "./firebase.js";

import { SAMPLE_PRODUCTS } from "./catalog.js";

/* =========================================================
   SREE VEERABHADRA HOMEMADE FOODS
   Customer website JavaScript
========================================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem("sv_cart") || "[]"),
  category: "all",
  search: ""
};

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

const PRODUCT_IMAGE_BY_NAME = Object.fromEntries(
  SAMPLE_PRODUCTS.map((product) => [
    String(product.name).trim().toLowerCase(),
    product.imageUrl
  ])
);

function canonicalProductName(value = "") {
  const cleanName = String(value).trim();
  return PRODUCT_ALIASES[cleanName.toLowerCase()] || cleanName;
}

function prepareProduct(product) {
  const originalName = product.name || product.title || "Homemade Product";
  const name = canonicalProductName(originalName);
  const localImage = PRODUCT_IMAGE_BY_NAME[name.toLowerCase()];

  return {
    ...product,
    name,
    // Use our matching local image for known catalogue items. This prevents
    // old Firebase logo/honey URLs from appearing on pickle cards.
    imageUrl: localImage || product.imageUrl || product.image || product.photo || "logo.jpeg"
  };
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

  const productWeight =
    product.weight ||
    product.size ||
    "";

  const productImage =
    product.image ||
    product.imageUrl ||
    product.photo ||
    "logo.jpeg";

  const price =
    Number(
      product.offerPrice ??
      product.salePrice ??
      product.price ??
      0
    ) || 0;

  const mrp =
    Number(
      product.mrp ??
      product.originalPrice ??
      0
    ) || 0;

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

        ${
          productWeight
            ? `<p class="product-weight">${escapeHTML(productWeight)}</p>`
            : ""
        }

        <p class="product-description">
          ${escapeHTML(productDescription)}
        </p>

        ${priceSection}

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

  if (!productGrid) {
    console.error("Product grid element was not found.");
    return;
  }

  hideElement(loading);

  const filteredProducts = getFilteredProducts();

  if (filteredProducts.length === 0) {
    productGrid.innerHTML = "";
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

      // Keep the store full while real product details are being added.
      // Firebase products with the same name replace sample products.
      const firebaseNames = new Set(
        firebaseProducts.map((product) => canonicalProductName(product.name || product.title || "").toLowerCase())
      );
      const remainingSamples = SAMPLE_PRODUCTS.filter(
        (product) => !firebaseNames.has(String(product.name).trim().toLowerCase())
      );
      state.products = [...firebaseProducts, ...remainingSamples];

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

      // Show the built-in catalogue even when Firebase is temporarily unavailable.
      state.products = [...SAMPLE_PRODUCTS];
      renderProducts();
      showToast("Showing sample catalogue. Firebase connection can be checked later.");
    }
  );
}

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

function addToCart(productId) {
  const product = state.products.find(
    (item) => item.id === productId
  );

  if (!product) {
    showToast("Product was not found.");
    return;
  }

  const existingItem = state.cart.find(
    (item) => item.id === productId
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    state.cart.push({
      id: product.id,
      name:
        product.name ||
        product.title ||
        "Homemade Product",
      price:
        Number(
          product.offerPrice ??
          product.salePrice ??
          product.price ??
          0
        ) || 0,
      image:
        product.image ||
        product.imageUrl ||
        product.photo ||
        "logo.jpeg",
      weight:
        product.weight ||
        product.size ||
        "",
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

  const checkoutTotal =
    $("#checkoutTotal") ||
    $("#paymentTotal") ||
    $("#orderTotal");

  if (cartCount) {
    cartCount.textContent = getCartQuantity();
  }

  const total = getCartTotal();

  if (cartTotal) {
    cartTotal.textContent = formatPrice(total);
  }

  if (checkoutTotal) {
    checkoutTotal.textContent = formatPrice(total);
  }

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
    addToCart(addButton.dataset.productId);
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
    transactionInput.required = Boolean(isUPI);
  }
}

$$('input[name="paymentMethod"], input[name="payment"]').forEach((input) => {
  input.addEventListener("change", updatePaymentSection);
});

updatePaymentSection();

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

      if (pincode && !/^[0-9]{6}$/.test(pincode)) {
        throw new Error(
          "Please enter a valid 6-digit PIN code."
        );
      }

      if (
        paymentMethod.toLowerCase().includes("upi") &&
        !transactionId
      ) {
        throw new Error(
          "Please enter your UPI transaction ID."
        );
      }

      const orderItems = state.cart.map((item) => ({
        productId: item.id,
        name: item.name,
        weight: item.weight || "",
        price: Number(item.price),
        quantity: Number(item.quantity),
        itemTotal:
          Number(item.price) * Number(item.quantity)
      }));

      const orderTotal = getCartTotal();

      const orderReference =
        "SVHF-" +
        Date.now()
          .toString()
          .slice(-8);

      await addDoc(collection(db, "orders"), {
        orderReference,

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
        total: orderTotal,
        shippingCharge: null,
        paymentMethod,
        transactionId:
          paymentMethod.toLowerCase().includes("upi")
            ? transactionId
            : "",

        notes,
        status: "New",
        createdAt: serverTimestamp()
      });

      state.cart = [];
      saveCart();
      renderCart();

      checkoutForm.reset();
      updatePaymentSection();
      closeCheckout();

      showToast(
        `Order placed successfully. Order ID: ${orderReference}`
      );

      window.setTimeout(() => {
        alert(
          `Your order was placed successfully!\n\nOrder ID: ${orderReference}\n\nWe will contact you regarding shipping charges and delivery.`
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

console.log(
  "Sree Veerabhadra Homemade Foods website loaded."
);
