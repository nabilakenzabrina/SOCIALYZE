/* SOCIALYZE — frontend connected to Django API. Cart is local; orders and consultations are saved in MySQL. */
const CONFIG = {
  instagramUrl: "https://www.instagram.com/USERNAME_KAMU/",
};
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const rupiah = amount => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
const CART_KEY = "socialyze_cart_v1";
let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); renderCart(); }
function renderCart() {
  $("#cartCount").textContent = cart.length;
  $("#cartText").textContent = cart.length ? cart.map(item => item.name).join(", ") : "Belum ada paket dipilih";
  const total = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const cartTotal = $("#cartTotal"); if (cartTotal) cartTotal.textContent = rupiah(total);
  const cartItems = $("#cartItems");
  if (cartItems) cartItems.innerHTML = cart.length ? cart.map((item, i) => `<div class="cart-item"><span><b>${escapeHtml(item.name)}</b><small>${rupiah(item.price)}</small></span><button type="button" class="cart-remove" data-remove-cart="${i}" aria-label="Hapus ${escapeHtml(item.name)}">🗑 Hapus</button></div>`).join("") : '<p class="cart-empty">Keranjang masih kosong. Pilih paket di atas untuk memulai.</p>';
  $("#summaryItems").innerHTML = cart.length ? cart.map((item, i) => `<div class="summary-line"><span>${escapeHtml(item.name)}</span><span>${rupiah(item.price)}</span></div>`).join("") : "<p>Belum ada paket.</p>";
  $("#summaryTotal").textContent = rupiah(total);
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
document.addEventListener("click", event => {
  const removeButton = event.target.closest("[data-remove-cart]");
  if (removeButton) { cart.splice(Number(removeButton.dataset.removeCart), 1); saveCart(); return; }
});
$("#clearCart")?.addEventListener("click", () => {
  if (!cart.length) return;
  if (confirm("Hapus semua layanan dari keranjang?")) { cart = []; saveCart(); }
});
$("#cancelCheckout")?.addEventListener("click", () => closeModal("checkoutModal"));

$$(".add-package").forEach(button => button.addEventListener("click", () => {
  cart.push({ name: button.dataset.package, price: Number(button.dataset.price) });
  saveCart();
  const oldText = button.innerHTML;
  button.innerHTML = "Ditambahkan ✓";
  setTimeout(() => button.innerHTML = oldText, 1200);
  $("#cartCount").animate?.([{ transform:"scale(1)" },{ transform:"scale(1.35)" },{ transform:"scale(1)" }], { duration:350 });
}));
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  const focusable = $("button, input, textarea, a", modal);
  setTimeout(() => focusable?.focus(), 50);
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  if (!$(".modal-backdrop.is-open")) document.body.classList.remove("modal-open");
}
$("#openCheckout").addEventListener("click", () => {
  if (!cart.length) {
    $("#packages").scrollIntoView({ behavior:"smooth" });
    $("#cartText").textContent = "Pilih paket di atas terlebih dahulu.";
    return;
  }
  renderCart();
  openModal("checkoutModal");
});
$$("[data-close]").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.close)));
$$(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", event => {
  if (event.target === backdrop) closeModal(backdrop.id);
}));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") $$(".modal-backdrop.is-open").forEach(modal => closeModal(modal.id));
});

$$(".filter-button").forEach(button => button.addEventListener("click", () => {
  $$(".filter-button").forEach(item => item.classList.toggle("active", item === button));
  const filter = button.dataset.filter;
  $$(".portfolio-item").forEach(item => item.hidden = filter !== "all" && item.dataset.category !== filter);
}));
$$(".portfolio-item").forEach(item => item.addEventListener("click", () => {
  $("#modalTitle").textContent = item.dataset.title;
  $("#modalDescription").textContent = item.dataset.description;
  const image = $("#modalImage");
  const cardImage = item.querySelector(".portfolio-image img");
  const imagePath = (cardImage && cardImage.getAttribute("src")) || item.dataset.image || "";
  image.alt = item.dataset.title || "Foto portfolio Socialyze";
  image.style.display = imagePath ? "block" : "none";
  image.onerror = () => { image.style.display = "none"; };
  if (imagePath) image.src = imagePath;
  openModal("portfolioModal");
}));

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}
async function postJSON(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal dikirim. Coba lagi.');
  return data;
}

$("#checkoutForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!cart.length) return;
  const form = new FormData(event.currentTarget);
  const payment = form.get("payment");
  if (!payment) { alert("Silakan pilih metode pembayaran."); return; }
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  const oldText = submitButton.textContent;
  submitButton.disabled = true; submitButton.textContent = 'Mengirim...';
  try {
    const order = await postJSON('/api/orders/', {
      name: form.get('name'), email: form.get('email'), phone: form.get('phone'),
      notes: form.get('notes'), payment, items: cart
    });
    closeModal("checkoutModal");
    $("#successMessage").textContent = `Terima kasih, ${order.name}. Permintaan pesanan berhasil disimpan. Tim Socialyze akan menghubungi kamu.`;
    $("#referenceId").textContent = order.id;
    openModal("successModal");
    cart = []; saveCart(); event.currentTarget.reset();
  } catch (error) { alert(error.message); }
  finally { submitButton.disabled = false; submitButton.textContent = oldText; }
});

$("#openConsultation").addEventListener("click", () => openModal("consultationModal"));
$("#consultationForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  const oldText = submitButton.textContent;
  submitButton.disabled = true; submitButton.textContent = 'Mengirim...';
  try {
    const request = await postJSON('/api/consultations/', {
      name: form.get('name'), email: form.get('email'), service: form.get('service'),
      budget: form.get('budget'), brief: form.get('brief')
    });
    event.currentTarget.reset(); closeModal("consultationModal");
    $("#successMessage").textContent = `Terima kasih, ${request.name}. Permintaan konsultasi berhasil disimpan. Tim Socialyze akan menghubungi kamu.`;
    $("#referenceId").textContent = request.id; openModal("successModal");
  } catch (error) { alert(error.message); }
  finally { submitButton.disabled = false; submitButton.textContent = oldText; }
});

const menuToggle = $("#menuToggle");
menuToggle.addEventListener("click", () => {
  const nav = $("#mainNav");
  const opened = nav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(opened));
  menuToggle.textContent = opened ? "×" : "☰";
});
$$(".nav a").forEach(link => link.addEventListener("click", () => {
  $("#mainNav").classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.textContent = "☰";
}));

const revealObserver = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 }) : null;
$$(".reveal").forEach(item => revealObserver ? revealObserver.observe(item) : item.classList.add("visible"));

$("#year").textContent = new Date().getFullYear();
$("#instagramLink").href = CONFIG.instagramUrl;

renderCart();


// Footer CTA reuses the existing in-page consultation action.
const footerConsultation = document.getElementById('footerConsultation');
if (footerConsultation) footerConsultation.addEventListener('click', () => document.getElementById('openConsultation')?.click());


/* Guided, app-like steps for consultation and service ordering */
(function initGuidedFlows(){
  function makeProgress(form, count){
    const bar=document.createElement('div'); bar.className='flow-progress'; bar.setAttribute('aria-label','Progress proses');
    for(let i=0;i<count;i++){const s=document.createElement('span'); if(i===0)s.classList.add('active'); bar.appendChild(s);}
    form.parentNode.insertBefore(bar,form);
    return bar;
  }
  function addStepControls(step, index, count, onBack, onNext, lastLabel){
    const actions=document.createElement('div'); actions.className='flow-actions';
    if(index>0){const back=document.createElement('button');back.type='button';back.className='button button-cancel';back.textContent='← Kembali';back.addEventListener('click',onBack);actions.appendChild(back);}
    const next=document.createElement('button');next.type='button';next.className='button button-lime';next.textContent=index===count-1?lastLabel:'Lanjutkan →';next.addEventListener('click',onNext);actions.appendChild(next);
    step.appendChild(actions);
  }
  function setupWizard(form, groups, progress, finalLabel, beforeFinish){
    if(!form || form.dataset.wizardReady) return;
    form.dataset.wizardReady='1';
    const steps=[];
    groups.forEach((nodes,i)=>{
      const step=document.createElement('section');step.className='flow-step';step.hidden=i!==0;
      const label=document.createElement('p');label.className='flow-step-label';label.textContent=`LANGKAH 0${i+1} / 0${groups.length}`;
      step.appendChild(label);
      nodes.forEach(node=>step.appendChild(node));
      form.insertBefore(step,form.firstChild); steps.push(step);
    });
    const bar=makeProgress(form,steps.length);
    let current=0;
    function show(n){current=n;steps.forEach((s,i)=>s.hidden=i!==n);[...bar.children].forEach((s,i)=>s.classList.toggle('active',i<=n));bar.setAttribute('aria-valuenow',String(n+1));form.closest('.modal')?.scrollTo({top:0,behavior:'smooth'});}
    steps.forEach((step,i)=>addStepControls(step,i,steps.length,()=>show(i-1),()=>{
      const required=[...step.querySelectorAll('input[required],select[required],textarea[required]')];
      for(const field of required){if(!field.checkValidity()){field.reportValidity();return;}}
      if(i===steps.length-1){if(beforeFinish)beforeFinish();const submit=form.querySelector('button[type="submit"]');if(submit)submit.click();else form.requestSubmit();}
      else show(i+1);
    },finalLabel));
    form.addEventListener('submit',e=>{if(current!==steps.length-1){e.preventDefault();show(current);}});
  }
  const consult=document.querySelector('#consultationForm');
  if(consult){
    const grid=consult.querySelector('.consultation-form-grid');
    const labels=[...grid.querySelectorAll(':scope > label')];
    const disclaimer=consult.querySelector('.summary-disclaimer');
    const submit=consult.querySelector('button[type="submit"]');
    const groups=[labels.slice(0,2),labels.slice(2,4),labels.slice(4)];
    setupWizard(consult,groups,null,'Kirim permintaan ↗');
    // Keep final submission controls on the final step.
    const finalStep=consult.querySelectorAll('.flow-step')[2];
    if(disclaimer)finalStep.appendChild(disclaimer);
    if(submit)finalStep.appendChild(submit);
  }
  const checkout=document.querySelector('#checkoutForm');
  if(checkout){
    const fields=checkout.querySelector('.form-fields');
    const labels=[...fields.children];
    const layout=checkout.querySelector('.checkout-layout');
    const aside=checkout.querySelector('.order-summary');
    const groups=[labels.slice(0,3),labels.slice(3,4),labels.slice(4)];
    setupWizard(checkout,groups,null,'Buat permintaan ↗');
    // Move summary into a final review step, so order details are confirmed at the end.
    const steps=[...checkout.querySelectorAll('.flow-step')];
    if(aside){steps[2].appendChild(aside);}
    // The checkout layout is only a structural wrapper after the fields are distributed.
    checkout.querySelectorAll('.flow-step').forEach(step=>{step.style.maxWidth='1180px';});
  }
})();
