import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  FileText, 
  Film,
  Radio,
  Sliders, 
  Search, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  DollarSign,
  Play,
  RotateCcw,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [overview, setOverview]     = useState(null);
  const [users, setUsers]           = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userPagination, setUserPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });

  const [bookings, setBookings]     = useState([]);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('');
  
  const [disputes, setDisputes]     = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [reports, setReports]       = useState([]);
  const [auditLogs, setAuditLogs]   = useState([]);

  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Form states
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionText, setResolutionText] = useState('');

  // 1. Fetch Overview Metrics
  const fetchOverviewData = useCallback(async () => {
    try {
      const res = await authFetch('/reports/overview');
      const data = await res.json();
      if (res.ok && data.data) setOverview(data.data);
    } catch {
      /* silent */
    }
  }, [authFetch]);

  // 2. Fetch Users
  const fetchUsers = useCallback(async (page = 1, role = '', q = '') => {
    try {
      const qs = new URLSearchParams({ page, limit: 12 });
      if (role) qs.set('role', role);
      if (q)    qs.set('q', q);
      const res  = await authFetch(`/users?${qs.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        if (data.pagination) setUserPagination(data.pagination);
      }
    } catch {
      /* silent */
    }
  }, [authFetch]);

  // 3. Fetch Bookings
  const fetchBookings = useCallback(async () => {
    try {
      const res  = await authFetch('/bookings?limit=50');
      const data = await res.json();
      if (res.ok) setBookings(data.bookings || []);
    } catch {
      /* silent */
    }
  }, [authFetch]);

  // 4. Fetch Disputes
  const fetchDisputes = useCallback(async () => {
    try {
      const res  = await authFetch('/disputes');
      const data = await res.json();
      if (res.ok) setDisputes(data.disputes || []);
    } catch {
      /* silent */
    }
  }, [authFetch]);

  // 5. Fetch Recordings
  const fetchRecordings = useCallback(async () => {
    try {
      const res  = await authFetch('/recordings?limit=50');
      const data = await res.json();
      if (res.ok) setRecordings(data.recordings || []);
    } catch {
      /* silent */
    }
  }, [authFetch]);

  // 6. Fetch Reports
  const fetchReports = useCallback(async () => {
    try {
      const res  = await authFetch('/moderation/reports');
      const data = await res.json();
      if (res.ok) setReports(data.reports || []);
    } catch {
      /* silent */
    }
  }, [authFetch]);

  // 7. Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const res  = await authFetch('/stitcher/audit-logs?limit=30');
      const data = await res.json();
      if (res.ok) setAuditLogs(data.logs || []);
    } catch {
      /* silent */
    }
  }, [authFetch]);

  const [aiJobs, setAiJobs]         = useState([]);

  // 8. Fetch AI Jobs for Admin Inspection
  const fetchAiJobs = useCallback(async () => {
    try {
      const res  = await authFetch('/reports/ai-jobs?limit=50');
      const data = await res.json();
      if (res.ok && data.data) setAiJobs(data.data.jobs || []);
    } catch {
      /* silent */
    }
  }, [authFetch]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchOverviewData(),
      fetchUsers(userPagination.page, userRoleFilter, userSearch),
      fetchBookings(),
      fetchDisputes(),
      fetchRecordings(),
      fetchReports(),
      fetchAuditLogs(),
      fetchAiJobs(),
    ]);
    setLoading(false);
  }, [fetchOverviewData, fetchUsers, fetchBookings, fetchDisputes, fetchRecordings, fetchReports, fetchAuditLogs, fetchAiJobs, userPagination.page, userRoleFilter, userSearch]);

  useEffect(() => {
    refreshAll();
  }, []);

  // Handle User Block / Unblock
  const handleToggleBlock = async (userId, currentBlocked) => {
    setActionLoading(true);
    setActionMessage({ type: '', text: '' });
    try {
      const endpoint = currentBlocked ? `/moderation/unblock/${userId}` : `/moderation/block/${userId}`;
      const res = await authFetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMessage({ type: 'success', text: `User ${currentBlocked ? 'unblocked' : 'blocked'} successfully.` });
      fetchUsers(userPagination.page, userRoleFilter, userSearch);
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Dispute Actions (Resolve with Refund / Release or Dismiss)
  const handleDisputeReview = async (disputeId) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/disputes/${disputeId}/review`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMessage({ type: 'success', text: 'Dispute status updated to Under Review.' });
      fetchDisputes();
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisputeResolve = async (disputeId, actionType, paymentAction) => {
    if (actionType === 'resolve' && (!resolutionText || resolutionText.trim().length < 10)) {
      return setActionMessage({ type: 'danger', text: 'Resolution text must be at least 10 characters.' });
    }
    setActionLoading(true);
    try {
      const endpoint = actionType === 'resolve' ? `/disputes/${disputeId}/resolve` : `/disputes/${disputeId}/dismiss`;
      const res = await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ resolution: resolutionText, action: paymentAction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMessage({ type: 'success', text: `Dispute ${actionType === 'resolve' ? 'resolved' : 'dismissed'} successfully.` });
      setSelectedDispute(null);
      setResolutionText('');
      fetchDisputes();
      fetchBookings();
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Payment Release & Refund Handlers
  const handlePaymentRelease = async (bookingId) => {
    if (!window.confirm('Release escrow payment to host?')) return;
    setActionLoading(true);
    try {
      const res = await authFetch(`/payments/${bookingId}/release`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMessage({ type: 'success', text: 'Payment released successfully to host.' });
      fetchBookings();
      fetchOverviewData();
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaymentRefund = async (bookingId) => {
    if (!window.confirm('Issue full refund for this booking?')) return;
    setActionLoading(true);
    try {
      const res = await authFetch(`/payments/${bookingId}/refund`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMessage({ type: 'success', text: 'Payment refunded successfully.' });
      fetchBookings();
      fetchOverviewData();
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const TABS = [
    { id: 'overview',   label: 'Dashboard',   Icon: Shield },
    { id: 'users',      label: 'Users',       Icon: Users },
    { id: 'bookings',   label: 'Bookings',    Icon: Calendar },
    { id: 'payments',   label: 'Payments',    Icon: CreditCard },
    { id: 'disputes',   label: 'Disputes',    Icon: AlertTriangle },
    { id: 'recordings', label: 'Recordings',  Icon: Film },
    { id: 'podcasts',   label: 'Podcasts',    Icon: Radio },
    { id: 'reports',    label: 'Reports',     Icon: FileText },
    { id: 'ai',         label: 'AI Jobs',     Icon: Radio },
    { id: 'audit',      label: 'Audit Logs',  Icon: Sliders },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--plum-deep) 0%, #1A0D20 100%)',
        color: '#fff',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 24px',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: 'var(--shadow-plum)',
      }}>
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', color: 'var(--lavender-soft)', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            <Shield size={14} /> SYSTEM CONTROL CENTER
          </span>
          <h1 style={{ fontSize: 24, color: '#fff', marginTop: 6, marginBottom: 2 }}>
            Admin Control Operations
          </h1>
          <p style={{ color: 'var(--lavender-soft)', fontSize: 13, maxWidth: 580 }}>
            Operate user directory, monitor platform bookings, control Stripe escrow holds, resolve disputes, inspect recordings, and view DataStitcher audit logs.
          </p>
        </div>

        <button
          onClick={refreshAll}
          disabled={loading}
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> Refresh All
        </button>
      </div>

      {/* Global Action Message Banner */}
      {actionMessage.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          background: actionMessage.type === 'success' ? 'var(--color-background-success)' : 'var(--color-background-danger)',
          color: actionMessage.type === 'success' ? 'var(--color-text-success)' : 'var(--color-text-danger)',
          border: `1px solid ${actionMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
        }}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage({ type: '', text: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* Admin Navigation Sidebar / Tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                border: active ? '1.5px solid var(--plum-primary)' : '1px solid var(--color-border-tertiary)',
                background: active ? 'var(--plum-primary)' : 'var(--color-background-primary)',
                color: active ? '#fff' : 'var(--color-text-secondary)',
                transition: 'all .15s ease',
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panes */}
      {activeTab === 'overview' && (
        <OverviewTab overview={overview} disputesCount={disputes.length} reportsCount={reports.length} />
      )}

      {activeTab === 'users' && (
        <UsersTab
          users={users}
          pagination={userPagination}
          roleFilter={userRoleFilter}
          searchQuery={userSearch}
          onRoleChange={(r) => { setUserRoleFilter(r); fetchUsers(1, r, userSearch); }}
          onSearchChange={(q) => { setUserSearch(q); fetchUsers(1, userRoleFilter, q); }}
          onPageChange={(p) => fetchUsers(p, userRoleFilter, userSearch)}
          onToggleBlock={handleToggleBlock}
          actionLoading={actionLoading}
        />
      )}

      {activeTab === 'bookings' && (
        <BookingsTab
          bookings={bookings}
          statusFilter={bookingStatusFilter}
          onStatusFilterChange={setBookingStatusFilter}
          onViewBooking={(id) => navigate(`/bookings/${id}`)}
        />
      )}

      {activeTab === 'payments' && (
        <PaymentsTab
          bookings={bookings}
          onRelease={handlePaymentRelease}
          onRefund={handlePaymentRefund}
          actionLoading={actionLoading}
        />
      )}

      {activeTab === 'disputes' && (
        <DisputesTab
          disputes={disputes}
          selectedDispute={selectedDispute}
          setSelectedDispute={setSelectedDispute}
          resolutionText={resolutionText}
          setResolutionText={setResolutionText}
          onReview={handleDisputeReview}
          onResolve={(id, type, action) => handleDisputeResolve(id, type, action)}
          actionLoading={actionLoading}
        />
      )}

      {activeTab === 'recordings' && (
        <RecordingsTab recordings={recordings} />
      )}

      {activeTab === 'podcasts' && (
        <PodcastsTab />
      )}

      {activeTab === 'reports' && (
        <ReportsTab overview={overview} reports={reports} />
      )}

      {activeTab === 'ai' && (
        <AiJobsTab jobs={aiJobs} />
      )}

      {activeTab === 'audit' && (
        <AuditTab logs={auditLogs} />
      )}
    </div>
  );
}

// ── Tab 1: Dashboard (Overview) ─────────────────────────────────────────────
function OverviewTab({ overview, disputesCount, reportsCount }) {
  const stats = overview || {
    users: { total: 0, hosts: 0, guests: 0 },
    bookings: { total: 0, active: 0, completed: 0, disputed: 0 },
    payments: { heldCount: 0, heldCents: 0, releasedCount: 0, releasedCents: 0, refundedCount: 0, refundedCents: 0 },
    recordings: { processing: 0, ready: 0, failed: 0 },
    renders: { queued: 0, processing: 0, ready: 0, failed: 0 },
    revenueCents: 0,
    openDisputes: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <KpiCard label="Total Users" value={stats.users.total} sub={`${stats.users.hosts} Hosts • ${stats.users.guests} Guests`} Icon={Users} color="var(--plum-primary)" />
        <KpiCard label="Bookings" value={stats.bookings.total} sub={`${stats.bookings.completed} Completed • ${stats.bookings.active} Active`} Icon={Calendar} color="var(--purple-castreach)" />
        <KpiCard label="Escrow Held" value={`$${((stats.payments?.heldCents || 0) / 100).toFixed(2)}`} sub={`${stats.payments?.heldCount || 0} Sessions Held`} Icon={CreditCard} color="#f59e0b" />
        <KpiCard label="Released Revenue" value={`$${((stats.revenueCents || 0) / 100).toFixed(2)}`} sub={`${stats.payments?.releasedCount || 0} Payouts Settled`} Icon={DollarSign} color="#10b981" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-primary)' }}>Recording Processing Pipeline</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            <span>Processing: <strong style={{ color: '#f59e0b' }}>{stats.recordings?.processing || 0}</strong></span>
            <span>Ready: <strong style={{ color: '#10b981' }}>{stats.recordings?.ready || 0}</strong></span>
            <span>Failed: <strong style={{ color: '#ef4444' }}>{stats.recordings?.failed || 0}</strong></span>
          </div>
        </div>

        <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-primary)' }}>FFmpeg Async Rendering Queue</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            <span>Queued/Processing: <strong style={{ color: '#f59e0b' }}>{(stats.renders?.queued || 0) + (stats.renders?.processing || 0)}</strong></span>
            <span>Ready: <strong style={{ color: '#10b981' }}>{stats.renders?.ready || 0}</strong></span>
            <span>Failed: <strong style={{ color: '#ef4444' }}>{stats.renders?.failed || 0}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Users Management ──────────────────────────────────────────────────
function UsersTab({ users, pagination, roleFilter, searchQuery, onRoleChange, onSearchChange, onPageChange, onToggleBlock, actionLoading }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search users by name or email…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8, border: '1px solid var(--color-border-tertiary)', fontSize: 13 }}
          />
          <Search size={16} color="var(--color-text-secondary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => onRoleChange(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--color-border-tertiary)', fontSize: 13, background: 'var(--color-background-primary)' }}
        >
          <option value="">All Roles</option>
          <option value="host">Hosts Only</option>
          <option value="guest">Guests Only</option>
          <option value="admin">Admins Only</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border-tertiary)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '10px 12px' }}>User</th>
              <th style={{ padding: '10px 12px' }}>Role</th>
              <th style={{ padding: '10px 12px' }}>Status</th>
              <th style={{ padding: '10px 12px' }}>Joined Date</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>No users found matching criteria.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: u.role === 'admin' ? 'var(--plum-deep)' : 'var(--color-background-info)', color: u.role === 'admin' ? '#fff' : 'var(--color-text-info)' }}>
                      {u.role?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: u.isBlocked ? 'var(--color-text-danger)' : 'var(--color-text-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {u.isBlocked ? <XCircle size={14} /> : <CheckCircle size={14} />}
                      {u.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>
                    {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => onToggleBlock(u._id, u.isBlocked)}
                        disabled={actionLoading}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          border: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: u.isBlocked ? 'var(--color-background-success)' : 'var(--color-background-danger)',
                          color: u.isBlocked ? 'var(--color-text-success)' : 'var(--color-text-danger)',
                        }}
                      >
                        {u.isBlocked ? 'Unblock' : 'Suspend User'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
          <button onClick={() => onPageChange(Math.max(1, pagination.page - 1))} disabled={pagination.page === 1} style={pageBtnStyle}>
            <ChevronLeft size={14} /> Previous
          </button>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Page {pagination.page} of {pagination.pages}</span>
          <button onClick={() => onPageChange(Math.min(pagination.pages, pagination.page + 1))} disabled={pagination.page >= pagination.pages} style={pageBtnStyle}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Bookings Management ─────────────────────────────────────────────
function BookingsTab({ bookings, statusFilter, onStatusFilterChange, onViewBooking }) {
  const filtered = statusFilter ? bookings.filter(b => b.status === statusFilter) : bookings;

  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Platform Bookings Ledger</h3>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border-tertiary)', fontSize: 13, background: 'var(--color-background-primary)' }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="disputed">Disputed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border-tertiary)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '10px 12px' }}>Booking ID</th>
              <th style={{ padding: '10px 12px' }}>Host</th>
              <th style={{ padding: '10px 12px' }}>Guest</th>
              <th style={{ padding: '10px 12px' }}>Scheduled</th>
              <th style={{ padding: '10px 12px' }}>Status</th>
              <th style={{ padding: '10px 12px' }}>Payment</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b._id} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>{b._id}</td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{b.host?.name || 'Host'}</td>
                <td style={{ padding: '10px 12px' }}>{b.guest?.name || 'Guest'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{new Date(b.slotStart).toLocaleString()}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', background: 'var(--color-background-info)', color: 'var(--color-text-info)' }}>
                    {b.status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', background: b.paymentStatus === 'released' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: b.paymentStatus === 'released' ? '#10b981' : '#f59e0b' }}>
                    {b.paymentStatus} (${((b.amountCents || 0) / 100).toFixed(2)})
                  </span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <button onClick={() => onViewBooking(b._id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-border-tertiary)', background: 'transparent', fontSize: 12, cursor: 'pointer' }}>
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab 4: Payments & Escrow Ledger ─────────────────────────────────────────
function PaymentsTab({ bookings, onRelease, onRefund, actionLoading }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Stripe Escrow & Payout Control</h3>
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        Safe operational ledger — zero cardholder numbers, CVVs, or secret credentials exposed.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border-tertiary)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '10px 12px' }}>Booking ID</th>
              <th style={{ padding: '10px 12px' }}>Session Amount</th>
              <th style={{ padding: '10px 12px' }}>Escrow Status</th>
              <th style={{ padding: '10px 12px' }}>Confirmations</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Admin Escrow Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>{b._id}</td>
                <td style={{ padding: '10px 12px', fontWeight: 700 }}>${((b.amountCents || 0) / 100).toFixed(2)} USD</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', background: b.paymentStatus === 'released' ? 'rgba(16,185,129,0.15)' : b.paymentStatus === 'refunded' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: b.paymentStatus === 'released' ? '#10b981' : b.paymentStatus === 'refunded' ? '#ef4444' : '#f59e0b' }}>
                    {b.paymentStatus}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  Host: {b.hostConfirmedCompletion ? '✓' : '✗'} | Guest: {b.guestConfirmedCompletion ? '✓' : '✗'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  {b.paymentStatus === 'held' && (
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button onClick={() => onRelease(b._id)} disabled={actionLoading} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Release
                      </button>
                      <button onClick={() => onRefund(b._id)} disabled={actionLoading} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Refund
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab 5: Disputes Resolution Operations ──────────────────────────────────
function DisputesTab({ disputes, selectedDispute, setSelectedDispute, resolutionText, setResolutionText, onReview, onResolve, actionLoading }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Booking Disputes Operational Queue</h3>
      {disputes.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>No active booking disputes.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {disputes.map((d) => (
            <div key={d._id} style={{ border: '1px solid var(--color-border-tertiary)', borderRadius: 10, padding: 16, background: 'var(--color-background-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Dispute #{d._id.slice(-6)} — Reason: {d.reason}</span>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', background: d.status === 'open' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: d.status === 'open' ? '#ef4444' : '#f59e0b' }}>
                  {d.status}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>{d.description}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {d.status === 'open' && (
                  <button onClick={() => onReview(d._id)} disabled={actionLoading} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--plum-primary)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Mark Under Review
                  </button>
                )}
                {['open', 'under_review'].includes(d.status) && (
                  <button onClick={() => setSelectedDispute(d._id)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--plum-primary)', background: '#fff', color: 'var(--plum-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Resolve / Dismiss
                  </button>
                )}
              </div>

              {selectedDispute === d._id && (
                <div style={{ marginTop: 14, padding: 14, background: 'var(--color-background-primary)', borderRadius: 8, border: '1px solid var(--color-border-tertiary)' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Resolution Notes (min 10 chars)</label>
                  <textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Describe resolution decision..."
                    rows={2}
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--color-border-tertiary)', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => onResolve(d._id, 'resolve', 'refund')} disabled={actionLoading} style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Resolve & Refund Guest
                    </button>
                    <button onClick={() => onResolve(d._id, 'resolve', 'release')} disabled={actionLoading} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Resolve & Release to Host
                    </button>
                    <button onClick={() => onResolve(d._id, 'dismiss', null)} disabled={actionLoading} style={{ padding: '6px 12px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Dismiss Dispute
                    </button>
                    <button onClick={() => setSelectedDispute(null)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 6: Recordings & Render Queue Inspection ──────────────────────────────
function RecordingsTab({ recordings }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recording Storage & FFmpeg Render Queue Inspector</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border-tertiary)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '10px 12px' }}>Booking ID</th>
              <th style={{ padding: '10px 12px' }}>Original Status</th>
              <th style={{ padding: '10px 12px' }}>Storage Provider</th>
              <th style={{ padding: '10px 12px' }}>Duration</th>
              <th style={{ padding: '10px 12px' }}>Render Status</th>
              <th style={{ padding: '10px 12px' }}>Render Job ID</th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((r) => (
              <tr key={r._id} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>{r._id}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: r.recordingStatus === 'READY' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: r.recordingStatus === 'READY' ? '#10b981' : '#f59e0b' }}>
                    {r.recordingStatus || 'NOT_STARTED'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                  {r.recordingStorage?.provider || 'local'} ({r.recordingStorage?.status || 'NOT_STORED'})
                </td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>
                  {r.recordingDuration ? `${r.recordingDuration}s` : 'N/A'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: r.recordingEdit?.renderStatus === 'READY' ? 'rgba(16,185,129,0.15)' : r.recordingEdit?.renderStatus === 'FAILED' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: r.recordingEdit?.renderStatus === 'READY' ? '#10b981' : r.recordingEdit?.renderStatus === 'FAILED' ? '#ef4444' : '#f59e0b' }}>
                    {r.recordingEdit?.renderStatus || 'NOT_REQUESTED'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  {r.recordingEdit?.renderJobId || 'None'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab 7: Podcast Moderation & Content Management ────────────────────────
function PodcastsTab() {
  const [podcasts, setPodcasts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const fetchAdminPodcasts = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/podcasts?limit=50', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (res.ok && data.podcasts) {
        setPodcasts(data.podcasts);
      } else {
        setError(data.error || 'Failed to load podcasts');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAdminPodcasts();
  }, [fetchAdminPodcasts]);

  const handleUnpublishPodcast = async (id) => {
    try {
      const res = await fetch(`/api/podcasts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: 'DRAFT' }),
      });
      if (res.ok) {
        fetchAdminPodcasts();
      }
    } catch (err) {
      alert(`Unpublish failed: ${err.message}`);
    }
  };

  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Podcast Moderation & Content Management</h3>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
            Inspect shows, verify publishing status, and moderate platform podcasts.
          </p>
        </div>
        <span style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: 11, fontWeight: 700 }}>
          Module Active
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>Loading podcasts...</div>
      ) : error ? (
        <div style={{ padding: 16, borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 13 }}>{error}</div>
      ) : podcasts.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
          No published podcasts currently on the platform.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--color-border-tertiary)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '10px 12px' }}>Podcast / Slug</th>
                <th style={{ padding: '10px 12px' }}>Owner</th>
                <th style={{ padding: '10px 12px' }}>Category</th>
                <th style={{ padding: '10px 12px' }}>Episodes</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {podcasts.map((p) => (
                <tr key={p._id} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>/podcasts/{p.slug}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{p.owner?.name || 'Unknown User'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{p.category}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.episodeCount || 0}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: p.status === 'PUBLISHED' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: p.status === 'PUBLISHED' ? '#10b981' : '#f59e0b' }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {p.status === 'PUBLISHED' && (
                      <button
                        onClick={() => handleUnpublishPodcast(p._id)}
                        style={{ padding: '4px 8px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Unpublish
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab 8: Operational Reports ─────────────────────────────────────────────
function ReportsTab({ overview, reports }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Platform Operations & Analytics Reports</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div style={{ border: '1px solid var(--color-border-tertiary)', padding: 16, borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Bookings Breakdown</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Total: {overview?.bookings?.total || 0} • Active: {overview?.bookings?.active || 0} • Completed: {overview?.bookings?.completed || 0}
          </div>
        </div>
        <div style={{ border: '1px solid var(--color-border-tertiary)', padding: 16, borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Escrow Payout Settlement</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Released: ${((overview?.revenueCents || 0) / 100).toFixed(2)} USD • Held: ${((overview?.payments?.heldCents || 0) / 100).toFixed(2)} USD
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 9: Audit Log Viewer ────────────────────────────────────────────────
function AuditTab({ logs }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>DataStitcher Immutable Audit Logs</h3>
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        Append-only event log — all sensitive fields automatically pre-redacted.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border-tertiary)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '8px 10px' }}>Timestamp</th>
              <th style={{ padding: '8px 10px' }}>Action</th>
              <th style={{ padding: '8px 10px' }}>Collection</th>
              <th style={{ padding: '8px 10px' }}>Actor</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>{new Date(l.createdAt).toLocaleString()}</td>
                <td style={{ padding: '8px 10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--plum-primary)' }}>{l.action}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{l.collectionName}</td>
                <td style={{ padding: '8px 10px' }}>{l.actor?.name || l.actorRole || 'System'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: AI Jobs Inspection ────────────────────────────────────────────────
function AiJobsTab({ jobs = [] }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>AI Podcast Intelligence Jobs</h3>
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        Monitor async AI generation tasks, provider models, execution statuses, and token usage metadata.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border-tertiary)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '8px 10px' }}>Job ID</th>
              <th style={{ padding: '8px 10px' }}>Artifact Type</th>
              <th style={{ padding: '8px 10px' }}>Status</th>
              <th style={{ padding: '8px 10px' }}>Source</th>
              <th style={{ padding: '8px 10px' }}>Provider / Model</th>
              <th style={{ padding: '8px 10px' }}>Attempt</th>
              <th style={{ padding: '8px 10px' }}>Tokens (In / Out)</th>
              <th style={{ padding: '8px 10px' }}>Requested At</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '16px 10px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No AI generation jobs recorded yet.
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j._id} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600 }}>{j.jobId}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--plum-primary)' }}>{j.artifactType}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 700,
                      background: j.status === 'READY' ? '#dcfce7' : j.status === 'FAILED' ? '#fee2e2' : '#fef3c7',
                      color: j.status === 'READY' ? '#15803d' : j.status === 'FAILED' ? '#b91c1c' : '#b45309',
                    }}>
                      {j.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textTransform: 'capitalize' }}>
                    {j.sourceType}: {j.sourceId?.slice ? j.sourceId.slice(-6) : j.sourceId}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                    {j.provider || 'anthropic'} ({j.model || 'haiku'})
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{j.attempt || 1}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                    {j.usage?.inputTokens || 0} / {j.usage?.outputTokens || 0}
                  </td>
                  <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>
                    {j.requestedAt ? new Date(j.requestedAt).toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, Icon, color }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', padding: 20, borderRadius: 12, border: '1px solid var(--color-border-tertiary)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
        <Icon size={18} color={color} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

const pageBtnStyle = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid var(--color-border-tertiary)',
  background: 'var(--color-background-primary)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};
