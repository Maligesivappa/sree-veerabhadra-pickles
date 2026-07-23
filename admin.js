import {
  db,
  auth,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "./firebase.js";

const $ = (selector) => document.querySelector(selector);
const money = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

let products = [];
let orders = [];
let adminStarted = false;

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(event.target).entries());

  try {
    await signInWithEmailAndPassword(auth, data.email, data.password);
    $("#loginMessage").textContent = "";
  } catch (error) {
    console.error("Admin login error:", error);
    $("#loginMessage").textContent =
      "Login failed. Check the email, password and Firebase Authentication.";
  }
});

$("#logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    alert("Could not log out.");
  }
});

onAuthStateChanged(auth, (user) => {
  $("#loginView").classList.toggle("hidden", Boolean(user));
  $("#adminView").classList.toggle("hidden", !user);

  if (user && !adminStarted) {
    adminStarted = true;
    startAdmin();
  }

  if (!user) {
    adminStarted = false;
  }
});

function startAdmin() {
  onSnapshot(
    query(collection(db, "products"), orderBy("createdAt", "desc")),
    (snapshot) => {
      products = snapshot.docs.map((productDocument) => ({
        id: productDocument.id,
        ...productDocument.data()
      }));

      renderProducts();
    },
    (error) => {
      console.error("Products listener error:", error);
      $("#productRows").innerHTML =
        `<tr><td colspan="6">Could not load products.</td></tr>`;
    }
  );

  onSnapshot(
    query(collection(db, "orders"), orderBy("createdAt", "desc")),
    (snapshot) => {
      orders = snapshot.docs.map((orderDocument) => ({
        id: orderDocument.id,
        ...orderDocument.data()
      }));

      updateDashboard(orders);
      applyOrderFilters();
    },
    (error) => {
      console.error("Orders listener error:", error);
      $("#orderRows").innerHTML =
        `<tr><td colspan="10">Could not load orders.</td></tr>`;
    }
  );
}

function renderProducts() {
  $("#productRows").innerHTML = products.length
    ? products.map((product) => `
      <tr>
        <td>${escapeHtml(product.name || "")}</td>
        <td>${escapeHtml(product.weight || "")}</td>
        <td>${money(product.mrp)}</td>
        <td>${money(product.offerPrice)}</td>
        <td>${product.inStock ? "Yes" : "No"}</td>
        <td>
          <button class="small" onclick="editProduct('${product.id}')">
            Edit
          </button>
          <button class="small danger" onclick="removeProduct('${product.id}')">
            Delete
          </button>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="6">No products yet.</td></tr>`;
}

window.editProduct = (id) => {
  const product = products.find((item) => item.id === id);
  if (!product) return;

  const form = $("#productForm");

  for (const key of [
    "id",
    "name",
    "weight",
    "mrp",
    "offerPrice",
    "imageUrl",
    "description"
  ]) {
    form.elements[key].value = product[key] ?? "";
  }

  form.elements.inStock.value = String(product.inStock !== false);
  $("#formTitle").textContent = "Edit Product";
  $("#cancelEdit").classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.removeProduct = async (id) => {
  if (!confirm("Delete this product?")) return;

  try {
    await deleteDoc(doc(db, "products", id));
  } catch (error) {
    console.error("Delete product error:", error);
    alert("Could not delete product.");
  }
};

$("#productForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.target;
  const data = Object.fromEntries(new FormData(form).entries());

  const payload = {
    name: data.name.trim(),
    weight: data.weight.trim(),
    mrp: Number(data.mrp),
    offerPrice: Number(data.offerPrice),
    imageUrl: data.imageUrl.trim(),
    description: data.description.trim(),
    inStock: data.inStock === "true",
    updatedAt: serverTimestamp()
  };

  try {
    if (data.id) {
      await updateDoc(doc(db, "products", data.id), payload);
    } else {
      await addDoc(collection(db, "products"), {
        ...payload,
        createdAt: serverTimestamp()
      });
    }

    resetForm();
  } catch (error) {
    console.error("Save product error:", error);
    alert("Could not save product. Check Firestore rules and admin login.");
  }
});

$("#cancelEdit").addEventListener("click", resetForm);

function resetForm() {
  $("#productForm").reset();
  $("#productForm").elements.id.value = "";
  $("#formTitle").textContent = "Add Product";
  $("#cancelEdit").classList.add("hidden");
}

function updateDashboard(allOrders) {
  const totalOrders = allOrders.length;

  const totalSales = allOrders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  const pendingShipments = allOrders.filter((order) =>
    ["New", "Confirmed", "Packed"].includes(order.status || "New")
  ).length;

  const deliveredOrders = allOrders.filter(
    (order) => order.status === "Delivered"
  ).length;

  $("#totalOrders").textContent = totalOrders;
  $("#totalSales").textContent = money(totalSales);
  $("#pendingShipments").textContent = pendingShipments;
  $("#deliveredOrders").textContent = deliveredOrders;
}

function applyOrderFilters() {
  const searchText = ($("#orderSearch")?.value || "").trim().toLowerCase();
  const selectedStatus = $("#statusFilter")?.value || "All";

  const filteredOrders = orders.filter((order) => {
    const searchableText = [
      order.id,
      order.customer?.name,
      order.customer?.phone,
      order.customerEmail
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !searchText || searchableText.includes(searchText);

    const orderStatus = order.status || "New";
    const matchesStatus =
      selectedStatus === "All" || orderStatus === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  renderOrders(filteredOrders);
  $("#orderCount").textContent =
    `${filteredOrders.length} order${filteredOrders.length === 1 ? "" : "s"}`;
}

function renderOrders(filteredOrders) {
  $("#orderRows").innerHTML = filteredOrders.length
    ? filteredOrders.map((order) => {
      const orderId = order.id.slice(0, 8).toUpperCase();
      const paymentMethod =
        order.paymentMethod ||
        order.customer?.payment ||
        "Cash on Delivery";

      const paymentStatus =
        paymentMethod === "Cash on Delivery"
          ? (order.paymentStatus || "Pay on Delivery")
          : (order.paymentStatus || "Verification Pending");

      return `
        <tr>
          <td>${orderId}</td>
          <td>${escapeHtml(order.customer?.name || "")}</td>
          <td>${escapeHtml(order.customer?.phone || "")}</td>

          <td class="address-cell">
            ${escapeHtml(order.customer?.address || "")},
            ${escapeHtml(order.customer?.city || "")} -
            ${escapeHtml(order.customer?.pincode || "")}
          </td>

          <td>${money(order.total)}</td>

          <td>
            <strong>${escapeHtml(paymentMethod)}</strong><br>
            <small>${escapeHtml(paymentStatus)}</small>
            ${
              paymentMethod === "UPI" && order.transactionId
                ? `<br><small>Txn: ${escapeHtml(order.transactionId)}</small>`
                : ""
            }
          </td>

          <td>
            <select
              class="status"
              onchange="changeStatus('${order.id}', this.value)"
            >
              ${statusOptions(order.status || "New")}
            </select>
          </td>

          <td>
            <input
              id="courier-${order.id}"
              class="tracking-input"
              type="text"
              placeholder="Courier name"
              value="${escapeAttribute(order.courierName || "")}"
            >
          </td>

          <td>
            <input
              id="awb-${order.id}"
              class="tracking-input"
              type="text"
              placeholder="AWB number"
              value="${escapeAttribute(order.awbNumber || "")}"
            >
          </td>

          <td>
            <input
              id="tracking-${order.id}"
              class="tracking-input"
              type="url"
              placeholder="Tracking link"
              value="${escapeAttribute(order.trackingLink || "")}"
            >
            <br>

            <button
              class="small"
              onclick="saveTracking('${order.id}')"
            >
              Save
            </button>

            ${
              order.trackingLink
                ? `
                  <a
                    class="small"
                    href="${escapeAttribute(order.trackingLink)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Track
                  </a>
                `
                : ""
            }
          </td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="10">No matching orders.</td></tr>`;
}

function statusOptions(currentStatus) {
  return ["New", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"]
    .map((status) =>
      `<option value="${status}" ${currentStatus === status ? "selected" : ""}>
        ${status}
      </option>`
    )
    .join("");
}

window.changeStatus = async (id, status) => {
  try {
    await updateDoc(doc(db, "orders", id), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Update status error:", error);
    alert("Could not update order status.");
  }
};

window.saveTracking = async (id) => {
  const courierName =
    document.getElementById(`courier-${id}`).value.trim();

  const awbNumber =
    document.getElementById(`awb-${id}`).value.trim();

  const trackingLink =
    document.getElementById(`tracking-${id}`).value.trim();

  if (!courierName || !awbNumber) {
    alert("Please enter the courier name and AWB number.");
    return;
  }

  if (
    trackingLink &&
    !trackingLink.startsWith("https://") &&
    !trackingLink.startsWith("http://")
  ) {
    alert("Tracking link must begin with https://");
    return;
  }

  try {
    await updateDoc(doc(db, "orders", id), {
      courierName,
      awbNumber,
      trackingLink,
      status: "Shipped",
      trackingUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    alert("Tracking details saved successfully.");
  } catch (error) {
    console.error("Save tracking error:", error);
    alert("Could not save tracking details.");
  }
};

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.remove("active");
    });

    button.classList.add("active");

    const selectedTab = button.dataset.tab;

    $("#productsTab").classList.toggle(
      "hidden",
      selectedTab !== "products"
    );

    $("#ordersTab").classList.toggle(
      "hidden",
      selectedTab !== "orders"
    );
  });
});

$("#orderSearch").addEventListener("input", applyOrderFilters);
$("#statusFilter").addEventListener("change", applyOrderFilters);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
