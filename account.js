import {
  auth,
  db,
  collection,
  getDocs,
  doc,
  getDoc,
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
    const items = Array.isArray(order.items) ? order.items : [];

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

        <p>
          <strong>Payment:</strong>
          ${order.customer?.payment || "Cash on Delivery"}
        </p>
      </article>
    `;
  }).join("");
}

async function loadProfile(user) {
  customerEmail.textContent = user.email || "Not available";
  customerName.textContent = user.displayName || "Customer";

  try {
    const profileReference = doc(db, "customers", user.uid);
    const profileSnapshot = await getDoc(profileReference);

    if (profileSnapshot.exists()) {
      const profile = profileSnapshot.data();

      customerName.textContent =
        profile.name || user.displayName || "Customer";

      customerPhone.textContent =
        profile.phone || "Not available";
    }
  } catch (error) {
    console.error("Profile error:", error);
  }
}

async function loadOrders(user) {
  try {
    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", user.uid)
    );

    const snapshot = await getDocs(ordersQuery);

    const orders = snapshot.docs.map((orderDocument) => ({
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

  await loadProfile(user);
  await loadOrders(user);
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
