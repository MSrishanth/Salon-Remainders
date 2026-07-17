import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { API_URL } from '../config';

const Dashboard = () => {
  const [todayBookings, setTodayBookings] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, customersRes] = await Promise.all([
        axios.get(`${API_URL}/api/bookings/today`),
        axios.get(`${API_URL}/api/customers`)
      ]);
      setTodayBookings(bookingsRes.data);
      setTotalCustomers(customersRes.data.length);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="header-vogue">Overview</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{todayBookings.length}</div>
          <div>Today's Appointments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalCustomers}</div>
          <div>Total Customers</div>
        </div>
      </div>

      <div className="card">
        <h3>Today's Schedule</h3>
        {todayBookings.length === 0 ? (
          <p style={{ marginTop: '1rem', color: '#666' }}>No appointments scheduled for today.</p>
        ) : (
          <table className="vogue-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {todayBookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{format(new Date(booking.appointmentDate), 'h:mm a')}</td>
                  <td>{booking.customer.name}</td>
                  <td>{booking.service}</td>
                  <td>
                    <span className={`status-badge status-${booking.status.toLowerCase()}`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
