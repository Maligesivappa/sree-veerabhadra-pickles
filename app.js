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
const state={products:[],cart:JSON.parse(localStorage.getItem("svp_cart")||"[]")};
const $=s=>document.querySelector(s);
const money=n=>`₹${Number(n||0).toLocaleString("en-IN")}`;
const saveCart=()=>localStorage.setItem("svp_cart",JSON.stringify(state.cart));

function renderProducts(filter=""){
  const q=filter.toLowerCase().trim();
  const list=state.products.filter(p=>(p.name||"").toLowerCase().includes(q));
  $("#productGrid").innerHTML=list.map(p=>`
  <article class="product">
    <div class="product-img"><img src="${p.imageUrl||"logo.jpeg"}" alt="${p.name||"Pickle"}" onerror="this.src='logo.jpeg'"></div>
    <div class="product-body">
      <h3>${p.name||"Pickle"}</h3><p>${p.weight||""}</p>
      <div class="prices"><span class="offer">${money(p.offerPrice)}</span><span class="mrp">${money(p.mrp)}</span></div>
      <div class="product-actions">
        <input class="qty" id="qty-${p.id}" type="number" min="1" max="10" value="1">
        <button class="btn primary full" onclick="addToCart('${p.id}')">Add to Cart</button>
      </div>
    </div>
  </article>`).join("");
  $("#emptyProducts").classList.toggle("hidden",list.length!==0);
}

window.addToCart=id=>{
  const p=state.products.find(x=>x.id===id); if(!p)return;
  const qty=Math.max(1,Number(document.querySelector(`#qty-${id}`).value)||1);
  const found=state.cart.find(x=>x.id===id);
  if(found)found.qty+=qty;else state.cart.push({...p,qty});
  saveCart();renderCart();toast("Added to cart");
};
window.removeCart=id=>{state.cart=state.cart.filter(x=>x.id!==id);saveCart();renderCart()};

function renderCart(){
  $("#cartCount").textContent=state.cart.reduce((a,b)=>a+b.qty,0);
  $("#cartItems").innerHTML=state.cart.length?state.cart.map(i=>`
  <div class="cart-item"><div><b>${i.name}</b><br><small>${i.weight||""} × ${i.qty}</small></div>
  <div><b>${money(i.offerPrice*i.qty)}</b><br><button class="remove" onclick="removeCart('${i.id}')">Remove</button></div></div>`).join(""):`<div class="notice">Your cart is empty.</div>`;
  $("#cartTotal").textContent=money(state.cart.reduce((a,b)=>a+(Number(b.offerPrice)*b.qty),0));
}
function drawer(show){$("#cartDrawer").classList.toggle("open",show);$("#overlay").classList.toggle("show",show)}
function checkout(show){$("#checkoutModal").classList.toggle("show",show);$("#overlay").classList.toggle("show",show)}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}

$("#cartBtn").onclick=()=>drawer(true);$("#closeCart").onclick=()=>drawer(false);$("#overlay").onclick=()=>{drawer(false);checkout(false)};
$("#checkoutBtn").onclick=()=>{if(!state.cart.length)return toast("Your cart is empty");drawer(false);checkout(true)};
$("#closeCheckout").onclick=()=>checkout(false);$("#search").oninput=e=>renderProducts(e.target.value);
$("#checkoutForm").onsubmit=async e=>{
  e.preventDefault();
  const customer = Object.fromEntries(new FormData(e.target).entries());
const total = state.cart.reduce(
  (a, b) => a + (Number(b.offerPrice) * b.qty),
  0
);

const user = auth.currentUser;

if (!user) {
  toast("Please login before placing an order.");
  window.location.href = "login.html";
  return;
}

const order = {
  userId: user.uid,
  customerEmail: user.email,
  customer,
  items: state.cart.map(({ id, name, weight, offerPrice, qty }) => ({
    id,
    name,
    weight,
    offerPrice,
    qty
  })),
  total,
  status: "New",
  paymentStatus: "Pending",
  createdAt: serverTimestamp()
};
  try{
    const ref=await addDoc(collection(db,"orders"),order);
    state.cart=[];saveCart();renderCart();checkout(false);e.target.reset();
    toast(`Order placed: ${ref.id.slice(0,8).toUpperCase()}`);
  }catch(err){console.error(err);toast("Could not place order. Check Firestore rules.");}
};
$("#year").textContent=new Date().getFullYear();

const q=query(collection(db,"products"),orderBy("createdAt","desc"));
onSnapshot(q,snap=>{
  state.products=snap.docs.map(d=>({id:d.id,...d.data()}));
  $("#loading").classList.add("hidden");renderProducts($("#search").value);
},err=>{
  console.error(err);$("#loading").textContent="Unable to load products. Check Firebase setup.";
});
renderCart();
