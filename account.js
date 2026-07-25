import {
  auth,
  db,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  onAuthStateChanged,
  signOut
} from "./firebase.js";

const customerName = document.getElementById("customerName");
const customerEmail = document.getElementById("customerEmail");
const customerPhone = document.getElementById("customerPhone");
const ordersLoading = document.getElementById("ordersLoading");
const ordersList = document.getElementById("ordersList");
const logoutBtn = document.getElementById("logoutBtn");
const accountPhone = document.getElementById("accountPhone");
const savePhoneBtn = document.getElementById("savePhoneBtn");
let signedInUser = null;

const money = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

function formatDate(timestamp) {
  if (!timestamp?.toDate) {
    return "Date unavailable";
  }

  return timestamp.toDate().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function escapeText(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

window.downloadCustomerInvoice = (encodedOrder) => {
  const order = JSON.parse(decodeURIComponent(encodedOrder));
  const rows = (order.items || []).map((item) => `<tr><td>${escapeText(item.name)} ${escapeText(item.weight || "")}</td><td>${item.quantity || item.qty || 1}</td><td>${money(item.price ?? item.offerPrice)}</td><td>${money(item.itemTotal ?? ((item.price ?? item.offerPrice ?? 0) * (item.quantity || item.qty || 1)))}</td></tr>`).join("");
  const shipping = order.shippingCharge == null ? "Shiprocket quote pending" : money(order.shippingCharge);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice</title><style>body{font-family:Arial;max-width:800px;margin:30px auto}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:10px;text-align:left}.note{background:#fff4dd;padding:14px}</style></head><body><h1>Sree Veerabhadra Homemade Foods</h1><h2>Order Invoice</h2><p><strong>Order:</strong> ${escapeText(order.orderReference || order.id.slice(0,8).toUpperCase())}</p><p><strong>Status:</strong> ${escapeText(order.status || "New")}</p><table><tr><th>Product</th><th>Qty</th><th>Price</th><th>Amount</th></tr>${rows}</table><p>Subtotal: ${money(order.subtotal)}<br>Discount: -${money(order.discount || 0)}<br>Shipping: ${shipping}<br><strong>Saved total: ${money(order.total)}</strong></p><p class="note">If shipping is pending, the final payable amount will be confirmed on WhatsApp.</p></body></html>`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([html], {type:"text/html"}));
  link.download = `${order.orderReference || "order"}-invoice.html`;
  link.click();
  URL.revokeObjectURL(link.href);
};

function displayOrders(orders) {
  ordersLoading.classList.add("hidden");

  if (orders.length === 0) {
    ordersList.innerHTML = `
      <div class="empty-message">
        <p>You have not placed any orders yet.</p>
        <a href="index.html#products" class="btn primary">
          Start Shopping
        </a>
      </div>
    `;
    return;
  }

  orders.sort((a, b) => {
    const first = a.createdAt?.seconds || 0;
    const second = b.createdAt?.seconds || 0;
    return second - first;
  });

  ordersList.innerHTML = orders.map((order) => {
    const items = Array.isArray(order.items) ? order.items.map((item) => ({
      ...item,
      name: `${item.name || "Product"}${item.weight ? ` (${item.weight})` : ""}`,
      qty: item.quantity || item.qty || 1,
      offerPrice: item.price ?? item.offerPrice ?? 0
    })) : [];

    return `
      <article class="order-card">
        <div class="order-top">
          <div>
            <strong>Order ID:</strong>
            ${order.id.slice(0, 8).toUpperCase()}
          </div>

          <span class="order-status">
            ${order.status || "New"}
          </span>
        </div>

        <p>
          <strong>Date:</strong>
          ${formatDate(order.createdAt)}
        </p>

        <p><strong>Customer:</strong> ${order.customer?.name || order.name || "Customer"}</p>
        <p><strong>Phone:</strong> ${order.customer?.phone || order.phone || "Not available"}</p>
        <p><strong>Delivery address:</strong> ${order.customer?.address || order.address || ""}, ${order.customer?.city || order.city || ""} - ${order.customer?.pincode || order.pincode || ""}</p>

        <ul class="order-items">
          ${items.map((item) => `
            <li>
              ${item.name || "Product"} —
              ${item.qty || 1} × ${money(item.offerPrice)}
            </li>
          `).join("")}
        </ul>

        <p>
          <strong>Total:</strong> ${money(order.total)}
        </p>

        <p><strong>Shipping:</strong> ${order.shippingCharge == null ? "Shiprocket quote pending" : money(order.shippingCharge)}</p>
        ${Number(order.discount || 0) > 0 ? `<p><strong>Coupon ${order.couponCode || ""}:</strong> -${money(order.discount)}</p>` : ""}

  <p>
  <strong>Payment Method:</strong>
  ${order.paymentMethod || order.customer?.payment || "Cash on Delivery"}
</p>

<p>
  <strong>Payment Status:</strong>
  ${order.paymentStatus || "Pending"}
</p>

${
  order.paymentMethod === "UPI" && order.transactionId
    ? `
      <p>
        <strong>Transaction ID:</strong>
        ${order.transactionId}
      </p>
    `
    : ""
}

${
  order.courierName || order.awbNumber || order.trackingLink
    ? `
      <div class="tracking-details">
        <p>
          <strong>Courier:</strong>
          ${order.courierName || "Not assigned"}
        </p>

        <p>
          <strong>AWB Number:</strong>
          ${order.awbNumber || "Not available"}
        </p>

        ${
          order.trackingLink
            ? `
              <a
                href="${order.trackingLink}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn primary"
              >
                Track Shipment
              </a>
            `
            : ""
        }
      </div>
    `
    : ""
}
        <button class="btn primary" type="button" onclick="downloadCustomerInvoice('${encodeURIComponent(JSON.stringify(order)).replaceAll("'", "%27")}')">Download Invoice</button>
      </article>
    `;
  }).join("");
}

async function loadProfile(user) {
  customerEmail.textContent = user.email || "Not available";
  customerName.textContent = user.displayName || "Customer";

  let profileData = {};
  try {
    const profileReference = doc(db, "customers", user.uid);
    const profileSnapshot = await getDoc(profileReference);

    if (profileSnapshot.exists()) {
      const profile = profileSnapshot.data();
      profileData = profile;

      customerName.textContent =
        profile.name || user.displayName || "Customer";

      customerPhone.textContent =
        profile.phone || "Not available";
      if (accountPhone) accountPhone.value = profile.phone || "";
    }
  } catch (error) {
    console.error("Profile error:", error);
  }
  return profileData;
}

async function loadOrders(user, customerPhone = "") {
  try {
    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", user.uid)
    );

    const snapshots = [await getDocs(ordersQuery)];
    if (customerPhone) {
      snapshots.push(await getDocs(query(collection(db, "orders"), where("phone", "==", customerPhone))));
    }
    const uniqueDocuments = new Map();
    snapshots.forEach((snapshot) => snapshot.docs.forEach((orderDocument) => uniqueDocuments.set(orderDocument.id, orderDocument)));
    const orders = [...uniqueDocuments.values()].map((orderDocument) => ({
      id: orderDocument.id,
      ...orderDocument.data()
    }));

    displayOrders(orders);
  } catch (error) {
    console.error("Order loading error:", error);

    ordersLoading.textContent =
      "Unable to load orders. Firestore permission may need updating.";
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  signedInUser = user;
  const profile = await loadProfile(user);
  await loadOrders(user, profile.phone || "");
});

savePhoneBtn?.addEventListener("click", async () => {
  const phone = String(accountPhone.value || "").replace(/\D/g, "");
  if (!signedInUser || !/^[0-9]{10}$/.test(phone)) return alert("Enter a valid 10-digit phone number.");
  await setDoc(doc(db, "customers", signedInUser.uid), {
    uid: signedInUser.uid,
    name: signedInUser.displayName || "Customer",
    email: signedInUser.email || "",
    phone
  }, { merge: true });
  customerPhone.textContent = phone;
  ordersLoading.classList.remove("hidden");
  ordersLoading.textContent = "Loading your orders...";
  await loadOrders(signedInUser, phone);
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert("Could not log out. Please try again.");
  }
});
