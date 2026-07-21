const PASSWORD='admin123';
const login=document.getElementById('loginCard');
const dash=document.getElementById('dashboard');

function openDash(){login.classList.add('hidden');dash.classList.remove('hidden');renderAll()}
document.getElementById('loginBtn').onclick=()=>{
  if(document.getElementById('adminPassword').value===PASSWORD){sessionStorage.setItem('svp_admin','yes');openDash()}
  else document.getElementById('loginMessage').textContent='Wrong password.'
};
document.getElementById('logoutBtn').onclick=()=>{sessionStorage.removeItem('svp_admin');location.reload()};
if(sessionStorage.getItem('svp_admin')==='yes')openDash();

document.querySelectorAll('.tab').forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(x=>x.classList.add('hidden'));
  btn.classList.add('active');document.getElementById(btn.dataset.tab).classList.remove('hidden');
});

function renderAll(){renderOrders();renderAdminProducts();renderCoupons()}

function renderOrders(){
  const orders=getOrders();
  document.getElementById('totalOrders').textContent=orders.length;
  document.getElementById('pendingOrders').textContent=orders.filter(o=>o.status==='Pending').length;
  document.getElementById('completedOrders').textContent=orders.filter(o=>o.status==='Completed').length;
  document.getElementById('totalRevenue').textContent=orders.filter(o=>o.status!=='Cancelled').reduce((s,o)=>s+Number(o.total||0),0);
  const list=document.getElementById('ordersList');
  list.innerHTML=orders.length?orders.map(o=>`<article class="order-card">
    <h3>${o.id} • ₹${o.total}</h3>
    <div class="order-info">
      <div><strong>Customer:</strong> ${o.customerName}</div>
      <div><strong>Phone:</strong> ${o.phone}</div>
      <div><strong>Payment:</strong> ${o.payment}</div>
      <div><strong>Date:</strong> ${o.createdAt}</div>
      <div><strong>Coupon:</strong> ${o.coupon||'None'}</div>
      <div><strong>Discount:</strong> ₹${o.discount||0}</div>
      <div><strong>Address:</strong> ${o.address}</div>
      <div><strong>Items:</strong> ${o.items.map(i=>`${i.name} × ${i.qty}`).join(', ')}</div>
    </div>
    <div class="order-actions">
      <select class="status-select" onchange="updateOrder('${o.id}',this.value)">
        ${['Pending','Confirmed','Packed','Out for Delivery','Completed','Cancelled'].map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
      <button class="btn danger" onclick="deleteOrder('${o.id}')">Delete</button>
    </div>
  </article>`).join(''):`<div class="panel-card">No orders yet.</div>`;
}
function updateOrder(id,status){const a=getOrders();const o=a.find(x=>x.id===id);if(o)o.status=status;saveOrders(a);renderOrders()}
function deleteOrder(id){if(confirm('Delete this order?')){saveOrders(getOrders().filter(x=>x.id!==id));renderOrders()}}

function imageToDataURL(file){return new Promise((resolve,reject)=>{if(!file)return resolve('');const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}

document.getElementById('productForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const id=document.getElementById('productId').value||'p'+Date.now();
  const all=getProducts();const old=all.find(x=>x.id===id);
  const file=document.getElementById('productImage').files[0];
  const image=file?await imageToDataURL(file):(old?.image||'');
  const obj={id,name:productName.value.trim(),weight:productWeight.value.trim(),mrp:Number(productMrp.value),offer:Number(productOffer.value),image,stock:productStock.checked};
  const i=all.findIndex(x=>x.id===id);if(i>=0)all[i]=obj;else all.unshift(obj);
  saveProducts(all);clearProductForm();renderAdminProducts();
});
function clearProductForm(){productForm.reset();productId.value='';productStock.checked=true;productFormTitle.textContent='Add Product'}
cancelProductEdit.onclick=clearProductForm;
function editProduct(id){
  const p=getProducts().find(x=>x.id===id);if(!p)return;
  productId.value=p.id;productName.value=p.name;productWeight.value=p.weight;productMrp.value=p.mrp;productOffer.value=p.offer;productStock.checked=p.stock;productFormTitle.textContent='Edit Product';window.scrollTo({top:0,behavior:'smooth'});
}
function deleteProduct(id){if(confirm('Delete this product?')){saveProducts(getProducts().filter(x=>x.id!==id));renderAdminProducts()}}
function renderAdminProducts(){
  const list=document.getElementById('adminProducts'),items=getProducts();
  list.innerHTML=items.map(p=>`<div class="list-card">
    <div class="list-main"><img class="thumb" src="${p.image||placeholder(p.name)}"><div class="grow"><h4>${p.name}</h4><div>${p.weight} • MRP ₹${p.mrp} • Offer ₹${p.offer}</div><span class="badge-status">${p.stock?'In stock':'Out of stock'}</span></div></div>
    <div class="button-row"><button class="btn secondary" onclick="editProduct('${p.id}')">Edit</button><button class="btn danger" onclick="deleteProduct('${p.id}')">Delete</button></div>
  </div>`).join('');
}

document.getElementById('couponForm').addEventListener('submit',e=>{
  e.preventDefault();
  const id=couponId.value||'c'+Date.now(),all=getCoupons();
  const obj={id,code:couponCodeAdmin.value.trim().toUpperCase(),type:couponType.value,value:Number(couponValue.value),minimum:Number(couponMinimum.value||0),maximum:Number(couponMaximum.value||0),expiry:couponExpiry.value,active:couponActive.checked};
  const i=all.findIndex(x=>x.id===id);if(i>=0)all[i]=obj;else all.unshift(obj);
  saveCoupons(all);clearCouponForm();renderCoupons();
});
function clearCouponForm(){couponForm.reset();couponId.value='';couponActive.checked=true;couponMinimum.value=0;couponMaximum.value=0;couponFormTitle.textContent='Add Coupon'}
cancelCouponEdit.onclick=clearCouponForm;
function editCoupon(id){
  const c=getCoupons().find(x=>x.id===id);if(!c)return;
  couponId.value=c.id;couponCodeAdmin.value=c.code;couponType.value=c.type;couponValue.value=c.value;couponMinimum.value=c.minimum;couponMaximum.value=c.maximum;couponExpiry.value=c.expiry||'';couponActive.checked=c.active;couponFormTitle.textContent='Edit Coupon';
}
function deleteCoupon(id){if(confirm('Delete this coupon?')){saveCoupons(getCoupons().filter(x=>x.id!==id));renderCoupons()}}
function renderCoupons(){
  const list=document.getElementById('adminCoupons'),items=getCoupons();
  list.innerHTML=items.length?items.map(c=>`<div class="list-card"><h4>${c.code}</h4><div>${c.type==='percent'?c.value+'%':'₹'+c.value} off • Minimum ₹${c.minimum||0}${c.maximum?` • Max ₹${c.maximum}`:''}</div><span class="badge-status">${c.active?'Active':'Inactive'}${c.expiry?' • Expires '+c.expiry:''}</span><div class="button-row"><button class="btn secondary" onclick="editCoupon('${c.id}')">Edit</button><button class="btn danger" onclick="deleteCoupon('${c.id}')">Delete</button></div></div>`).join(''):'No coupons added.';
}
