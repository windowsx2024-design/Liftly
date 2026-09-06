const plansRoot=document.querySelector('#plans');
const toast=document.querySelector('#toast');
const paymentPanel=document.querySelector('#paymentPanel');
const cardForm=document.querySelector('#cardForm');
const selectedPlan=document.querySelector('#selectedPlan');
const cardNumber=document.querySelector('#cardNumber');
const expiry=document.querySelector('#expiry');
const cvc=document.querySelector('#cvc');
function notify(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),3500)}
let plans=[];
function choose(planId){
 const plan=plans.find(p=>p.id===planId); if(!plan)return;
 selectedPlan.value=plan.id;
 document.querySelector('#selectedPlanName').textContent=plan.name;
 document.querySelector('#selectedPlanPrice').textContent=`$${plan.price}/month`;
 paymentPanel.classList.add('open');
 paymentPanel.scrollIntoView({behavior:'smooth',block:'center'});
}
async function load(){try{
 plans=await (await fetch('/api/payments/plans')).json();
 plansRoot.innerHTML=plans.map((plan,i)=>`<article class="plan ${i===1?'featured':''}"><span>${i===1?'MOST POPULAR':i===plans.length-1?'LIFTLY ENTERPRISE':'LIFTLY PLAN'}</span><h2>${plan.name}</h2><p>${plan.description}</p><b class="price">$${plan.price}<small>/ month</small></b><ul>${plan.features.map(feature=>`<li>${feature}</li>`).join('')}</ul><button data-plan="${plan.id}">Choose ${plan.name}</button></article>`).join('');
 document.querySelectorAll('[data-plan]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.plan)));
}catch{notify('Start the Liftly server to load billing plans.')}}
function formatCard(v){v=v.replace(/\D/g,'').slice(0,19);return v.replace(/(.{4})/g,'$1 ').trim()}
cardNumber.addEventListener('input',()=>cardNumber.value=formatCard(cardNumber.value));
expiry.addEventListener('input',()=>{let v=expiry.value.replace(/\D/g,'').slice(0,4);if(v.length>2)v=v.slice(0,2)+'/'+v.slice(2);expiry.value=v});
cvc.addEventListener('input',()=>cvc.value=cvc.value.replace(/\D/g,'').slice(0,4));
cardForm.addEventListener('submit',async e=>{e.preventDefault();
 const number=cardNumber.value.replace(/\s/g,'');
 if(number.length<13||number.length>19)return notify('Enter a valid card number.');
 if(!/^\d{2}\/\d{2}$/.test(expiry.value))return notify('Enter expiry as MM/YY.');
 if(cvc.value.length<3)return notify('Enter a valid security code.');
 const planId=selectedPlan.value;
 try{const r=await fetch('/api/payments/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({planId})});const result=await r.json();notify(result.message||result.error||'Payment provider is not connected yet.');}
 catch{notify('Payment setup needs the Liftly server.')} 
});
document.querySelector('#closePayment').addEventListener('click',()=>paymentPanel.classList.remove('open'));
load();
