import {
 db,auth,collection,addDoc,doc,updateDoc,deleteDoc,onSnapshot,query,orderBy,serverTimestamp,
 signInWithEmailAndPassword,signOut,onAuthStateChanged
} from "./firebase.js";

const $=s=>document.querySelector(s);const money=n=>`₹${Number(n||0).toLocaleString("en-IN")}`;
let products=[];

$("#loginForm").onsubmit=async e=>{
 e.preventDefault();const d=Object.fromEntries(new FormData(e.target).entries());
 try{await signInWithEmailAndPassword(auth,d.email,d.password);$("#loginMessage").textContent=""}
 catch(err){$("#loginMessage").textContent="Login failed. Enable Email/Password in Firebase Authentication and create the admin user."}
};
$("#logoutBtn").onclick=()=>signOut(auth);

onAuthStateChanged(auth,user=>{
 $("#loginView").classList.toggle("hidden",!!user);$("#adminView").classList.toggle("hidden",!user);
 if(user)startAdmin();
});

function startAdmin(){
 onSnapshot(query(collection(db,"products"),orderBy("createdAt","desc")),snap=>{
  products=snap.docs.map(d=>({id:d.id,...d.data()}));renderProducts();
 });
 onSnapshot(query(collection(db,"orders"),orderBy("createdAt","desc")),snap=>{
  const orders=snap.docs.map(d=>({id:d.id,...d.data()}));renderOrders(orders);
 });
}

function renderProducts(){
 $("#productRows").innerHTML=products.length?products.map(p=>`<tr>
 <td>${p.name||""}</td><td>${p.weight||""}</td><td>${money(p.mrp)}</td><td>${money(p.offerPrice)}</td><td>${p.inStock?"Yes":"No"}</td>
 <td><button class="small" onclick="editProduct('${p.id}')">Edit</button> <button class="small danger" onclick="removeProduct('${p.id}')">Delete</button></td></tr>`).join(""):`<tr><td colspan="6">No products yet.</td></tr>`;
}
window.editProduct=id=>{
 const p=products.find(x=>x.id===id);if(!p)return;const f=$("#productForm");
 for(const k of ["id","name","weight","mrp","offerPrice","imageUrl","description"])f.elements[k].value=p[k]??"";
 f.elements.inStock.value=String(p.inStock!==false);$("#formTitle").textContent="Edit Product";$("#cancelEdit").classList.remove("hidden");scrollTo({top:0,behavior:"smooth"});
};
window.removeProduct=async id=>{if(confirm("Delete this product?"))await deleteDoc(doc(db,"products",id))};

$("#productForm").onsubmit=async e=>{
 e.preventDefault();const f=e.target;const d=Object.fromEntries(new FormData(f).entries());
 const payload={name:d.name.trim(),weight:d.weight.trim(),mrp:Number(d.mrp),offerPrice:Number(d.offerPrice),imageUrl:d.imageUrl.trim(),description:d.description.trim(),inStock:d.inStock==="true",updatedAt:serverTimestamp()};
 try{
  if(d.id)await updateDoc(doc(db,"products",d.id),payload);
  else await addDoc(collection(db,"products"),{...payload,createdAt:serverTimestamp()});
  resetForm();
 }catch(err){alert("Could not save. Check Firestore rules and admin login.");console.error(err)}
};
$("#cancelEdit").onclick=resetForm;
function resetForm(){$("#productForm").reset();$("#productForm").elements.id.value="";$("#formTitle").textContent="Add Product";$("#cancelEdit").classList.add("hidden")}

function renderOrders(orders){
  $("#orderRows").innerHTML = orders.length ? orders.map(o => `
    <tr>
      <td>${o.id.slice(0,8).toUpperCase()}</td>
      <td>${o.customer?.name || ""}</td>
      <td>${o.customer?.phone || ""}</td>
      <td>${o.customer?.address || ""}, ${o.customer?.city || ""} - ${o.customer?.pincode || ""}</td>
      <td>${money(o.total)}</td>
      <td>${o.customer?.payment || ""}</td>
      <td>
        <select class="status" onchange="changeStatus('${o.id}',this.value)">
          <option ${o.status==="New"?"selected":""}>New</option>
          <option ${o.status==="Confirmed"?"selected":""}>Confirmed</option>
          <option ${o.status==="Packed"?"selected":""}>Packed</option>
          <option ${o.status==="Shipped"?"selected":""}>Shipped</option>
          <option ${o.status==="Delivered"?"selected":""}>Delivered</option>
          <option ${o.status==="Cancelled"?"selected":""}>Cancelled</option>
        </select>
      </td>
    </tr>
  `).join("") : '<tr><td colspan="7">No orders yet.</td></tr>';
}

