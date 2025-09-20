// ------------------ Constantes y selectores ------------------
const PRODUCTS_URL = './data/products.json';
const productsContainer = document.getElementById('products');
const searchInput = document.getElementById('searchInput');
const cartBtn = document.getElementById('cartBtn');
const cartPanel = document.getElementById('cartPanel');
const cartItemsContainer = document.getElementById('cartItems');
const cartCountEl = document.getElementById('cartCount');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const clearCartBtn = document.getElementById('clearCartBtn');

// ------------------ Estado ------------------
let PRODUCTS = [];
let cart = loadCartFromStorage();

// ------------------ Modelos ------------------
function createCartItem(productId, size, qty = 1) {
  return { productId, size, qty };
}

// ------------------ Persistencia ------------------
function saveCartToStorage() {
  localStorage.setItem('tf_cart_v1', JSON.stringify(cart));
}
function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem('tf_cart_v1');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// ------------------ Utilidades ------------------
function formatPrice(num) {
  return Number(num).toFixed(2);
}
function findProductById(id) {
  return PRODUCTS.find(p => p.id === Number(id));
}
function calculateCartTotal() {
  return cart.reduce((sum, item) => {
    const p = findProductById(item.productId);
    return p ? sum + (p.price * item.qty) : sum;
  }, 0);
}

// ------------------ Renderizado ------------------
function renderProducts(list) {
  productsContainer.innerHTML = '';
  if (list.length === 0) {
    productsContainer.innerHTML = '<p>No hay productos que coincidan.</p>';
    return;
  }
  list.forEach(product => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <img alt="${product.title}" src="${product.image}" loading="lazy">
      <h3>${product.title}</h3>
      <p>${product.brand}</p>
      <p>$${formatPrice(product.price)}</p>
      <div class="card-actions">
        <select aria-label="Seleccionar talle" class="size-select">
          <option value="">Talle</option>
          ${product.sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
        <button class="add-to-cart" data-id="${product.id}">Agregar</button>
        <button class="details" data-id="${product.id}">Ver</button>
      </div>
    `;
    productsContainer.appendChild(card);
  });
}

function renderCart() {
  cartItemsContainer.innerHTML = '';
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p>El carrito está vacío.</p>';
    cartCountEl.textContent = '0';
    cartTotalEl.textContent = formatPrice(0);
    return;
  }
  cart.forEach(item => {
    const p = findProductById(item.productId);
    if (!p) return;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${p.image}" alt="${p.title}" width="70">
      <div style="flex:1">
        <strong>${p.title}</strong>
        <div>Talle: ${item.size}</div>
        <div>$${formatPrice(p.price)} x ${item.qty} = $${formatPrice(p.price * item.qty)}</div>
      </div>
      <div class="qty-control">
        <button class="dec" data-id="${item.productId}" data-size="${item.size}">-</button>
        <span>${item.qty}</span>
        <button class="inc" data-id="${item.productId}" data-size="${item.size}">+</button>
        <button class="remove" data-id="${item.productId}" data-size="${item.size}">Eliminar</button>
      </div>
    `;
    cartItemsContainer.appendChild(div);
  });
  cartCountEl.textContent = cart.reduce((s, i) => s + i.qty, 0);
  cartTotalEl.textContent = formatPrice(calculateCartTotal());
}

// ------------------ Lógica carrito ------------------
function addToCart(productId, size, qty = 1) {
  if (!size) {
    Swal.fire({ icon: 'warning', text: 'Seleccione un talle antes de agregar.' });
    return;
  }
  const product = findProductById(productId);
  if (!product) {
    Swal.fire({ icon: 'error', text: 'Producto no encontrado.' });
    return;
  }
  const currentQtyInCart = cart.filter(c => c.productId === productId && c.size === size)
    .reduce((s, i) => s + i.qty, 0);
  if (currentQtyInCart + qty > product.stock) {
    Swal.fire({ icon: 'warning', text: 'No hay suficiente stock.' });
    return;
  }
  const existing = cart.find(c => c.productId === productId && c.size === size);
  existing ? existing.qty += qty : cart.push(createCartItem(productId, size, qty));
  saveCartToStorage();
  renderCart();
  Swal.fire({ position: 'top-end', icon: 'success', toast: true, title: 'Agregado al carrito', showConfirmButton: false, timer: 1200 });
}

function changeCartItem(productId, size, delta) {
  const idx = cart.findIndex(c => c.productId === productId && c.size === size);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCartToStorage();
  renderCart();
}

function removeCartItem(productId, size) {
  cart = cart.filter(c => !(c.productId === productId && c.size === size));
  saveCartToStorage();
  renderCart();
}

function clearCart() {
  cart = [];
  saveCartToStorage();
  renderCart();
}

// ------------------ Eventos ------------------
productsContainer.addEventListener('click', (e) => {
  const addBtn = e.target.closest('.add-to-cart');
  const detailsBtn = e.target.closest('.details');
  if (addBtn) {
    const id = Number(addBtn.dataset.id);
    const card = addBtn.closest('.product-card');
    const select = card.querySelector('.size-select');
    addToCart(id, select.value);
  } else if (detailsBtn) {
    openProductModal(Number(detailsBtn.dataset.id));
  }
});

cartItemsContainer.addEventListener('click', (e) => {
  const inc = e.target.closest('.inc');
  const dec = e.target.closest('.dec');
  const rem = e.target.closest('.remove');
  if (inc) changeCartItem(Number(inc.dataset.id), inc.dataset.size, +1);
  if (dec) changeCartItem(Number(dec.dataset.id), dec.dataset.size, -1);
  if (rem) removeCartItem(Number(rem.dataset.id), rem.dataset.size);
});

cartBtn.addEventListener('click', () => { 
  cartPanel.classList.toggle('hidden'); 
  renderCart(); 
});

clearCartBtn.addEventListener('click', () => {
  Swal.fire({ title: '¿Vaciar carrito?', showCancelButton: true, confirmButtonText: 'Sí, vaciar' })
    .then(result => { if (result.isConfirmed) clearCart(); });
});

// ------------------ Checkout con datos prellenados ------------------
checkoutBtn.addEventListener('click', async () => {
  if (cart.length === 0) {
    Swal.fire({ icon: 'info', text: 'El carrito está vacío.' });
    return;
  }

  const { value: formValues } = await Swal.fire({
    title: 'Datos de compra',
    html: `
      <input id="swal-name" class="swal2-input" placeholder="Nombre">
      <input id="swal-email" class="swal2-input" placeholder="Email">
      <input id="swal-addr" class="swal2-input" placeholder="Dirección">
    `,
    didOpen: () => {
      document.getElementById('swal-name').value = "Carola Castanheira";
      document.getElementById('swal-email').value = "carola@example.com";
      document.getElementById('swal-addr').value = "Calle Falsa 123";
    },
    preConfirm: () => ({
      name: document.getElementById('swal-name').value,
      email: document.getElementById('swal-email').value,
      addr: document.getElementById('swal-addr').value,
    })
  });

  if (!formValues) return;

  const order = {
    id: 'ORD-' + Date.now(),
    buyer: formValues,
    items: cart.map(c => ({ ...c })),
    total: calculateCartTotal(),
    date: new Date().toISOString()
  };

  order.items.forEach(it => {
    const p = findProductById(it.productId);
    if (p) p.stock = Math.max(0, p.stock - it.qty);
  });

  clearCart();
  renderProducts(PRODUCTS);

  Swal.fire({ 
    title: 'Compra realizada', 
    html: `<p>Orden: <b>${order.id}</b></p><p>Total: $${formatPrice(order.total)}</p>` 
  });
});

// ------------------ Búsqueda ------------------
searchInput.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const filtered = PRODUCTS.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  );
  renderProducts(filtered);
});

// ------------------ Modal ------------------
function openProductModal(productId) {
  const p = findProductById(productId);
  if (!p) return;
  Swal.fire({
    title: p.title,
    html: `
      <img src="${p.image}" alt="${p.title}" style="width:100%;height:auto;object-fit:contain;border-radius:6px;margin-bottom:.5rem">
      <p><strong>Marca:</strong> ${p.brand}</p>
      <p><strong>Precio:</strong> $${formatPrice(p.price)}</p>
      <p><strong>Stock:</strong> ${p.stock}</p>
      <p><strong>Talles:</strong> ${p.sizes.join(' - ')}</p>
    `,
    showCloseButton: true
  });
}

// ------------------ Inicialización ------------------
async function init() {
  try {
    const res = await fetch(PRODUCTS_URL);
    PRODUCTS = await res.json();
  } catch (e) {
    PRODUCTS = [{ id: 1, title: 'Remera fallback', brand: 'Fallback', price: 1000, sizes: ['S','M'], stock: 2, image: 'https://picsum.photos/seed/f1/600/400', category: 'Remeras' }];
  }
  renderProducts(PRODUCTS);
  renderCart();
}

init();
