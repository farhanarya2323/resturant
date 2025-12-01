// Frontend-only logic: products, cart, orders stored in localStorage
const STORAGE_PRODUCTS = 'rfx_products_v1';
const STORAGE_CART = 'rfx_cart_v1';
const STORAGE_ORDERS = 'rfx_orders_v1';

document.getElementById('year')?.textContent = new Date().getFullYear();
document.getElementById('year2')?.textContent = new Date().getFullYear();
document.getElementById('year3')?.textContent = new Date().getFullYear();

// default sample products (only if none exist)
function seedIfEmpty(){
  if(!localStorage.getItem(STORAGE_PRODUCTS)){
    const sample = [
      { _id: id(), name: "Paneer Butter Masala", description: "Creamy spicy paneer", price: 220, image:"https://i.imgur.com/0KFBHTB.jpeg", createdAt: Date.now() },
      { _id: id(), name: "Margherita Pizza", description: "Cheesy classic", price: 299, image:"https://i.imgur.com/6X5d7sH.jpeg", createdAt: Date.now() },
      { _id: id(), name: "Veg Biryani", description: "Aromatic basmati rice", price: 180, image:"https://i.imgur.com/4YQ1QvK.jpeg", createdAt: Date.now() }
    ];
    localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(sample));
  }
}
seedIfEmpty();

function id(){ return 'p_'+Math.random().toString(36).slice(2,9); }

// helpers to get/update storage
function getProducts(){ return JSON.parse(localStorage.getItem(STORAGE_PRODUCTS) || '[]'); }
function saveProducts(arr){ localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(arr)); }
function getCart(){ return JSON.parse(localStorage.getItem(STORAGE_CART) || '[]'); }
function saveCart(arr){ localStorage.setItem(STORAGE_CART, JSON.stringify(arr)); }
function getOrders(){ return JSON.parse(localStorage.getItem(STORAGE_ORDERS) || '[]'); }
function saveOrders(arr){ localStorage.setItem(STORAGE_ORDERS, JSON.stringify(arr)); }

// update cart count in nav
function updateCartCount(){
  const c = getCart().length;
  const el = document.getElementById('cartCount');
  if(el) el.innerText = c;
}
updateCartCount();

// page specific logic
const page = window.page || 'home';

// render product card (used in multiple places)
function productCardHTML(p){
  return `
    <div class="card">
      <img src="${escape(p.image) || 'https://via.placeholder.com/400x300?text=No+Image'}" alt="${escape(p.name)}">
      <h4>${escape(p.name)} <span class="muted">₹${p.price}</span></h4>
      <p class="muted">${escape(p.description||'')}</p>
      <div class="row">
        <button class="btn-primary" onclick="addToCart('${p._id}')">Add to Cart</button>
        <button class="btn-ghost" onclick="viewProduct('${p._id}')">View</button>
      </div>
    </div>
  `;
}
function escape(s){ return (s||'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// HOME / MENU
if(page === 'home'){
  const itemsEl = document.getElementById('items');
  const noItems = document.getElementById('noItems');
  function loadHome(){
    const prod = getProducts();
    if(prod.length === 0){ noItems.style.display='block'; itemsEl.innerHTML=''; return; }
    noItems.style.display='none';
    itemsEl.innerHTML = prod.map(productCardHTML).join('');
  }
  loadHome();

  // expose for admin actions to reload when products change
  window.refreshHome = loadHome;
}

// CART page
if(page === 'cart'){
  const cartEl = document.getElementById('cartItems');
  const cartEmpty = document.getElementById('cartEmpty');
  const totalText = document.getElementById('totalText');
  const orderMsg = document.getElementById('orderMsg');
  const placeBtn = document.getElementById('placeOrderBtn');

  function loadCartPage(){
    const cart = getCart();
    if(cart.length === 0){ cartEmpty.style.display='block'; cartEl.innerHTML=''; totalText.innerText='Total: ₹0'; return; }
    cartEmpty.style.display='none';
    const prods = getProducts();
    let total = 0;
    cartEl.innerHTML = cart.map((pid, idx) => {
      const p = prods.find(x => x._id === pid);
      if(!p) return '';
      total += Number(p.price || 0);
      return `<div class="cart-item">
        <img src="${escape(p.image)}">
        <div style="flex:1"><strong>${escape(p.name)}</strong><div class="muted" style="margin-top:6px">${escape(p.description||'')}</div></div>
        <div>₹${p.price}</div>
        <div><button class="btn-ghost" onclick="removeFromCart(${idx})">Remove</button></div>
      </div>`;
    }).join('');
    totalText.innerText = 'Total: ₹' + total;
  }
  loadCartPage();

  placeBtn.addEventListener('click', ()=>{
    const cart = getCart();
    if(cart.length === 0) return alert('Cart khaali hai');
    // ask for minimal details
    const name = prompt('Full name for delivery:');
    if(!name) return alert('Name required');
    const phone = prompt('Phone number:');
    if(!phone) return alert('Phone required');
    const address = prompt('Delivery address:');
    if(!address) return alert('Address required');

    const order = {
      id: 'o_'+Date.now(),
      items: cart,
      name, phone, address,
      payment: 'COD',
      status: 'Pending',
      createdAt: Date.now()
    };
    const orders = getOrders();
    orders.unshift(order);
    saveOrders(orders);
    saveCart([]); // clear cart
    updateCartCount();
    loadCartPage();
    orderMsg.innerText = 'Order placed (Cash on Delivery). Order ID: ' + order.id;
    // for admin view reload
    window.refreshAdmin && window.refreshAdmin();
  });

  window.removeFromCart = function(idx){
    const c = getCart();
    c.splice(idx,1);
    saveCart(c);
    updateCartCount();
    loadCartPage();
  };
}

// ADMIN page
if(page === 'admin'){
  const form = document.getElementById('productForm');
  const adminItems = document.getElementById('adminItems');
  const noAdmin = document.getElementById('noAdminItems');
  const ordersList = document.getElementById('ordersList');
  const noOrders = document.getElementById('noOrders');

  function loadAdmin(){
    const p = getProducts();
    if(p.length === 0){ adminItems.innerHTML=''; noAdmin.style.display='block'; } else {
      noAdmin.style.display='none';
      adminItems.innerHTML = p.map(prod => {
        return `<div class="card">
          <img src="${escape(prod.image)}" alt="">
          <h4>${escape(prod.name)} <span class="muted">₹${prod.price}</span></h4>
          <p class="muted">${escape(prod.description||'')}</p>
          <div class="row">
            <button class="btn-primary" onclick="editProduct('${prod._id}')">Edit</button>
            <button class="btn-ghost" onclick="deleteProduct('${prod._id}')">Delete</button>
          </div>
        </div>`;
      }).join('');
    }

    const ord = getOrders();
    if(ord.length === 0){ ordersList.innerHTML=''; noOrders.style.display='block'; } else {
      noOrders.style.display='none';
      ordersList.innerHTML = ord.map(o => {
        const itemsText = (o.items || []).map(id => {
          const prod = getProducts().find(p=>p._id===id);
          return prod ? prod.name : 'Unknown';
        }).join(', ');
        return `<div class="card" style="padding:10px;">
          <strong>Order ${o.id}</strong> <div class="muted">${new Date(o.createdAt).toLocaleString()}</div>
          <div class="muted">Name: ${escape(o.name)} • ${escape(o.phone)}</div>
          <div class="muted">Items: ${escape(itemsText)}</div>
          <div style="margin-top:8px">Status: ${escape(o.status)} 
            <button class="btn-primary" onclick="updateOrderStatus('${o.id}','Preparing')">Preparing</button>
            <button class="btn-primary" onclick="updateOrderStatus('${o.id}','Delivered')">Delivered</button>
          </div>
        </div>`;
      }).join('');
    }
  }
  loadAdmin();
  window.refreshAdmin = loadAdmin;

  // add / edit
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const idVal = document.getElementById('prodId').value;
    const name = document.getElementById('name').value.trim();
    const desc = document.getElementById('description').value.trim();
    const price = Number(document.getElementById('price').value || 0);
    const image = document.getElementById('image').value.trim();

    if(!name || !price){ alert('Name and price required'); return; }

    const products = getProducts();
    if(idVal){
      // update
      const idx = products.findIndex(x=>x._id===idVal);
      if(idx>-1){
        products[idx].name = name;
        products[idx].description = desc;
        products[idx].price = price;
        products[idx].image = image;
        saveProducts(products);
        alert('Updated');
      }
    } else {
      // add
      const newP = { _id: id(), name, description: desc, price, image, createdAt: Date.now() };
      products.unshift(newP);
      saveProducts(products);
      alert('Product added');
    }
    form.reset();
    document.getElementById('prodId').value = '';
    loadAdmin();
    window.refreshHome && window.refreshHome();
  });

  window.editProduct = function(pid){
    const prod = getProducts().find(p=>p._id===pid);
    if(!prod) return alert('Product not found');
    document.getElementById('prodId').value = prod._id;
    document.getElementById('name').value = prod.name;
    document.getElementById('description').value = prod.description || '';
    document.getElementById('price').value = prod.price;
    document.getElementById('image').value = prod.image || '';
    window.scrollTo({top:0,behavior:'smooth'});
  };

  window.deleteProduct = function(pid){
    if(!confirm('Confirm delete?')) return;
    let arr = getProducts().filter(p=>p._id!==pid);
    saveProducts(arr);
    loadAdmin();
    window.refreshHome && window.refreshHome();
  };

  window.updateOrderStatus = function(oid, status){
    const ord = getOrders();
    const i = ord.findIndex(o=>o.id===oid);
    if(i>-1){ ord[i].status = status; saveOrders(ord); loadAdmin(); alert('Status updated'); }
  };

  document.getElementById('clearBtn').addEventListener('click', ()=>{
    form.reset(); document.getElementById('prodId').value='';
  });
}

// helper functions used by pages
window.addToCart = function(pid){
  const cart = getCart();
  cart.push(pid);
  saveCart(cart);
  updateCartCount();
  alert('Added to cart');
};

window.viewProduct = function(pid){
  alert('Product view (feature) — For now use menu and cart.'); // simple placeholder
};

// allow home/admin reload from other pages
window.refreshHome && window.refreshHome();
window.refreshAdmin && window.refreshAdmin();
