import React, { useState, useEffect } from 'react';
import { trackEvent } from '../utils/analytics';
import { API_URL } from '../config';

const EnquiryForm = ({ 
  config = {}, 
  enquiryType = 'GENERAL_ENQUIRY', 
  onSuccess,
  websiteId = 'default_website_id',
  clientId = 'default_client_id',
  getTimeOptions = null,
  serviceOptions = null,
  initialData = {}
}) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    phone: initialData.phone || '',
    email: initialData.email || '',
    service: initialData.service || '',
    message: '',
    date: '',
    time: '',
    quantity: '',
    budget: '',
    contactMethod: 'Phone'
  });

  const [status, setStatus] = useState('idle');
  const [leadCode, setLeadCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Base fields are always shown
  const showDate = config.showDate || false;
  const showTime = config.showTime || false;
  const showQuantity = config.showQuantity || false;
  const showBudget = config.showBudget || false;

  useEffect(() => {
    trackEvent('FORM_STARTED', { type: enquiryType });
  }, [enquiryType]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');
    trackEvent('FORM_SUBMITTED', { type: enquiryType });

    try {
      const response = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          enquiryType,
          websiteId,
          clientId,
          url: window.location.href,
          referrer: document.referrer
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit enquiry');
      }

      setLeadCode(data.leadCode);
      setStatus('success');
      trackEvent('ENQUIRY_CREATED', { leadCode: data.leadCode, type: enquiryType });
      
      if (onSuccess) onSuccess(data);

    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  if (status === 'success') {
    return (
      <div className="p-4 border-2 border-green-500 rounded-lg text-center bg-green-50">
        <h3 className="text-xl font-bold text-green-700 mb-2">Thanks! Your enquiry has been received.</h3>
        <p className="mb-4">Reference Code: <strong className="font-mono bg-green-100 px-2 py-1 rounded">{leadCode}</strong></p>
        <div className="flex gap-2 justify-center mt-4">
          <button className="px-4 py-2 bg-black text-white rounded font-bold uppercase text-sm" onClick={() => window.location.reload()}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-bold mb-2">Submit Enquiry</h3>
      
      <div className="flex flex-col">
        <label className="text-sm font-bold text-gray-700 mb-1">Full Name *</label>
        <input required type="text" name="name" value={formData.name} onChange={handleChange} className="border p-2 rounded" placeholder="John Doe" />
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-bold text-gray-700 mb-1">Phone Number *</label>
        <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="border p-2 rounded" placeholder="Your mobile number" />
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-bold text-gray-700 mb-1">Email Address *</label>
        <input required type="email" name="email" value={formData.email} onChange={handleChange} className="border p-2 rounded" placeholder="john@example.com" />
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-bold text-gray-700 mb-1">Service / Requirement *</label>
        {serviceOptions ? (
          <select required name="service" value={formData.service} onChange={handleChange} className="border p-2 rounded">
            <option value="">Select Service...</option>
            {serviceOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <input required type="text" name="service" value={formData.service} onChange={handleChange} className="border p-2 rounded" placeholder="What are you looking for?" />
        )}
      </div>

      {showDate && (
        <div className="flex flex-col">
          <label className="text-sm font-bold text-gray-700 mb-1">Date</label>
          <input required type="date" name="date" value={formData.date} onChange={handleChange} className="border p-2 rounded" />
        </div>
      )}

      {showTime && (
        <div className="flex flex-col">
          <label className="text-sm font-bold text-gray-700 mb-1">Time</label>
          {getTimeOptions ? (
            <select required name="time" value={formData.time} onChange={handleChange} className="border p-2 rounded">
              <option value="">Select time...</option>
              {getTimeOptions(formData.date).map(t => (
                <option key={t.value} value={t.value} disabled={t.isDisabled} style={t.isDisabled ? { color: '#999', backgroundColor: '#f0f0f0' } : {}}>
                  {t.label}{t.labelSuffix}
                </option>
              ))}
            </select>
          ) : (
            <input required type="time" name="time" value={formData.time} onChange={handleChange} className="border p-2 rounded" />
          )}
        </div>
      )}

      {showQuantity && (
        <div className="flex flex-col">
          <label className="text-sm font-bold text-gray-700 mb-1">Number of Guests / Quantity</label>
          <input required type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="border p-2 rounded" min="1" />
        </div>
      )}

      <div className="flex flex-col">
        <label className="text-sm font-bold text-gray-700 mb-1">Message (Optional)</label>
        <textarea name="message" value={formData.message} onChange={handleChange} className="border p-2 rounded" rows="3" placeholder="Any special requests?"></textarea>
      </div>

      {status === 'error' && <p className="text-red-500 text-sm font-bold">{errorMsg}</p>}

      <button 
        type="submit" 
        disabled={status === 'submitting'}
        className={`mt-2 py-3 px-4 font-bold uppercase text-white rounded transition-colors ${status === 'submitting' ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {status === 'submitting' ? 'Submitting...' : 'Submit Enquiry/Booking'}
      </button>
    </form>
  );
};

export default EnquiryForm;
