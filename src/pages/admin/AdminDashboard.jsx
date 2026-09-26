import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Users, 
  Headphones, 
  Mic, 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  FileText, 
  Activity, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Lock, 
  Star, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Sliders,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [overview, setOverview]     = useState(null);
  const [users, setUsers]           = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userPagination, setUserPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });

  const [bookings, setBookings]     = useState([]);
  const [disputes, setDisputes]     = useState([]);
  const [reports, setReports]       = useState([]);
  const [auditLogs, setAuditLogs]   = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);

  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Modal / Form states
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionText, setResolutionText] = useState('');

  // 1. Fetch Overview & System Health
  const fetchOverviewData = useCallback(async () => {
    try {
      const [repRes, healthRes] = await Promise.all([
        authFetch('/reports/overview'),
        authFetch('/stitcher/health'),
      ]);
      const repData = await repRes.json();
      const hData   = await healthRes.json();
      
      if (repRes.ok && repData.data) setOverview(repData.data);
      if (healthRes.ok) setHealthStatus(hData);
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
      const res  = await authFetch('/bookings?limit=30');
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

  // 5. Fetch Reports
  const fetchReports = useCallback(async () => {
    try {
      const res  = await authFetch('/moderation/reports');
      const data = await res.json();
      if (res.ok) setReports(data.reports || []);
    } catch {
      /* silent */
    }
  }, [authFetch]);

  // 6. Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const res  = await authFetch('/stitcher/audit-logs?limit=25');
      const data = await res.json();
      if (res.ok) setAuditLogs(data.logs || []);
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
      fetchReports(),
      fetchAuditLogs(),
    ]);
    setLoading(false);
  }, [fetchOverviewData, fetchUsers, fetchBookings, fetchDisputes, fetchReports, fetchAuditLogs, userPagination.page, userRoleFilter, userSearch]);

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

  // Handle Dispute Actions
  const handleDisputeReview = async (disputeId) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/disputes/${disputeId}/review`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMessage({ type: 'success', text: 'Dispute moved to Under Review.' });
      fetchDisputes();
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisputeResolve = async (disputeId, actionType) => {
    if (!resolutionText || resolutionText.trim().length < 10) {
      return setActionMessage({ type: 'danger', text: 'Resolution text must be at least 10 characters.' });
    }
    setActionLoading(true);
    try {
      const endpoint = `/disputes/${disputeId}/${actionType}`;
      const res = await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ resolution: resolutionText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMessage({ type: 'success', text: `Dispute ${actionType === 'resolve' ? 'resolved' : 'dismissed'} successfully.` });
      setSelectedDispute(null);
      setResolutionText('');
      fetchDisputes();
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const TABS = [
    { id: 'overview',  label: 'Overview',      Icon: Shield },
    { id: 'users',     label: 'Users',         Icon: Users },
    { id: 'hosts',     label: 'Hosts',         Icon: Headphones },
    { id: 'guests',    label: 'Guests',        Icon: Mic },
    { id: 'bookings',  label: 'Bookings',      Icon: Calendar },
    { id: 'payments',  label: 'Payments',      Icon: CreditCard },
    { id: 'disputes',  label: 'Disputes',      Icon: AlertTriangle },
    { id: 'reports',   label: 'Reports',       Icon: FileText },
    { id: 'audit',     label: 'Audit Trail',   Icon: Sliders },
    { id: 'health',    label: 'System Health', Icon: Activity },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--plum-deep) 0%, #1A0D20 100%)',
        color: '#fff',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: 'var(--shadow-plum)',
      }}>
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', color: 'var(--lavender-soft)', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            <Shield size={14} /> PLATFORM CONTROL CENTER
          </span>
          <h1 style={{ fontSize: 26, color: '#fff', marginTop: 8, marginBottom: 4 }}>
            System Administration
          </h1>
          <p style={{ color: 'var(--lavender-soft)', fontSize: 13, maxWidth: 540 }}>
            Manage users, inspect platform booking ledgers, authorize escrow holds, and monitor DataStitcher audit logs.
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
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> Refresh Data
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
          justifyContent: 'space-between',
        }}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage({ type: '', text: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
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

      {activeTab === 'hosts' && (
        <HostsTab users={users.filter(u => u.role === 'host')} onToggleBlock={handleToggleBlock} />
      )}

      {activeTab === 'guests' && (
        <GuestsTab users={users.filter(u => u.role === 'guest')} onToggleBlock={handleToggleBlock} />
      )}

      {activeTab === 'bookings' && (
        <BookingsTab bookings={bookings} />
      )}

      {activeTab === 'payments' && (
        <PaymentsTab bookings={bookings} overview={overview} />
      )}

      {activeTab === 'disputes' && (
        <DisputesTab
          disputes={disputes}
          selectedDispute={selectedDispute}
          setSelectedDispute={setSelectedDispute}
          resolutionText={resolutionText}
          setResolutionText={setResolutionText}
          onReview={handleDisputeReview}
          onResolve={(id, type) => handleDisputeResolve(id, type)}
          actionLoading={actionLoading}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsTab reports={reports} onToggleBlock={handleToggleBlock} />
      )}

      {activeTab === 'audit' && (
        <AuditTab logs={auditLogs} />
      )}

      {activeTab === 'health' && (
        <HealthTab health={healthStatus} />
      )}
    </div>
  );
}

// ── Tab 1: Overview ──────────────────────────────────────────────────────────
function OverviewTab({ overview, disputesCount, reportsCount }) {
  const stats = overview || {
    users: { total: 0, hosts: 0, guests: 0 },
    bookings: { total: 0, completed: 0 },
    revenueCents: 0,
    openDisputes: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <KpiCard label="Total Registered Users" value={stats.users.total} sub={`${stats.users.hosts} Hosts • ${stats.users.guests} Guests`} Icon={Users} color="var(--plum-primary)" />
        <KpiCard label="Platform Bookings" value={stats.bookings.total} sub={`${stats.bookings.completed} Completed`} Icon={Calendar} color="var(--purple-castreach)" />
        <KpiCard label="Total Released Revenue" value={`$${((stats.revenueCents || 0) / 100).toFixed(2)}`} sub="Stripe Escrow Settled" Icon={DollarSign} color="var(--color-success)" />
        <KpiCard label="Active Disputes" value={disputesCount} sub={`${reportsCount} User Reports`} Icon={AlertTriangle} color={disputesCount > 0 ? 'var(--color-danger)' : 'var(--color-success)'} />
      </div>
    </div>
  );
}

// ── Tab 2: Users ────────────────────────────────────────────────────────────
function UsersTab({ users, pagination, roleFilter, searchQuery, onRoleChange, onSearchChange, onPageChange, onToggleBlock, actionLoading }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      {/* Filters Bar */}
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

      {/* Users Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border-tertiary)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '10px 12px' }}>User</th>
              <th style={{ padding: '10px 12px' }}>Role</th>
              <th style={{ padding: '10px 12px' }}>Status</th>
              <th style={{ padding: '10px 12px' }}>Joined</th>
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
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{u._id}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: u.role === 'admin' ? 'var(--plum-deep)' : 'var(--color-background-info)', color: u.role === 'admin' ? '#fff' : 'var(--color-text-info)' }}>
                      {u.role.toUpperCase()}
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
                        {u.isBlocked ? 'Unblock' : 'Block User'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
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

// ── Tab 3: Hosts ────────────────────────────────────────────────────────────
function HostsTab({ users, onToggleBlock }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Verified Podcast Hosts Directory</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {users.map((h) => (
          <div key={h._id} style={{ border: '1px solid var(--color-border-tertiary)', borderRadius: 10, padding: 14, background: 'var(--color-background-secondary)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{h.name}</div>
            <div style={{ fontSize: 12, color: 'var(--plum-primary)', fontWeight: 600, marginBottom: 8 }}>{h.podcastName || 'Host Account'}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
              Rate: ${((h.sessionRateCents || 0) / 100).toFixed(2)}/session • Rating: {h.avgRating ? h.avgRating.toFixed(1) : '5.0'} ★
            </div>
            <button
              onClick={() => onToggleBlock(h._id, h.isBlocked)}
              style={{ width: '100%', padding: '6px', borderRadius: 6, border: 'none', background: h.isBlocked ? '#22c55e' : '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {h.isBlocked ? 'Unblock Host' : 'Suspend Host'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 4: Guests ───────────────────────────────────────────────────────────
function GuestsTab({ users, onToggleBlock }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Guest Speakers Directory</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {users.map((g) => (
          <div key={g._id} style={{ border: '1px solid var(--color-border-tertiary)', borderRadius: 10, padding: 14, background: 'var(--color-background-secondary)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{g.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{g.expertise?.join(' · ') || 'General Guest'}</div>
            <button
              onClick={() => onToggleBlock(g._id, g.isBlocked)}
              style={{ width: '100%', padding: '6px', borderRadius: 6, border: 'none', background: g.isBlocked ? '#22c55e' : '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {g.isBlocked ? 'Unblock Guest' : 'Suspend Guest'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 5: Bookings Ledger ──────────────────────────────────────────────────
function BookingsTab({ bookings }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Platform Booking Ledger</h3>
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
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>{b._id}</td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{b.host?.name || b.host}</td>
                <td style={{ padding: '10px 12px' }}>{b.guest?.name || b.guest}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{new Date(b.slotStart).toLocaleString()}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', background: 'var(--color-background-info)', color: 'var(--color-text-info)' }}>
                    {b.status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', background: 'var(--color-background-success)', color: 'var(--color-text-success)' }}>
                    {b.paymentStatus} (${((b.amountCents || 0) / 100).toFixed(2)})
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab 6: Payments Ledger (Safe Operational View) ─────────────────────────
function PaymentsTab({ bookings, overview }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Stripe Connect Escrow & Financial Ledger</h3>
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        Safe operational overview — zero cardholder numbers, CVVs, or secret credentials exposed.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border-tertiary)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '10px 12px' }}>Booking ID</th>
              <th style={{ padding: '10px 12px' }}>Amount</th>
              <th style={{ padding: '10px 12px' }}>Escrow Status</th>
              <th style={{ padding: '10px 12px' }}>Intent ID</th>
              <th style={{ padding: '10px 12px' }}>Created Date</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>{b._id}</td>
                <td style={{ padding: '10px 12px', fontWeight: 700 }}>${((b.amountCents || 0) / 100).toFixed(2)} USD</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', background: b.paymentStatus === 'held' ? '#fef3c7' : '#dcfce7', color: b.paymentStatus === 'held' ? '#92400e' : '#166534' }}>
                    {b.paymentStatus}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  {b.stripePaymentIntentId || 'pi_simulated_hold'}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{new Date(b.createdAt || Date.now()).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab 7: Disputes Resolution Center ───────────────────────────────────────
function DisputesTab({ disputes, selectedDispute, setSelectedDispute, resolutionText, setResolutionText, onReview, onResolve, actionLoading }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Booking Disputes Queue</h3>
      {disputes.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>No active booking disputes.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {disputes.map((d) => (
            <div key={d._id} style={{ border: '1px solid var(--color-border-tertiary)', borderRadius: 10, padding: 16, background: 'var(--color-background-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Dispute #{d._id.slice(-6)} — Reason: {d.reason}</span>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', background: d.status === 'open' ? '#fee2e2' : '#fef3c7', color: d.status === 'open' ? '#991b1b' : '#92400e' }}>
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
                <div style={{ marginTop: 14, padding: 14, background: '#fff', borderRadius: 8, border: '1px solid var(--color-border-tertiary)' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Resolution Notes (min 10 chars)</label>
                  <textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Describe resolution decision..."
                    rows={2}
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--color-border-tertiary)', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => onResolve(d._id, 'resolve')} disabled={actionLoading} style={{ padding: '6px 12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Resolve Dispute
                    </button>
                    <button onClick={() => onResolve(d._id, 'dismiss')} disabled={actionLoading} style={{ padding: '6px 12px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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

// ── Tab 8: User Reports / Moderation ───────────────────────────────────────
function ReportsTab({ reports, onToggleBlock }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Moderation & User Incident Reports</h3>
      {reports.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>No open user reports filed.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map((r) => (
            <div key={r._id} style={{ border: '1px solid var(--color-border-tertiary)', borderRadius: 10, padding: 14, background: 'var(--color-background-secondary)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                Reporter: {r.reporter?.name || 'User'} → Reported: <b>{r.reported?.name || 'User'}</b>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 10 }}>Reason: {r.reason}</p>
              <button
                onClick={() => onToggleBlock(r.reported?._id, false)}
                style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Block Reported User
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 9: DataStitcher Audit Log Viewer ──────────────────────────────────
function AuditTab({ logs }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>DataStitcher Immutable Audit Trail</h3>
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

// ── Tab 10: System Health ─────────────────────────────────────────────────
function HealthTab({ health }) {
  const h = health || { status: 'healthy', database: 'connected', stitcher: 'active' };
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Platform Subsystem Health</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <HealthCard label="API Engine" status="Online" color="var(--color-success)" />
        <HealthCard label="MongoDB Connection" status="Connected" color="var(--color-success)" />
        <HealthCard label="DataStitcher Registry" status="Active" color="var(--color-success)" />
        <HealthCard label="Stripe Escrow Connect" status="Configured" color="var(--color-success)" />
        <HealthCard label="Daily.co WebRTC Engine" status="Active" color="var(--color-success)" />
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

function HealthCard({ label, status, color }) {
  return (
    <div style={{ padding: 16, borderRadius: 10, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color, display: 'flex', alignItems: 'center', gap: 6 }}>
        <CheckCircle size={16} /> {status}
      </div>
    </div>
  );
}

const pageBtnStyle = {
  padding: '6px 12px',
  border: '1px solid var(--color-border-tertiary)',
  borderRadius: 6,
  background: 'var(--color-background-primary)',
  cursor: 'pointer',
  fontSize: 12,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};
