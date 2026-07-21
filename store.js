const DEFAULT_PRODUCTS = [
  {id:'p1',name:'Tomato Pickle',weight:'500 g',mrp:120,offer:90,image:'',stock:true},
  {id:'p2',name:'Mango Pickle',weight:'500 g',mrp:150,offer:120,image:'',stock:true},
  {id:'p3',name:'Lemon Pickle',weight:'500 g',mrp:130,offer:100,image:'',stock:true},
  {id:'p4',name:'Gongura Pickle',weight:'500 g',mrp:160,offer:130,image:'',stock:true}
];
const DEFAULT_COUPONS = [
  {id:'c1',code:'WELCOME10',type:'percent',value:10,minimum:200,maximum:100,expiry:'',active:true}
];

function getProducts(){
  const saved=localStorage.getItem('svp_products');
  if(!saved){localStorage.setItem('svp_products',JSON.stringify(DEFAULT_PRODUCTS));return [...DEFAULT_PRODUCTS]}
  return JSON.parse(saved);
}
function saveProducts(v){localStorage.setItem('svp_products',JSON.stringify(v))}
function getCoupons(){
  const saved=localStorage.getItem('svp_coupons');
  if(!saved){localStorage.setItem('svp_coupons',JSON.stringify(DEFAULT_COUPONS));return [...DEFAULT_COUPONS]}
  return JSON.parse(saved);
}
function saveCoupons(v){localStorage.setItem('svp_coupons',JSON.stringify(v))}
function getOrders(){return JSON.parse(localStorage.getItem('svp_orders')||'[]')}
function saveOrders(v){localStorage.setItem('svp_orders',JSON.stringify(v))}
function money(v){return Math.round(Number(v)||0)}
function placeholder(name){
  const text=encodeURIComponent(name);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#f4ddb5"/><text x="50%" y="48%" text-anchor="middle" font-family="Arial" font-size="42" fill="#7a2716">${name}</text><text x="50%" y="62%" text-anchor="middle" font-family="Arial" font-size="24" fill="#376127">Sree Veerabhadra Pickles</text></svg>`)}`;
}