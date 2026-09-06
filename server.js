const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
const initialData = {
  dashboard: { storeName:'Northstar Goods', netSales:12480, orders:186, conversion:3.8, profit:4990, payout:2180.40 },
  queue: [],
  users: [
    {id:'alex-chen', name:'Alex Chen', email:'alex@northstargoods.com', plan:'Growth', revenue:12480, views:6800000, purchases:186, status:'Active'},
    {id:'maya-singh', name:'Maya Singh', email:'maya@oceanroom.com', plan:'Starter', revenue:4360, views:1200000, purchases:73, status:'Active'},
    {id:'jordan-lee', name:'Jordan Lee', email:'jordan@northmarket.com', plan:'Growth', revenue:21890, views:9100000, purchases:312, status:'Active'}
  ],
  accessRequests: [
    {id:'request-sam-rivera', name:'Sam Rivera', email:'sam@rivera.store', requestedAt:'2026-09-05T09:30:00.000Z', status:'pending'}
  ],
  plans: [{id:'starter', name:'Starter', price:25, description:'For getting started with Liftly.', features:['25 product saves','Basic sales signals','CSV exports']},{id:'growth', name:'Growth', price:100, description:'For sellers ready to move faster.', features:['Unlimited product saves','Viral product intel','Store performance']},{id:'pro', name:'Pro', price:250, description:'For growing stores and serious testing.', features:['Everything in Growth','Advanced analytics','Priority support']},{id:'business', name:'Business', price:500, description:'For teams running multiple stores.', features:['Multi-store workspace','Team access','Advanced automation']},{id:'scale', name:'Scale', price:1000, description:'For high-volume ecommerce operations.', features:['Everything in Business','Dedicated support','Enterprise workflows']}],
  products: [
    {id:'magnetic-phone-mount', title:'Magnetic Phone Mount', cost:3.82, rating:4.8, supplierOrders:'2,000+'},
    {id:'pet-hair-remover', title:'Pet Hair Remover', cost:4.25, rating:4.9, supplierOrders:'1,000+'},
    {id:'portable-blender', title:'Portable Blender', cost:8.90, rating:4.7, supplierOrders:'500+'}
  ]
};

function data() { if (!fs.existsSync(DATA_FILE)) { fs.mkdirSync(DATA_DIR, {recursive:true}); fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2)); } return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function save(value) { fs.mkdirSync(DATA_DIR, {recursive:true}); fs.writeFileSync(DATA_FILE, JSON.stringify(value, null, 2)); }
function send(res, status, payload, headers={}) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type', 'Access-Control-Allow-Methods':'GET,POST,OPTIONS', ...headers}); res.end(JSON.stringify(payload)); }
function readBody(req) { return new Promise((resolve, reject) => { let body=''; req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); }); req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON body')); } }); }); }
function csvCell(value) { return `"${String(value).replace(/"/g, '""')}"`; }
function serveFile(res, pathname) {
  const file = pathname === '/' ? path.join(ROOT, 'index.html') : path.resolve(ROOT, `.${pathname}`);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, {error:'Not found'});
  res.writeHead(200, {'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Referrer-Policy':'strict-origin-when-cross-origin'}); fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}); return res.end(); }
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/dashboard') return send(res, 200, data().dashboard);
    if (req.method === 'POST' && url.pathname === '/api/research/import') {
      const body = await readBody(req); const store = data();
      const product = {id: crypto.randomUUID(), title:String(body.title||'Untitled product').slice(0,180), cost:Number(body.price)||0, rating:Number(body.rating)||0, supplierOrders:String(body.orders||''), image:String(body.image||''), sourceUrl:String(body.url||''), score:Number(body.score)||0, description:String(body.description||'').slice(0,1000), importedAt:new Date().toISOString()};
      store.products = store.products || []; store.products.unshift(product); save(store);
      return send(res, 201, {message:'Product saved to Liftly.', product});
    }
    if (req.method === 'GET' && url.pathname === '/api/products') return send(res, 200, data().products || []);
    if (req.method === 'DELETE' && /^\/api\/products\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split('/')[3]; const store = data(); const before = (store.products || []).length;
      store.products = (store.products || []).filter(p => p.id !== id);
      if (store.products.length === before) return send(res, 404, {error:'Product not found.'});
      store.queue = (store.queue || []).filter(p => p.id !== id); save(store); return send(res, 200, {message:'Product removed.'});
    }
    if (req.method === 'PUT' && /^\/api\/products\/[^/]+$/.test(url.pathname)) {
      const id = url.pathname.split('/')[3]; const body = await readBody(req); const store = data();
      const product = (store.products || []).find(p => p.id === id); if (!product) return send(res, 404, {error:'Product not found.'});
      for (const field of ['title','description','image','sourceUrl']) if (body[field] !== undefined) product[field] = String(body[field] || '');
      for (const field of ['cost','score','rating']) if (body[field] !== undefined) { const n=Number(body[field]); if (Number.isFinite(n)) product[field]=n; }
      if (body.sellingPrice !== undefined) { const n=Number(body.sellingPrice); if (Number.isFinite(n)) product.sellingPrice=n; }
      save(store); return send(res, 200, {message:'Product updated.', product});
    }
    if (req.method === 'GET' && url.pathname === '/api/queue') return send(res, 200, data().queue);
    if (req.method === 'GET' && url.pathname === '/api/admin/users') return send(res, 200, data().users);
    if (req.method === 'GET' && url.pathname === '/api/admin/access-requests') return send(res, 200, data().accessRequests || []);
    if (req.method === 'POST' && /^\/api\/admin\/access-requests\/[^/]+$/.test(url.pathname)) {
      const {decision} = await readBody(req); const id = url.pathname.split('/')[4]; const store = data(); const request = (store.accessRequests || []).find(item => item.id === id);
      if (!request || request.status !== 'pending') return send(res, 404, {error:'Pending access request not found.'});
      if (!['approve','decline'].includes(decision)) return send(res, 400, {error:'Choose approve or decline.'});
      request.status = decision === 'approve' ? 'approved' : 'declined';
      if (decision === 'approve' && !store.users.some(user => user.email === request.email)) store.users.push({id:request.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g,'-'),name:request.name,email:request.email,plan:'Starter',revenue:0,views:0,purchases:0,status:'Active'});
      save(store); return send(res, 200, {message:`${request.name}'s access was ${request.status}.`});
    }
    if (req.method === 'POST' && /^\/api\/admin\/users\/[^/]+\/metrics$/.test(url.pathname)) {
      const body = await readBody(req); const id = url.pathname.split('/')[4]; const store = data(); const user = store.users.find(item => item.id === id);
      if (!user) return send(res, 404, {error:'Seller not found.'});
      for (const field of ['revenue','views','purchases']) { const value = Number(body[field]); if (!Number.isFinite(value) || value < 0) return send(res, 400, {error:`${field} must be a positive number.`}); user[field] = value; }
      save(store); return send(res, 200, {message:`${user.name}'s performance was updated.`, user});
    }
    if (req.method === 'GET' && url.pathname === '/api/payments/plans') return send(res, 200, data().plans);
    if (req.method === 'POST' && url.pathname === '/api/payments/checkout') {
      const {planId} = await readBody(req); const plan = data().plans.find(item => item.id === planId);
      if (!plan) return send(res, 404, {error:'Plan not found.'});
      return send(res, 501, {message:`${plan.name} is selected. Connect Stripe or another payment provider to take a live payment.`});
    }
    if (req.method === 'POST' && url.pathname === '/api/queue') {
      const body = await readBody(req); const store = data();
      const product = store.products.find(item => item.id === body.productId);
      if (!product) return send(res, 404, {error:'Product not found'});
      if (!store.queue.some(item => item.id === product.id)) store.queue.push({...product, addedAt:new Date().toISOString()});
      save(store); return send(res, 201, {message:`${product.title} added to your queue.`, product});
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/signup') {
      const body = await readBody(req); const name = String(body.name || '').trim(); const email = String(body.email || '').trim().toLowerCase(); const password = String(body.password || '');
      if (!name || !email || password.length < 6) return send(res, 400, {error:'Name, valid email, and a password of at least 6 characters are required.'});
      const store = data();
      if (store.users.some(user => user.email.toLowerCase() === email)) return send(res, 409, {error:'An account with this email already exists.'});
      const user = {id:email.split('@')[0].replace(/[^a-z0-9]+/g,'-'), name, email, plan:'Starter', revenue:0, views:0, purchases:0, status:'Active'};
      store.users.push(user); save(store); return send(res, 201, {message:'Account created.', user});
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/email') {
      const {email} = await readBody(req);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return send(res, 400, {error:'Please enter a valid email address.'});
      const store = data(); const user = store.users.find(item => item.email.toLowerCase() === email.toLowerCase());
      if (user) return send(res, 200, {message:'Sign-in link prepared.', token:crypto.randomUUID()});
      let request = (store.accessRequests || []).find(item => item.email.toLowerCase() === email.toLowerCase());
      if (request?.status === 'approved') return send(res, 200, {message:'Your access is approved. Sign-in link prepared.', token:crypto.randomUUID()});
      if (!request) { request = {id:crypto.randomUUID(),name:email.split('@')[0],email,requestedAt:new Date().toISOString(),status:'pending'}; store.accessRequests = [...(store.accessRequests || []), request]; save(store); }
      return send(res, 202, {message:'Your access request is waiting for admin approval.'});
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/provider') {
      const {provider} = await readBody(req);
      if (!['Google','Apple','Facebook','TikTok','X'].includes(provider)) return send(res, 400, {error:'Unsupported provider.'});
      return send(res, 501, {message:`${provider} OAuth needs client credentials. Add them as environment variables before enabling this provider.`});
    }
    if (req.method === 'POST' && url.pathname === '/api/shopify/import') {
      const body = await readBody(req); const title=String(body.title||'').trim();
      if (!title) return send(res,400,{error:'Product title is required.'});
      const shop=String(process.env.SHOPIFY_STORE_DOMAIN||'').replace(/^https?:\/\//,'').replace(/\/$/,'');
      const token=String(process.env.SHOPIFY_ACCESS_TOKEN||'');
      if (!shop || !token) return send(res,200,{configured:false,status:'Not configured',message:'Shopify publishing is not configured. Add SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN to enable live draft imports.'});
      const apiVersion=process.env.SHOPIFY_API_VERSION||'2026-07';
      const query=`mutation ProductCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) { productCreate(product: $product, media: $media) { product { id title handle status } userErrors { field message } } }`;
      const variables={product:{title,descriptionHtml:`<p>${String(body.description||'').replace(/[<>]/g,'')}</p>`,status:'DRAFT',vendor:'Liftly'},media: body.image ? [{originalSource:String(body.image),mediaContentType:'IMAGE'}] : []};
      const response=await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});
      const result=await response.json(); const payload=result?.data?.productCreate;
      if (!response.ok || !payload || payload.userErrors?.length) return send(res,502,{configured:true,status:'error',error:payload?.userErrors?.[0]?.message||result?.errors?.[0]?.message||'Shopify rejected the product.'});
      return send(res,200,{configured:true,status:'created',product:payload.product,adminUrl:`https://${shop}/admin/products/${String(payload.product.id).split('/').pop()}`});
    }
    if (req.method === 'GET' && url.pathname === '/api/shopify/export') {
      let body={}; try { body=JSON.parse(url.searchParams.get('data')||'{}'); } catch {}
      const title=String(body.title||'Untitled product'); const handle=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
      const csv=[["Handle","Title","Body (HTML)","Vendor","Variant Price","Status"],[handle,title,`<p>${String(body.description||'').replace(/[<>]/g,'')}</p>`,'Liftly',Number(body.price)||0,'draft']].map(row=>row.map(csvCell).join(',')).join('\n');
      res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename=\"${handle}-shopify.csv\"`}); return res.end(csv);
    }
    if (req.method === 'POST' && url.pathname === '/api/shopify/export') {
      const {title, price, description='', video=''} = await readBody(req);
      if (!title || !price) return send(res, 400, {error:'Product title and price are required.'});
      const handle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const csv = [["Handle","Title","Body (HTML)","Vendor","Variant Price","Status"],[handle,title,`<p>${description}${video ? ` Video: ${video}` : ''}</p>`,'Liftly',price,'draft']].map(row => row.map(csvCell).join(',')).join('\n');
      res.writeHead(200, {'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${handle}-shopify.csv"`}); return res.end(csv);
    }
    serveFile(res, url.pathname);
  } catch (error) { console.error(error); send(res, 500, {error:'Something went wrong. Please try again.'}); }
});
server.listen(PORT, () => console.log(`Liftly is running at http://localhost:${PORT}`));
