import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { motion } from 'framer-motion';
import IntroSequence from './components/IntroSequence';

const SERVICES = [
  { name: 'Regular Cut', price: 149 },
  { name: 'Haircut & Wash', price: 199 },
  { name: 'Haircut & Colour', price: 299 },
  { name: 'Haircut, Beard, Colour', price: 349 },
  { name: 'Haircut & Massage', price: 249 },
  { name: 'Haircut & Hairspa', price: 299 },
  { name: 'Facial', price: 449 },
  { name: 'Haircut, Beard, Facial', price: 649 }
];

const FEATS = [
  { icon: '✂️', title: 'Sharp Cuts', desc: 'Eight signature services from ₹149 to ₹649.' },
  { icon: '🔔', title: 'Service Reminders', desc: 'Auto pings for your color touch-up, beard trim & more.' },
  { icon: '⭐', title: 'Loyal Regulars', desc: 'Built to remember every customer of mine.' }
];

function App() {
  // Navigation & Auth State
  const [view, setView] = useState('intro'); // intro, landing, login, barber, customer
  const [loginRole, setLoginRole] = useState('barber');
  const [loggedInCustomer, setLoggedInCustomer] = useState(null);
  const [barberAuth, setBarberAuth] = useState({ username: 'admin', password: 'admin123', name: 'Barber Admin', phone: '8686383723', email: 'admin@shobanasalon.com' });

  // Database State
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [nid, setNid] = useState(1000);

  // Portal State
  const [bTab, setBTab] = useState('dashboard');
  const [cTab, setCTab] = useState('home');
  const [toast, setToast] = useState('');
  const [selectedBookings, setSelectedBookings] = useState([]);

  // Filters
  const [bSearch, setBSearch] = useState('');
  const [bFilter, setBFilter] = useState('all');
  const [bDateFilter, setBDateFilter] = useState('');
  const [cSearch, setCSearch] = useState('');

  // Form & Modal States
  const [loginForm, setLoginForm] = useState({ user: '', pass: '', name: '', error: '' });
  const [accountForm, setAccountForm] = useState({ name: '', phone: '', email: '', password: '', error: '' });
  const [leaveDateForm, setLeaveDateForm] = useState('');
  const [pendingLeaveDates, setPendingLeaveDates] = useState([]);
  const [leaveAllDay, setLeaveAllDay] = useState(true);
  const [leaveStartTime, setLeaveStartTime] = useState('13:00');
  const [leaveEndTime, setLeaveEndTime] = useState('17:00');
  const [emergencyAllDay, setEmergencyAllDay] = useState(true);
  const [emergencyStartTime, setEmergencyStartTime] = useState('13:00');
  const [emergencyEndTime, setEmergencyEndTime] = useState('17:00');
  const [showPassword, setShowPassword] = useState(false);
  const [modals, setModals] = useState({ booking: false, rem: false, custBook: false, addCust: false, reschedule: false, confirmCancelBooking: false, confirmCancelReminder: false, confirmMarkDone: false, confirmAddLeave: false, confirmEmergencyClose: false });
  const [confirmData, setConfirmData] = useState({ id: null, name: '' });

  const [bookingForm, setBookingForm] = useState({ name: '', phone: '', email: '', svc: '', date: '', time: '' });
  const [custBookForm, setCustBookForm] = useState({ name: '', email: '', svc: '', date: '', time: '' });
  const [landingServiceModal, setLandingServiceModal] = useState(null);
  const [pendingBookingSvc, setPendingBookingSvc] = useState(null);
  const [addCustForm, setAddCustForm] = useState({ name: '', phone: '', email: '' });
  const [remForm, setRemForm] = useState({ name: '', phone: '', email: '', svc: '', date: '', time: '' });
  const [rescheduleForm, setRescheduleForm] = useState({ id: null, date: '', time: '' });

  // Helpers
  const fmtTime = (t) => {
    let [h, m] = t.split(':');
    h = +h;
    const a = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${a}`;
  };
  const todayStr = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };
  const nowStr = () => {
    const n = new Date();
    const d = todayStr();
    const t = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
    return `${d} ${t}`;
  };
  
  const getFilteredTimeOptions = (selectedDate, leavesArray = []) => {
    const allTimes = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'];
    if (!selectedDate) return allTimes.map(t => ({ value: t, label: fmtTime(t), isDisabled: false, labelSuffix: '' }));
    
    const isToday = selectedDate === todayStr();
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const leaveForDate = leavesArray.find(l => l.date === selectedDate);
    const d = new Date(selectedDate);
    const isTuesday = d.getDay() === 2;

    return allTimes.map(t => {
      const [h, m] = t.split(':');
      const timeMins = parseInt(h) * 60 + parseInt(m);
      let isPast = isToday && timeMins <= currentMins;
      let isClosed = isTuesday;

      if (leaveForDate) {
        if (leaveForDate.allDay) {
          isClosed = true;
        } else if (t >= leaveForDate.startTime && t < leaveForDate.endTime) {
          isClosed = true;
        }
      }

      const isDisabled = isPast || isClosed;
      let labelSuffix = '';
      if (isPast) labelSuffix = ' (Passed)';
      else if (isClosed) labelSuffix = ' (Closed)';

      return { value: t, label: fmtTime(t), isDisabled, labelSuffix };
    });
  };

  const sCls = (s) => s === 'PENDING' ? 'bp' : s === 'COMPLETED' ? 'bc' : s === 'CANCELLED' ? 'bx' : 'bs';

  const getCName = (id) => customers.find(c => c.id === id)?.name || 'Unknown';
  const getCPhone = (id) => customers.find(c => c.id === id)?.phone || 'Unknown';

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleDateChange = (val, setter, field = null) => {
    if (!val) {
      if (field) setter(prev => ({ ...prev, [field]: val })); else setter(val);
      return;
    }
    const d = new Date(val);
    if (d.getDay() === 2) {
      showToast('❌ Shop is closed on Tuesdays.');
      return;
    }
    const leaveForDate = leaves.find(l => l.date === val);
    if (leaveForDate && leaveForDate.allDay) {
      showToast('❌ Shop is closed on this date.');
      return;
    }
    if (field) setter(prev => ({ ...prev, [field]: val })); else setter(val);
  };

  // --- DATABASE SYNC ---
  useEffect(() => {
    const unsubB = db.collection("bookings").onSnapshot(snap => {
      const bList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const today = new Date();
      const cmFilterDate = today.toISOString().split('T')[0].slice(0, 7) + '-01';
      setBookings(bList.filter(b => b.date && b.date >= cmFilterDate));
    }, err => console.error("Bookings Sync Error:", err));

    const unsubC = db.collection("customers").onSnapshot(snap => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, err => console.error("Customers Sync Error:", err));

    const unsubR = db.collection("reminders").onSnapshot(snap => {
      const rList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const today = new Date();
      const cmFilterDate = today.toISOString().split('T')[0].slice(0, 7) + '-01';
      setReminders(rList.filter(r => r.remindDate && r.remindDate >= cmFilterDate));
    }, err => console.error("Reminders Sync Error:", err));

    const unsubA = db.collection("barberAuth").doc("admin").onSnapshot(doc => {
      if (doc.exists) setBarberAuth(doc.data());
    }, err => console.error("Auth Sync Error:", err));

    const unsubL = db.collection("leaves").onSnapshot(snap => {
      setLeaves(snap.docs.map(doc => {
        const data = doc.data();
        return {
          date: data.date,
          allDay: data.allDay !== false,
          startTime: data.startTime || '',
          endTime: data.endTime || ''
        };
      }));
    }, err => console.error("Leaves Sync Error:", err));

    return () => { unsubB(); unsubC(); unsubR(); unsubA(); unsubL(); };
  }, []);

  // --- AUTO DELIVER CRON ---
  useEffect(() => {
    const checkAutoDeliver = async () => {
      const now = new Date();
      const today = todayStr();
      
      for (const r of reminders) {
        if (r.status === 'COMPLETED' && r.remindDate < today) {
          // Delete old delivered reminders to save space
          await db.collection("reminders").doc(r.id).delete();
        } else if ((r.status === 'Scheduled' || r.status === 'PENDING') && r.remindDate && r.remindTime) {
          try {
            const [time, ampm] = r.remindTime.split(' ');
            let [hours, mins] = time.split(':');
            hours = parseInt(hours);
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            const rDate = new Date(`${r.remindDate}T${String(hours).padStart(2, '0')}:${mins}:00`);
            if (now >= rDate) {
              await db.collection("reminders").doc(r.id).update({ status: 'COMPLETED' });
            }
          } catch (e) {}
        }
      }
    };
    checkAutoDeliver();
    const interval = setInterval(checkAutoDeliver, 60000);
    return () => clearInterval(interval);
  }, [reminders]);

  // --- AUTH ---
  const handleLogin = async (e) => {
    e.preventDefault();
    const { user, pass, name } = loginForm;
    if (loginRole === 'barber') {
      if (user === barberAuth.username && pass === barberAuth.password) {
        setView('barber');
        setBTab('dashboard');
      } else {
        setLoginForm({ ...loginForm, error: 'Invalid credentials' });
      }
    } else {
      let c = customers.find(x => x.phone === user);

      if (!c) {
        const checkName = name.trim();
        const isDuplicate = customers.some(x => 
          (checkName && x.name.toLowerCase() === checkName.toLowerCase()) || 
          (x.password === pass)
        );
        if (isDuplicate) {
          setLoginForm({ ...loginForm, error: 'already existed.please try another username/email/phonenumber/password' });
          return;
        }

        const finalName = checkName || user;
        const newCustRef = db.collection("customers").doc();
        c = { id: newCustRef.id, name: finalName, phone: user, password: pass, email: '', visits: 0, spent: 0, lastVisit: 'N/A' };
        await newCustRef.set(c);
      } else {
        if (c.password && c.password !== pass) {
          setLoginForm({ ...loginForm, error: 'Invalid password' });
          return;
        }
        let needsUpdate = false;
        let updateData = {};
        if (!c.password) { updateData.password = pass; needsUpdate = true; }
        if (name.trim() && name.trim() !== c.name) {
          const isDupName = customers.some(x => x.id !== c.id && x.name.toLowerCase() === name.trim().toLowerCase());
          if (isDupName) {
            setLoginForm({ ...loginForm, error: 'already existed.please try another username/email/phonenumber/password' });
            return;
          }
          updateData.name = name.trim();
          needsUpdate = true;
        }
        
        // Strict cleanup of existing mangled names
        if (c.name.startsWith('Customer ')) {
          const parts = c.name.split(' ');
          if (parts.length > 2) {
             updateData.name = parts.slice(1).join(' ');
             needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
           await db.collection("customers").doc(c.id).update(updateData);
           c = { ...c, ...updateData };
        }
      }
      
      setLoggedInCustomer(c);
      setView('customer');
      setCTab('home');
      setCustBookForm(prev => ({ ...prev, name: c.name, email: c.email || '', svc: pendingBookingSvc || prev.svc }));
      
      if (pendingBookingSvc) {
        setModals(m => ({ ...m, custBook: true }));
        setPendingBookingSvc(null);
      }
    }
  };

  const logout = () => {
    setView('landing');
    setLoggedInCustomer(null);
    setLoginForm({ user: '', pass: '', name: '', error: '' });
  };

  const updateBarberAccount = async (e) => {
    e.preventDefault();
    const { name, phone, email, password } = accountForm;
    const newAuth = { ...barberAuth, name, phone, email, password, username: phone }; // Using phone as username
    await db.collection("barberAuth").doc("admin").set(newAuth);
    setAccountForm({ ...accountForm, error: '' });
    showToast('✅ Barber account updated');
  };

  const updateCustomerAccount = async (e) => {
    e.preventDefault();
    const { name, phone, email, password } = accountForm;
    const checkName = name.trim();
    
    // Check for duplicates in other customers
    const isDuplicate = customers.some(x => 
      x.id !== loggedInCustomer.id && 
      (x.phone === phone || (checkName && x.name.toLowerCase() === checkName.toLowerCase()))
    );

    if (isDuplicate) {
      setAccountForm({ ...accountForm, error: 'Phone number or username already exists for another account.' });
      return;
    }

    const updatedCustomer = { name: checkName, phone, email, password };
    await db.collection("customers").doc(loggedInCustomer.id).update(updatedCustomer);

    setLoggedInCustomer({ ...loggedInCustomer, ...updatedCustomer });
    setAccountForm({ ...accountForm, error: '' });
    showToast('✅ Customer account updated');
  };

  const clearAllReminders = async () => {
    if (loginRole === 'barber') {
      const batch = db.batch();
      reminders.forEach(r => batch.delete(db.collection("reminders").doc(r.id)));
      await batch.commit();
      showToast('🗑️ All reminders cleared');
    } else {
      const batch = db.batch();
      const myRems = reminders.filter(r => r.customerId === loggedInCustomer.id);
      myRems.forEach(r => batch.delete(db.collection("reminders").doc(r.id)));
      await batch.commit();
      showToast('🗑️ Your reminders cleared');
    }
  };

  // --- BARBER ACTIONS ---
  const openConfirmMarkDone = (id, name) => { setConfirmData({ id, name }); setModals(m => ({ ...m, confirmMarkDone: true })); };
  const openConfirmCancelB = (id, name) => { setConfirmData({ id, name }); setModals(m => ({ ...m, confirmCancelBooking: true })); };
  const openConfirmCancelReminder = (id, name) => { setConfirmData({ id, name }); setModals(m => ({ ...m, confirmCancelReminder: true })); };

  const markDone = async () => {
    const { id } = confirmData;
    setModals(m => ({ ...m, confirmMarkDone: false }));
    showToast('✅ Completed');
    
    const b = bookings.find(x => x.id === id);
    db.collection("bookings").doc(id).update({ status: 'COMPLETED', completedAt: todayStr() });
    
    if (b) {
      const c = customers.find(c => c.id === b.customerId);
      fetch('/api/notifications/appointment-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: c?.email || '', customerName: c?.name || 'Customer', customerPhone: c?.phone || '',
          serviceName: b.service, appointmentDate: `${b.date} ${fmtTime(b.time)}`,
          price: b.price, appUrl: window.location.origin
        })
      }).catch(err => console.error('Completion API Error:', err));
    }
  };

  const markAllDone = async () => {
    setModals(m => ({ ...m, confirmMarkAllDone: false }));
    showToast('⏳ Marking all as completed & sending emails...');
    const batch = db.batch();
    const today = todayStr();
    const pending = bookings.filter(b => b.status === 'PENDING' && b.date === today);
    
    if (pending.length === 0) return;

    pending.forEach(b => {
      batch.update(db.collection("bookings").doc(b.id), { status: 'COMPLETED', completedAt: todayStr() });
    });
    
    await batch.commit();

    const emailPromises = pending.map(b => {
      const c = customers.find(c => c.id === b.customerId);
      return fetch('/api/notifications/appointment-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: c?.email || '', customerName: c?.name || 'Customer', customerPhone: c?.phone || '',
          serviceName: b.service, appointmentDate: `${b.date} ${fmtTime(b.time)}`,
          price: b.price, appUrl: window.location.origin
        })
      }).catch(err => console.error('Completion API Error:', err));
    });

    await Promise.all(emailPromises);
    showToast('✅ All pending bookings completed & emails sent!');
  };

  const markNoShow = async (id) => {
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    
    showToast('🚫 Marked as No Show');
    db.collection("bookings").doc(id).update({ status: 'NO_SHOW' });
    const c = customers.find(c => c.id === b.customerId);
    
    fetch('/api/notifications/appointment-no-show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: c?.email || '', customerName: c?.name || 'Customer', customerPhone: c?.phone || '',
        serviceName: b.service, appointmentDate: `${b.date} ${fmtTime(b.time)}`, appUrl: window.location.origin
      })
    }).catch(err => console.error('No-Show API Error:', err));
  };

  const bulkNoShow = async () => {
    if (selectedBookings.length === 0) return;
    
    setSelectedBookings([]);
    showToast('🚫 Bulk marked as No Show');
    
    const batch = db.batch();
    const toProcess = bookings.filter(b => selectedBookings.includes(b.id) && b.status === 'PENDING');
    
    toProcess.forEach(b => {
      batch.update(db.collection("bookings").doc(b.id), { status: 'NO_SHOW' });
      const c = customers.find(c => c.id === b.customerId);
      fetch('/api/notifications/appointment-no-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: c?.email || '', customerName: c?.name || 'Customer', customerPhone: c?.phone || '',
          serviceName: b.service, appointmentDate: `${b.date} ${fmtTime(b.time)}`, appUrl: window.location.origin
        })
      }).catch(err => console.error('No-Show API Error:', err));
    });
    
    batch.commit();
  };

  const clearMonthHistory = async () => {
    setModals(m => ({ ...m, confirmClearHistory: false }));
    showToast('🗑️ Deleting month history...');
    const batch = db.batch();
    
    const today = new Date();
    const currentMonthStr = today.toISOString().split('T')[0].slice(0, 7) + '-01';
      
      const toDelete = bookings.filter(b => 
        (b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'NO_SHOW') && 
        b.date && b.date >= currentMonthStr
      );
      
      if (toDelete.length === 0) {
        showToast('ℹ️ No history to delete for this month.');
        return;
      }
      
      toDelete.forEach(b => {
        batch.delete(db.collection("bookings").doc(b.id));
      });
      
    await batch.commit();
    showToast(`✅ ${toDelete.length} bookings permanently deleted.`);
  };

  const toggleSelection = (id) => {
    setSelectedBookings(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addToPendingLeaves = () => {
    if (!leaveDateForm) {
      showToast('❌ Please select a date first.');
      return;
    }
    const d = new Date(leaveDateForm);
    if (d.getDay() === 2) {
      showToast('❌ Tuesdays are already holidays.');
      return;
    }
    if (pendingLeaveDates.includes(leaveDateForm)) {
      showToast('❌ Date is already in the list.');
      return;
    }
    const leaveExists = leaves.find(l => l.date === leaveDateForm);
    if (leaveExists && leaveExists.allDay) {
      showToast('❌ Date already marked as closed.');
      return;
    }
    setPendingLeaveDates(prev => [...prev, leaveDateForm]);
    setLeaveDateForm('');
  };

  const removePendingLeave = (dateToRemove) => {
    setPendingLeaveDates(prev => prev.filter(d => d !== dateToRemove));
  };

  const addLeave = async () => {
    setModals(m => ({ ...m, confirmAddLeave: false }));
    
    const datesToProcess = pendingLeaveDates.length > 0 ? pendingLeaveDates : (leaveDateForm ? [leaveDateForm] : []);
    
    if (datesToProcess.length === 0) {
      showToast('❌ Please select at least one date.');
      return;
    }

    const batch = db.batch();
    let totalCancelled = 0;

    for (const date of datesToProcess) {
      const d = new Date(date);
      if (d.getDay() === 2) continue;

      const leaveExists = leaves.find(l => l.date === date);
      if (leaveExists && leaveExists.allDay) continue;

      const leaveData = { 
        date: date, 
        allDay: leaveAllDay, 
        startTime: leaveAllDay ? null : leaveStartTime, 
        endTime: leaveAllDay ? null : leaveEndTime 
      };
      
      batch.set(db.collection("leaves").doc(date), leaveData);

      const pendingOnDate = bookings.filter(b => b.date === date && b.status === 'PENDING');
      
      const toCancel = leaveAllDay 
        ? pendingOnDate 
        : pendingOnDate.filter(b => b.time >= leaveStartTime && b.time < leaveEndTime);

      const cancelReason = leaveAllDay 
        ? `Shop will be closed on ${date}.`
        : `Shop will be closed on ${date} from ${fmtTime(leaveStartTime)} to ${fmtTime(leaveEndTime)}.`;

      toCancel.forEach(b => {
        batch.update(db.collection("bookings").doc(b.id), { status: 'CANCELLED' });
        const c = customers.find(c => c.id === b.customerId);
        fetch('/api/notifications/appointment-cancelled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: c?.email || '', customerName: c?.name || 'Customer', customerPhone: c?.phone || '',
            serviceName: b.service, appointmentDate: `${b.date} ${fmtTime(b.time)}`, appUrl: window.location.origin,
            cancelReason
          })
        }).catch(err => console.error("Email error:", err));
        totalCancelled++;
      });
    }
    
    await batch.commit();
    setLeaveDateForm('');
    setPendingLeaveDates([]);
    showToast(`✅ Added ${datesToProcess.length} closed date(s). ${totalCancelled > 0 ? `Cancelled ${totalCancelled} bookings.` : ''}`);
  };

  const removeLeave = async (date) => {
    await db.collection("leaves").doc(date).delete();
    showToast('✅ Date removed from closed dates.');
  };

  const emergencyCloseShop = async () => {
    setModals(m => ({ ...m, confirmEmergencyClose: false }));
    
    const today = todayStr();
    
    const leaveData = { 
      date: today, 
      allDay: emergencyAllDay, 
      startTime: emergencyAllDay ? null : emergencyStartTime, 
      endTime: emergencyAllDay ? null : emergencyEndTime 
    };
    
    await db.collection("leaves").doc(today).set(leaveData);
    
    const batch = db.batch();
    const todayPending = bookings.filter(b => b.date === today && b.status === 'PENDING');
    
    const toCancel = emergencyAllDay 
      ? todayPending 
      : todayPending.filter(b => b.time >= emergencyStartTime && b.time < emergencyEndTime);

    const cancelReason = emergencyAllDay 
      ? "Shop is closed for the rest of today."
      : `Shop is closed today from ${fmtTime(emergencyStartTime)} to ${fmtTime(emergencyEndTime)}.`;
      
    toCancel.forEach(b => {
      batch.update(db.collection("bookings").doc(b.id), { status: 'CANCELLED' });
      const c = customers.find(c => c.id === b.customerId);
      fetch('/api/notifications/appointment-cancelled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: c?.email || '', customerName: c?.name || 'Customer', customerPhone: c?.phone || '',
          serviceName: b.service, appointmentDate: `${b.date} ${fmtTime(b.time)}`, appUrl: window.location.origin,
          cancelReason
        })
      }).catch(err => console.error('Emergency Cancel API Error:', err));
    });
    
    await batch.commit();
    showToast(`🚫 Emergency Close: ${toCancel.length} appointments cancelled.`);
  };

  const openReschedule = (id) => {
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    setRescheduleForm({ id, date: b.date, time: b.time });
    setModals(m => ({ ...m, reschedule: true }));
  };

  const cancelB = async () => {
    const { id } = confirmData;
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    
    setModals(m => ({ ...m, confirmCancelBooking: false }));
    showToast('❌ Cancelled');
    
    db.collection("bookings").doc(id).update({ status: 'CANCELLED' });
    const c = customers.find(c => c.id === b.customerId);
    
    fetch('/api/notifications/appointment-cancelled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: c?.email || '', customerName: c?.name || 'Customer', customerPhone: c?.phone || '',
        serviceName: b.service, appointmentDate: `${b.date} ${fmtTime(b.time)}`, appUrl: window.location.origin
      })
    }).catch(err => console.error('Cancel API Error:', err));
  };

  const sendRem = (id) => {
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    const c = customers.find(c => c.id === b.customerId);
    setRemForm({
      name: c?.name || '',
      phone: c?.phone || '',
      email: c?.email || '',
      svc: b.service || '',
      date: '',
      time: ''
    });
    setModals(m => ({ ...m, rem: true }));
  };

  const deleteCust = async (id) => {
    if (window.confirm('Delete this customer? This will not remove their bookings.')) {
      await db.collection("customers").doc(id).delete();
      showToast('🗑️ Customer removed');
    }
  };

  const deleteReminder = async () => {
    const { id } = confirmData;
    const r = reminders.find(x => x.id === id);
    await db.collection("reminders").doc(id).delete();
    
    if (r) {
      const c = customers.find(c => c.id === r.customerId);
      fetch('/api/notifications/reminder-cancelled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: c?.email || '', customerName: c?.name || '', customerPhone: c?.phone || '',
          serviceName: r.type, remindDate: r.remindDate, remindTime: r.remindTime, appUrl: window.location.origin
        })
      }).catch(err => console.error('Cancel Rem API Error:', err));
    }
    setModals(m => ({ ...m, confirmCancelReminder: false }));
    showToast('🗑️ Reminder cancelled & deleted');
  };

  const openBarberBookService = (svcName, svcPrice) => {
    setBookingForm({ name: '', phone: '', email: '', svc: `${svcName}|${svcPrice}`, date: '', time: '' });
    setModals(m => ({ ...m, booking: true }));
  };

  const openCustomerBookService = (svcName, svcPrice) => {
    setCustBookForm(prev => ({ ...prev, svc: `${svcName}|${svcPrice}` }));
    setModals(m => ({ ...m, custBook: true }));
  };

  // --- SUBMITS ---
  const submitBooking = async (e) => {
    e.preventDefault();
    const leaveForDate = leaves.find(l => l.date === bookingForm.date);
    if (leaveForDate) {
      if (leaveForDate.allDay) {
        showToast(`❌ Shop is closed all day on this date.`);
        return;
      } else if (bookingForm.time >= leaveForDate.startTime && bookingForm.time < leaveForDate.endTime) {
        showToast(`❌ Shop is closed from ${fmtTime(leaveForDate.startTime)} to ${fmtTime(leaveForDate.endTime)} on this date.`);
        return;
      }
    }
    const [svcName, svcPrice] = bookingForm.svc.split('|');
    
    let c = customers.find(x => x.phone === bookingForm.phone);
    let customerId;
    
    setModals(m => ({ ...m, booking: false }));
    setBookingForm({ name: '', phone: '', email: '', svc: '', date: '', time: '' });
    showToast('✅ Booked for ' + bookingForm.name);
    
    if (c) {
      customerId = c.id;
      db.collection("customers").doc(customerId).update({
        visits: c.visits + 1,
        spent: c.spent + +svcPrice,
        lastVisit: bookingForm.date,
        email: bookingForm.email || c.email
      });
    } else {
      const newCustRef = db.collection("customers").doc();
      customerId = newCustRef.id;
      db.collection("customers").doc(customerId).set({
        name: bookingForm.name, phone: bookingForm.phone, email: bookingForm.email,
        visits: 1, spent: +svcPrice, lastVisit: bookingForm.date
      });
    }

    const newBookingRef = db.collection("bookings").doc();
    db.collection("bookings").doc(newBookingRef.id).set({
      customerId: customerId,
      service: svcName, price: +svcPrice, date: bookingForm.date, time: bookingForm.time, status: 'PENDING'
    });

    fetch('/api/notifications/appointment-success', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: bookingForm.email, customerName: bookingForm.name, serviceName: svcName,
        appointmentDate: `${bookingForm.date} ${fmtTime(bookingForm.time)}`, price: svcPrice, customerPhone: bookingForm.phone, appUrl: window.location.origin
      })
    }).catch(err => console.error('Email Error:', err));
  };

  const submitAddCust = async (e) => {
    e.preventDefault();
    const checkName = addCustForm.name.trim().toLowerCase();
    const isDup = customers.some(x => x.phone === addCustForm.phone || (checkName && x.name.toLowerCase() === checkName));
    if (isDup) {
      showToast('⚠️ already existed.please try another username/email/phonenumber/password');
      return;
    }
    const newCustRef = db.collection("customers").doc();
    await newCustRef.set({ name: addCustForm.name, phone: addCustForm.phone, email: addCustForm.email, visits: 0, spent: 0, lastVisit: 'N/A' });
    
    setModals(m => ({ ...m, addCust: false }));
    setAddCustForm({ name: '', phone: '', email: '' });
    showToast('✅ Customer added!');
  };

  const custSubmitBooking = async (e) => {
    e.preventDefault();
    const leaveForDate = leaves.find(l => l.date === custBookForm.date);
    if (leaveForDate) {
      if (leaveForDate.allDay) {
        showToast(`❌ Shop is closed all day on this date.`);
        return;
      } else if (custBookForm.time >= leaveForDate.startTime && custBookForm.time < leaveForDate.endTime) {
        showToast(`❌ Shop is closed from ${fmtTime(leaveForDate.startTime)} to ${fmtTime(leaveForDate.endTime)} on this date.`);
        return;
      }
    }
    const [svcName, svcPrice] = custBookForm.svc.split('|');
    
    setModals(m => ({ ...m, custBook: false }));
    setCustBookForm(prev => ({ ...prev, svc: '', date: '', time: '' }));
    showToast('✅ Booked successfully!');

    let c = customers.find(x => x.id === loggedInCustomer.id);
    if (c) {
      db.collection("customers").doc(c.id).update({
        name: custBookForm.name,
        visits: c.visits + 1,
        spent: c.spent + +svcPrice,
        lastVisit: custBookForm.date,
        email: custBookForm.email || c.email
      });
      setLoggedInCustomer({ ...c, name: custBookForm.name, email: custBookForm.email || c.email });
    }

    const newBookingRef = db.collection("bookings").doc();
    db.collection("bookings").doc(newBookingRef.id).set({
      customerId: loggedInCustomer.id,
      service: svcName, price: +svcPrice, date: custBookForm.date, time: custBookForm.time, status: 'PENDING'
    });

    fetch('/api/notifications/appointment-success', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: custBookForm.email, customerName: custBookForm.name, serviceName: svcName,
        appointmentDate: `${custBookForm.date} ${fmtTime(custBookForm.time)}`, price: svcPrice, customerPhone: loggedInCustomer.phone, appUrl: window.location.origin
      })
    }).catch(err => console.error('Email Error:', err));
  };

  const submitManualReminder = async (e) => {
    e.preventDefault();
    console.log("🔥 Reminder function triggered");
    
    let name = remForm.name, phone = remForm.phone, email = remForm.email;
    let customerId = null;
    if (loginRole === 'customer') {
      name = loggedInCustomer.name;
      phone = loggedInCustomer.phone;
      customerId = loggedInCustomer.id;
    } else {
      const c = customers.find(x => x.phone === phone);
      if (c) customerId = c.id;
    }
    
    const formattedTime = fmtTime(remForm.time);
    
    const reminderData = {
      customerId: customerId,
      message: remForm.svc, // Use svc/type as message context
      date: remForm.date,
      time: formattedTime || "",
      status: 'PENDING', // Force PENDING per requirements
      createdAt: new Date(),
      // Preserving old fields for UI compatibility if needed, but the prompt requested the specific schema
      sentAt: nowStr(), 
      remindDate: remForm.date, 
      remindTime: formattedTime,
      type: remForm.svc
    };

    console.log("📦 Data:", reminderData);

    try {
      // Temporary Test Mode Write
      await db.collection("reminders").add({
        test: "working",
        createdAt: new Date()
      });
      console.log("✅ Temporary test reminder stored");

      // Actual Write
      await db.collection("reminders").add(reminderData);
      console.log("✅ Reminder stored");

      fetch('/api/notifications/reminder-scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: email, customerName: name, customerPhone: phone,
          serviceName: remForm.svc, remindDate: remForm.date, remindTime: formattedTime
        })
      }).catch(err => console.error('Email Error:', err));

      setModals(m => ({ ...m, rem: false }));
      setRemForm({ name: '', phone: '', email: '', svc: '', date: '', time: '' });
      showToast(`🔔 Service reminder scheduled for ${name}!`);
    } catch (error) {
      console.error("❌ Error:", error);
      showToast('❌ Failed to schedule reminder. Check console.');
    }
  };

  const submitReschedule = async (e) => {
    e.preventDefault();
    const leaveForDate = leaves.find(l => l.date === rescheduleForm.date);
    if (leaveForDate) {
      if (leaveForDate.allDay) {
        showToast(`❌ Shop is closed all day on this date.`);
        return;
      } else if (rescheduleForm.time >= leaveForDate.startTime && rescheduleForm.time < leaveForDate.endTime) {
        showToast(`❌ Shop is closed from ${fmtTime(leaveForDate.startTime)} to ${fmtTime(leaveForDate.endTime)} on this date.`);
        return;
      }
    }
    const b = bookings.find(x => x.id === rescheduleForm.id);
    await db.collection("bookings").doc(rescheduleForm.id).update({ date: rescheduleForm.date, time: rescheduleForm.time });
    
    setModals(m => ({ ...m, reschedule: false }));

    if (b) {
      const c = customers.find(x => x.id === b.customerId);
      if (c) {
        fetch('/api/notifications/appointment-rescheduled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: c.email || '', customerName: c.name, customerPhone: c.phone,
            serviceName: b.service, 
            appointmentDate: `${rescheduleForm.date} ${fmtTime(rescheduleForm.time)}`,
            oldAppointmentDate: `${b.date} ${fmtTime(b.time)}`
          })
        }).catch(err => console.error('Email Error:', err));
      }
    }

    showToast('📅 Appointment rescheduled');
  };

  // --- RENDERS ---
  const renderLanding = () => (
    <div id="landing-page">
      <nav className="nav">
        <a className="nav-brand" href="#">
          <div className="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" /></svg></div>
          <div><div className="nav-title">SHOBANA HAIR SALON</div><div className="nav-sub">PREMIUM GROOMING</div></div>
        </a>
        <div className="nav-btns">
          <button className="brut-btn" onClick={() => { setLoginRole('customer'); setView('login'); }}>📅 Book</button>
          <button className="brut-btn brut-white" onClick={() => { setLoginRole('customer'); setView('login'); }}>👤 My Visits</button>
          <button className="brut-btn brut-yellow" onClick={() => { setLoginRole('barber'); setView('login'); }}>🔔 Barber</button>
        </div>
      </nav>

      <div className="marquee">
        <div className="marquee-track">
          <div className="marquee-items"><span>★ BEST BARBER IN TOWN</span><span>✂ HAIRCUT FROM ₹149</span><span>★ OPEN 8AM–10PM · TUESDAY CLOSED</span><span>✂ CALL 8686383723</span><span>★ SERVICE REMINDERS</span></div>
          <div className="marquee-items"><span>★ BEST BARBER IN TOWN</span><span>✂ HAIRCUT FROM ₹149</span><span>★ OPEN 8AM–10PM · TUESDAY CLOSED</span><span>✂ CALL 8686383723</span><span>★ SERVICE REMINDERS</span></div>
        </div>
      </div>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <div className="hero-badge">★ ★ BEST BARBER ★ ★</div>
            <h1 className="hero-title">SHOBANA<br />HAIR<br /><span className="hero-highlight">SALON</span></h1>
            <p className="hero-desc">Look sharp, stay sharp — we’ll remind you when it’s time.</p>
            <div className="hero-actions">
              <button className="brut-btn text-lg" onClick={() => { setLoginRole('customer'); setView('login'); }}>BOOK NOW →</button>
              <a href="tel:8686383723" className="brut-btn brut-white text-lg">📞 86863 83723</a>
            </div>
          </div>
          <div className="hero-img-wrap">
            <div className="brut-card hero-img-card">
              <img src="https://images.pexels.com/photos/20785318/pexels-photo-20785318.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="Barber" />
            </div>
            <div className="hero-hours-tag">OPEN 8AM – 10PM</div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-inner">
          {FEATS.map((f, i) => (
            <div key={i} className="brut-card feat-card">
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="pricelist-section" style={{ position: 'relative', zIndex: 10 }}>
        <div className="pricelist-wrap">
          <motion.div 
            className="brut-card pricelist-card"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            whileHover={{ scale: 1.02, rotateX: 5, rotateY: 5 }}
            variants={{
              hidden: { opacity: 0, y: 50, rotateX: 20 },
              visible: { 
                opacity: 1, y: 0, rotateX: 0,
                transition: { type: 'spring', stiffness: 100, damping: 15, staggerChildren: 0.1, delayChildren: 0.2 }
              }
            }}
            style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
          >
            <div className="pricelist-header">
              <div className="pricelist-title">PRICE<span className="script-text">list</span></div>
              <div className="pricelist-line"></div>
            </div>
            <div className="pricelist-body">
              {SERVICES.map((s, i) => (
                <motion.div 
                  key={i} 
                  className={`price-row clickable ${i % 2 === 0 ? 'price-row-dark' : 'price-row-light'}`}
                  onClick={() => setLandingServiceModal(s)}
                  variants={{
                    hidden: { opacity: 0, x: -40 },
                    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 120 } }
                  }}
                >
                  <span className="pr-name">{s.name}</span>
                  <span className="pr-price">₹{s.price}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <div className="pricelist-cta">
            <button className="brut-btn text-lg" onClick={() => { setLoginRole('customer'); setView('login'); }}>BOOK A SERVICE →</button>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="foot-inner">
          <div><div className="foot-brand">SHOBANA HAIR SALON</div><div className="foot-sub">★ ★ BEST BARBER ★ ★</div></div>
          <div><div className="foot-heading">HOURS</div><div>🕐 Mon, Wed–Sun: 8AM – 10PM</div><div style={{ marginTop: '4px', color: '#ff6b6b' }}>🚫 Tuesday: CLOSED</div></div>
          <div><div className="foot-heading">CONTACT</div><div style={{ marginBottom: '8px' }}><a href="tel:8686383723" style={{ color: 'inherit', textDecoration: 'none' }}>📞 86863 83723</a></div><div><a href="https://maps.google.com/?q=SHOBANA+MEANS+BEAUTY+SALON+Boosareddy+Guda,+Suman+Housing+Colony,+West+Marredpally,+Hyderabad,+Secunderabad,+Telangana+500026" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>📍 Visit us today</a></div></div>
        </div>
        <div className="foot-bottom">© 2026 SHOBANA HAIR SALON · BUILT WITH ✂</div>
      </footer>
    </div>
  );

  const renderLogin = () => (
    <div className="login-screen" id="login-screen">
      <div className="login-card">
        <button className="login-back" onClick={() => { setView('landing'); setLoginForm({ user: '', pass: '', name: '', error: '' }); }}>← Back</button>
        <div className="login-logo">✂️</div>
        <h1 className="login-h">Shobana Hair Salon</h1>
        <p className="login-sub">Sign in to continue</p>
        <div className="login-tabs">
          <button className={`ltab ${loginRole === 'barber' ? 'active' : ''}`} onClick={() => setLoginRole('barber')}>Barber</button>
          <button className={`ltab ${loginRole === 'customer' ? 'active' : ''}`} onClick={() => setLoginRole('customer')}>Customer</button>
        </div>
        <form onSubmit={handleLogin}>
          {loginRole === 'customer' && (
            <div className="fg"><label className="fl">Full Name</label><input className="fi" placeholder="Enter your full name" value={loginForm.name} onChange={e => setLoginForm({ ...loginForm, name: e.target.value })} /></div>
          )}
          <div className="fg"><label className="fl">Phone</label><input className="fi" required placeholder={loginRole === 'barber' ? 'Enter username' : 'Enter phone number'} value={loginForm.user} onChange={e => setLoginForm({ ...loginForm, user: e.target.value })} /></div>
          <div className="fg">
            <label className="fl">Password</label>
            <input className="fi" type={showPassword ? "text" : "password"} required placeholder={loginRole === 'barber' ? 'Enter password' : 'Set or enter password'} value={loginForm.pass} onChange={e => setLoginForm({ ...loginForm, pass: e.target.value })} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
              <input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} /> Show Password
            </label>
          </div>
          <div className="login-err">{loginForm.error}</div>
          <button type="submit" className="brut-btn full">Sign In</button>
        </form>
      </div>
    </div>
  );

  const renderBarberPortal = () => {
    const today = todayStr();
    const todayBookings = bookings.filter(b => b.date === today);
    const todayReminders = reminders.filter(r => (r.status === 'Scheduled' || r.status === 'PENDING') && r.remindDate === today);
    const rev = bookings.filter(b => b.status === 'COMPLETED' && (b.completedAt === today || (!b.completedAt && b.date === today))).reduce((a, b) => a + Number(b.price), 0);

    const currentMonthStr = today.slice(0, 7);
    const monthRev = bookings.filter(b => b.status === 'COMPLETED' && ((b.completedAt && b.completedAt.startsWith(currentMonthStr)) || (!b.completedAt && b.date.startsWith(currentMonthStr)))).reduce((a, b) => a + Number(b.price), 0);

    const pending = bookings.filter(b => b.status === 'PENDING' && b.date === today).sort((a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')));
    
    let bookList = [...bookings].sort((a, b) => ((b.date || '') + (b.time || '')).localeCompare((a.date || '') + (a.time || '')));
    if (bFilter !== 'all') bookList = bookList.filter(b => b.status === bFilter);
    if (bDateFilter) bookList = bookList.filter(b => b.date === bDateFilter);
    if (bSearch) bookList = bookList.filter(b => (getCName(b.customerId) + b.service).toLowerCase().includes(bSearch.toLowerCase()));

    let custList = [...customers];
    if (cSearch) custList = custList.filter(c => (c.name || '').toLowerCase().includes(cSearch.toLowerCase()) || (c.phone || '').includes(cSearch));

    return (
      <div id="barber-app">
        <div className="topbar">
          <div className="topbar-brand">✂️ Shobana</div>
          <div className="topbar-nav">
            <button className={bTab === 'dashboard' ? 'active' : ''} onClick={() => setBTab('dashboard')}>Dashboard</button>
            <button className={bTab === 'analytics' ? 'active' : ''} onClick={() => setBTab('analytics')}>Analytics</button>
            <button className={bTab === 'bookings' ? 'active' : ''} onClick={() => setBTab('bookings')}>Bookings</button>
            <button className={bTab === 'customers' ? 'active' : ''} onClick={() => setBTab('customers')}>Customers</button>
            <button className={bTab === 'reminders' ? 'active' : ''} onClick={() => setBTab('reminders')}>Reminders</button>
            <button className={bTab === 'services' ? 'active' : ''} onClick={() => setBTab('services')}>Services</button>
            <button className={bTab === 'account' ? 'active' : ''} onClick={() => { setBTab('account'); setAccountForm({ ...barberAuth, error: '' }); }}>Account</button>
          </div>
          <div className="topbar-acts">
            <button className="ab ao" title="Sync Data" onClick={() => setModals(m => ({ ...m, booking: true }))}>+ New</button>
            <button className="btn-logout" onClick={() => setModals(m => ({ ...m, rem: true }))}>🔔 Set Service Reminder</button>
            <button className="btn-logout" onClick={logout}>Logout</button>
          </div>
        </div>
        <div className="main">
          {bTab === 'dashboard' && (
            <div className="bv">
              <div className="ph"><h1>Dashboard</h1><p>Daily Overview</p></div>
              <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="sb"><div className="si blue">📅</div><div className="sv">{pending.length || '--'}</div><div className="sl">Bookings</div></div>
                <div className="sb"><div className="si purple">📨</div><div className="sv">{todayReminders.length || '--'}</div><div className="sl">Reminders</div></div>
                <div className="sb"><div className="si gold">₹</div><div className="sv">{rev ? '₹' + rev : '--'}</div><div className="sl">Today's Revenue</div></div>
                <div className="sb"><div className="si green">👥</div><div className="sv">{customers.length || '--'}</div><div className="sl">Total Customers</div></div>
              </div>
              <div className="card">
                <div className="ch" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>Bookings</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {pending.length > 0 && <button className="brut-btn text-sm" title="Mark All Done" onClick={() => setModals(m => ({ ...m, confirmMarkAllDone: true }))} style={{ padding: '4px 10px', fontSize: '1rem', boxShadow: 'none', backgroundColor: '#2ecc71', color: 'white', borderColor: '#27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>☑️</button>}
                    {selectedBookings.length > 0 && <button className="brut-btn brut-white text-sm" onClick={bulkNoShow} style={{ padding: '4px 10px', fontSize: '0.9rem', boxShadow: 'none', backgroundColor: '#ffebe9', color: '#d73a49', border: '1px solid #d73a49' }}>🚫 Bulk No Show</button>}
                  </div>
                </div>
                <div className="cb">
                  <table>
                    <thead><tr><th><input type="checkbox" onChange={(e) => setSelectedBookings(e.target.checked ? pending.map(b => b.id) : [])} checked={selectedBookings.length === pending.length && pending.length > 0} /></th><th>Date</th><th>Time</th><th>Customer</th><th>Phone</th><th>Service</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {pending.length === 0 ? <tr><td colSpan="9"><div className="empty"><p>No upcoming bookings</p></div></td></tr> : 
                        pending.map(b => (
                          <tr key={b.id}>
                            <td><input type="checkbox" checked={selectedBookings.includes(b.id)} onChange={() => toggleSelection(b.id)} /></td><td>{b.date}</td><td style={{ fontWeight: 500 }}>{fmtTime(b.time)}</td><td className="nc">{getCName(b.customerId)}</td><td>{getCPhone(b.customerId)}</td>
                            <td>{b.service}</td><td>₹{b.price}</td><td><span className="badge bp">PENDING</span></td>
                            <td className="ac"><button className="ab ag" onClick={() => openConfirmMarkDone(b.id, getCName(b.customerId))} title="Mark Done">✓</button><button className="ab ao" onClick={() => openReschedule(b.id)} title="Reschedule">📅</button><button className="ab" style={{ backgroundColor: '#ffebe9', color: '#d73a49', border: '1px solid #d73a49', boxShadow: 'none', fontSize: '0.9rem' }} onClick={() => markNoShow(b.id)} title="Mark No Show">🚫</button><button className="ab ar" onClick={() => openConfirmCancelB(b.id, getCName(b.customerId))} title="Cancel Booking">✕</button></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {bTab === 'analytics' && (
            <div className="bv">
              <div className="ph"><h1>Analytics</h1><p>Financial Overview</p></div>
              <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="sb"><div className="si gold">₹</div><div className="sv">{monthRev ? '₹' + monthRev : '--'}</div><div className="sl">Month Turnover</div></div>
              </div>
            </div>
          )}

          {bTab === 'bookings' && (
            <div className="bv">
              <div className="ph split">
                <div><h1>Bookings for {new Date().toLocaleString('default', { month: 'long' })} month</h1><p>Manage appointments</p></div>
                <div className="sbar" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {pending.length > 0 && <button className="brut-btn text-sm" title="Mark All Done" onClick={() => setModals(m => ({ ...m, confirmMarkAllDone: true }))} style={{ padding: '4px 10px', fontSize: '1rem', boxShadow: 'none', backgroundColor: '#2ecc71', color: 'white', borderColor: '#27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>☑️</button>}
                  {selectedBookings.length > 0 && <button className="brut-btn brut-white text-sm" onClick={bulkNoShow} style={{ padding: '4px 10px', fontSize: '0.9rem', boxShadow: 'none', backgroundColor: '#ffebe9', color: '#d73a49', border: '1px solid #d73a49' }}>🚫 Bulk No Show</button>}
                  <button className="brut-btn text-sm" onClick={() => setModals(m => ({ ...m, confirmClearHistory: true }))} title="Clear History" style={{ padding: '4px 10px', fontSize: '1rem', boxShadow: 'none', backgroundColor: '#e74c3c', color: 'white', borderColor: '#c0392b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
                  <input type="date" className="sinp" value={bDateFilter} onChange={e => setBDateFilter(e.target.value)} />
                  <input className="sinp" placeholder="Search..." value={bSearch} onChange={e => setBSearch(e.target.value)} />
                  <select className="ssel" value={bFilter} onChange={e => setBFilter(e.target.value)}>
                    <option value="all">All</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="card">
                <div className="cb">
                  <table>
                    <thead><tr><th>Date</th><th>Time</th><th>Customer</th><th>Service</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {bookList.length === 0 ? <tr><td colSpan="7"><div className="empty"><p>No bookings found</p></div></td></tr> : 
                        bookList.map(b => (
                          <tr key={b.id}>
                            <td>{b.date}</td><td>{fmtTime(b.time)}</td><td className="nc">{getCName(b.customerId)}</td><td>{b.service}</td><td>₹{b.price}</td>
                            <td><span className={`badge ${sCls(b.status)}`}>{b.status}</span></td>
                            <td className="ac">{b.status === 'PENDING' && <><button className="ab ag" onClick={() => openConfirmMarkDone(b.id, getCName(b.customerId))} title="Mark Done">✓</button><button className="ab" style={{ backgroundColor: '#ffebe9', color: '#d73a49', border: '1px solid #d73a49', boxShadow: 'none', fontSize: '0.9rem' }} onClick={() => markNoShow(b.id)} title="Mark No Show">🚫</button><button className="ab ar" onClick={() => openConfirmCancelB(b.id, getCName(b.customerId))} title="Cancel Booking">✕</button></>}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {bTab === 'customers' && (
            <div className="bv">
              <div className="ph split">
                <div><h1>Customer Directory</h1><p>Manage your regulars</p></div>
                <div className="sbar"><input className="sinp" placeholder="Search..." value={cSearch} onChange={e => setCSearch(e.target.value)} /><button className="brut-btn" onClick={() => setModals(m => ({ ...m, addCust: true }))}>+ Add Customer</button></div>
              </div>
              <div className="card">
                <div className="cb">
                  <table>
                    <thead><tr><th>Name</th><th>Phone</th><th>Visits</th><th>Spent</th><th>Last Visit</th><th>Actions</th></tr></thead>
                    <tbody>
                      {custList.length === 0 ? <tr><td colSpan="6"><div className="empty"><p>No customers found</p></div></td></tr> : 
                        [...custList].reverse().map(c => (
                          <tr key={c.id}><td className="nc">{c.name}</td><td>{c.phone}</td><td>{c.visits}</td><td>₹{c.spent}</td><td>{typeof c.lastVisit === 'object' && c.lastVisit ? new Date(c.lastVisit.seconds * 1000).toLocaleDateString() : (c.lastVisit || 'N/A')}</td><td className="ac"><button className="ab ar" onClick={() => deleteCust(c.id)} title="Delete">✕</button></td></tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {bTab === 'reminders' && (
            <div className="bv">
              <div className="ph split">
                <div><h1>Service Reminders</h1><p>Manual reminders</p></div>
                <div><button className="brut-btn brut-white text-sm" style={{ boxShadow: 'none' }} onClick={clearAllReminders}>Clear All Reminders</button></div>
              </div>
              <div className="card">
                <div className="ch"><h2>Reminder Log</h2></div>
                <div className="cb">
                  <table>
                    <thead><tr><th>Set On</th><th>Date</th><th>Time</th><th>Customer</th><th>Phone</th><th>Service</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {reminders.filter(r => r.status !== 'Delivered' || r.remindDate >= today).length === 0 ? <tr><td colSpan="8"><div className="empty"><p>No pending reminders</p></div></td></tr> : 
                        [...reminders].filter(r => r.status !== 'Delivered' || r.remindDate >= today).reverse().map(r => {
                          const dateStr = r.remindDate ? r.remindDate : r.sentAt.split(' ')[0];
                          const timeStr = r.remindTime ? r.remindTime : (r.sentAt.split(' ')[1] ? fmtTime(r.sentAt.split(' ')[1]) : '--');
                          return (
                            <tr key={r.id}><td>{r.sentAt}</td><td>{dateStr}</td><td style={{ fontWeight: 500 }}>{timeStr}</td><td className="nc">{getCName(r.customerId)}</td><td>{getCPhone(r.customerId)}</td><td><span className="badge bp">{r.type}</span></td><td><span className="badge bs">{r.status}</span></td><td className="ac"><button className="ab ar" onClick={() => openConfirmCancelReminder(r.id, getCName(r.customerId))} title="Delete Reminder">✕</button></td></tr>
                          )
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {bTab === 'services' && (
            <div className="bv">
              <div className="ph"><h1>Services & Pricing</h1><p>8AM–10PM · Ph: 8686383723</p></div>
              <div className="card">
                <div className="pgrid">
                  {SERVICES.map(s => <div key={s.name} className="pcard clickable" onClick={() => openBarberBookService(s.name, s.price)}><span className="pn">{s.name}</span><span className="pt">₹{s.price}</span></div>)}
                </div>
              </div>
            </div>
          )}

          {bTab === 'account' && (
            <div className="bv">
              <div className="ph"><h1>Account Settings</h1><p>Manage your login details and leaves</p></div>
              <div className="sg two">
                <div className="card">
                  <div className="cb" style={{ padding: '30px' }}>
                    <h2>Login Details</h2>
                    <form onSubmit={updateBarberAccount} style={{ marginTop: '20px' }}>
                      <div className="fg"><label className="fl">Name</label><input className="fi" required value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} /></div>
                      <div className="fg"><label className="fl">Phone / Username</label><input className="fi" required value={accountForm.phone} onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })} /></div>
                      <div className="fg"><label className="fl">Email</label><input className="fi" type="email" required value={accountForm.email} onChange={e => setAccountForm({ ...accountForm, email: e.target.value })} /></div>
                      <div className="fg"><label className="fl">Password</label><input className="fi" type="text" required value={accountForm.password} onChange={e => setAccountForm({ ...accountForm, password: e.target.value })} /></div>
                      <div className="login-err">{accountForm.error}</div>
                      <button type="submit" className="brut-btn" style={{ marginTop: '20px' }}>Update Account</button>
                    </form>
                  </div>
                </div>

                <div className="card">
                  <div className="cb" style={{ padding: '30px' }}>
                    <h2>Manage Leaves</h2>
                    <p style={{ margin: '10px 0', color: '#666' }}>All Tuesdays are automatically closed.</p>
                    <form onSubmit={(e) => { e.preventDefault(); setModals(m => ({ ...m, confirmAddLeave: true })); }} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input type="date" className="fi" value={leaveDateForm} onChange={e => setLeaveDateForm(e.target.value)} />
                        <button type="button" className="brut-btn brut-white text-sm" onClick={addToPendingLeaves} style={{ padding: '8px 12px', boxShadow: 'none' }}>+ Add Date</button>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' }}>
                          <input type="checkbox" checked={leaveAllDay} onChange={e => setLeaveAllDay(e.target.checked)} /> All Day
                        </label>
                      </div>

                      {pendingLeaveDates.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '5px' }}>
                          {pendingLeaveDates.map(d => (
                            <div key={d} className="badge bs" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px' }}>
                              {d} <span onClick={() => removePendingLeave(d)} style={{ cursor: 'pointer', fontWeight: 'bold' }}>✕</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {!leaveAllDay && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <select className="fi" required={!leaveAllDay} value={leaveStartTime} onChange={e => setLeaveStartTime(e.target.value)}>
                            {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                          </select>
                          <span>to</span>
                          <select className="fi" required={!leaveAllDay} value={leaveEndTime} onChange={e => setLeaveEndTime(e.target.value)}>
                            {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                          </select>
                        </div>
                      )}
                      <button type="submit" className="brut-btn" style={{ padding: '0 20px', width: 'fit-content' }}>{pendingLeaveDates.length > 1 ? `Add ${pendingLeaveDates.length} Leaves` : 'Add Leave'}</button>
                    </form>
                    
                    <div style={{ marginTop: '20px', maxHeight: '200px', overflowY: 'auto' }}>
                      {leaves.length === 0 ? <p className="empty" style={{ padding: '10px 0' }}>No specific leaves added.</p> : 
                        [...leaves].sort((a,b) => a.date.localeCompare(b.date)).map(l => (
                          <div key={l.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                            <span>{l.date} {l.allDay ? '(All Day)' : `(${fmtTime(l.startTime)} - ${fmtTime(l.endTime)})`}</span>
                            <button type="button" onClick={() => removeLeave(l.date)} style={{ background: 'none', border: 'none', color: '#d73a49', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                          </div>
                        ))
                      }
                    </div>

                    <div style={{ marginTop: '40px', padding: '20px', border: '1px solid #d73a49', borderRadius: '8px', backgroundColor: '#ffebe9' }}>
                      <h3 style={{ color: '#d73a49', margin: '0 0 10px 0' }}>Emergency Action</h3>
                      <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem' }}>Instantly close shop for today. Cancels relevant bookings and emails customers.</p>
                      
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <input type="checkbox" checked={emergencyAllDay} onChange={e => setEmergencyAllDay(e.target.checked)} /> All Day
                        </label>
                      </div>
                      {!emergencyAllDay && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
                          <select className="fi" required={!emergencyAllDay} value={emergencyStartTime} onChange={e => setEmergencyStartTime(e.target.value)}>
                            {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                          </select>
                          <span>to</span>
                          <select className="fi" required={!emergencyAllDay} value={emergencyEndTime} onChange={e => setEmergencyEndTime(e.target.value)}>
                            {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                          </select>
                        </div>
                      )}
                      
                      <button className="brut-btn" onClick={() => setModals(m => ({ ...m, confirmEmergencyClose: true }))} style={{ backgroundColor: '#cb2431', width: '100%', border: 'none' }}>🚨 Close Shop Today</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCustomerPortal = () => {
    if (!loggedInCustomer) return null;
    const today = todayStr();
    const mine = bookings.filter(b => b.customerId === loggedInCustomer.id);
    const myRems = reminders.filter(r => r.customerId === loggedInCustomer.id && (r.status !== 'Delivered' || r.remindDate >= today));
    
    const upB = mine.filter(b => b.status === 'PENDING');
    const pastB = mine.filter(b => b.status === 'COMPLETED');
    const upcoming = [...mine].filter(b => b.status === 'PENDING').sort((a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')));

    let displayName = loggedInCustomer.name;
    if (displayName.startsWith('Customer ')) {
      const parts = displayName.split(' ');
      if (parts.length > 2) displayName = parts.slice(1).join(' ');
    }

    return (
      <div id="customer-app">
        <div className="topbar">
          <div className="topbar-brand">✂️ Shobana</div>
          <div className="topbar-nav">
            <button className={cTab === 'home' ? 'active' : ''} onClick={() => setCTab('home')}>Home</button>
            <button className={cTab === 'mybookings' ? 'active' : ''} onClick={() => setCTab('mybookings')}>My Bookings</button>
            <button className={cTab === 'myreminders' ? 'active' : ''} onClick={() => setCTab('myreminders')}>My Reminders</button>
            <button className={cTab === 'svclist' ? 'active' : ''} onClick={() => setCTab('svclist')}>Services</button>
            <button className={cTab === 'account' ? 'active' : ''} onClick={() => { setCTab('account'); setAccountForm({ name: loggedInCustomer.name, phone: loggedInCustomer.phone, email: loggedInCustomer.email || '', password: loggedInCustomer.password || '', error: '' }); }}>Account</button>
          </div>
          <div className="topbar-acts">
            <span className="cname">{displayName}</span>
            <button className="btn-logout" onClick={() => setModals(m => ({ ...m, rem: true }))}>🔔 Set Service Reminder</button>
            <button className="btn-logout" onClick={logout}>Logout</button>
          </div>
        </div>
        <div className="main">
          {cTab === 'home' && (
            <div className="cv">
              <div className="chero">
                <h1>Welcome, <span>{displayName}</span>!</h1>
                <p>Book your next appointment</p>
                <button className="brut-btn" onClick={() => setModals(m => ({ ...m, custBook: true }))}>📅 Book Now</button>
              </div>
              <div className="sg two">
                <div className="sb"><div className="si blue">📅</div><div className="sv">{upB.length || '--'}</div><div className="sl">Upcoming</div></div>
                <div className="sb"><div className="si green">✅</div><div className="sv">{pastB.length || '--'}</div><div className="sl">Completed</div></div>
              </div>
              <div className="card">
                <div className="ch"><h2>Upcoming Appointments</h2></div>
                <div className="cb">
                  {upcoming.length > 0 ? (
                    <table>
                      <thead><tr><th>Date</th><th>Time</th><th>Service</th><th>Amount</th></tr></thead>
                      <tbody>
                        {upcoming.map(b => (
                          <tr key={b.id}>
                            <td>{b.date}</td>
                            <td>{fmtTime(b.time)}</td>
                            <td>{b.service}</td>
                            <td>₹{b.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <div className="empty"><p>No upcoming. Book now!</p></div>}
                </div>
              </div>
            </div>
          )}

          {cTab === 'mybookings' && (
            <div className="cv">
              <div className="ph"><h1>My Bookings</h1><p>Full history of your visits</p></div>
              <div className="card">
                <div className="cb">
                  <table>
                    <thead><tr><th>Date</th><th>Time</th><th>Service</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {mine.length === 0 ? <tr><td colSpan="6"><div className="empty"><p>No bookings history</p></div></td></tr> : 
                        [...mine].sort((a, b) => ((b.date || '') + (b.time || '')).localeCompare((a.date || '') + (a.time || ''))).map(b => (
                          <tr key={b.id}>
                            <td>{b.date}</td><td>{fmtTime(b.time)}</td><td>{b.service}</td><td>₹{b.price}</td>
                            <td><span className={`badge ${sCls(b.status)}`}>{b.status}</span></td>
                            <td className="ac">{b.status === 'PENDING' && <button className="ab ar" onClick={() => openConfirmCancelB(b.id, getCName(b.customerId))} title="Cancel Booking">✕</button>}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {cTab === 'myreminders' && (
            <div className="cv">
              <div className="ph split">
                <div><h1>My Service Reminders</h1><p>Scheduled alerts for your services</p></div>
                <div><button className="brut-btn brut-white text-sm" style={{ boxShadow: 'none' }} onClick={clearAllReminders}>Clear All</button></div>
              </div>
              <div className="card">
                <div className="cb">
                  <table>
                    <thead><tr><th>Set On</th><th>Date</th><th>Time</th><th>Service</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {myRems.length === 0 ? <tr><td colSpan="6"><div className="empty"><p>No scheduled reminders</p></div></td></tr> : 
                        [...myRems].reverse().map(r => {
                          const dateStr = r.remindDate ? r.remindDate : r.sentAt.split(' ')[0];
                          const timeStr = r.remindTime ? r.remindTime : (r.sentAt.split(' ')[1] ? fmtTime(r.sentAt.split(' ')[1]) : '--');
                          return (<tr key={r.id}><td>{r.sentAt}</td><td>{dateStr}</td><td style={{ fontWeight: 500 }}>{timeStr}</td><td><span className="badge bp">{r.type}</span></td><td><span className="badge bs">{r.status}</span></td><td className="ac">{r.status !== 'Delivered' && <button className="ab ar" onClick={() => openConfirmCancelReminder(r.id, r.name || displayName)} title="Cancel Reminder">✕</button>}</td></tr>)
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {cTab === 'svclist' && (
            <div className="cv">
              <div className="ph"><h1>Our Services</h1></div>
              <div className="card">
                <div className="pgrid">
                  {SERVICES.map(s => <div key={s.name} className="pcard clickable" onClick={() => openCustomerBookService(s.name, s.price)}><span className="pn">{s.name}</span><span className="pt">₹{s.price}</span></div>)}
                </div>
              </div>
            </div>
          )}

          {cTab === 'account' && (
            <div className="cv">
              <div className="ph"><h1>My Account</h1><p>Update your login and contact details</p></div>
              <div className="card" style={{ maxWidth: '600px' }}>
                <div className="cb" style={{ padding: '30px' }}>
                  <form onSubmit={updateCustomerAccount}>
                    <div className="fg"><label className="fl">Name</label><input className="fi" required value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} /></div>
                    <div className="fg"><label className="fl">Phone Number (Login ID)</label><input className="fi" required value={accountForm.phone} onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })} /></div>
                    <div className="fg"><label className="fl">Email Address</label><input className="fi" type="email" required value={accountForm.email} onChange={e => setAccountForm({ ...accountForm, email: e.target.value })} /></div>
                    <div className="fg"><label className="fl">Password</label><input className="fi" type="text" required value={accountForm.password} onChange={e => setAccountForm({ ...accountForm, password: e.target.value })} /></div>
                    <div className="login-err">{accountForm.error}</div>
                    <button type="submit" className="brut-btn" style={{ marginTop: '20px' }}>Update Details</button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderModals = () => (
    <>
      {landingServiceModal && (
        <div className="mo open">
          <div className="modal" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div className="mh" style={{ justifyContent: 'center', borderBottom: 'none' }}>
              <button className="mc" onClick={() => setLandingServiceModal(null)}>&times;</button>
            </div>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>✂️</div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{landingServiceModal.name}</h2>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#000000', marginBottom: '30px' }}>
              ₹{landingServiceModal.price}
            </div>
            <button className="brut-btn text-lg" style={{ width: '100%' }} onClick={() => {
              setPendingBookingSvc(`${landingServiceModal.name}|${landingServiceModal.price}`);
              setLandingServiceModal(null);
              setLoginRole('customer');
              setView('login');
            }}>Book Service →</button>
          </div>
        </div>
      )}

      {modals.booking && (
        <div className="mo open">
          <div className="modal">
            <div className="mh"><h2>New Booking</h2><button className="mc" onClick={() => setModals(m => ({ ...m, booking: false }))}>&times;</button></div>
            <form onSubmit={submitBooking}>
              <div className="mb">
                <div className="fg"><label className="fl">Customer Name</label><input className="fi" required placeholder="Name" value={bookingForm.name} onChange={e => setBookingForm({ ...bookingForm, name: e.target.value })} /></div>
                <div className="fg"><label className="fl">Contact Number</label><input className="fi" required placeholder="9876543210" value={bookingForm.phone} onChange={e => setBookingForm({ ...bookingForm, phone: e.target.value })} /></div>
                <div className="fg"><label className="fl">Email Address</label><input className="fi" type="email" required placeholder="customer@example.com" value={bookingForm.email} onChange={e => setBookingForm({ ...bookingForm, email: e.target.value })} /></div>
                <div className="fg">
                  <label className="fl">Service</label>
                  <select className="fi" required value={bookingForm.svc} onChange={e => setBookingForm({ ...bookingForm, svc: e.target.value })}>
                    <option value="">Select...</option>
                    {SERVICES.map(s => <option key={s.name} value={`${s.name}|${s.price}`}>{s.name} — ₹{s.price}</option>)}
                  </select>
                </div>
                <div className="fr">
                  <div className="fg"><label className="fl">Date</label><input type="date" className="fi" required value={bookingForm.date} onChange={e => handleDateChange(e.target.value, setBookingForm, 'date')} /></div>
                  <div className="fg">
                    <label className="fl">Time</label>
                    <select className="fi" required value={bookingForm.time} onChange={e => setBookingForm({ ...bookingForm, time: e.target.value })}>
                      <option value="">Select time...</option>
                      {getFilteredTimeOptions(bookingForm.date, leaves).map(t => <option key={t.value} value={t.value} disabled={t.isDisabled} style={t.isDisabled ? { color: '#999', backgroundColor: '#f0f0f0' } : {}}>{t.label}{t.labelSuffix}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="mf"><button type="button" className="btn-cancel" onClick={() => setModals(m => ({ ...m, booking: false }))}>Cancel</button><button type="submit" className="brut-btn">Create</button></div>
            </form>
          </div>
        </div>
      )}

      {modals.custBook && (
        <div className="mo open">
          <div className="modal">
            <div className="mh"><h2>Book Appointment</h2><button className="mc" onClick={() => setModals(m => ({ ...m, custBook: false }))}>&times;</button></div>
            <form onSubmit={custSubmitBooking}>
              <div className="mb">
                <div className="fg"><label className="fl">Full Name</label><input className="fi" required placeholder="Your Name" value={custBookForm.name} onChange={e => setCustBookForm({ ...custBookForm, name: e.target.value })} /></div>
                <div className="fg">
                  <label className="fl">Service</label>
                  <select className="fi" required value={custBookForm.svc} onChange={e => setCustBookForm({ ...custBookForm, svc: e.target.value })}>
                    <option value="">Select...</option>
                    {SERVICES.map(s => <option key={s.name} value={`${s.name}|${s.price}`}>{s.name} — ₹{s.price}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Email Address</label><input className="fi" type="email" required placeholder="your@email.com" value={custBookForm.email} onChange={e => setCustBookForm({ ...custBookForm, email: e.target.value })} /></div>
                <div className="fr">
                  <div className="fg"><label className="fl">Date</label><input type="date" className="fi" required value={custBookForm.date} onChange={e => handleDateChange(e.target.value, setCustBookForm, 'date')} /></div>
                  <div className="fg">
                    <label className="fl">Time</label>
                    <select className="fi" required value={custBookForm.time} onChange={e => setCustBookForm({ ...custBookForm, time: e.target.value })}>
                      <option value="">Select time...</option>
                      {getFilteredTimeOptions(custBookForm.date, leaves).map(t => <option key={t.value} value={t.value} disabled={t.isDisabled} style={t.isDisabled ? { color: '#999', backgroundColor: '#f0f0f0' } : {}}>{t.label}{t.labelSuffix}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="mf"><button type="button" className="btn-cancel" onClick={() => setModals(m => ({ ...m, custBook: false }))}>Cancel</button><button type="submit" className="brut-btn">Confirm</button></div>
            </form>
          </div>
        </div>
      )}

      {modals.reschedule && (
        <div className="mo open">
          <div className="modal">
            <div className="mh"><h2>📅 Reschedule Appointment</h2><button className="mc" onClick={() => setModals(m => ({ ...m, reschedule: false }))}>&times;</button></div>
            <form onSubmit={submitReschedule}>
              <div className="mb">
                <div className="fr">
                  <div className="fg"><label className="fl">New Date</label><input type="date" className="fi" required value={rescheduleForm.date} onChange={e => handleDateChange(e.target.value, setRescheduleForm, 'date')} /></div>
                  <div className="fg">
                    <label className="fl">New Time</label>
                    <select className="fi" required value={rescheduleForm.time} onChange={e => setRescheduleForm({ ...rescheduleForm, time: e.target.value })}>
                      <option value="">Select time...</option>
                      {getFilteredTimeOptions(rescheduleForm.date, leaves).map(t => <option key={t.value} value={t.value} disabled={t.isDisabled} style={t.isDisabled ? { color: '#999', backgroundColor: '#f0f0f0' } : {}}>{t.label}{t.labelSuffix}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="mf"><button type="button" className="btn-cancel" onClick={() => setModals(m => ({ ...m, reschedule: false }))}>Cancel</button><button type="submit" className="brut-btn">Update</button></div>
            </form>
          </div>
        </div>
      )}

      {modals.addCust && (
        <div className="mo open">
          <div className="modal">
            <div className="mh"><h2>👥 Add New Customer</h2><button className="mc" onClick={() => setModals(m => ({ ...m, addCust: false }))}>&times;</button></div>
            <form onSubmit={submitAddCust}>
              <div className="mb">
                <div className="fg"><label className="fl">Customer Name</label><input className="fi" required placeholder="Name" value={addCustForm.name} onChange={e => setAddCustForm({ ...addCustForm, name: e.target.value })} /></div>
                <div className="fg"><label className="fl">Phone Number</label><input className="fi" required placeholder="9876543210" value={addCustForm.phone} onChange={e => setAddCustForm({ ...addCustForm, phone: e.target.value })} /></div>
                <div className="fg"><label className="fl">Email Address</label><input className="fi" type="email" required placeholder="email@example.com" value={addCustForm.email} onChange={e => setAddCustForm({ ...addCustForm, email: e.target.value })} /></div>
              </div>
              <div className="mf"><button type="button" className="btn-cancel" onClick={() => setModals(m => ({ ...m, addCust: false }))}>Cancel</button><button type="submit" className="brut-btn">Add Customer</button></div>
            </form>
          </div>
        </div>
      )}

      {modals.rem && (
        <div className="mo open">
          <div className="modal">
            <div className="mh"><h2>🔔 Service Reminder</h2><button className="mc" onClick={() => setModals(m => ({ ...m, rem: false }))}>&times;</button></div>
            <form onSubmit={submitManualReminder}>
              <div className="mb">
                {loginRole === 'barber' ? (
                  <>
                    <div className="fg"><label className="fl">Customer Name</label><input className="fi" required placeholder="Name" value={remForm.name} onChange={e => setRemForm({ ...remForm, name: e.target.value })} /></div>
                    <div className="fg"><label className="fl">Contact Number</label><input className="fi" required placeholder="9876543210" value={remForm.phone} onChange={e => setRemForm({ ...remForm, phone: e.target.value })} /></div>
                    <div className="fg"><label className="fl">Email Address</label><input className="fi" type="email" required placeholder="customer@example.com" value={remForm.email} onChange={e => setRemForm({ ...remForm, email: e.target.value })} /></div>
                  </>
                ) : (
                  <div className="fg"><label className="fl">Email Address</label><input className="fi" type="email" required placeholder="your@email.com" value={remForm.email} onChange={e => setRemForm({ ...remForm, email: e.target.value })} /></div>
                )}
                
                <div className="fg">
                  <label className="fl">Select Service</label>
                  <select className="fi" required value={remForm.svc} onChange={e => setRemForm({ ...remForm, svc: e.target.value })}>
                    <option value="">Select...</option>
                    {SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div className="fr">
                  <div className="fg"><label className="fl">Reminder Date</label><input type="date" className="fi" required value={remForm.date} onChange={e => handleDateChange(e.target.value, setRemForm, 'date')} /></div>
                  <div className="fg">
                    <label className="fl">Time</label>
                    <select className="fi" required value={remForm.time} onChange={e => setRemForm({ ...remForm, time: e.target.value })}>
                      <option value="">Select time...</option>
                      {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="mf"><button type="button" className="btn-cancel" onClick={() => setModals(m => ({ ...m, rem: false }))}>Close</button><button type="submit" className="brut-btn">Schedule Alert</button></div>
            </form>
          </div>
        </div>
      )}

      {modals.confirmCancelBooking && (
        <div className="mo open">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="mh"><h2>Cancel Booking</h2><button className="mc" onClick={() => setModals(m => ({ ...m, confirmCancelBooking: false }))}>&times;</button></div>
            <div className="mb" style={{ padding: '20px 40px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', margin: '0 0 20px 0' }}>Do you want to cancel the booking for <strong>{confirmData.name}</strong>?</p>
            </div>
            <div className="mf" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn-cancel" onClick={() => setModals(m => ({ ...m, confirmCancelBooking: false }))}>No, Keep it</button>
              <button type="button" className="brut-btn" style={{ backgroundColor: '#e74c3c' }} onClick={cancelB}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

      {modals.confirmCancelReminder && (
        <div className="mo open">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="mh"><h2>Cancel Service Reminder</h2><button className="mc" onClick={() => setModals(m => ({ ...m, confirmCancelReminder: false }))}>&times;</button></div>
            <div className="mb" style={{ padding: '20px 40px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', margin: '0 0 20px 0' }}>Do you want to cancel the service reminder for <strong>{confirmData.name}</strong>?</p>
            </div>
            <div className="mf" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn-cancel" onClick={() => setModals(m => ({ ...m, confirmCancelReminder: false }))}>No, Keep it</button>
              <button type="button" className="brut-btn" style={{ backgroundColor: '#e74c3c' }} onClick={deleteReminder}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

      {modals.confirmMarkDone && (
        <div className="mo open">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="mh"><h2>Mark Booking as Done</h2><button className="mc" onClick={() => setModals(m => ({ ...m, confirmMarkDone: false }))}>&times;</button></div>
            <div className="mb" style={{ padding: '20px 40px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', margin: '0 0 20px 0' }}>Do you want to mark the booking as done for <strong>{confirmData.name}</strong>?</p>
            </div>
            <div className="mf" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn-cancel" onClick={() => setModals(m => ({ ...m, confirmMarkDone: false }))}>No</button>
              <button type="button" className="brut-btn" style={{ backgroundColor: '#2ecc71', color: '#fff' }} onClick={markDone}>Yes, Complete</button>
            </div>
          </div>
        </div>
      )}

      {modals.confirmMarkAllDone && (
        <div className="mo open">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="mh"><h2>Mark All Pending as Done</h2><button className="mc" onClick={() => setModals(m => ({ ...m, confirmMarkAllDone: false }))}>&times;</button></div>
            <div className="mb" style={{ padding: '20px 40px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', margin: '0 0 20px 0' }}>Do you want to mark all pending bookings for today as done? This will also send out the Vote of Thanks emails.</p>
            </div>
            <div className="mf" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn-cancel" onClick={() => setModals(m => ({ ...m, confirmMarkAllDone: false }))}>No</button>
              <button type="button" className="brut-btn" style={{ backgroundColor: '#2ecc71', color: '#fff' }} onClick={markAllDone}>Yes, Complete All</button>
            </div>
          </div>
        </div>
      )}

      {modals.confirmClearHistory && (
        <div className="mo open">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="mh"><h2 style={{ color: '#e74c3c' }}>Clear Month History</h2><button className="mc" onClick={() => setModals(m => ({ ...m, confirmClearHistory: false }))}>&times;</button></div>
            <div className="mb" style={{ padding: '20px 40px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', margin: '0 0 20px 0' }}>Are you sure you want to permanently delete all COMPLETED and CANCELLED bookings for this month?</p>
            </div>
            <div className="mf" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn-cancel" onClick={() => setModals(m => ({ ...m, confirmClearHistory: false }))}>No, Cancel</button>
              <button type="button" className="brut-btn" style={{ backgroundColor: '#e74c3c' }} onClick={clearMonthHistory}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
      {modals.confirmAddLeave && (
        <div className="mo open">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="mh"><h2>Confirm Add Leave</h2><button className="mc" onClick={() => setModals(m => ({ ...m, confirmAddLeave: false }))}>&times;</button></div>
            <div className="mb" style={{ padding: '20px 40px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', margin: '0 0 20px 0' }}>Are you sure you want to add this leave? It will cancel overlapping bookings and notify customers.</p>
            </div>
            <div className="mf" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn-cancel" onClick={() => setModals(m => ({ ...m, confirmAddLeave: false }))}>NO, CANCEL</button>
              <button type="button" className="brut-btn" onClick={addLeave}>YES, CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      {modals.confirmEmergencyClose && (
        <div className="mo open">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="mh"><h2 style={{ color: '#d73a49' }}>🚨 Emergency Close Today</h2><button className="mc" onClick={() => setModals(m => ({ ...m, confirmEmergencyClose: false }))}>&times;</button></div>
            <div className="mb" style={{ padding: '20px 40px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', margin: '0 0 20px 0' }}>Are you absolutely sure? This will instantly close the shop for the selected time today, cancel bookings, and alert customers.</p>
            </div>
            <div className="mf" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn-cancel" onClick={() => setModals(m => ({ ...m, confirmEmergencyClose: false }))}>NO, CANCEL</button>
              <button type="button" className="brut-btn" style={{ backgroundColor: '#cb2431' }} onClick={emergencyCloseShop}>YES, CONFIRM</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {view === 'intro' && <IntroSequence onFinish={() => setView('landing')} />}
      {view === 'landing' && renderLanding()}
      {view === 'login' && renderLogin()}
      {view === 'barber' && renderBarberPortal()}
      {view === 'customer' && renderCustomerPortal()}
      {renderModals()}
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}

export default App;
