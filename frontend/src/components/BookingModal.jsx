import React, { useState } from 'react';
import axios from 'axios';
import { PRICELIST } from '../services';
import { API_URL } from '../config';

const BookingModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    serviceId: '',
    date: '',
    time: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Create or get customer
      const customerRes = await axios.post(`${API_URL}/api/customers`, {
        name: formData.name,
        phone: formData.phone
      });
      const customerId = customerRes.data.id;

      // 2. Prepare booking data
      const selectedService = PRICELIST.find(s => s.id === parseInt(formData.serviceId));
      const appointmentDate = new Date(`${formData.date}T${formData.time}`).toISOString();

      // 3. Create booking
      await axios.post(`${API_URL}/api/bookings`, {
        customerId,
        service: selectedService.name,
        price: selectedService.price,
        appointmentDate
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <div className="modal-header">
          <h2 className="modal-title">New Appointment</h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Customer Name</label>
            <input 
              type="text" 
              name="name" 
              className="form-control" 
              required 
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="form-group">
            <label className="form-label">WhatsApp Number</label>
            <input 
              type="tel" 
              name="phone" 
              className="form-control" 
              required 
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 9876543210"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Service</label>
            <select 
              name="serviceId" 
              className="form-control" 
              required
              value={formData.serviceId}
              onChange={handleChange}
            >
              <option value="">Select a service...</option>
              {PRICELIST.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} - ₹{service.price}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Date</label>
              <input 
                type="date" 
                name="date" 
                className="form-control" 
                required 
                value={formData.date}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Time</label>
              <input 
                type="time" 
                name="time" 
                className="form-control" 
                required 
                value={formData.time}
                onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className="btn-accent" style={{ width: '100%', marginTop: '1rem' }}>
            Confirm Booking
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
