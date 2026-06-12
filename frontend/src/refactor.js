const fs = require('fs');
let code = fs.readFileSync('App.jsx', 'utf8');

// Fix search
code = code.split('b => (b.name + b.service)').join('b => (getCName(b.customerId) + b.service)');

// Fix pending table
code = code.split('<td className="nc">{b.name}</td><td>{b.phone}</td>').join('<td className="nc">{getCName(b.customerId)}</td><td>{getCPhone(b.customerId)}</td>');
code = code.split('openConfirmMarkDone(b.id, b.name)').join('openConfirmMarkDone(b.id, getCName(b.customerId))');
code = code.split('openConfirmCancelB(b.id, b.name)').join('openConfirmCancelB(b.id, getCName(b.customerId))');

// Fix bookings list table
code = code.split('<td className="nc">{b.name}</td><td>{b.service}</td>').join('<td className="nc">{getCName(b.customerId)}</td><td>{b.service}</td>');

// Fix reminders table
code = code.split('<td className="nc">{r.name}</td><td>{r.phone}</td>').join('<td className="nc">{getCName(r.customerId)}</td><td>{getCPhone(r.customerId)}</td>');
code = code.split('openConfirmCancelReminder(r.id, r.name)').join('openConfirmCancelReminder(r.id, getCName(r.customerId))');

// Fix mine bookings filters
code = code.split('bookings.filter(b => b.phone === loggedInCustomer.phone)').join('bookings.filter(b => b.customerId === loggedInCustomer.id)');
code = code.split('reminders.filter(r => r.phone === loggedInCustomer.phone && (r.status !== \\\'Delivered\\\' || r.remindDate >= today))').join('reminders.filter(r => r.customerId === loggedInCustomer.id && (r.status !== \\\'Delivered\\\' || r.remindDate >= today))');

fs.writeFileSync('App.jsx', code);
console.log('Replaced successfully');
