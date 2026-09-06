const $ = (s) => document.querySelector(s);
const toast = $('#toast');
function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3200); }
function completeStep(step) { const el = document.querySelector(`.start-step[data-step="${step}"]`); if (!el) return; el.classList.add('done'); el.querySelector('b').textContent = '✓'; }

function setProduct(card) {
  document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  $('#listingTitle').textContent = card.dataset.title;
  $('#listingPrice').textContent = `$${card.dataset.price}`;
  $('#listingCopy').textContent = `${card.dataset.tag} — ready to turn attention into orders.`;
  $('#listingThumb').className = `listing-thumb ${card.querySelector('.card-image').classList[1]}`;
  $('#listingStatus').textContent = 'READY TO EXPORT';
  $('#sales').textContent = card.dataset.sales;
  $('#revenue').textContent = card.dataset.revenue;
  $('#growth').textContent = card.dataset.growth;
  $('#views').textContent = card.dataset.views;
  const scale = {"Mini Projector": [15,20,18,29,35,31,47,51,60,72,88,100], "Cooling Neck Fan": [12,19,16,22,31,39,46,54,63,72,81,94], "Cloud Slide": [23,18,28,33,29,38,44,51,58,66,73,82], "Glow Candle": [17,24,20,28,31,37,42,45,49,54,58,68]};
  $('#barChart').querySelectorAll('i').forEach((bar, index) => bar.style.height = `${scale[card.dataset.title][index]}%`);
}
document.querySelectorAll('.product-card').forEach(card => card.addEventListener('click', () => setProduct(card)));

let activeCard = null, startX, startY, originalX, originalY;
document.querySelectorAll('.draggable').forEach(card => {
  card.addEventListener('pointerdown', e => { activeCard = card; startX = e.clientX; startY = e.clientY; originalX = card.offsetLeft; originalY = card.offsetTop; card.setPointerCapture(e.pointerId); card.style.zIndex = 10; });
  card.addEventListener('pointermove', e => { if (!activeCard || activeCard !== card) return; card.style.left = `${originalX + e.clientX - startX}px`; card.style.top = `${originalY + e.clientY - startY}px`; card.style.transform = 'rotate(0deg)'; });
  card.addEventListener('pointerup', () => { if (activeCard === card) { activeCard = null; card.style.zIndex = ''; } });
});

function youtubeId(url) {
  try {
    const value = url.trim();
    if (!value) return null;
    const parsed = new URL(value);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).split('/')[0].slice(0, 11);
    if (parsed.hostname === 'youtube.com' || parsed.hostname === 'www.youtube.com' || parsed.hostname === 'm.youtube.com') {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v')?.slice(0, 11) || null;
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(parts[0])) return parts[1]?.slice(0, 11) || null;
    }
  } catch {}
  const match = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return match?.[1] || null;
}
function loadVideo() {
  const id = youtubeId($('#youtubeUrl').value.trim());
  if (!id) { $('#inputHelp').textContent = 'Please paste a valid YouTube video URL.'; $('#inputHelp').style.color = '#ff9ca0'; return; }
  const origin = /^https?:$/.test(location.protocol) ? `&origin=${encodeURIComponent(location.origin)}&widget_referrer=${encodeURIComponent(location.href)}` : '';
  $('#youtubeFrame').src = `https://www.youtube.com/embed/${id}?rel=0&playsinline=1${origin}`;
  $('#youtubeFrame').style.display = 'block'; $('#videoPlaceholder').style.display = 'none';
  $('#inputHelp').textContent = 'Video loaded. Your product story is ready.'; $('#inputHelp').style.color = '#c4ff63';
  $('#listingStatus').textContent = 'VIDEO ATTACHED';
  completeStep('video');
}
$('#loadVideo').addEventListener('click', loadVideo);
$('#youtubeUrl').addEventListener('keydown', e => { if (e.key === 'Enter') loadVideo(); });
function scrollToStudio(){ $('#how').scrollIntoView({behavior:'smooth'}); }
$('#startButton').addEventListener('click', scrollToStudio); $('#closingStart').addEventListener('click', scrollToStudio); $('#watchButton').addEventListener('click', scrollToStudio);
$('#copyListing').addEventListener('click', async () => { const text = `${$('#listingTitle').textContent}\n${$('#listingCopy').textContent}\nPrice: ${$('#listingPrice').textContent}`; try { await navigator.clipboard.writeText(text); showToast('Product details copied to your clipboard.'); } catch { showToast('Product details are ready to copy.'); } });
$('#shopifyButton').addEventListener('click', () => {
  const card = document.querySelector('.product-card.selected');
  if (card) { const portfolio = JSON.parse(localStorage.getItem('liftlyPortfolio') || '[]'); const item = {name:card.dataset.title, price:Number(card.dataset.price), score:Number(String(card.dataset.growth).replace(/[^0-9.-]/g,'')) || 82, orders:Number(String(card.dataset.sales).replace(/[^0-9.-]/g,'')) || 0, revenue:Number(String(card.dataset.revenue).replace(/[^0-9.-]/g,'')) || 0, savedAt:new Date().toISOString()}; if (!portfolio.some(x=>x.name===item.name)) { portfolio.push(item); localStorage.setItem('liftlyPortfolio', JSON.stringify(portfolio)); } }
  window.location.href = 'https://www.shopify.com/';
});
$('#navConnect').addEventListener('click', () => { window.location.href = 'https://www.shopify.com/'; });
$('#payoutButton').addEventListener('click', () => showToast('Payout details will appear after your Shopify store is connected.'));
document.querySelectorAll('.import-button').forEach(button => button.addEventListener('click', () => {
  const name = button.dataset.product;
  const portfolio = JSON.parse(localStorage.getItem('liftlyPortfolio') || '[]');
  if (!portfolio.some(item => item.name === name)) {
    portfolio.push({name, savedAt: new Date().toISOString()});
    localStorage.setItem('liftlyPortfolio', JSON.stringify(portfolio));
  }
  window.location.href = 'https://www.aliexpress.com/';
}));
document.querySelectorAll('.start-step').forEach(step => step.addEventListener('click', () => {
  const destination = step.dataset.step === 'video' ? '#how' : step.dataset.step === 'store' ? '#how' : '#catalog';
  document.querySelector(destination).scrollIntoView({behavior:'smooth'});
}));
const loginOverlay = $('#loginOverlay');
function closeLogin() { loginOverlay.classList.remove('open'); loginOverlay.setAttribute('aria-hidden', 'true'); }
$('#openLogin').addEventListener('click', () => { loginOverlay.classList.add('open'); loginOverlay.setAttribute('aria-hidden', 'false'); });
$('#closeLogin').addEventListener('click', closeLogin);
loginOverlay.addEventListener('click', event => { if (event.target === loginOverlay) closeLogin(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeLogin(); });
const providerHomes = { Google: 'https://www.google.com/', Apple: 'https://www.apple.com/', Facebook: 'https://www.facebook.com/', TikTok: 'https://www.tiktok.com/', X: 'https://x.com/' };
document.querySelectorAll('.social-login').forEach(button => button.addEventListener('click', () => { const url = providerHomes[button.dataset.provider]; if (url) window.location.href = url; }));
$('#emailLoginButton').addEventListener('click', async () => {
  const email = $('#emailLogin').value.trim();
  if (!email || !$('#emailLogin').checkValidity()) return showToast('Please enter a valid email address.');
  try { const response = await fetch('/api/auth/email', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email})}); const result = await response.json(); showToast(result.message || result.error); } catch { showToast('Your email sign-in link is ready to send.'); }
});
