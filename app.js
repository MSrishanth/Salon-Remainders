const SERVICES=[{name:'Regular Cut',price:149},{name:'Haircut & Wash',price:199},{name:'Haircut & Colour',price:299},{name:'Haircut, Beard, Colour',price:349},{name:'Haircut & Massage',price:249},{name:'Haircut & Hairspa',price:299},{name:'Facial',price:449},{name:'Haircut, Beard, Facial',price:649}];
const FEATS=[{icon:'✂️',title:'Sharp Cuts',desc:'Eight signature services from ₹149 to ₹649.'},{icon:'🔔',title:'Service Reminders',desc:'Auto pings for your color touch-up, beard trim & more.'},{icon:'⭐',title:'Loyal Regulars',desc:'Built to remember every customer of mine.'}];

// DATA STORAGE (Firebase Firestore Persistence - Compat Version)
let bookings=[], customers=[], reminders=[], nid=1000;
let loginRole='barber', loggedInCustomer=null;

const storage={
  save:async()=>{
    if(!window.db)return;
    try {
      await window.db.collection("saloon").doc("state").set({ bookings, customers, reminders, nid });
    } catch(e){ console.error('Firebase Save Failed', e); }
  },
  init:()=>{
    if(!window.db){ 
      console.log("Waiting for Firebase DB connection...");
      setTimeout(storage.init, 500); 
      return; 
    }
    window.db.collection("saloon").doc("state").onSnapshot((docSnapshot)=>{
      if(docSnapshot.exists){
        const data = docSnapshot.data();
        bookings = data.bookings || [];
        customers = data.customers || [];
        const oldLen = (data.reminders || []).length;
        reminders = (data.reminders || []).filter(r => r.remindDate);
        nid = data.nid || 1000;
        console.log('Firebase Cloud Sync Active');
        if (oldLen !== reminders.length) { storage.save(); }
        checkAutoDeliver();
        refreshUI();
      } else {
        console.log('Initializing empty cloud database...');
        storage.save();
      }
    });
  }
};

function refreshUI(){
  if(document.getElementById('barber-app').style.display==='block') renderBarberAll();
  if(document.getElementById('customer-app').style.display==='block') renderCustAll();
}

function checkAutoDeliver(){
  const now = new Date();
  let changed = false;
  reminders.forEach(r => {
    if (r.status === 'Scheduled' && r.remindDate && r.remindTime) {
      try {
        const [time, ampm] = r.remindTime.split(' ');
        let [hours, mins] = time.split(':');
        hours = parseInt(hours);
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        const rDate = new Date(`${r.remindDate}T${String(hours).padStart(2,'0')}:${mins}:00`);
        if (now >= rDate) {
          r.status = 'Delivered';
          changed = true;
        }
      } catch(e) {}
    }
  });
  if(changed){
    storage.save();
  }
}

// LANDING POPULATION
function initLanding(){
  console.log("Initializing Landing Page...");
  const fg=document.getElementById('feat-grid');
  if(fg){
    fg.innerHTML='';
    FEATS.forEach(f=>{
      fg.innerHTML+=`<div class="brut-card feat-card"><div class="feat-icon">${f.icon}</div><div class="feat-title">${f.title}</div><div class="feat-desc">${f.desc}</div></div>`;
    });
  }
  const pr=document.getElementById('price-rows');
  if(pr){
    pr.innerHTML='';
    SERVICES.forEach((s,i)=>{
      pr.innerHTML+=`<div class="price-row ${i%2===0?'price-row-dark':'price-row-light'}"><span class="pr-name">${s.name}</span><span class="pr-price">₹${s.price}</span></div>`;
    });
    console.log("Price List Rendered");
  } else {
    console.warn("Price rows container not found!");
  }
}

function showLogin(role){
  setLoginRole(role);
  document.getElementById('landing-page').style.display='none';
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('login-error').textContent='';
  document.getElementById('login-user').value='';
  document.getElementById('login-pass').value='';
}

function backToLanding(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('landing-page').style.display='block';
}

function setLoginRole(role){
  loginRole=role;
  document.querySelectorAll('.ltab').forEach(t=>t.classList.remove('active'));
  document.getElementById('lt-'+role).classList.add('active');
  document.getElementById('login-user').placeholder=role==='barber'?'Enter username':'Enter phone number';
  document.getElementById('login-pass').placeholder=role==='barber'?'Enter password':'Set or enter password';
  
  const nameGroup = document.getElementById('login-name-group');
  if(nameGroup) nameGroup.style.display = role === 'customer' ? 'block' : 'none';
}

function handleLogin(e){
  e.preventDefault();
  const u=document.getElementById('login-user').value,
        p=document.getElementById('login-pass').value,
        n=document.getElementById('login-name').value,
        err=document.getElementById('login-error');
  if(loginRole==='barber'){
    if(u==='admin'&&p==='admin123'){
      document.getElementById('login-screen').style.display='none';
      document.getElementById('barber-app').style.display='block';
      initBarber();
    }else{err.textContent='Invalid credentials'}
  }else{
    // Customer flow
    let c=customers.find(x=>x.phone===u);
    if(!c){
      // Signup
      const finalName = n.trim() || u;
      c={id:++nid,name:finalName,phone:u,password:p,email:'',visits:0,spent:0,lastVisit:'N/A'};
      customers.push(c);
      storage.save();
    } else {
      // Login - verify password
      if (c.password && c.password !== p) {
        err.textContent = 'Invalid password';
        return;
      }
      // Set password if not already set (legacy)
      if (!c.password) {
        c.password = p;
        storage.save();
      }
      if (n.trim()) {
        c.name = n.trim();
        storage.save();
      }
    }
    
    // Strict cleanup of existing mangled names
    if (c.name.startsWith('Customer ')) {
      const parts = c.name.split(' ');
      if (parts.length > 2) {
        c.name = parts.slice(1).join(' '); 
        storage.save();
      }
    }
    loggedInCustomer=c;
    document.getElementById('login-screen').style.display='none';
    document.getElementById('customer-app').style.display='block';
    initCustomer();
  }
}

function logout(){
  document.getElementById('barber-app').style.display='none';
  document.getElementById('customer-app').style.display='none';
  document.getElementById('landing-page').style.display='block';
  loggedInCustomer=null;
}

// BARBER
function initBarber(){
  const sel=document.getElementById('f-svc');
  if(sel){
    sel.innerHTML='<option value="">Select...</option>';
    SERVICES.forEach(s=>{sel.innerHTML+=`<option value="${s.name}|${s.price}">${s.name} — ₹${s.price}</option>`});
  }
  const fdate = document.getElementById('f-date');
  if(fdate) fdate.valueAsDate=new Date();
  const g=document.getElementById('svc-grid');
  if(g){
    g.innerHTML='';
    SERVICES.forEach(s=>{g.innerHTML+=`<div class="pcard"><span class="pn">${s.name}</span><span class="pt">₹${s.price}</span></div>`});
  }
  renderBarberAll();
}

function bTab(id,btn){
  document.querySelectorAll('.bv').forEach(v=>v.style.display='none');
  document.getElementById('bv-'+id).style.display='block';
  document.querySelectorAll('#barber-app .topbar-nav button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

function fmtTime(t){let[h,m]=t.split(':');h=+h;const a=h>=12?'PM':'AM';h=h%12||12;return h+':'+m+' '+a}
function todayStr(){
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0');
}
function nowStr(){
  const n = new Date();
  const d = todayStr();
  const t = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
  return d + ' ' + t;
}

function renderBarberAll(){rDash();rBook();rCust();rRem()}
function rDash(){
  const today = todayStr();
  const todayBookings = bookings.filter(b=>b.date===today);
  const todayReminders = reminders.filter(r=>r.sentAt.startsWith(today));
  const rev = todayBookings.filter(b=>b.status==='COMPLETED').reduce((a,b)=>a+b.price,0);
  
  const sToday = document.getElementById('s-today');
  const sRem = document.getElementById('s-rem');
  const sRev = document.getElementById('s-rev');
  const sCust = document.getElementById('s-cust-total');
  
  if(sToday) sToday.textContent = todayBookings.length || '--';
  if(sRem) sRem.textContent = todayReminders.length || '--';
  if(sRev) sRev.textContent = rev ? '₹'+rev : '--';
  if(sCust) sCust.textContent = customers.length || '--';
  
  const tb=document.getElementById('dash-tb');
  if(!tb) return;
  tb.innerHTML='';
  const pending=bookings.filter(b=>b.status==='PENDING').sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  if(!pending.length){
    tb.innerHTML='<tr><td colspan="7"><div class="empty"><p>No upcoming bookings</p></div></td></tr>';
    return;
  }
  pending.forEach(b=>{
    tb.innerHTML+=`<tr><td style="font-weight:500">${fmtTime(b.time)}</td><td class="nc">${b.name}</td><td>${b.phone}</td><td>${b.service}</td><td>₹${b.price}</td><td><span class="badge bp">PENDING</span></td><td class="ac"><button class="ab ag" onclick="markDone(${b.id})">✓</button><button class="ab ao" onclick="sendRem(${b.id})">📱</button><button class="ab ar" onclick="cancelB(${b.id})">✕</button></td></tr>`;
  });
}

function rBook(search){
  const fEle = document.getElementById('bf');
  const f = fEle ? fEle.value : 'all';
  const tb=document.getElementById('book-tb');
  if(!tb) return;
  tb.innerHTML='';
  let list=[...bookings].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  if(f!=='all')list=list.filter(b=>b.status===f);
  if(search)list=list.filter(b=>(b.name+b.service).toLowerCase().includes(search.toLowerCase()));
  if(!list.length){
    tb.innerHTML='<tr><td colspan="7"><div class="empty"><p>No bookings found</p></div></td></tr>';
    return;
  }
  list.forEach(b=>{
    const cls=b.status==='COMPLETED'?'bc':b.status==='CANCELLED'?'bx':'bp';
    tb.innerHTML+=`<tr><td>${b.date}</td><td>${fmtTime(b.time)}</td><td class="nc">${b.name}</td><td>${b.service}</td><td>₹${b.price}</td><td><span class="badge ${cls}">${b.status}</span></td><td class="ac">${b.status==='PENDING'?`<button class="ab ag" onclick="markDone(${b.id})">✓</button><button class="ab ar" onclick="cancelB(${b.id})">✕</button>`:''}</td></tr>`;
  });
}

function rCust(search){
  const tb=document.getElementById('cust-tb');
  if(!tb) return;
  tb.innerHTML='';
  let list=[...customers];
  if(search) list=list.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));
  if(!list.length){
    tb.innerHTML='<tr><td colspan="6"><div class="empty"><p>No customers found</p></div></td></tr>';
    return;
  }
  list.reverse().forEach(c=>{
    tb.innerHTML+=`<tr><td class="nc">${c.name}</td><td>${c.phone}</td><td>${c.visits}</td><td>₹${c.spent}</td><td>${c.lastVisit}</td><td class="ac"><button class="ab ar" onclick="deleteCust(${c.id})" title="Delete">✕</button></td></tr>`;
  });
}

function rRem(){
  const tb=document.getElementById('rem-tb');
  if(!tb) return;
  tb.innerHTML='';
  const list=reminders.filter(r=>r.status!=='Delivered');
  if(!list.length){
    tb.innerHTML='<tr><td colspan="7"><div class="empty"><p>No pending reminders</p></div></td></tr>';
    return;
  }
  [...list].reverse().forEach(r=>{
    const dateStr = r.remindDate ? r.remindDate : r.sentAt.split(' ')[0];
    const timeStr = r.remindTime ? r.remindTime : (r.sentAt.split(' ')[1] ? fmtTime(r.sentAt.split(' ')[1]) : '--');
    tb.innerHTML+=`<tr><td>${r.sentAt}</td><td>${dateStr}</td><td style="font-weight:500">${timeStr}</td><td class="nc">${r.name}</td><td>${r.phone}</td><td><span class="badge bp">${r.type}</span></td><td><span class="badge bs">${r.status}</span></td></tr>`;
  });
}

function markDone(id){
  const b=bookings.find(x=>x.id===id);
  if(b){
    b.status='COMPLETED';
    storage.save();
    showToast('✅ Completed');
  }
}

function cancelB(id){
  const b=bookings.find(x=>x.id===id);
  if(b){
    b.status='CANCELLED';
    storage.save();
    showToast('❌ Cancelled');
  }
}

function sendRem(id){
  const b=bookings.find(x=>x.id===id);
  if(!b)return;
  reminders.push({id:++nid,sentAt:nowStr(),name:b.name,phone:b.phone,type:'Manual',status:'Delivered'});
  storage.save();
  showToast('📱 Reminder sent to '+b.name);
}

function submitBooking(e){
  e.preventDefault();
  const name=document.getElementById('f-name').value,
        phone=document.getElementById('f-phone').value,
        email=document.getElementById('f-email').value,
        sv=document.getElementById('f-svc').value.split('|'),
        date=document.getElementById('f-date').value,
        time=document.getElementById('f-time').value;

  const bookingData = {id:++nid,name,phone,email,service:sv[0],price:+sv[1],date,time,status:'PENDING'};
  bookings.push(bookingData);

  let c=customers.find(x=>x.phone===phone);
  if(c){
    c.visits++;
    c.spent+=+sv[1];
    c.lastVisit=date;
    c.email=email; // Update email if provided
  } else {
    customers.push({id:++nid,name,phone,email,visits:1,spent:+sv[1],lastVisit:date});
  }

  storage.save();

  // Trigger Backend Email Notification
  fetch('http://localhost:3001/api/notifications/appointment-success', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerEmail: email,
      customerName: name,
      serviceName: sv[0],
      appointmentDate: `${date} ${fmtTime(time)}`,
      price: sv[1],
      customerPhone: phone
    })
  }).catch(err => console.error('Email Notification Failed:', err));

  closeModal('booking-modal');
  document.getElementById('booking-form').reset();
  const fdate = document.getElementById('f-date');
  if(fdate) fdate.valueAsDate=new Date();
  showToast('✅ Booked for '+name);
}

// CUSTOMER
function initCustomer(){
  const sel=document.getElementById('cf-svc');
  if(sel){
    sel.innerHTML='<option value="">Select...</option>';
    SERVICES.forEach(s=>{sel.innerHTML+=`<option value="${s.name}|${s.price}">${s.name} — ₹${s.price}</option>`});
  }
  const cfdate = document.getElementById('cf-date');
  if(cfdate) cfdate.valueAsDate=new Date();
  const g=document.getElementById('csvc-grid');
  if(g){
    g.innerHTML='';
    SERVICES.forEach(s=>{g.innerHTML+=`<div class="pcard"><span class="pn">${s.name}</span><span class="pt">₹${s.price}</span></div>`});
  }
  let displayName = loggedInCustomer.name;
  if (displayName.startsWith('Customer ')) {
    const parts = displayName.split(' ');
    if (parts.length > 2) displayName = parts.slice(1).join(' ');
  }

  document.getElementById('cust-greet').textContent=displayName;
  document.getElementById('cust-name').textContent=displayName;
  const cfName = document.getElementById('cf-name');
  if(cfName) cfName.value = displayName;
  renderCustAll();
}

function cTab(id,btn){
  document.querySelectorAll('.cv').forEach(v=>v.style.display='none');
  document.getElementById('cv-'+id).style.display='block';
  document.querySelectorAll('#customer-app .topbar-nav button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

function renderCustAll(){
  if(!loggedInCustomer)return;
  const mine = bookings.filter(b=>b.phone===loggedInCustomer.phone);
  const myRems = reminders.filter(r=>r.phone===loggedInCustomer.phone);
  
  const cup = document.getElementById('c-upcoming');
  const ccomp = document.getElementById('c-completed');
  if(cup) cup.textContent = mine.filter(b=>b.status==='PENDING').length || '--';
  if(ccomp) ccomp.textContent = mine.filter(b=>b.status==='COMPLETED').length || '--';
  
  const upcoming=mine.filter(b=>b.status==='PENDING').sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const nd=document.getElementById('c-next');
  if(nd){
    if(upcoming.length){
      const n=upcoming[0];
      nd.innerHTML=`<div style="padding:20px"><table style="width:auto"><tr><td style="font-weight:600;padding-right:20px">Date</td><td>${n.date}</td></tr><tr><td style="font-weight:600;padding-right:20px">Time</td><td>${fmtTime(n.time)}</td></tr><tr><td style="font-weight:600;padding-right:20px">Service</td><td>${n.service}</td></tr><tr><td style="font-weight:600;padding-right:20px">Amount</td><td>₹${n.price}</td></tr></table></div>`;
    }else{
      nd.innerHTML='<div class="empty"><p>No upcoming. Book now!</p></div>';
    }
  }
  
  const btb=document.getElementById('mybook-tb');
  if(btb){
    btb.innerHTML='';
    if(!mine.length){
      btb.innerHTML='<tr><td colspan="5"><div class="empty"><p>No bookings history</p></div></td></tr>';
    } else {
      [...mine].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).forEach(b=>{
        const cls=b.status==='COMPLETED'?'bc':b.status==='CANCELLED'?'bx':'bp';
        btb.innerHTML+=`<tr><td>${b.date}</td><td>${fmtTime(b.time)}</td><td>${b.service}</td><td>₹${b.price}</td><td><span class="badge ${cls}">${b.status}</span></td></tr>`;
      });
    }
  }

  const rtb=document.getElementById('myrem-tb');
  if(rtb){
    rtb.innerHTML='';
    if(!myRems.length){
      rtb.innerHTML='<tr><td colspan="5"><div class="empty"><p>No scheduled reminders</p></div></td></tr>';
    } else {
      [...myRems].reverse().forEach(r=>{
        const dateStr = r.remindDate ? r.remindDate : r.sentAt.split(' ')[0];
        const timeStr = r.remindTime ? r.remindTime : (r.sentAt.split(' ')[1] ? fmtTime(r.sentAt.split(' ')[1]) : '--');
        rtb.innerHTML+=`<tr><td>${r.sentAt}</td><td>${dateStr}</td><td style="font-weight:500">${timeStr}</td><td><span class="badge bp">${r.type}</span></td><td><span class="badge bs">${r.status}</span></td></tr>`;
      });
    }
  }
}

function custSubmitBooking(e){
  e.preventDefault();
  const name=document.getElementById('cf-name').value,
        sv=document.getElementById('cf-svc').value.split('|'),
        date=document.getElementById('cf-date').value,
        time=document.getElementById('cf-time').value,
        email=document.getElementById('cf-email').value;
  
  const phone=loggedInCustomer.phone;
  bookings.push({id:++nid,name,phone,email,service:sv[0],price:+sv[1],date,time,status:'PENDING'});
  
  loggedInCustomer.name=name; // Update to full name
  loggedInCustomer.visits++;
  loggedInCustomer.spent+=+sv[1];
  loggedInCustomer.lastVisit=date;
  loggedInCustomer.email=email;

  storage.save();

  // Trigger Backend Email Notification
  fetch('http://localhost:3001/api/notifications/appointment-success', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerEmail: email,
      customerName: name,
      serviceName: sv[0],
      appointmentDate: `${date} ${fmtTime(time)}`,
      price: sv[1],
      customerPhone: phone
    })
  }).catch(err => console.error('Email Notification Failed:', err));

  closeModal('cust-book-modal');
  const cfdate = document.getElementById('cf-date');
  if(cfdate) cfdate.valueAsDate=new Date();
  showToast('✅ Booked successfully!');
  refreshUI();
}

function openRemModal(){
  const hsvc=document.getElementById('h-svc');
  if(hsvc){
    hsvc.innerHTML='<option value="">Select a service...</option>';
    SERVICES.forEach(s=>hsvc.innerHTML+=`<option value="${s.name}">${s.name}</option>`);
  }
  const barberFields = document.getElementById('h-barber-fields');
  const customerFields = document.getElementById('h-customer-fields');
  
  if(loginRole==='barber'){
    if(barberFields) barberFields.style.display='block';
    if(customerFields) customerFields.style.display='none';
    const hname = document.getElementById('h-name');
    const hphone = document.getElementById('h-phone');
    const hemail = document.getElementById('h-email');
    if(hname) hname.required=true;
    if(hphone) hphone.required=true;
    if(hemail) hemail.required=true;
  } else {
    if(barberFields) barberFields.style.display='none';
    if(customerFields) customerFields.style.display='block';
    const hcemail = document.getElementById('hc-email');
    if(hcemail) {
      hcemail.required=true;
      if(loggedInCustomer && loggedInCustomer.email) hcemail.value = loggedInCustomer.email;
    }
  }
  openModal('rem-modal');
}

function submitManualReminder(e){
  e.preventDefault();
  const svc = document.getElementById('h-svc').value, date = document.getElementById('h-date').value, time = document.getElementById('h-time').value;
  let name, phone, email;
  
  if(loginRole==='barber'){ 
    name = document.getElementById('h-name').value; 
    phone = document.getElementById('h-phone').value; 
    email = document.getElementById('h-email').value;
  } else { 
    name = loggedInCustomer.name; 
    phone = loggedInCustomer.phone; 
    email = document.getElementById('hc-email').value;
  }
  
  const formattedTime = fmtTime(time);
  reminders.push({id:++nid,sentAt:nowStr(),remindDate:date,remindTime:formattedTime,name,phone,email,type:`${svc}`,status:'Scheduled'});
  storage.save();

  // Trigger Backend Instant Reminder Confirmation
  fetch('http://localhost:3001/api/notifications/reminder-scheduled', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerEmail: email,
      customerName: name,
      customerPhone: phone,
      serviceName: svc,
      remindDate: date,
      remindTime: formattedTime
    })
  }).catch(err => console.error('Reminder Confirmation Failed:', err));

  closeModal('rem-modal');
  showToast(`🔔 Service reminder scheduled for ${name}!`);
}

function submitAddCust(e){
  e.preventDefault();
  const name=document.getElementById('ac-name').value, 
        phone=document.getElementById('ac-phone').value,
        email=document.getElementById('ac-email').value;
        
  if(customers.find(x=>x.phone===phone)){ showToast('⚠️ Phone already exists'); return; }
  customers.push({id:++nid,name,phone,email,visits:0,spent:0,lastVisit:'N/A'});
  storage.save();
  closeModal('add-cust-modal');
  document.getElementById('ac-name').value='';
  document.getElementById('ac-phone').value='';
  document.getElementById('ac-email').value='';
  showToast('✅ Customer added!');
}

function deleteCust(id){
  if(confirm('Delete this customer? This will not remove their bookings.')){
    customers = customers.filter(c=>c.id!==id);
    storage.save();
    showToast('🗑️ Customer removed');
  }
}

// SHARED
function openModal(id){
  const m = document.getElementById(id);
  if(m) m.classList.add('open');
}
function closeModal(id){
  const m = document.getElementById(id);
  if(m) m.classList.remove('open');
}
function showToast(msg){
  const t=document.getElementById('toast');
  if(!t) return;
  t.innerHTML=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

// INITIALIZE
window.onload = () => {
  console.log("Window Loaded");
  initLanding();
  storage.init();
  setInterval(checkAutoDeliver, 60000); // Auto check every minute
};
