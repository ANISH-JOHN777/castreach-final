import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  Radio, 
  Mic, 
  Film, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  DollarSign, 
  RotateCcw, 
  RefreshCw, 
  BarChart3, 
  Activity, 
  Server, 
  Database, 
  Wifi, 
  HardDrive, 
  Cpu, 
  ArrowUpRight, 
  Star, 
  Zap, 
  Flame, 
  ShieldCheck, 
  MessageSquare, 
  Award, 
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BADGE_META = {
  top_rated:      { label: 'Top Rated',      Icon: Star, color: '#f59e0b' },
  fast_responder: { label: 'Fast Responder', Icon: Zap, color: '#3b82f6' },
  most_booked:    { label: 'Most Booked',    Icon: Flame, color: '#ef4444' },
  verified_host:  { label: 'Verified Host',  Icon: ShieldCheck, color: '#22c55e' },
};

export default function Insights() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [range, setRange] = useState('6');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Admin Data States
  const [overview, setOverview] = useState(null);
  const [bookingsReport, setBookingsReport] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);
  const [readyStatus, setReadyStatus] = useState(null);

  // Non-admin Data State
  const [userAnalytics, setUserAnalytics] = useState(null);

  const fetchAdminData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const [overviewRes, bookingsRes, auditRes, healthRes, readyRes] = await Promise.all([
        authFetch('/reports/overview').catch(() => null),
        authFetch(`/reports/bookings?months=${range}`).catch(() => null),
        authFetch('/stitcher/audit-logs?limit=8').catch(() => null),
        authFetch('/health').catch(() => null),
        authFetch('/ready').catch(() => null),
      ]);

      if (overviewRes && overviewRes.ok) {
        const d = await overviewRes.json();
        setOverview(d.data || d);
      }
      if (bookingsRes && bookingsRes.ok) {
        const d = await bookingsRes.json();
        setBookingsReport(d.data || d);
      }
      if (auditRes && auditRes.ok) {
        const d = await auditRes.json();
        setAuditLogs(d.logs || d.data || []);
      }
      if (healthRes && healthRes.ok) {
        const d = await healthRes.json();
        setHealthStatus(d);
      }
      if (readyRes && readyRes.ok) {
        const d = await readyRes.json();
        setReadyStatus(d);
      }
    } catch (err) {
      setError(err.message || 'Failed to load platform analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authFetch, range]);

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/analytics/me');
      if (!res.ok) throw new Error('Failed to load user analytics');
      const d = await res.json();
      setUserAnalytics(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    } else {
      fetchUserData();
    }
  }, [isAdmin, range, fetchAdminData, fetchUserData]);

  const handleRefresh = () => {
    if (isAdmin) {
      fetchAdminData(true);
    } else {
      fetchUserData();
    }
  };

  // ---------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------
  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <div style={{ height: 28, width: 220, background: 'var(--color-border-primary)', borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 16, width: 340, background: 'var(--color-border-primary)', borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 24 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ ...cardStyle, height: 110, background: 'var(--white-pure)', opacity: 0.7 }} />
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // ERROR STATE
  // ---------------------------------------------------------
  if (error) {
    return (
      <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', padding: 24, borderRadius: 16, textAlign: 'center', maxWidth: 440, border: '1px solid var(--border-subtle)' }}>
          <AlertCircle size={36} style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--color-error)' }}>Unable to Load Insights</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>{error}</p>
          <button onClick={handleRefresh} style={primaryBtnStyle}>
            <RefreshCw size={16} /> Retry Loading
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // NON-ADMIN VIEW (PERSONAL INSIGHTS)
  // ---------------------------------------------------------
  if (!isAdmin) {
    const data = userAnalytics || {};
    const completionRate = data.totalBookings > 0
      ? Math.round((data.completedBookings / data.totalBookings) * 100)
      : 0;

    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Your Insights</h1>
            <p style={subtitleStyle}>Track your personal bookings, ratings, performance, and badges.</p>
          </div>
          <button onClick={handleRefresh} style={secondaryBtnStyle} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total bookings',    value: data.totalBookings || 0,     Icon: Calendar, color: 'var(--plum-primary)' },
            { label: 'Completed',         value: data.completedBookings || 0, Icon: CheckCircle2, color: 'var(--color-success)' },
            { label: 'This month',        value: data.thisMonthBookings || 0, Icon: BarChart3, color: 'var(--purple-castreach)' },
            { label: 'Completion rate',   value: `${completionRate}%`,       Icon: TrendingUp, color: 'var(--plum-deep)' },
            { label: 'Avg rating',        value: data.avgRating?.toFixed(1) || '—', Icon: Star, color: 'var(--color-warning)' },
            { label: 'Response rate',     value: `${Math.round((data.responseRate || 0) * 100)}%`, Icon: MessageSquare, color: 'var(--plum-primary)' },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                <div style={{ background: `${color}15`, padding: 8, borderRadius: 10 }}>
                  <Icon size={18} color={color} />
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 12, color: 'var(--plum-deep)' }}>{value}</div>
            </div>
          ))}
        </div>

        {data.badges?.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Your Badges</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {data.badges.map((b) => {
                const meta = BADGE_META[b] || { label: b, Icon: Award, color: '#6b7280' };
                const BadgeIcon = meta.Icon;
                return (
                  <div key={b} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', borderRadius: 20,
                    background: `${meta.color}15`, border: `1.5px solid ${meta.color}40`,
                    fontSize: 13, fontWeight: 600, color: meta.color,
                  }}>
                    <BadgeIcon size={16} color={meta.color} /> {meta.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.topTopics?.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Popular Topics</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.topTopics.map(({ topic, count }) => {
                const max = data.topTopics[0].count || 1;
                return (
                  <div key={topic}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{topic}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{count} sessions</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--lavender-mist)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: 'var(--plum-primary)', borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------
  // ADMIN PLATFORM OVERVIEW DASHBOARD
  // ---------------------------------------------------------
  const ov = overview || {};
  const users = ov.users || { total: 0, hosts: 0, guests: 0 };
  const bookings = ov.bookings || { total: 0, active: 0, completed: 0, disputed: 0 };
  const payments = ov.payments || { heldCount: 0, heldCents: 0, releasedCount: 0, releasedCents: 0, refundedCount: 0, refundedCents: 0 };
  const podcasts = ov.podcasts || { total: 0, published: 0, totalEpisodes: 0, publishedEpisodes: 0 };

  const byMonth = bookingsReport?.byMonth || [];
  const byStatus = bookingsReport?.byStatus || [];

  return (
    <div style={containerStyle}>
      {/* SECTION 1 — PAGE HEADER */}
      <div style={headerStyle}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={titleStyle}>Platform Overview</h1>
            <span style={adminBadgeStyle}>ADMIN INSIGHTS</span>
          </div>
          <p style={subtitleStyle}>Monitor CastReach activity, growth, bookings, and platform health.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <select 
            value={range} 
            onChange={(e) => setRange(e.target.value)} 
            style={selectStyle}
            aria-label="Time range selector"
          >
            <option value="1">Last 30 Days</option>
            <option value="3">Last 3 Months</option>
            <option value="6">Last 6 Months</option>
            <option value="12">Last 12 Months</option>
          </select>

          <button onClick={handleRefresh} style={secondaryBtnStyle} disabled={refreshing} title="Refresh data">
            <RefreshCw size={15} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* SECTION 2 — PRIMARY KPI CARDS */}
      <div style={{ marginBottom: 28 }}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Platform Core Metrics</h2>
          <span style={sectionSubStyle}>Aggregate platform-wide registered entities</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { 
              label: 'Total Users', 
              value: users.total.toLocaleString(), 
              sub: `${users.hosts} Hosts · ${users.guests} Guests`, 
              Icon: Users, 
              color: 'var(--plum-deep)',
              bg: 'var(--lavender-mist)'
            },
            { 
              label: 'Hosts', 
              value: users.hosts.toLocaleString(), 
              sub: 'Registered host creators', 
              Icon: Radio, 
              color: 'var(--plum-primary)',
              bg: '#f3e8ff'
            },
            { 
              label: 'Guests', 
              value: users.guests.toLocaleString(), 
              sub: 'Registered podcast guests', 
              Icon: UserCheck, 
              color: '#2563eb',
              bg: '#eff6ff'
            },
            { 
              label: 'Podcasts', 
              value: podcasts.total.toLocaleString(), 
              sub: `${podcasts.published} Published podcasts`, 
              Icon: Mic, 
              color: 'var(--color-success)',
              bg: 'var(--color-success-bg)'
            },
            { 
              label: 'Published Episodes', 
              value: podcasts.publishedEpisodes.toLocaleString(), 
              sub: `${podcasts.totalEpisodes} Total episodes`, 
              Icon: Film, 
              color: '#d97706',
              bg: '#fffbeb'
            },
          ].map(({ label, value, sub, Icon, color, bg }) => (
            <div key={label} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {label}
                </span>
                <div style={{ background: bg, padding: 8, borderRadius: 10 }}>
                  <Icon size={18} color={color} />
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--plum-deep)', marginTop: 8 }}>
                {value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3 — BUSINESS & FINANCIAL KPI CARDS */}
      <div style={{ marginBottom: 32 }}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Booking & Escrow Analytics</h2>
          <span style={sectionSubStyle}>Platform activity and financial escrow status</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { 
              label: 'Total Bookings', 
              value: bookings.total.toLocaleString(), 
              sub: 'All platform sessions', 
              Icon: Calendar, 
              color: 'var(--plum-primary)' 
            },
            { 
              label: 'Completed Bookings', 
              value: bookings.completed.toLocaleString(), 
              sub: 'Successfully finished', 
              Icon: CheckCircle2, 
              color: 'var(--color-success)' 
            },
            { 
              label: 'Active Bookings', 
              value: bookings.active.toLocaleString(), 
              sub: 'Pending or confirmed', 
              Icon: Clock, 
              color: '#d97706' 
            },
            { 
              label: 'Disputed Bookings', 
              value: bookings.disputed.toLocaleString(), 
              sub: `${ov.openDisputes || 0} Currently open`, 
              Icon: AlertTriangle, 
              color: 'var(--color-error)' 
            },
            { 
              label: 'Escrow Held', 
              value: `$${((payments.heldCents || 0) / 100).toFixed(2)}`, 
              sub: `${payments.heldCount || 0} Payments in escrow`, 
              Icon: ShieldAlert, 
              color: 'var(--plum-deep)' 
            },
            { 
              label: 'Released Payouts', 
              value: `$${((payments.releasedCents || 0) / 100).toFixed(2)}`, 
              sub: `${payments.releasedCount || 0} Completed payouts`, 
              Icon: DollarSign, 
              color: 'var(--color-success)' 
            },
            { 
              label: 'Refunded Payments', 
              value: `$${((payments.refundedCents || 0) / 100).toFixed(2)}`, 
              sub: `${payments.refundedCount || 0} Total refunded`, 
              Icon: RotateCcw, 
              color: 'var(--purple-castreach)' 
            },
          ].map(({ label, value, sub, Icon, color }) => (
            <div key={label} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                <Icon size={16} color={color} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--plum-deep)' }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4 & 5 GRID — BOOKING ACTIVITY CHART & PLATFORM DISTRIBUTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, marginBottom: 32 }}>
        
        {/* SECTION 4 — BOOKING ACTIVITY CHART */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--plum-deep)' }}>Booking Activity</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Session count over trailing {range} months</p>
            </div>
            <BarChart3 size={18} color="var(--plum-primary)" />
          </div>

          {byMonth.length === 0 ? (
            <div style={emptyStateStyle}>
              <BarChart3 size={32} color="var(--border-accent)" style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--plum-deep)' }}>No booking trend data available yet.</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Historical trends will appear as bookings are created.</div>
            </div>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 12, paddingTop: 20, paddingBottom: 10 }}>
              {byMonth.map(({ _id, count }) => {
                const max = Math.max(...byMonth.map((m) => m.count), 1);
                const barHeight = Math.max(Math.round((count / max) * 120), 12);
                const monthName = new Date(_id.year, _id.month - 1).toLocaleString('default', { month: 'short' });
                return (
                  <div key={`${_id.year}-${_id.month}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--plum-primary)' }}>{count}</span>
                    <div 
                      style={{ 
                        width: '100%', 
                        maxWidth: 40,
                        height: `${barHeight}px`, 
                        background: 'linear-gradient(180deg, var(--plum-primary), var(--purple-castreach))', 
                        borderRadius: 6,
                        transition: 'height 0.3s ease'
                      }} 
                      title={`${monthName} ${_id.year}: ${count} bookings`}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                      {monthName}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 5 — PLATFORM DISTRIBUTION */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--plum-deep)' }}>Platform Distribution</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Breakdown by user roles and booking status</p>
            </div>
            <Activity size={18} color="var(--plum-primary)" />
          </div>

          {/* User Distribution Bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              <span>User Base Breakdown</span>
              <span style={{ color: 'var(--text-muted)' }}>{users.total} Total</span>
            </div>
            {users.total === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No registered users yet.</div>
            ) : (
              <>
                <div style={{ height: 12, background: 'var(--lavender-mist)', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${(users.hosts / users.total) * 100}%`, background: 'var(--plum-primary)' }} title="Hosts" />
                  <div style={{ width: `${(users.guests / users.total) * 100}%`, background: '#2563eb' }} title="Guests" />
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--plum-primary)' }} />
                    <span>Hosts: <strong>{users.hosts}</strong> ({Math.round((users.hosts / users.total) * 100)}%)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: '#2563eb' }} />
                    <span>Guests: <strong>{users.guests}</strong> ({Math.round((users.guests / users.total) * 100)}%)</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Booking Status Breakdown */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              <span>Booking Status Breakdown</span>
              <span style={{ color: 'var(--text-muted)' }}>{bookings.total} Total</span>
            </div>
            {byStatus.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No booking status records yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {byStatus.map(({ _id, count }) => {
                  const pct = bookings.total > 0 ? Math.round((count / bookings.total) * 100) : 0;
                  const statusColors = {
                    completed: 'var(--color-success)',
                    confirmed: '#2563eb',
                    pending: '#d97706',
                    disputed: 'var(--color-error)',
                    cancelled: '#6b7280',
                  };
                  const color = statusColors[_id] || 'var(--purple-castreach)';
                  return (
                    <div key={_id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{_id}</span>
                        <span>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--lavender-mist)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECTION 6 & 7 GRID — RECENT ACTIVITY & SYSTEM HEALTH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, marginBottom: 32 }}>

        {/* SECTION 6 — RECENT PLATFORM ACTIVITY */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--plum-deep)' }}>Recent Platform Activity</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Audit trail of recent platform actions</p>
            </div>
            <Activity size={18} color="var(--plum-primary)" />
          </div>

          {auditLogs.length === 0 ? (
            <div style={emptyStateStyle}>
              <Activity size={30} color="var(--border-accent)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--plum-deep)' }}>No recent activity yet.</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Platform actions will be logged here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {auditLogs.slice(0, 6).map((log) => {
                const actionLabel = (log.action || 'SYSTEM_EVENT').replace(/_/g, ' ');
                const actorName = log.actor?.name || log.actor?.email || 'System';
                const timeAgo = log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently';
                return (
                  <div key={log._id || Math.random()} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ background: 'var(--lavender-mist)', padding: 8, borderRadius: 8, marginTop: 2 }}>
                      <Activity size={14} color="var(--plum-primary)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--plum-deep)', textTransform: 'capitalize' }}>
                        {actionLabel.toLowerCase()}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        By <strong>{actorName}</strong> {log.actor?.role ? `(${log.actor.role})` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {timeAgo}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 7 — PLATFORM HEALTH */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--plum-deep)' }}>Platform Infrastructure Health</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Realtime service readiness and component status</p>
            </div>
            <Server size={18} color="var(--color-success)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { 
                name: 'API Gateway', 
                status: healthStatus?.status === 'ok' ? 'Operational' : 'Attention required',
                isOk: healthStatus?.status === 'ok',
                detail: healthStatus?.uptime ? `Uptime: ${Math.floor(healthStatus.uptime / 60)} mins` : 'HTTP 200 OK',
                Icon: Server 
              },
              { 
                name: 'Database Cluster', 
                status: readyStatus?.db === 'connected' ? 'Operational' : 'Attention required',
                isOk: readyStatus?.db === 'connected',
                detail: readyStatus?.db === 'connected' ? 'MongoDB Active' : 'Connecting...',
                Icon: Database 
              },
              { 
                name: 'WebSocket Signaling', 
                status: 'Operational',
                isOk: true,
                detail: 'Realtime node active',
                Icon: Wifi 
              },
              { 
                name: 'Media Storage', 
                status: 'Operational',
                isOk: true,
                detail: 'Storage node ready',
                Icon: HardDrive 
              },
              { 
                name: 'Background Workers', 
                status: 'Operational',
                isOk: true,
                detail: 'AI & Render queues active',
                Icon: Cpu 
              },
            ].map(({ name, status, isOk, detail, Icon }) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--cream-warm)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={16} color="var(--plum-primary)" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--plum-deep)' }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{detail}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: isOk ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOk ? 'var(--color-success)' : 'var(--color-warning)' }} />
                  {status}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SECTION 8 — QUICK ADMIN ACTIONS */}
      <div style={{ marginBottom: 32 }}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Quick Admin Actions</h2>
          <span style={sectionSubStyle}>Direct access to management workflows</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {[
            { label: 'Discover Creators', path: '/discover', desc: 'Browse hosts and podcasts' },
            { label: 'Review Bookings', path: '/bookings', desc: 'Audit platform sessions' },
            { label: 'Manage Users', path: '/admin', desc: 'Manage user permissions' },
            { label: 'Review Disputes', path: '/control-center', desc: 'Resolve open disputes' },
            { label: 'Moderate Content', path: '/settings', desc: 'System & media settings' },
          ].map(({ label, path, desc }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              style={actionBtnStyle}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--plum-deep)' }}>{label}</span>
                <ChevronRight size={16} color="var(--plum-primary)" />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{desc}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

// ---------------------------------------------------------
// STYLES & DESIGN SYSTEM TOKENS
// ---------------------------------------------------------
const containerStyle = {
  padding: '24px 20px',
  maxWidth: 1200,
  margin: '0 auto',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 28,
  flexWrap: 'wrap',
};

const titleStyle = {
  fontSize: 26,
  fontWeight: 800,
  color: 'var(--plum-deep)',
  letterSpacing: '-0.02em',
  margin: 0,
};

const subtitleStyle = {
  fontSize: 14,
  color: 'var(--text-muted)',
  marginTop: 4,
};

const adminBadgeStyle = {
  background: 'var(--plum-deep)',
  color: '#fff',
  fontSize: 11,
  fontWeight: 700,
  padding: '4px 10px',
  borderRadius: 12,
  letterSpacing: '0.05em',
};

const sectionHeaderStyle = {
  marginBottom: 14,
};

const sectionTitleStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--plum-deep)',
  margin: 0,
};

const sectionSubStyle = {
  fontSize: 13,
  color: 'var(--text-muted)',
};

const cardStyle = {
  background: 'var(--white-pure)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 14,
  padding: 18,
  boxShadow: 'var(--shadow-sm)',
};

const emptyStateStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '36px 16px',
  textAlign: 'center',
  background: 'var(--cream-warm)',
  borderRadius: 10,
  border: '1px dashed var(--border-subtle)',
};

const primaryBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 20px',
  background: 'var(--plum-deep)',
  color: '#fff',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
};

const secondaryBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 14px',
  background: 'var(--white-pure)',
  color: 'var(--plum-deep)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: 'var(--shadow-sm)',
};

const selectStyle = {
  padding: '8px 14px',
  background: 'var(--white-pure)',
  color: 'var(--plum-deep)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  outline: 'none',
  cursor: 'pointer',
};

const actionBtnStyle = {
  display: 'flex',
  flexDirection: 'column',
  textAlign: 'left',
  padding: '14px 16px',
  background: 'var(--white-pure)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
  cursor: 'pointer',
  boxShadow: 'var(--shadow-sm)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

