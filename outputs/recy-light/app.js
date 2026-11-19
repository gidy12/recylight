let PRODUCTS = [];

async function loadProductsFromAPI(){return window.RecyLightCatalog?.load()}
async function loadCategoriesFromAPI(){return window.RecyLightCatalog?.loadCategories()}
async function initAPI(){return window.RecyLightCatalog?.load()}
const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const fmt = n => `RWF ${Number(n).toLocaleString('en-US')}`;
const $ = s => document.querySelector(s);
let selectedCategory='All', query='', sort='featured', cart=loadCart(), toastTimer, pendingOrder=false, pendingWhatsAppOrder=false, accountMode='register', currentUser=null, inviteToken='';

function loadCart(){try{return JSON.parse(localStorage.getItem('recylight-cart')||'{}')}catch{return {}}}
function saveCart(){try{localStorage.setItem('recylight-cart',JSON.stringify(cart))}catch{}}

function filteredProducts(){
  let list=PRODUCTS.filter(p=>(selectedCategory==='All'||p.category===selectedCategory)&&`${p.name} ${p.category} ${p.brand||''} ${p.description}`.toLowerCase().includes(query.toLowerCase()));
  if(sort==='low')list.sort((a,b)=>a.price-b.price);
  if(sort==='high')list.sort((a,b)=>b.price-a.price);
  if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name));
  return list;
}

function renderProducts(){
  const list=filteredProducts();
  const grid=$('#product-grid');
  $('#result-count').textContent=`${list.length} ${list.length===1?'item':'items'}`;
  $('#empty-state').hidden=!!list.length;
  grid.innerHTML=list.map(p=>`<article class="product-card"><div class="product-image">${p.badge?`<span class="product-badge">${escapeHtml(p.badge)}</span>`:''}<img loading="lazy" src="${p.image}" alt="${escapeHtml(p.alt)}" onerror="this.style.display='none';this.parentElement.classList.add('image-fallback')"></div><div class="product-details"><span class="product-category">${escapeHtml(p.category)}${p.brand?` · ${escapeHtml(p.brand)}`:''}</span><h3 class="product-title">${escapeHtml(p.name)}</h3><div class="product-price">${fmt(p.price)} ${p.was?`<del>${fmt(p.was)}</del>`:''}</div><div class="product-stock ${p.stock?'':'out'"><span class="stock-dot" aria-hidden="true"></span>${p.stock?`${p.stock} left · In stock`:'Out of stock'}</div><button class="product-detail-link" data-details="${escapeHtml(p.id)}" type="button">View details →</button><div class="product-actions"><button class="cart-icon-add" data-add="${p.id}" aria-label="Add ${escapeHtml(p.name)} to cart" ${p.stock?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg></button><button class="buy-now" data-buy="${p.id}" ${p.stock?'':'disabled'}><span aria-hidden="true">ϟ</span> Buy</button></div></div></article>`).join('');
  grid.querySelectorAll('[data-details]').forEach(b=>b.addEventListener('click',()=>openProductDetails(b.dataset.details)));
  grid.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>addToCart(b.dataset.add)));
  grid.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>{addToCart(b.dataset.buy);requestOrder()}));
}

let activeDetailProduct=null;
function openProductDetails(id){
  const product=PRODUCTS.find(item=>String(item.id)===String(id));
  if(!product)return;
  activeDetailProduct=product;
  $('#detail-image').style.visibility='visible';
  $('#detail-image').onerror=()=>{$('#detail-image').style.visibility='hidden'};
  $('#detail-image').src=product.image||'';
  $('#detail-image').alt=product.alt||product.name;
  $('#detail-category').textContent=product.brand?`${product.category} · ${product.brand}`:product.category;
  $('#detail-name').textContent=product.name;
  $('#detail-price').textContent=fmt(product.price);
  $('#detail-description').textContent=product.description||'Product details will be confirmed by RecyLight.';
}
function addToCart(productId){
function accountMessage(message){
  const translate=window.translateStoreText||((text)=>text);
  $('#account-feedback').textContent=translate(message);
}
function syncAccountToCheckout(user){
  const metadata=user?.userMetadata||user?.user_metadata||{};
  if(user?.email)$('#checkout-form').elements.email.value=user.email;
  if(metadata.full_name)$('#checkout-form').elements.name.value=metadata.full_name;
}
  const product=PRODUCTS.find(p=>p.id===productId);
  if(!product||!product.stock)return;
  cart[productId]=(cart[productId]||0)+1;
async function handleAccountSubmit(event){
  event.preventDefault();
  const form=event.currentTarget;
  if(!form.reportValidity())return;
  const auth=window.RecyLightAuth;
  if(!auth){accountMessage(window.RecyLightAuthError||'Account sign-in is loading. Please try again in a moment.');return}
  const submit=$('#account-submit');
  submit.disabled=true;
  accountMessage('');
  try{
    const email=$('#account-email').value.trim(),password=$('#account-password').value,name=$('#account-name').value.trim();
    let user;
    if(accountMode==='register'){
      await auth.signup(email,password,{full_name:name});
      user=await auth.getUser();
      if(!user){accountMessage('Check your email to confirm your account, then log in.');return}
    }else if(accountMode==='login'){
      user=await auth.login(email,password)
    }else if(accountMode==='reset'){
      user=await auth.updateUser({password})
    }else if(accountMode==='invite'){
      user=await auth.acceptInvite(inviteToken,password);inviteToken=''
    }
    currentUser=user||await auth.getUser();
    if(!currentUser)throw new Error('The account could not be loaded. Please log in and try again.');
async function logoutUser(){
  try{
    if(!window.RecyLightAuth)throw new Error(window.RecyLightAuthError||'Sign-in is not ready yet. Please try again.');
    await window.RecyLightAuth.logout();
    currentUser=null;
    renderAccountControl();
    $('#account-dialog').close();
  }catch(error){if($('#account-dialog').open)accountMessage(error.message);else showToast(error.message||'Log out failed. Please try again.')}
}
function requestOrder(){if(currentUser){openCheckout();return}pendingOrder=true;openAccount('register')}
function openCheckout(){
  $('#cart-dialog').close();
  $('#checkout-dialog').showModal();
}
function openAccount(mode='register'){
function openCheckout(){
  $('#cart-dialog').close();
  $('#checkout-dialog').showModal();
}
function openAccount(mode='register'){
  accountMode=mode;
  $('#account-title').textContent=mode==='register'?'Create account':'Log in';
  $('#account-form').reset();
  $('#account-dialog').showModal();
}
function openAccountDialog(){
  openAccount();
}
$('#account-dialog').addEventListener('click',event=>{if(e.target===$('#account-dialog'))$('#account-dialog').close()});
$('#account-form').addEventListener('submit',handleAccountSubmit);
$('#profile-save').addEventListener('click',saveAccountProfile);
$('#profile-logout').addEventListener('click',logoutUser);
$('#cart-close').onclick=closeCart;
$('#overlay').onclick=closeCart;
$('#continue-shopping').onclick=closeCart;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#cart-drawer').hidden)closeCart()});
$('.checkout-open').onclick=()=>{closeCart();requestOrder()};
$('#checkout-close').onclick=()=>$('#checkout-dialog').close();
$('#checkout-dialog').addEventListener('click',e=>{if(e.target===$('#checkout-dialog'))$('#checkout-dialog').close()});
$('#checkout-form').addEventListener('submit',e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const feedback=$('#form-feedback');
  const btn=form.querySelector('button[type="submit"]');
  feedback.textContent='';
  btn.disabled=true;
  try{
    const fd=new FormData(form);
    const orderData={name:fd.get('name'),phone:fd.get('phone'),email:fd.get('email')||undefined,address:fd.get('address'),payment_method:fd.get('payment')||'Pay on delivery',instructions:fd.get('instructions')||undefined,items:cartLines().map(({p,qty})=>({product_id:p.id,product_name:p.name,quantity:qty,unit_price:p.price})),subtotal:cartTotal()};
    const order=window.RecyLightAPI.createOrder(orderData);
    feedback.textContent='Order submitted — a team member will confirm availability, prices, and delivery.';
    feedback.style.color='#1a7a1a';
    Object.keys(cart).forEach(k=>delete cart[k]);
    updateCart();
    setTimeout(()=>$('#checkout-dialog').close(),1500);
  }catch(error){feedback.textContent=error.message||'Could not submit order. Please try again.';feedback.style.color='#c00'}
  finally{btn.disabled=false}
});
initAPI().catch(()=>{/* API not reachable — local fixture and cart continue to work offline. */});
  accountMode=mode;
  $('#account-title').textContent=mode==='register'?'Create account':'Log in';
  $('#account-title').nextElementSibling?.textContent||$('#account-intro').textContent;
  $('#account-form').reset();
  $('#account-dialog').showModal();
}
    syncAccountToCheckout(currentUser);
    renderAccountControl();
    const continueOrder=pendingOrder,continueWhatsApp=pendingWhatsAppOrder;
    pendingOrder=false;pendingWhatsAppOrder=false;
    $('#account-dialog').close();
    if(continueOrder)openCheckout();
    if(continueWhatsApp)sendWhatsAppOrder();
  }catch(error){accountMessage(error?.message||'We could not complete sign-in. Please check your details and try again.')}
  finally{submit.disabled=false}}
async function saveAccountProfile(){
  const button=$('#profile-save');
  button.disabled=true;
  $('#profile-feedback').textContent='';
  try{
    const user=await window.RecyLightAuth.updateUser({data:{full_name:$('#profile-name').value.trim()}});
    currentUser=user||await window.RecyLightAuth.getUser();
    const metadata=currentUser?.userMetadata||currentUser?.user_metadata||{};
    $('#profile-name').value=metadata.full_name||$('#profile-name').value.trim();
    renderAccountControl();
    $('#profile-feedback').textContent='Profile saved.';
  }catch(error){$('#profile-feedback').textContent=error?.message||'Could not save your profile.';}
  finally{button.disabled=false}}
  saveCart(); renderCart(); renderProducts();
}
function removeFromCart(productId){delete cart[productId];saveCart();renderCart();renderProducts();}
function changeQty(productId,delta){cart[productId]=Math.max(0,(cart[productId]||0)+delta);if(!cart[productId])delete cart[productId];saveCart();renderCart();renderProducts();}
function cartLines(){return Object.entries(cart).map(([id,qty])=>({p:PRODUCTS.find(item=>item.id===id),qty}))}
function cartTotal(){return cartLines().reduce((t,{p,qty})=>t+p.price*qty,0)}
function openCart(){renderCart();$('#overlay').hidden=false;$('#cart-drawer').hidden=false;document.body.style.overflow='hidden';$('#cart-close').focus()}
function closeCart(){$('#overlay').hidden=true;$('#cart-drawer').hidden=true;document.body.style.overflow='';$('#cart-open')?.focus()}
function renderCart(){
  const list=cartLines();
  const container=$('#cart-items');
  container.innerHTML=list.length?list.map(({p,qty})=>
    `<div class="cart-item"><div class="cart-item-image"><img loading="lazy" src="${p.image}" alt="${escapeHtml(p.alt)}"></div><div class="cart-item-details"><div class="cart-item-name">${escapeHtml(p.name)}${p.brand?` · ${escapeHtml(p.brand)}`:''}</div><div class="cart-item-price">${fmt(p.price)}</div><div class="cart-item-qty"><button type="button" aria-label="Decrease ${escapeHtml(p.name)}" onclick="changeQty('${p.id}',-1)">−</button><span>${qty}</span><button type="button" aria-label="Increase ${escapeHtml(p.name)}" onclick="changeQty('${p.id}',1)">+</button></div></div><button class="cart-item-remove" aria-label="Remove ${escapeHtml(p.name)}" onclick="removeFromCart('${p.id}')">×</button></div>`
  ).join(''):`<div class="cart-empty"><span>🛒</span><h3>Your cart is empty</h3><p>Browse our products and add items to get started.</p></div>`;
  $('#cart-total').textContent=fmt(cartTotal());
}