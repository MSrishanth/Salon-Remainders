import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { motion } from 'framer-motion';
import IntroSequence from './components/IntroSequence';
import { API_URL } from './config';

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
  const [view, setView] = useState(() => {
    const path = window.location.pathname;
    return (path === '/' || path === '') ? 'landing' : '404';
  }); // intro, landing, login, barber, customer, 404
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modals, setModals] = useState({ booking: false, rem: false, custBook: false, addCust: false, reschedule: false, confirmCancelBooking: false, confirmCancelReminder: false, confirmMarkDone: false, confirmAddLeave: false, confirmEmergencyClose: false, bookingDetails: false });

  // Scroll Animations for Landing Page
  useEffect(() => {
    if (view !== 'landing') return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    const elements = document.querySelectorAll('.reveal-up, .reveal-pop');
    elements.forEach(el => observer.observe(el));

    return () => {
      elements.forEach(el => observer.unobserve(el));
    };
  }, [view]);
  const [confirmData, setConfirmData] = useState({ id: null, name: '' });

  const [bookingForm, setBookingForm] = useState({ name: '', phone: '', email: '', svc: '', date: '', time: '' });
  const [custBookForm, setCustBookForm] = useState({ name: '', email: '', svc: '', date: '', time: '' });
  const [landingServiceModal, setLandingServiceModal] = useState(null);
  const [pendingBookingSvc, setPendingBookingSvc] = useState(null);
  const [addCustForm, setAddCustForm] = useState({ name: '', phone: '', email: '' });
  const [remForm, setRemForm] = useState({ name: '', phone: '', email: '', svc: '', date: '', time: '' });
  const [rescheduleForm, setRescheduleForm] = useState({ id: null, date: '', time: '' });
  const [selectedBooking, setSelectedBooking] = useState(null);

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
          } catch (e) { }
        }
      }
    };
    checkAutoDeliver();
    const interval = setInterval(checkAutoDeliver, 60000);
    return () => clearInterval(interval);
  }, [reminders]);

   const handleLogin = async (e) => {
    e.preventDefault();
    const { user, pass, name } = loginForm;
    const cleanUser = user.trim().toLowerCase();
    const checkName = name.trim();
    if (loginRole === 'barber') {
      if (cleanUser === barberAuth.username.toLowerCase() && pass === barberAuth.password) {
        setView('barber');
        setBTab('dashboard');
      } else {
        setLoginForm({ ...loginForm, error: 'Invalid credentials' });
      }
    } else {
      let c = customers.find(x => x.phone === cleanUser || (x.email && x.email.toLowerCase() === cleanUser));

      if (!c) {
        const isDuplicate = customers.some(x =>
          (checkName && x.name.toLowerCase() === checkName.toLowerCase()) ||
          (x.phone === cleanUser) ||
          (x.email && x.email.toLowerCase() === cleanUser)
        );
        if (isDuplicate) {
          setLoginForm({ ...loginForm, error: 'Phone number, email, or username already in use. Please try another.' });
          return;
        }

        const finalName = checkName || cleanUser;
        const isEmail = cleanUser.includes('@');
        const newCustRef = db.collection("customers").doc();
        c = { id: newCustRef.id, name: finalName, phone: isEmail ? '' : cleanUser, password: pass, email: isEmail ? cleanUser : '', visits: 0, spent: 0, lastVisit: 'N/A' };
        await newCustRef.set(c);
      } else {
        if (c.lockoutUntil && Date.now() < c.lockoutUntil) {
          setLoginForm({ ...loginForm, error: 'Account locked due to multiple failed attempts. Please try again after 24 hours.' });
          return;
        }

        if (c.password && c.password !== pass) {
          let failed = (c.failedAttempts || 0) + 1;
          let updateData = { failedAttempts: failed };
          
          if (failed >= 3) {
            updateData.lockoutUntil = Date.now() + 24 * 60 * 60 * 1000;
          }
          await db.collection("customers").doc(c.id).update(updateData);
          
          setLoginForm({ ...loginForm, error: failed >= 3 ? 'Account locked due to multiple failed attempts. Please try again after 24 hours.' : 'Invalid password' });
          return;
        }

        if (checkName && checkName.toLowerCase() !== c.name.toLowerCase()) {
           setLoginForm({ ...loginForm, error: 'This phone/email is already registered to a different username.' });
           return;
        }
        
        let needsUpdate = false;
        let updateData = {};
        if (c.failedAttempts > 0 || c.lockoutUntil) {
          updateData.failedAttempts = 0;
          updateData.lockoutUntil = null;
          needsUpdate = true;
        }

        if (!c.password) { updateData.password = pass; needsUpdate = true; }

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
    const checkPhone = phone.trim();
    const checkEmail = email.trim().toLowerCase();

    // Check for duplicates in other customers
    const isDuplicate = customers.some(x =>
      x.id !== loggedInCustomer.id &&
      ((checkPhone && x.phone === checkPhone) || (checkEmail && x.email && x.email.toLowerCase() === checkEmail) || (checkName && x.name.toLowerCase() === checkName.toLowerCase()))
    );

    if (isDuplicate) {
      setAccountForm({ ...accountForm, error: 'Phone number, email, or username already exists for another account.' });
      return;
    }

    const updatedCustomer = { name: checkName, phone: checkPhone, email: checkEmail, password };
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
      fetch(`${API_URL}/api/notifications/appointment-completed`, {
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
      return fetch(`${API_URL}/api/notifications/appointment-completed`, {
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

    fetch(`${API_URL}/api/notifications/appointment-no-show`, {
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
      fetch(`${API_URL}/api/notifications/appointment-no-show`, {
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
        fetch(`${API_URL}/api/notifications/appointment-cancelled`, {
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
      fetch(`${API_URL}/api/notifications/appointment-cancelled`, {
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

    fetch(`${API_URL}/api/notifications/appointment-cancelled`, {
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
      fetch(`${API_URL}/api/notifications/reminder-cancelled`, {
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

    const checkName = bookingForm.name.trim().toLowerCase();
    const checkPhone = bookingForm.phone.trim();
    const checkEmail = bookingForm.email.trim().toLowerCase();
    
    let c = customers.find(x => (checkPhone && x.phone === checkPhone) || (checkEmail && x.email && x.email.toLowerCase() === checkEmail));
    
    if (c) {
      if (checkName && c.name.toLowerCase() !== checkName) {
        showToast('⚠️ A different name is registered with this phone/email. Please login to book.');
        return;
      }
    } else {
      const isNameDup = customers.some(x => x.name.toLowerCase() === checkName);
      if (isNameDup) {
        showToast('⚠️ This name is already registered with a different phone/email.');
        return;
      }
    }

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
        email: checkEmail || c.email
      });
    } else {
      const newCustRef = db.collection("customers").doc();
      customerId = newCustRef.id;
      db.collection("customers").doc(customerId).set({
        name: bookingForm.name.trim(), phone: checkPhone, email: checkEmail,
        visits: 1, spent: +svcPrice, lastVisit: bookingForm.date
      });
    }

    const newBookingRef = db.collection("bookings").doc();
    db.collection("bookings").doc(newBookingRef.id).set({
      customerId: customerId,
      service: svcName, price: +svcPrice, date: bookingForm.date, time: bookingForm.time, status: 'PENDING'
    });

    fetch(`${API_URL}/api/notifications/appointment-success`, {
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
    const checkPhone = addCustForm.phone.trim();
    const checkEmail = addCustForm.email.trim().toLowerCase();
    const isDup = customers.some(x => (checkPhone && x.phone === checkPhone) || (checkEmail && x.email && x.email.toLowerCase() === checkEmail) || (checkName && x.name.toLowerCase() === checkName));
    if (isDup) {
      showToast('⚠️ Phone number, email, or username already exists.');
      return;
    }
    const newCustRef = db.collection("customers").doc();
    await newCustRef.set({ name: addCustForm.name.trim(), phone: checkPhone, email: checkEmail, visits: 0, spent: 0, lastVisit: 'N/A' });

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

    const checkName = custBookForm.name.trim().toLowerCase();
    const checkEmail = custBookForm.email.trim().toLowerCase();
    
    const isDup = customers.some(x => x.id !== loggedInCustomer.id && ((checkName && x.name.toLowerCase() === checkName) || (checkEmail && x.email && x.email.toLowerCase() === checkEmail)));
    if (isDup) {
      showToast('⚠️ The name or email you entered is already registered to another account.');
      return;
    }

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

    fetch(`${API_URL}/api/notifications/appointment-success`, {
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

      fetch(`${API_URL}/api/notifications/reminder-scheduled`, {
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
        fetch(`${API_URL}/api/notifications/appointment-rescheduled`, {
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
    <div className="bg-background text-on-background font-body-md antialiased overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="w-full sticky top-0 z-50 bg-background border-b-4 border-on-background brutalist-shadow relative">
        <div className="flex justify-between items-center px-md w-full max-w-container-max mx-auto h-auto py-md">
          {/* Brand Logo (Left) */}
          <div className="font-headline-lg tracking-widest text-on-background uppercase shrink-0 leading-none text-[40px] md:text-[64px]">
            SHOBANA
          </div>

          {/* Desktop Navigation (Center) */}
          <nav className="hidden lg:flex items-center gap-lg mx-auto">
            <a className="text-on-background font-headline-md text-headline-md hover:text-primary-container transition-colors" href="#menu">SERVICES</a>
            <a className="text-on-background font-headline-md text-headline-md hover:text-primary-container transition-colors" href="https://www.google.com/maps/place/SHOBANA+MEANS+BEAUTY+SALON/@17.4481912,78.5039059,17z/data=!4m6!3m5!1s0x3bcb9a38d62ae7ad:0x6ba4a5f7916444e4!8m2!3d17.4495139!4d78.5041777!16s%2Fg%2F11cmbmfqx0?entry=ttu&g_ep=EgoyMDI2MDcwOC4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noreferrer">RATE US</a>
            <a className="text-on-background font-headline-md text-headline-md hover:text-primary-container transition-colors" href="#booking">BOOKINGS</a>
          </nav>

          {/* Desktop Actions (Right) */}
          <div className="hidden lg:flex items-center gap-sm shrink-0">
            <button className="bg-background text-on-background border-4 border-on-background px-md py-base font-headline-md text-headline-md brutalist-shadow-hover flex items-center gap-xs" onClick={() => { setLoginRole('customer'); setView('login'); }}>
              <span className="material-symbols-outlined">person</span>MY VISITS
            </button>
            <button className="bg-primary-container text-on-primary-container border-4 border-on-background px-md py-base font-headline-md text-headline-md brutalist-shadow-hover flex items-center gap-xs" onClick={() => { setLoginRole('barber'); setView('login'); }}>
              <span className="material-symbols-outlined">notifications</span>BARBER
            </button>
            <button className="bg-primary-container text-on-primary-container border-4 border-on-background px-md py-base font-headline-md text-headline-md brutalist-shadow-hover" onClick={() => { setLoginRole('customer'); setView('login'); }} style={{ transform: 'translate(0px, 0px)', boxShadow: 'rgb(0, 0, 0) 4px 4px 0px 0px' }}>
              BOOK NOW
            </button>
          </div>

          {/* Mobile Nav */}
          <nav className="flex lg:hidden justify-end gap-md items-center ml-auto">
            <a className="text-on-background font-label-bold text-[18px] md:text-headline-md" href="#menu">SERVICES</a>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-on-background font-label-bold text-[18px] md:text-headline-md flex items-center">
              <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </nav>
        </div>

        {/* Mobile Dropdown Menu */}
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:hidden bg-background border-b-4 border-on-background p-md space-y-md`} id="mobile-menu">
          <nav className="flex flex-col gap-md">
            <button className="text-on-background font-headline-md text-headline-md flex items-center gap-xs" onClick={() => { setLoginRole('customer'); setView('login'); setMobileMenuOpen(false); }}><span className="material-symbols-outlined">person</span>MY VISITS</button>
            <button className="text-on-background font-headline-md text-headline-md flex items-center gap-xs" onClick={() => { setLoginRole('barber'); setView('login'); setMobileMenuOpen(false); }}><span className="material-symbols-outlined">notifications</span>BARBER</button>
            <a className="text-on-background font-headline-md text-headline-md" href="#menu" onClick={() => setMobileMenuOpen(false)}>SERVICES</a>
            <a className="text-on-background font-headline-md text-headline-md" href="https://www.google.com/maps/place/SHOBANA+MEANS+BEAUTY+SALON/@17.4481912,78.5039059,17z/data=!4m6!3m5!1s0x3bcb9a38d62ae7ad:0x6ba4a5f7916444e4!8m2!3d17.4495139!4d78.5041777!16s%2Fg%2F11cmbmfqx0?entry=ttu&g_ep=EgoyMDI2MDcwOC4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noreferrer" onClick={() => setMobileMenuOpen(false)}>RATE US</a>
            <a className="text-on-background font-headline-md text-headline-md" href="#booking" onClick={() => setMobileMenuOpen(false)}>BOOKING</a>
          </nav>
          <div className="flex flex-col gap-sm pt-md border-t-2 border-on-background">
            <button className="bg-primary-container text-on-primary-container px-md py-base font-headline-md text-headline-md border-4 border-on-background text-center brutalist-shadow px-xs py-xs text-[12px] md:px-md md:py-base md:text-headline-md" onClick={() => { setLoginRole('customer'); setView('login'); setMobileMenuOpen(false); }}>BOOK NOW</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[70vh] lg:min-h-[80vh] flex flex-col md:flex-row items-stretch border-b-4 border-on-background overflow-hidden md:grid md:grid-cols-[1.2fr_0.8fr] md:flex-none">
        <div className="flex-1 p-md md:p-xl flex flex-col justify-center space-y-md z-10 bg-background md:h-full">
          <h1 className="font-display-lg-mobile md:font-display-lg text-[80px] md:text-[120px] leading-[0.9] md:leading-none uppercase max-w-4xl text-on-background">SHOBANA&nbsp;<div className="flex"><span className="px-xs">MEN'S&nbsp;</span><span className="bg-primary-container text-on-primary-container px-xs">SALON</span></div></h1>
          <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg max-w-xl border-l-4 border-primary-container pl-md text-on-surface-variant">Look sharp, stay sharp — we’ll remind you when it’s time.</p>
          <div className="flex flex-col sm:flex-row gap-md pt-base transition-all duration-700 md:flex-wrap">
            <button className="bg-primary-container text-on-primary-container border-4 border-on-background px-md md:px-lg py-md font-headline-md text-headline-md brutalist-shadow brutalist-shadow-hover brutalist-shadow-active inline-flex items-center justify-center gap-sm uppercase" onClick={() => { setLoginRole('customer'); setView('login'); }} style={{ transform: 'translate(0px, 0px)', boxShadow: 'rgb(0, 0, 0) 4px 4px 0px 0px' }}>
              BOOK NOW
            </button>
            <a className="bg-background text-on-background border-4 border-on-background px-md md:px-lg py-md font-headline-md text-headline-md brutalist-shadow brutalist-shadow-hover brutalist-shadow-active inline-flex items-center justify-center gap-sm uppercase" href="tel:+918686383723" style={{ transform: 'translate(0px, 0px)', boxShadow: 'rgb(0, 0, 0) 4px 4px 0px 0px' }}>
              CALL NOW
              <span className="material-symbols-outlined">call</span>
            </a>
          </div>
        </div>
        <div className="flex-1 w-full relative bg-surface-container border-t-4 md:border-t-0 md:border-l-4 border-on-background overflow-hidden md:aspect-auto md:h-full md:w-full h-[300px] md:relative min-h-[400px]">
          <img className="w-full h-full object-cover" src="/images/chair.webp" alt="Barber Chair" />
          <div className="absolute bottom-md left-md bg-primary-container text-on-primary-container p-sm brutalist-shadow border-4 border-on-background reveal-up">
            <p className="font-headline-md text-[18px] md:text-headline-md uppercase">SINCE 1998</p>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-lg md:py-xl px-md max-w-container-max mx-auto" id="services">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md md:gap-lg">
          <div className="bg-surface-container border-4 border-on-background p-md md:p-lg brutalist-shadow group hover:bg-primary-container hover:text-on-primary-container transition-colors duration-200 reveal-up" style={{ transitionDelay: '0ms' }}>
            <div className="text-[48px] md:text-[64px] mb-base">✂️</div>
            <h3 className="font-headline-lg text-[28px] md:text-headline-lg mb-sm uppercase">Precision Haircuts</h3>
            <p className="font-body-md text-body-md">Engineered for your face shape. From classic tapers to modern skin fades, we execute with absolute precision.</p>
          </div>
          <div className="bg-surface-container border-4 border-on-background p-md md:p-lg brutalist-shadow group hover:bg-primary-container hover:text-on-primary-container transition-colors duration-200 reveal-up" style={{ transitionDelay: '100ms' }}>
            <div className="text-[48px] md:text-[64px] mb-base">🧴</div>
            <h3 className="font-headline-lg text-[28px] md:text-headline-lg mb-sm uppercase">Premium Grooming</h3>
            <p className="font-body-md text-body-md">Utilizing world-class products for beard sculpting, hot towel shaves, and specialized facial treatments.</p>
          </div>
          <div className="bg-surface-container border-4 border-on-background p-md md:p-lg brutalist-shadow group hover:bg-primary-container hover:text-on-primary-container transition-colors duration-200 sm:col-span-2 lg:col-span-1 reveal-up" style={{ transitionDelay: '200ms' }}>
            <div className="text-[48px] md:text-[64px] mb-base">👑</div>
            <h3 className="font-headline-lg text-[28px] md:text-headline-lg mb-sm uppercase">True Advocacy</h3>
            <p className="font-body-md text-body-md">Join our brotherhood. We prioritize consistency and customer comfort in every single visit.</p>
          </div>
        </div>
      </section>

      {/* Price List / Service Menu */}
      <section className="bg-on-background text-background py-lg md:py-xl" id="menu">
        <div className="max-w-container-max mx-auto px-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-lg gap-md reveal-up md:flex-wrap" id="price-header-container">
            <div>
              <h2 className="font-display-lg text-[40px] md:text-display-lg leading-none mb-xs text-background">THE SERVICE MENU</h2>
              <p className="font-headline-md text-headline-md text-black uppercase reveal-pop" id="starting-price-text">STARTING FROM ₹149</p>
            </div>
            <div className="bg-primary-container text-on-primary-container px-sm md:px-md py-sm font-label-bold text-[12px] md:text-label-bold brutalist-shadow border-4 border-background w-full md:w-auto text-center">
              ALL SERVICES INCLUDE COMPLIMENTARY STYLING
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-4 border-background reveal-up">
            {SERVICES.map((s, i) => (
              <div key={i} className={`flex justify-between items-center p-md border-background hover:bg-primary-container hover:text-on-primary-container transition-all group cursor-pointer relative ${i < SERVICES.length - (SERVICES.length % 2 === 0 ? 2 : 1) ? 'md:border-b-4' : 'md:border-b-0'} ${i < SERVICES.length - 1 ? 'border-b-4' : 'border-b-0'} ${i % 2 === 0 ? 'md:border-r-4' : 'md:border-r-0'}`} onClick={() => setLandingServiceModal(s)}>
                <div className="flex flex-col transition-transform duration-300 group-hover:translate-x-4">
                  <span className="font-headline-lg text-[24px] md:text-headline-lg uppercase">{s.name}</span>
                </div>
                <span className="font-display-lg-mobile text-[32px] md:text-display-lg-mobile transition-transform duration-300 group-hover:-translate-x-2">₹{s.price}</span>
                {i === 1 && (
                  <div className="absolute -top-3 -right-2 md:-top-4 md:-right-4 bg-error text-on-error font-label-bold text-[10px] md:text-[12px] px-sm py-xs border-2 border-background rotate-12 z-20">POPULAR</div>
                )}
                {i === 2 && (
                  <span className="font-label-bold text-[10px] md:text-label-bold bg-on-background text-background px-xs w-fit absolute bottom-2 left-6">BEST SELLER</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Experience / Gallery */}
      <section className="py-lg md:py-xl" id="gallery">
        <div className="px-md max-w-container-max mx-auto grid grid-cols-2 md:grid-cols-4 gap-md">
          <div className="col-span-2 row-span-1 md:row-span-2 border-4 border-on-background brutalist-shadow overflow-hidden h-[300px] md:h-[600px] reveal-up">
            <img className="w-full h-full object-cover" src="/images/shop.webp" />
          </div>
          <div className="border-4 border-on-background brutalist-shadow overflow-hidden h-[180px] md:h-[288px] reveal-up">
            <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=2070&auto=format&fit=crop" />
          </div>
          <div className="border-4 border-on-background brutalist-shadow overflow-hidden h-[180px] md:h-[288px] reveal-up">
            <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop" />
          </div>
          <div className="col-span-2 border-4 border-on-background brutalist-shadow overflow-hidden h-[180px] md:h-[288px] reveal-up">
            <img className="w-full h-full object-cover" src="/images/shop1.webp" />
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-surface-container py-lg md:py-xl border-y-4 border-on-background" id="reviews">
        <div className="max-w-container-max mx-auto px-md">
          <h2 className="font-display-lg text-[40px] md:text-display-lg mb-lg text-center uppercase">VOICES OF THE SHARP</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md md:gap-lg reveal-up">
            <div className="bg-background border-4 border-on-background p-md md:p-lg brutalist-shadow relative">
              <div className="flex gap-xs mb-sm">
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
              </div>
              <p className="font-headline-md text-[18px] md:text-headline-md mb-base">"Best haircut experience. Clean and professional."</p>
              <p className="font-label-bold text-label-bold uppercase border-t-4 border-on-background pt-sm">— RAHUL M.</p>
              <div className="absolute -bottom-4 -left-4 text-4xl text-primary-container font-headline-lg">"</div>
            </div>
            <div className="bg-primary-container text-on-primary-container border-4 border-on-background p-md md:p-lg brutalist-shadow relative">
              <div className="flex gap-xs mb-sm">
                <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
              </div>
              <p className="font-headline-md text-[18px] md:text-headline-md mb-base">"Affordable and high quality service. The staff knows their fades!"</p>
              <p className="font-label-bold text-label-bold uppercase border-t-4 border-on-primary-container pt-sm">— VIVEK K.</p>
            </div>
            <div className="bg-background border-4 border-on-background p-md md:p-lg brutalist-shadow relative sm:col-span-2 lg:col-span-1">
              <div className="flex gap-xs mb-sm">
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
              </div>
              <p className="font-headline-md text-[18px] md:text-headline-md mb-base">"My go-to salon every month! Consistency is key and they deliver."</p>
              <p className="font-label-bold text-label-bold uppercase border-t-4 border-on-background pt-sm">— ARJUN S.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Location + Map */}
      <section className="py-lg md:py-xl px-md max-w-container-max mx-auto" id="location">
        <div className="flex flex-col lg:flex-row border-4 border-on-background overflow-hidden brutalist-shadow bg-surface-container">
          <div className="flex-1 p-md md:p-lg flex flex-col justify-center space-y-md lg:space-y-lg md:flex-wrap">
            <h2 className="font-display-lg text-[40px] md:text-display-lg uppercase leading-none">FIND US</h2>
            <div className="space-y-sm md:space-y-md">
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-primary-container mt-1 shrink-0">location_on</span>
                <div>
                  <p className="font-headline-md text-headline-md uppercase">Address</p>
                  <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg text-on-surface-variant">Boosareddy Guda, West Marredpally, Secunderabad, Telangana 500026</p>
                </div>
              </div>
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-primary-container mt-1 shrink-0">schedule</span>
                <div>
                  <p className="font-headline-md text-headline-md uppercase">Hours</p>
                  <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg text-on-surface-variant">Daily: 08:00 AM – 10:00 PM</p>
                </div>
              </div>
            </div>
            <a className="bg-primary-container text-on-primary-container px-lg py-md font-headline-md text-headline-md brutalist-shadow brutalist-shadow-hover border-4 border-on-background inline-flex items-center justify-center gap-sm w-full md:w-fit uppercase" href="https://www.google.com/maps/place/SHOBANA+MEANS+BEAUTY+SALON/@17.4481912,78.5039059,17z/data=!4m6!3m5!1s0x3bcb9a38d62ae7ad:0x6ba4a5f7916444e4!8m2!3d17.4495139!4d78.5041777!16s%2Fg%2F11cmbmfqx0?entry=ttu&g_ep=EgoyMDI2MDcwOC4wIKXMDSoASAFQAw%3D%3D" style={{ transform: 'translate(0px, 0px)', boxShadow: 'rgb(0, 0, 0) 4px 4px 0px 0px' }} target="_blank" rel="noreferrer">
              GET DIRECTIONS
              <span className="material-symbols-outlined">directions</span>
            </a>
          </div>
          <a className="flex-1 h-[300px] md:h-[400px] border-t-4 lg:border-t-0 lg:border-l-4 border-on-background reveal-up w-full overflow-hidden block hover:opacity-90 transition-opacity" href="https://www.google.com/maps/place/SHOBANA+MEANS+BEAUTY+SALON/@17.4481912,78.5039059,17z/data=!4m6!3m5!1s0x3bcb9a38d62ae7ad:0x6ba4a5f7916444e4!8m2!3d17.4495139!4d78.5041777!16s%2Fg%2F11cmbmfqx0?entry=ttu&g_ep=EgoyMDI2MDcwOC4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noreferrer">
            <img alt="Map of Shobana Salon" className="w-full h-full object-cover" src="/images/map.webp" />
          </a>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary-container py-lg md:py-xl text-center border-t-4 border-on-background" id="booking">
        <div className="max-w-4xl mx-auto px-md space-y-md md:space-y-lg text-on-primary-container">
          <h2 className="font-display-lg text-[40px] md:text-display-lg uppercase leading-[1.1] md:leading-none">READY FOR A TRANSFORMATION?</h2>
          <p className="font-headline-md text-[18px] md:text-headline-md max-w-2xl mx-auto uppercase">WALK IN OR BOOK YOUR SLOT NOW TO AVOID THE WAIT. WE ARE READY WHEN YOU ARE.</p>
          <div className="flex flex-col sm:flex-row gap-md justify-center items-center md:flex-wrap">
            <button className="w-full sm:w-auto bg-background text-on-background px-md md:px-xl py-md font-headline-md text-headline-md brutalist-shadow brutalist-shadow-hover border-4 border-on-background inline-flex items-center justify-center gap-sm uppercase" onClick={() => { setLoginRole('customer'); setView('login'); }} style={{ transform: 'translate(0px, 0px)', boxShadow: 'rgb(0, 0, 0) 4px 4px 0px 0px' }}>BOOK A SERVICE</button>
            <a className="w-full sm:w-auto bg-surface-container text-on-surface px-md md:px-xl py-md font-headline-md text-headline-md brutalist-shadow brutalist-shadow-hover border-4 border-on-background inline-flex items-center justify-center gap-sm uppercase" href="tel:+918686383723" style={{ transform: 'translate(0px, 0px)', boxShadow: 'rgb(0, 0, 0) 4px 4px 0px 0px' }}>CALL NOW<span className="material-symbols-outlined">call</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background text-on-background py-lg border-t-4 border-on-background mb-20 lg:mb-0">
        <div className="max-w-container-max mx-auto px-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-lg">
            <div className="flex flex-col gap-xs">
              <div className="font-headline-lg text-[28px] md:text-headline-lg tracking-tighter uppercase">SHOBANA HAIR SALON</div>
              <div className="font-label-bold text-label-bold text-primary-container">★ ★ BEST BARBER ★ ★</div>
            </div>
            <div className="flex flex-col gap-sm">
              <div className="font-headline-md text-headline-md uppercase border-b-2 border-on-background w-fit mb-xs">HOURS</div>
              <div className="font-body-md text-body-md flex items-center gap-xs">
                <span>🕐</span> Mon, Wed–Sun: 8AM – 10PM
              </div>
              <div className="font-body-md text-body-md flex items-center gap-xs text-error">
                <span>🚫</span> Tuesday: CLOSED
              </div>
            </div>
            <div className="flex flex-col gap-sm">
              <div className="font-headline-md text-headline-md uppercase border-b-2 border-on-background w-fit mb-xs">CONTACT</div>
              <div className="font-body-md text-body-md flex items-center gap-xs">
                <span>📞</span> <a href="tel:+918686383723" className="hover:text-primary-container transition-colors">86863 83723</a>
              </div>
              <div className="font-body-md text-body-md flex items-center gap-xs">
                <span>📍</span> <a href="https://www.google.com/maps/place/SHOBANA+MEANS+BEAUTY+SALON/@17.4481912,78.5039059,17z/data=!4m6!3m5!1s0x3bcb9a38d62ae7ad:0x6ba4a5f7916444e4!8m2!3d17.4495139!4d78.5041777!16s%2Fg%2F11cmbmfqx0?entry=ttu&g_ep=EgoyMDI2MDcwOC4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noreferrer" className="hover:text-primary-container transition-colors">Visit us today</a>
              </div>
            </div>
          </div>
          <div className="border-t-4 border-on-background pt-md flex flex-col md:flex-row justify-between items-center gap-sm">
            <p className="font-label-bold text-[10px] md:text-label-bold uppercase opacity-60">© 2026 SHOBANA HAIR SALON · BUILT WITH ✂</p>
            <div className="flex gap-md font-label-bold text-[10px] md:text-label-bold opacity-60">
              <a className="hover:opacity-100 transition-opacity hover:text-primary-container" href="#">INSTAGRAM</a>
              <a className="hover:opacity-100 transition-opacity hover:text-primary-container" href="#">FACEBOOK</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Bottom Mobile Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t-4 border-on-background flex items-center justify-around h-20 px-md brutalist-shadow gap-xs">
        <button onClick={() => window.scrollTo(0, 0)} className="flex flex-col items-center justify-center gap-1 bg-primary-container text-black px-md py-xs rounded-full transition-all brutalist-shadow-sm">
          <span className="material-symbols-outlined">home</span>
          <span className="font-label-bold text-[10px] uppercase">HOME</span>
        </button>
        <button onClick={() => { setLoginRole('customer'); setView('login'); }} className="flex flex-col items-center justify-center gap-1 text-on-background hover:bg-primary-container hover:text-black px-md py-xs rounded-full transition-all">
          <span className="material-symbols-outlined">content_cut</span>
          <span className="font-label-bold text-[10px] uppercase">BOOK</span>
        </button>
        <button onClick={() => { setLoginRole('customer'); setView('login'); }} className="flex flex-col items-center justify-center gap-1 text-on-background hover:bg-primary-container hover:text-black px-md py-xs rounded-full transition-all">
          <span className="material-symbols-outlined">history</span>
          <span className="font-label-bold text-[10px] uppercase">VISITS</span>
        </button>
        <button onClick={() => { setLoginRole('barber'); setView('login'); }} className="flex flex-col items-center justify-center gap-1 text-on-background hover:bg-primary-container hover:text-black px-md py-xs rounded-full transition-all">
          <span className="material-symbols-outlined">person</span>
          <span className="font-label-bold text-[10px] uppercase">PROFILE</span>
        </button>
      </nav>
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
                        [...leaves].sort((a, b) => a.date.localeCompare(b.date)).map(l => (
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
                          <tr key={b.id} onClick={() => { setSelectedBooking(b); setModals(m => ({ ...m, bookingDetails: true })); }} style={{ cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f9f9f9'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
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
                          <tr key={b.id} onClick={() => { setSelectedBooking(b); setModals(m => ({ ...m, bookingDetails: true })); }} style={{ cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f9f9f9'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
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

      {modals.bookingDetails && selectedBooking && (
        <div className="mo open">
          <div className="modal">
            <div className="mh"><h2>Booking Details</h2><button className="mc" onClick={() => setModals(m => ({ ...m, bookingDetails: false }))}>&times;</button></div>
            <div className="mb">
              <div style={{ marginBottom: '15px', lineHeight: '1.8' }}>
                <p><strong>Customer Name:</strong> {loggedInCustomer?.name}</p>
                <p><strong>Email Address:</strong> {loggedInCustomer?.email || 'N/A'}</p>
                <p><strong>Service:</strong> {selectedBooking.service}</p>
                <p><strong>Date & Time:</strong> {selectedBooking.date} at {fmtTime(selectedBooking.time)}</p>
                <p><strong>Price:</strong> ₹{selectedBooking.price}</p>
              </div>
            </div>
            <div className="mf" style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-cancel" style={{ flex: 1 }} onClick={() => setModals({ ...modals, bookingDetails: false })}>Close</button>
              <button className="brut-btn" style={{ flex: 1 }} onClick={() => {
                setModals({ ...modals, bookingDetails: false, reschedule: true });
                setRescheduleForm({ id: selectedBooking.id, date: selectedBooking.date, time: selectedBooking.time });
              }}>✏️ Edit / Reschedule</button>
            </div>
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

  const render404 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#fcfcfc', color: '#1a1a1a', padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '10px' }}>✂️</div>
      <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '15px' }}>404</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '30px', color: '#666' }}>Oops! The page you're looking for doesn't exist.</p>
      <button className="brut-btn text-lg" onClick={() => {
        window.history.pushState({}, '', '/');
        setView('landing');
      }}>Return Home</button>
    </div>
  );

  return (
    <>
      {view === 'intro' && <IntroSequence onFinish={() => setView('landing')} />}
      {view === 'landing' && renderLanding()}
      {view === 'login' && renderLogin()}
      {view === 'barber' && renderBarberPortal()}
      {view === 'customer' && renderCustomerPortal()}
      {view === '404' && render404()}
      {renderModals()}
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}

export default App;
