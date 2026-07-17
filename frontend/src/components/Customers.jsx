import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { API_URL } from '../config';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/customers`);
      setCustomers(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="header-vogue">Customer History</h1>
      
      <div className="card">
        {customers.length === 0 ? (
          <p>No customers found.</p>
        ) : (
          <table className="vogue-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Total Bookings</th>
                <th>Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const lastVisit = customer.bookings.length > 0 
                  ? new Date(Math.max(...customer.bookings.map(b => new Date(b.appointmentDate))))
                  : null;

                return (
                  <tr key={customer.id}>
                    <td style={{ fontWeight: 600, color: 'var(--brand-black)' }}>{customer.name}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.bookings.length}</td>
                    <td>{lastVisit ? format(lastVisit, 'MMM dd, yyyy') : 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Customers;
