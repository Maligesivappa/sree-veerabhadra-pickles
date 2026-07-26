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
  const rows = (order.items || []).map((item, index) => `<tr><td>${index + 1}</td><td><strong>${escapeText(item.name)}</strong><br><small>${escapeText(item.weight || "")}</small></td><td>${item.quantity || item.qty || 1}</td><td>${money(item.price ?? item.offerPrice)}</td><td>${money(item.itemTotal ?? ((item.price ?? item.offerPrice ?? 0) * (item.quantity || item.qty || 1)))}</td></tr>`).join("");
  const shipping = order.shippingCharge == null ? "Shiprocket quote pending" : money(order.shippingCharge);
  const customer = order.customer || {};
  const reference = escapeText(order.orderReference || order.id?.slice(0, 8).toUpperCase() || "ORDER");
  const orderDate = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Invoice ${reference}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f6efe4;color:#2c211d;font-family:Arial,sans-serif}.invoice{max-width:850px;margin:24px auto;background:#fff;border-top:8px solid #9e2f1c;box-shadow:0 10px 30px #5b2b1b22}.header{display:flex;justify-content:space-between;gap:20px;padding:24px 30px;background:linear-gradient(135deg,#fff8ec,#fde5b7)}.brand{display:flex;align-items:center;gap:16px}.brand img{width:82px;height:82px;object-fit:contain;border-radius:50%;background:#fff}.brand h1{margin:0;color:#7a2114;font-family:Georgia,serif;font-size:25px}.brand p,.meta p{margin:5px 0;font-size:13px}.meta{text-align:right}.invoice-title{font-size:26px;color:#9e2f1c;font-weight:800}.content{padding:26px 30px}.details{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}.box{border:1px solid #ead7be;border-radius:12px;padding:16px;background:#fffdf9}.box h3{margin:0 0 10px;color:#7a2114;font-size:14px;text-transform:uppercase;letter-spacing:.8px}.box p{margin:5px 0;line-height:1.5}table{width:100%;border-collapse:collapse;margin:18px 0}th{background:#9e2f1c;color:#fff;text-align:left;padding:11px}td{padding:11px;border-bottom:1px solid #ead7be}th:nth-child(n+3),td:nth-child(n+3){text-align:right}.summary{margin-left:auto;width:min(100%,340px);border:1px solid #ead7be;border-radius:12px;padding:14px}.summary p{display:flex;justify-content:space-between;margin:9px}.summary .grand{border-top:2px solid #9e2f1c;padding-top:12px;font-size:19px;color:#7a2114}.note{margin-top:22px;background:#fff2d8;border-left:5px solid #e5a52f;padding:14px;line-height:1.5}.footer{text-align:center;padding:18px;background:#2f5c35;color:#fff;line-height:1.6}.print{display:block;margin:20px auto;padding:11px 24px;border:0;border-radius:8px;background:#9e2f1c;color:#fff;font-weight:bold;cursor:pointer}@media(max-width:600px){.header,.details{display:block}.meta{text-align:left;margin-top:18px}.content{padding:20px 14px}.invoice{margin:0}.box{margin-bottom:12px}th,td{padding:8px 5px;font-size:12px}}@media print{body{background:#fff}.invoice{margin:0;box-shadow:none}.print{display:none}}
  </style></head><body><main class="invoice"><header class="header"><div class="brand"><img src="https://maligesivappa.github.io/sree-veerabhadra-pickles/logo.jpeg" alt="Sree Veerabhadra logo"><div><h1>Sree Veerabhadra<br>Homemade Foods</h1><p>Traditional taste, prepared with care</p></div></div><div class="meta"><div class="invoice-title">ORDER INVOICE</div><p><strong>Invoice/Order:</strong> ${reference}</p><p><strong>Date:</strong> ${orderDate}</p><p><strong>Status:</strong> ${escapeText(order.status || "New")}</p></div></header><section class="content"><div class="details"><div class="box"><h3>From</h3><p><strong>Sree Veerabhadra Homemade Foods</strong><br>Opposite Bus Stand, near Rajappa Hospital<br>Velgode – 518533, Nandyal, Andhra Pradesh<br>Phone/WhatsApp: +91 94902 10173</p></div><div class="box"><h3>Bill & Deliver To</h3><p><strong>${escapeText(customer.name || order.name || "Customer")}</strong><br>${escapeText(customer.phone || order.phone || "")}<br>${escapeText(customer.address || order.address || "")}<br>${escapeText(customer.city || order.city || "")}${customer.state || order.state ? `, ${escapeText(customer.state || order.state)}` : ""}${customer.pincode || order.pincode ? ` - ${escapeText(customer.pincode || order.pincode)}` : ""}</p></div></div><table><thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="summary"><p><span>Items subtotal</span><strong>${money(order.subtotal)}</strong></p><p><span>Coupon discount</span><strong>-${money(order.discount || 0)}</strong></p><p><span>Shipping</span><strong>${shipping}</strong></p><p class="grand"><span>Total</span><strong>${money(order.total)}</strong></p><p><span>Payment</span><strong>${escapeText(order.paymentMethod || "COD")}</strong></p></div><div class="note"><strong>Thank you for your order!</strong><br>Our food is freshly prepared after receiving your order. If the shipping quote is pending, the final payable amount will be confirmed through WhatsApp.</div><button class="print" onclick="window.print()">Print / Save as PDF</button></section><footer class="footer">Sree Veerabhadra Homemade Foods<br>Delivery Across India • WhatsApp: +91 94902 10173</footer></main></body></html>`;
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
