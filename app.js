let cart=[];
let activeCoupon=null;

function products(){return getProducts()}

function renderProducts(){
  const list=products();
  document.getElementById('productCount').textContent=`${list.length} products`;
  const grid=document.getElementById('productGrid');
  grid.innerHTML=list.map(p=>{
    const saving=Math.max(0,money(p.mrp)-money(p.offer));
    return `<article class="product-card ${p.stock?'':'out'}">
      <img src="${p.image||placeholder(p.name)}" alt="${p.name}">
      <div class="product-body">
        <h3>${p.name}</h3>
        <p>${p.weight}</p>
        <div class="price-line">
          <span class="offer">₹${money(p.offer)}</span>
          <span class="mrp">₹${money(p.mrp)}</span>
          ${saving?`<span class="save">Save ₹${saving}</span>`:''}
        </div>
        ${p.stock?`<div class="qty-row"><input id="qty-${p.id}" type="number" min="1" max="20" value="1"><button class="btn primary" onclick="addToCart('${p.id}')">Add to Cart</button></div>`:`<strong>Out of stock</strong>`}
      </div>
    </article>`;
  }).join('');
}

function addToCart(id){
  const p=products().find(x=>x.id===id);
  if(!p||!p.stock)return;
  const qty=Math.max(1,Number(document.getElementById(`qty-${id}`).value)||1);
  const found=cart.find(x=>x.id===id);
  if(found)found.qty+=qty;else cart.push({...p,qty});
  renderCart();
}
function removeItem(id){cart=cart.filter(x=>x.id!==id);renderCart()}

function discountAmount(sub){
  if(!activeCoupon)return 0;
  let d=activeCoupon.type==='percent'?sub*(Number(activeCoupon.value)||0)/100:Number(activeCoupon.value)||0;
  if(Number(activeCoupon.maximum)>0)d=Math.min(d,Number(activeCoupon.maximum));
  return Math.min(sub,Math.round(d));
}
function renderCart(){
  const box=document.getElementById('cartItems');
  if(!cart.length){box.className='cart-items empty';box.textContent='No items added yet.'}
  else{
    box.className='cart-items';
    box.innerHTML=cart.map(i=>`<div class="cart-line"><div><strong>${i.name} × ${i.qty}</strong><small>${i.weight} • ₹${money(i.offer)} each</small></div><div><strong>₹${money(i.offer)*i.qty}</strong><button class="remove" onclick="removeItem('${i.id}')">✕</button></div></div>`).join('');
  }
  const sub=cart.reduce((s,i)=>s+money(i.offer)*i.qty,0);
  const disc=discountAmount(sub);
  document.getElementById('subtotal').textContent=sub;
  document.getElementById('discount').textContent=disc;
  document.getElementById('grandTotal').textContent=sub-disc;
}

document.getElementById('applyCoupon').addEventListener('click',()=>{
  const code=document.getElementById('couponCode').value.trim().toUpperCase();
  const msg=document.getElementById('couponMessage');
  const sub=cart.reduce((s,i)=>s+money(i.offer)*i.qty,0);
  const c=getCoupons().find(x=>x.code.toUpperCase()===code);
  if(!c||!c.active){activeCoupon=null;msg.textContent='Invalid or inactive coupon.';msg.className='error';renderCart();return}
  if(c.expiry && new Date(c.expiry+'T23:59:59')<new Date()){activeCoupon=null;msg.textContent='This coupon has expired.';msg.className='error';renderCart();return}
  if(sub<Number(c.minimum||0)){activeCoupon=null;msg.textContent=`Minimum order is ₹${c.minimum}.`;msg.className='error';renderCart();return}
  activeCoupon=c;msg.textContent=`Coupon ${c.code} applied.`;msg.className='success';renderCart();
});

document.getElementById('orderForm').addEventListener('submit',e=>{
  e.preventDefault();
  if(!cart.length){alert('Please add at least one product.');return}
  const sub=cart.reduce((s,i)=>s+money(i.offer)*i.qty,0);
  const disc=discountAmount(sub);
  const order={
    id:'SVP'+Date.now().toString().slice(-8),
    customerName:document.getElementById('customerName').value.trim(),
    phone:document.getElementById('phone').value.trim(),
    address:document.getElementById('address').value.trim(),
    payment:document.getElementById('payment').value,
    coupon:activeCoupon?activeCoupon.code:'',
    items:cart.map(x=>({...x})),
    subtotal:sub,discount:disc,total:sub-disc,
    status:'Pending',createdAt:new Date().toLocaleString()
  };
  const orders=getOrders();orders.unshift(order);saveOrders(orders);
  document.getElementById('orderMessage').textContent=`Order ${order.id} placed successfully.`;
  e.target.reset();cart=[];activeCoupon=null;renderCart();
  window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
});

renderProducts();renderCart();
