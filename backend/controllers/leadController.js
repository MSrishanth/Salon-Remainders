import { db } from '../firebaseAdmin.js';
import { DateTime } from 'luxon';
import { sendTransactionalEmail } from '../services/emailService.js';

function generateLeadCode(clientPrefix = 'ABC') {
  const dateStr = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyyMMdd');
  const sequence = Math.floor(100 + Math.random() * 900); // Simple random sequence for now
  return `${clientPrefix}-${dateStr}-${sequence}`;
}

export const isBillableQualifiedEnquiry = (lead) => {
  // Must have name and phone
  if (!lead.name || !lead.phone) return { billable: false, reason: 'INVALID: Missing contact details' };
  
  // Basic spam check
  if (lead.message && lead.message.toLowerCase().includes('viagra')) {
    return { billable: false, reason: 'SPAM: Suspicious content' };
  }

  // Not a test
  if (lead.name.toLowerCase() === 'test') {
    return { billable: false, reason: 'TEST: Test submission' };
  }

  // Specific types validation
  if (lead.enquiryType === 'SALON_APPOINTMENT' || lead.enquiryType === 'RESTAURANT_RESERVATION' || lead.enquiryType === 'GENERAL_ENQUIRY') {
    if (!lead.service) {
      return { billable: false, reason: 'INVALID: Missing service requirement' };
    }
  }

  // If it passes basic checks, it's billable!
  return { billable: true, reason: 'Valid qualified enquiry submitted through website.' };
};

export const createLead = async (req, res) => {
  const data = req.body;
  
  try {
    // 1. Validation & Rate Limiting can be added here
    
    // 2. Duplicate Detection (simplified)
    const recentLeadsRef = db.collection('leads');
    const duplicateCheck = await recentLeadsRef
      .where('phone', '==', data.phone)
      .where('enquiryType', '==', data.enquiryType)
      .get();
      
    // Not actually blocking them in this simplified version, but we would flag it normally
    const isDuplicate = !duplicateCheck.empty;
    
    // 3. Billing Qualification
    const qualification = isBillableQualifiedEnquiry(data);
    let billable = qualification.billable;
    let reason = qualification.reason;
    
    if (isDuplicate) {
      billable = false;
      reason = 'DUPLICATE: Similar enquiry already exists.';
    }

    // 4. Create Lead
    const leadCode = generateLeadCode('SHB'); // SHB for Shobana Hair Salon
    const now = new Date().toISOString();
    
    const leadRecord = {
      ...data,
      leadCode,
      status: isDuplicate ? 'POSSIBLE_DUPLICATE' : 'NEW',
      billable,
      billingReason: reason,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await db.collection('leads').add(leadRecord);
    
    // Sync to existing Bookings system for backward compatibility
    if (data.enquiryType === 'SALON_APPOINTMENT') {
      try {
        const [svcName, svcPrice] = (data.service || '').split('|');
        if (svcName && svcPrice) {
          // Find or create customer
          let customerId = 'website_lead';
          const customersSnap = await db.collection('customers').where('phone', '==', data.phone).limit(1).get();
          
          if (!customersSnap.empty) {
            customerId = customersSnap.docs[0].id;
          } else {
            // Create a basic customer record
            const newCustRef = await db.collection('customers').add({
              name: data.name,
              phone: data.phone,
              email: data.email || '',
              visits: 0,
              spent: 0,
              lastVisit: 'N/A'
            });
            customerId = newCustRef.id;
          }

          // Create the booking
          await db.collection('bookings').add({
            customerId,
            service: svcName,
            price: Number(svcPrice),
            date: data.date,
            time: data.time,
            status: 'PENDING'
          });

          // Send the beautiful confirmation email
          if (data.email) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            
            // Format time correctly
            let jsDate = new Date();
            try {
              if (data.date && data.time) {
                // Approximate JS Date formatting for email display
                const dt = DateTime.fromFormat(`${data.date} ${data.time}`, 'yyyy-MM-dd HH:mm', { zone: 'Asia/Kolkata' });
                if (dt.isValid) jsDate = dt.toJSDate();
              }
            } catch (e) {}
            
            const formattedDateDisplay = DateTime.fromJSDate(jsDate).setZone('Asia/Kolkata').toFormat('dd/MM/yy h:mm a');
            const subject = `Booking Confirmed: ${formattedDateDisplay} - Shobana Hair Salon`;
            const textBody = `Hi ${data.name}, your appointment for ${svcName} is confirmed for ${formattedDateDisplay}.`;
            const htmlBody = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: 'Inter', sans-serif; color: #333; line-height: 1.6; }
                  .container { max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; }
                  .header { background-color: #000; color: #fff; padding: 30px; text-align: center; }
                  .content { padding: 40px; }
                  .box { background-color: #fcfcfc; padding: 25px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee; }
                  .btn { display: inline-block; padding: 14px 28px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin-top: 25px; font-weight: bold; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0; font-size: 24px;">BOOKING CONFIRMED</h1>
                  </div>
                  <div class="content">
                    <p>Hi <strong>${data.name}</strong>,</p>
                    <p>Your appointment has been successfully booked. We look forward to seeing you.</p>
                    
                    <div class="box">
                      <h3 style="margin-top: 0;">Appointment Details</h3>
                      <p><strong>Service:</strong> ${svcName}</p>
                      <p><strong>Date & Time:</strong> ${formattedDateDisplay}</p>
                      <p><strong>Price:</strong> ₹${svcPrice}</p>
                      <p><strong>Reference:</strong> ${leadCode}</p>
                    </div>

                    <p style="margin-top: 30px;">Need to make changes? You can manage your appointment online.</p>
                    <a href="${frontendUrl}" class="btn">Manage Booking</a>
                  </div>
                </div>
              </body>
              </html>
            `;
            sendTransactionalEmail(data.email, subject, textBody, htmlBody).catch(e => console.error('Error sending confirmation email:', e));
          }
        }
      } catch (syncErr) {
        console.error('Error syncing lead to bookings:', syncErr);
      }
    } else if (data.email) {
      // Basic Email Notification for non-appointments (WhatsApp intents, etc)
      const subject = `Enquiry Received - ${leadCode}`;
      const textBody = `Hi ${data.name},\n\nYour enquiry has been received.\nReference: ${leadCode}\n\nWe will contact you shortly.`;
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Enquiry Received</h2>
          <p>Hi <strong>${data.name}</strong>,</p>
          <p>Your enquiry has been received.</p>
          <p><strong>Reference:</strong> ${leadCode}</p>
          <p>We will contact you shortly.</p>
        </div>
      `;
      sendTransactionalEmail(data.email, subject, textBody, htmlBody).catch(e => console.error('Error sending basic lead email:', e));
    }
    
    // 5. Success
    res.status(201).json({
      success: true,
      leadId: docRef.id,
      leadCode,
      billable
    });
    
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create enquiry' });
  }
};

export const getLeads = async (req, res) => {
  try {
    let query = db.collection('leads');
    
    if (req.user && req.user.role === 'CLIENT' && req.user.clientId) {
      query = query.where('clientId', '==', req.user.clientId);
    }
    
    const leadsSnap = await query.get();
    let leads = leadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort in JS to avoid requiring composite indexes
    leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

export const disputeLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const leadRef = db.collection('leads').doc(id);
    const leadDoc = await leadRef.get();
    
    if (!leadDoc.exists) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    const lead = leadDoc.data();
    
    // Check permission
    if (req.user && req.user.role === 'CLIENT') {
      if (lead.clientId !== req.user.clientId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    
    await leadRef.update({
      status: 'DISPUTED',
      disputeReason: reason || 'Disputed by client',
      disputedAt: new Date().toISOString()
    });
    
    res.json({ message: 'Lead disputed successfully' });
  } catch (error) {
    console.error('Error disputing lead:', error);
    res.status(500).json({ error: 'Failed to dispute lead' });
  }
};
