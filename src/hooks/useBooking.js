import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * useBooking — load and manage a single booking by ID.
 * Returns { booking, loading, error, confirm, cancel, refetch }
 */
export function useBooking(bookingId) {
  const { authFetch } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const refetch = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const res  = await authFetch(`/bookings/${bookingId}`);
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      if (!res.ok) throw new Error(data.error || `Failed to load booking (${res.status})`);
      setBooking(data.booking);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [bookingId, authFetch]);

  useEffect(() => { refetch(); }, [refetch]);

  const confirm = async () => {
    const res  = await authFetch(`/bookings/${bookingId}/confirm`, { method: 'PATCH' });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) throw new Error(data.error || `Confirm failed (${res.status})`);
    setBooking(data.booking);
    return data.booking;
  };

  const cancel = async () => {
    const res  = await authFetch(`/bookings/${bookingId}/cancel`, { method: 'PATCH' });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) throw new Error(data.error || `Cancel failed (${res.status})`);
    setBooking(data.booking);
    return data.booking;
  };

  const complete = async () => {
    const res  = await authFetch(`/bookings/${bookingId}/complete`, { method: 'PATCH' });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) throw new Error(data.error || `Completion failed (${res.status})`);
    setBooking(data.booking);
    return data.booking;
  };

  const review = async ({ rating, comment }) => {
    const res  = await authFetch(`/bookings/${bookingId}/review`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) throw new Error(data.error || `Review failed (${res.status})`);
    setBooking(data.booking);
    return data.booking;
  };

  const createPaymentIntent = async () => {
    const res  = await authFetch('/payments/intent', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) throw new Error(data.error || `Payment intent failed (${res.status})`);
    return data.clientSecret;
  };

  return { booking, loading, error, confirm, cancel, complete, review, createPaymentIntent, refetch };
}

/**
 * useBookings — load the list of my bookings.
 * Returns { bookings, loading, error, refetch }
 */
export function useBookings(statusFilter) {
  const { authFetch } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const qs  = statusFilter ? `?status=${statusFilter}` : '';
      const res  = await authFetch(`/bookings${qs}`);
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      if (!res.ok) throw new Error(data.error || `Failed to fetch bookings (${res.status})`);
      setBookings(data.bookings || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, authFetch]);

  useEffect(() => { refetch(); }, [refetch]);

  return { bookings, loading, error, refetch };
}
