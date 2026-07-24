import {
  auth,
  db,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "./firebase.js";

const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem("svp_cart") || "[]")
};

const UPI_ID = "Q344822848@ybl";
const UPI_NAME = "Sree Veerabhadra Pickles";

const $ = (selector) => document.querySelector(selector);

const money = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const getCartTotal = () =>
  state.cart.reduce(
    (sum, item) =>
      sum +
      Number(item.offerPrice || 0) *
        Number(item.qty || 0),
    0
  );

const saveCart = () => {
  localStorage.setItem(
    "svp_cart",
    JSON.stringify(state.cart)
  );
};

function renderProducts(filter = "") {
  const searchText = filter.toLowerCase().trim();

  const list = state.products.filter((product) =>
    (product.name || "")
      .toLowerCase()
      .includes(searchText)
  );

  $("#productGrid").innerHTML = list
    .map(
      (product) => `
        <article class="product">

          <div class="product-img">
            <img
              src="${product.imageUrl || "logo.jpeg"}"
              alt="${product.name || "Pickle"}"
              onerror="this.src='logo.jpeg'"
            >
          </div>

          <div class="product-body">

            <h3>${product.name || "Pickle"}</h3>

            <p>${product.weight || ""}</p>

            <div class="prices">
              <span class="offer">
                ${money(product.offerPrice)}
              </span>

              <span class="mrp">
                ${money(product.mrp)}
              </span>
            </div>

            <div class="product-actions">

              <input
                class="qty"
                id="qty-${product.id}"
                type="number"
                min="1"
                max="10"
                value="1"
              >

              <button
                class="btn primary full"
                type="button"
                onclick="addToCart('${product.id}')"
              >
                Add to Cart
              </button>

            </div>

          </div>

        </article>
      `
    )
    .join("");

  $("#emptyProducts").classList.toggle(
    "hidden",
    list.length !== 0
  );
}

window.addToCart = (id) => {
  const product = state.products.find(
    (item) => item.id === id
  );

  if (!product) return;

  const quantityInput =
    document.querySelector(`#qty-${id}`);

  const quantity = Math.min(
    10,
    Math.max(
      1,
      Number(quantityInput?.value) || 1
    )
  );

  const existingItem = state.cart.find(
    (item) => item.id === id
  );

  if (existingItem) {
    existingItem.qty = Math.min(
      10,
      existingItem.qty + quantity
    );
  } else {
    state.cart.push({
      ...product,
      qty: quantity
    });
  }

  saveCart();
  renderCart();
  toast("Added to cart");
};

window.removeCart = (id) => {
  state.cart = state.cart.filter(
    (item) => item.id !== id
  );

  saveCart();
  renderCart();
};

function renderCart() {
  $("#cartCount").textContent =
    state.cart.reduce(
      (total, item) =>
        total + Number(item.qty || 0),
      0
    );

  $("#cartItems").innerHTML =
    state.cart.length
      ? state.cart
          .map(
            (item) => `
              <div class="cart-item">

                <div>
                  <b>${item.name}</b><br>
                  <small>
                    ${item.weight || ""} × ${item.qty}
                  </small>
                </div>

                <div>
                  <b>
                    ${money(
                      Number(item.offerPrice) *
                        item.qty
                    )}
                  </b>
                  <br>

                  <button
                    class="remove"
                    type="button"
                    onclick="removeCart('${item.id}')"
                  >
                    Remove
                  </button>
                </div>

              </div>
            `
          )
          .join("")
      : `<div class="notice">
          Your cart is empty.
        </div>`;

  $("#cartTotal").textContent =
    money(getCartTotal());

  updateUpiDetails();
}

function drawer(show) {
  $("#cartDrawer").classList.toggle(
    "open",
    show
  );

  $("#overlay").classList.toggle(
    "show",
    show
  );
}

function checkout(show) {
  $("#checkoutModal").classList.toggle(
    "show",
    show
  );

  $("#overlay").classList.toggle(
    "show",
    show
  );

  if (show) {
    updateUpiDetails();
    updatePaymentSection();
  }
}

function toast(message) {
  const toastElement = $("#toast");

  toastElement.textContent = message;
  toastElement.classList.add("show");

  setTimeout(() => {
    toastElement.classList.remove("show");
  }, 2500);
}

function updateUpiDetails() {
  const total = getCartTotal();

  const upiAmount = $("#upiAmount");
  const upiPayBtn = $("#upiPayBtn");

  if (upiAmount) {
    upiAmount.textContent = money(total);
  }

  if (upiPayBtn) {
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: UPI_NAME,
      am: total.toFixed(2),
      cu: "INR",
      tn: "Pickle order payment"
    });

    upiPayBtn.href =
      `upi://pay?${params.toString()}`;
  }
}

function updatePaymentSection() {
  const selectedPayment =
    document.querySelector(
      'input[name="payment"]:checked'
    );

  const upiPaymentBox =
    $("#upiPaymentBox");

  const transactionId =
    $("#transactionId");

  const isUpi =
    selectedPayment?.value === "UPI";

  if (upiPaymentBox) {
    upiPaymentBox.classList.toggle(
      "hidden",
      !isUpi
    );
  }

  if (transactionId) {
    transactionId.required = isUpi;

    if (!isUpi) {
      transactionId.value = "";
    }
  }
}

$("#cartBtn").onclick = () => {
  drawer(true);
};

$("#closeCart").onclick = () => {
  drawer(false);
};

$("#overlay").onclick = () => {
  drawer(false);
  checkout(false);
};

$("#checkoutBtn").onclick = () => {
  if (!state.cart.length) {
    toast("Your cart is empty");
    return;
  }

  if (!auth.currentUser) {
    toast("Please login before checkout.");

    setTimeout(() => {
      window.location.href =
        "login.html";
    }, 1000);

    return;
  }

  drawer(false);
  checkout(true);
};

$("#closeCheckout").onclick = () => {
  checkout(false);
};

$("#search").oninput = (event) => {
  renderProducts(event.target.value);
};

document
  .querySelectorAll(
    'input[name="payment"]'
  )
  .forEach((radio) => {
    radio.addEventListener(
      "change",
      updatePaymentSection
    );
  });

$("#checkoutForm").onsubmit =
  async (event) => {
    event.preventDefault();

    const user = auth.currentUser;

    if (!user) {
      toast(
        "Please login before placing an order."
      );

      setTimeout(() => {
        window.location.href =
          "login.html";
      }, 1000);

      return;
    }

    if (!state.cart.length) {
      toast("Your cart is empty");
      return;
    }

    const formData =
      new FormData(event.target);

    const paymentMethod =
      formData.get("payment") ||
      "Cash on Delivery";

    const transactionId = String(
      formData.get("transactionId") || ""
    ).trim();

    if (
      paymentMethod === "UPI" &&
      transactionId.length < 6
    ) {
      toast(
        "Enter a valid UPI transaction ID"
      );

      $("#transactionId")?.focus();
      return;
    }

    const customer = {
      name: String(
        formData.get("name") || ""
      ).trim(),

      phone: String(
        formData.get("phone") || ""
      ).trim(),

      address: String(
        formData.get("address") || ""
      ).trim(),

      city: String(
        formData.get("city") || ""
      ).trim(),

      pincode: String(
        formData.get("pincode") || ""
      ).trim()
    };

    const total = getCartTotal();

    const order = {
      userId: user.uid,

      customerEmail:
        user.email || "",

      customer,

      items: state.cart.map(
        ({
          id,
          name,
          weight,
          offerPrice,
          qty
        }) => ({
          id,
          name,
          weight,
          offerPrice:
            Number(offerPrice),
          qty: Number(qty)
        })
      ),

      total,

      paymentMethod,

      paymentStatus:
        paymentMethod === "UPI"
          ? "Verification Pending"
          : "Pending",

      transactionId:
        paymentMethod === "UPI"
          ? transactionId
          : "",

      status: "New",

      createdAt: serverTimestamp()
    };

    const submitButton =
      event.target.querySelector(
        'button[type="submit"]'
      );

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
          "Placing Order...";
      }

      const orderReference =
        await addDoc(
          collection(db, "orders"),
          order
        );

      state.cart = [];

      saveCart();
      renderCart();
      checkout(false);

      event.target.reset();
      updatePaymentSection();

      toast(
        `Order placed: ${orderReference.id
          .slice(0, 8)
          .toUpperCase()}`
      );
    } catch (error) {
      console.error(error);

      toast(
        "Could not place order. Check Firestore rules."
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent =
          "Place Order";
      }
    }
  };

/* ==========================================
   SAFE FOOTER YEAR
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {

  const yearElement = document.getElementById("year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

});

const productsQuery = query(
  collection(db, "products"),
  orderBy("createdAt", "desc")
);

onSnapshot(
  productsQuery,

  (snapshot) => {
    state.products =
      snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
      }));

    $("#loading").classList.add(
      "hidden"
    );

    renderProducts(
      $("#search").value
    );
  },

  (error) => {
    console.error(error);

    $("#loading").textContent =
      "Unable to load products. Check Firebase setup.";
  }
);

renderCart();
updatePaymentSection();
