import { useState } from 'react';
import { 
  User, 
  Lock, 
  CreditCard, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Radio, 
  MapPin, 
  Video, 
  Mic, 
  Globe, 
  Share2,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EXPERTISE_OPTIONS = [
  'Technology', 'AI & Machine Learning', 'Startups', 'Finance',
  'Health & Wellness', 'Marketing', 'Science', 'Politics',
  'Sports', 'Entertainment', 'Education', 'True Crime', 'Design', 'Philosophy'
];

export default function Settings() {
  const { user, authFetch, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');

  return (
    <div className="fade-in" style={{ maxWidth: 960, margin: '0 auto', color: '#f3f4f6' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.02em' }}>Settings & Account</h1>
        <p style={{ color: '#9ca3af', fontSize: 13 }}>Configure your podcast workspace, host settings, optional social profiles, and account controls.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Sidebar Tabs */}
        <div style={{ background: '#14151a', border: '1px solid #1f2129', borderRadius: 16, overflow: 'hidden' }}>
          {[
            { id: 'profile',  label: 'Profile & Studio', Icon: User },
            { id: 'password', label: 'Password', Icon: Lock },
            { id: 'stripe',   label: 'Payments & Escrow', Icon: CreditCard },
            { id: 'danger',   label: 'Danger Zone', Icon: Trash2, danger: true },
          ].map(({ id, label, Icon, danger }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                width: '100%',
                padding: '13px 18px',
                border: 'none',
                background: tab === id ? 'rgba(72, 47, 76, 0.08)' : 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 13.5,
                color: tab === id ? (danger ? '#ef4444' : '#482F4C') : (danger ? '#ef4444' : '#9ca3af'),
                fontWeight: tab === id ? 700 : 500,
                borderLeft: tab === id ? `3px solid ${danger ? '#ef4444' : '#482F4C'}` : '3px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} color={danger ? '#ef4444' : tab === id ? '#482F4C' : '#6b7280'} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {tab === 'profile'  && <ProfileTab user={user} authFetch={authFetch} setUser={setUser} />}
          {tab === 'password' && <PasswordTab authFetch={authFetch} />}
          {tab === 'stripe'   && <StripeTab authFetch={authFetch} user={user} />}
          {tab === 'danger'   && <DangerZoneTab authFetch={authFetch} logout={logout} navigate={navigate} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user, authFetch, setUser }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    role: user?.role || 'host',
    profilePicture: user?.profilePicture || user?.avatar || '',
    location: user?.location || '',
    // Host specific
    podcastName: user?.podcastName || '',
    podcastUrl: user?.podcastUrl || '',
    podcastDescription: user?.podcastDescription || '',
    podcastCategory: user?.podcastCategory || '',
    studioLocation: user?.studioLocation || '',
    preferredMeetingMode: user?.preferredMeetingMode || 'both',
    equipment: (user?.equipment || []).join(', '),
    typicalFormat: user?.typicalFormat || '',
    listenerCount: user?.listenerCount ? String(user.listenerCount) : '0',
    sessionRate: user?.sessionRateCents ? (user.sessionRateCents / 100).toString() : '0',
    // Guest specific
    speakingTopics: (user?.speakingTopics || []).join(', '),
    priorAppearances: (user?.priorAppearances || []).join(', '),
    portfolioUrl: user?.portfolioUrl || '',
    // Optional Social profiles
    twitter: user?.socialLinks?.twitter || '',
    linkedin: user?.socialLinks?.linkedin || '',
    website: user?.socialLinks?.website || '',
    youtube: user?.socialLinks?.youtube || '',
    instagram: user?.socialLinks?.instagram || '',
  });

  const [expertise, setExpertise] = useState(user?.expertise || []);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (t) => setExpertise((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: form.name.trim(),
        bio: form.bio.trim(),
        role: form.role,
        profilePicture: form.profilePicture.trim(),
        location: form.location.trim(),
        expertise,
        podcastName: form.podcastName.trim(),
        podcastUrl: form.podcastUrl.trim(),
        podcastDescription: form.podcastDescription.trim(),
        podcastCategory: form.podcastCategory.trim(),
        studioLocation: form.studioLocation.trim(),
        preferredMeetingMode: form.preferredMeetingMode,
        equipment: form.equipment.split(',').map((s) => s.trim()).filter(Boolean),
        typicalFormat: form.typicalFormat.trim(),
        listenerCount: parseInt(form.listenerCount, 10) || 0,
        sessionRateCents: Math.max(0, Math.round((parseFloat(form.sessionRate) || 0) * 100)),
        speakingTopics: form.speakingTopics.split(',').map((s) => s.trim()).filter(Boolean),
        priorAppearances: form.priorAppearances.split(',').map((s) => s.trim()).filter(Boolean),
        portfolioUrl: form.portfolioUrl.trim(),
        socialLinks: {
          twitter: form.twitter.trim(),
          linkedin: form.linkedin.trim(),
          website: form.website.trim(),
          youtube: form.youtube.trim(),
          instagram: form.instagram.trim(),
        },
      };

      const res = await authFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');
      setUser(data.user);
      setSuccess('Profile and configuration successfully updated!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Profile & Studio Configuration</h2>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>All fields are saved in real-time to your verified CastReach account.</p>
        </div>
      </div>

      <form onSubmit={save}>
        {/* Core Identity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Full Name">
            <input value={form.name} onChange={set('name')} style={inp} required />
          </Field>
          <Field label="Primary Role">
            <select value={form.role} onChange={set('role')} style={inp}>
              <option value="host">Podcast Host (Show Creator)</option>
              <option value="guest">Guest Speaker (Interviewee)</option>
            </select>
          </Field>
        </div>

        <Field label="Profile Picture URL">
          <input
            value={form.profilePicture}
            onChange={set('profilePicture')}
            placeholder="https://example.com/avatar.jpg"
            style={inp}
          />
          <span style={{ fontSize: 11, color: '#6b7280', marginTop: 4, display: 'block' }}>
            Firebase avatar or direct image URL. Shows on discover directory and bottom player.
          </span>
        </Field>

        <Field label="Bio">
          <textarea
            value={form.bio}
            onChange={set('bio')}
            rows={3}
            maxLength={500}
            style={{ ...inp, resize: 'vertical' }}
            placeholder="Tell other hosts and guests about yourself, your background, and topics you discuss..."
          />
          <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'right', marginTop: 2 }}>{form.bio.length}/500</div>
        </Field>

        <Field label="Location / City">
          <input
            value={form.location}
            onChange={set('location')}
            placeholder="e.g. San Francisco, CA or London, UK"
            style={inp}
          />
        </Field>

        {/* ── HOST CONFIGURATION ── */}
        {form.role === 'host' && (
          <div style={{ background: '#121319', border: '1px solid #1f2129', borderRadius: 14, padding: '18px', margin: '20px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#482F4C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radio size={15} /> Host & Studio Details
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Podcast Show Name">
                <input value={form.podcastName} onChange={set('podcastName')} placeholder="e.g. The Silicon Standard" style={inp} />
              </Field>
              <Field label="Category / Genre">
                <input value={form.podcastCategory} onChange={set('podcastCategory')} placeholder="e.g. Technology, Venture" style={inp} />
              </Field>
            </div>

            <Field label="Podcast Website or Feed URL">
              <input value={form.podcastUrl} onChange={set('podcastUrl')} type="url" placeholder="https://yourpodcast.com" style={inp} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Studio Meeting Mode">
                <select value={form.preferredMeetingMode} onChange={set('preferredMeetingMode')} style={inp}>
                  <option value="both">Both Virtual (Google Meet) & Physical Studio</option>
                  <option value="gmeet">Virtual Only (Google Meet)</option>
                  <option value="physical">Physical Studio Only</option>
                </select>
              </Field>

              <Field label="Physical Studio Address / Location">
                <input value={form.studioLocation} onChange={set('studioLocation')} placeholder="e.g. 450 Studio Row, Studio B" style={inp} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Studio Recording Equipment">
                <input value={form.equipment} onChange={set('equipment')} placeholder="e.g. Shure SM7B, Sony FX3, Rodecaster Pro" style={inp} />
              </Field>
              <Field label="Typical Format">
                <input value={form.typicalFormat} onChange={set('typicalFormat')} placeholder="e.g. 45-minute deep-dive discussion" style={inp} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Monthly Listener Count">
                <input value={form.listenerCount} onChange={set('listenerCount')} type="number" min="0" style={inp} />
              </Field>
              <Field label="Session Rate (USD) — 0 = Free">
                <input value={form.sessionRate} onChange={set('sessionRate')} type="number" min="0" step="1" style={inp} />
              </Field>
            </div>
          </div>
        )}

        {/* ── GUEST CONFIGURATION ── */}
        {form.role === 'guest' && (
          <div style={{ background: '#121319', border: '1px solid #1f2129', borderRadius: 14, padding: '18px', margin: '20px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#482F4C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={15} /> Guest Speaker Details
            </div>

            <Field label="Prepared Speaking Topics (comma-separated)">
              <input
                value={form.speakingTopics}
                onChange={set('speakingTopics')}
                placeholder="e.g. AI Governance, Zero-Knowledge Proofs, Product Growth"
                style={inp}
              />
            </Field>

            <Field label="Prior Podcast Appearances (comma-separated)">
              <input
                value={form.priorAppearances}
                onChange={set('priorAppearances')}
                placeholder="e.g. The Tech Crunch Show, Founders Podcast, BBC Radio"
                style={inp}
              />
            </Field>

            <Field label="Portfolio or Media Kit URL">
              <input
                value={form.portfolioUrl}
                onChange={set('portfolioUrl')}
                placeholder="https://yourportfolio.com"
                style={inp}
              />
            </Field>
          </div>
        )}

        {/* Expertise Pills */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 8 }}>
            Expertise & Niches
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EXPERTISE_OPTIONS.map((t) => {
              const active = expertise.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(t)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    cursor: 'pointer',
                    border: active ? '1.5px solid #482F4C' : '1px solid #282a36',
                    background: active ? 'rgba(72, 47, 76, 0.12)' : 'transparent',
                    color: active ? '#482F4C' : '#9ca3af',
                    fontWeight: active ? 600 : 500,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── OPTIONAL SOCIAL PROFILES ── */}
        <div style={{ marginBottom: 22, borderTop: '1px solid #1f2129', paddingTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>
              Social Profiles (Optional)
            </span>
            <span style={{ fontSize: 11, color: '#6b7280' }}>Guests & hosts can optionally connect social links</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Twitter / X">
              <input value={form.twitter} onChange={set('twitter')} placeholder="https://x.com/username" style={inp} />
            </Field>
            <Field label="LinkedIn">
              <input value={form.linkedin} onChange={set('linkedin')} placeholder="https://linkedin.com/in/username" style={inp} />
            </Field>
            <Field label="Personal Website / Portfolio">
              <input value={form.website} onChange={set('website')} placeholder="https://yourdomain.com" style={inp} />
            </Field>
            <Field label="YouTube Channel">
              <input value={form.youtube} onChange={set('youtube')} placeholder="https://youtube.com/@channel" style={inp} />
            </Field>
            <div style={{ gridColumn: 'span 2' }}>
              <Field label="Instagram">
                <input value={form.instagram} onChange={set('instagram')} placeholder="https://instagram.com/username" style={inp} />
              </Field>
            </div>
          </div>
        </div>

        {error && <div style={errBox}>{error}</div>}
        {success && <div style={successBox}>{success}</div>}

        <button type="submit" disabled={saving} style={{ ...saveBtn, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving changes...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
}

function PasswordTab({ authFetch }) {
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (form.newPass !== form.confirm) return setError('Passwords do not match.');
    if (form.newPass.length < 8) return setError('Password must be at least 8 characters.');
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await authFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.newPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Password updated successfully!');
      setForm({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={card}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Change Password</h2>
      <form onSubmit={save}>
        <Field label="Current Password">
          <input type="password" value={form.current} onChange={set('current')} required style={inp} />
        </Field>
        <Field label="New Password">
          <input type="password" value={form.newPass} onChange={set('newPass')} required style={inp} />
        </Field>
        <Field label="Confirm New Password">
          <input type="password" value={form.confirm} onChange={set('confirm')} required style={inp} />
        </Field>
        {error && <div style={errBox}>{error}</div>}
        {success && <div style={successBox}>{success}</div>}
        <button type="submit" disabled={saving} style={{ ...saveBtn, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

function StripeTab({ authFetch, user }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const connect = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/payments/connect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={card}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Payment Settings & Escrow</h2>
      <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20, lineHeight: 1.6 }}>
        {user?.role === 'host'
          ? 'Connect your Stripe account to receive payments from scheduled guests. All session funds are held in escrow and released once recordings wrap.'
          : 'Guests pay automatically upon booking. Funds remain safely protected until both host and guest finish the recording.'}
      </p>
      {user?.role === 'host' && (
        <>
          {error && <div style={{ ...errBox, marginBottom: 12 }}>{error}</div>}
          <button
            onClick={connect}
            disabled={loading}
            style={{
              padding: '10px 22px',
              background: '#635bff',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13,
              opacity: loading ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CreditCard size={16} /> {loading ? 'Redirecting to Stripe...' : 'Connect Stripe Account'}
          </button>
        </>
      )}
    </div>
  );
}

function DangerZoneTab({ authFetch, logout, navigate }) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm account removal.');
      return;
    }

    if (!window.confirm('Are you absolutely sure? This will delete your profile, podcast shows, and recordings permanently.')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const res = await authFetch('/users/me', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');

      await logout();
      navigate('/');
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ ...card, borderColor: 'rgba(239, 68, 68, 0.35)', background: '#171113' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <AlertTriangle size={20} color="#ef4444" />
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#ef4444', margin: 0 }}>Delete Account Permanently</h2>
      </div>

      <p style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.6, marginBottom: 16 }}>
        Permanently delete your CastReach host or guest account. This will instantly erase:
      </p>

      <ul style={{ fontSize: 12.5, color: '#9ca3af', paddingLeft: 20, marginBottom: 20, lineHeight: 1.7 }}>
        <li>Your host show profile, guest details, and social links</li>
        <li>All active booking slots, upcoming calendar appointments, and studio meeting links</li>
        <li>Your podcast audio uploads, analytics, and session history</li>
      </ul>

      <div style={{ background: '#201316', border: '1px solid #3d1b22', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#f87171', marginBottom: 8 }}>
          To confirm deletion, type <strong style={{ color: '#fff' }}>DELETE</strong> below:
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE"
          style={{ ...inp, borderColor: '#ef4444' }}
        />
      </div>

      {error && <div style={errBox}>{error}</div>}

      <button
        type="button"
        onClick={handleDeleteAccount}
        disabled={isDeleting || confirmText !== 'DELETE'}
        style={{
          background: confirmText === 'DELETE' ? '#ef4444' : '#4b2128',
          color: '#ffffff',
          border: 'none',
          padding: '10px 22px',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 13,
          cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          transition: 'all 0.2s ease',
        }}
      >
        <Trash2 size={16} />
        {isDeleting ? 'Deleting Account...' : 'Permanently Delete My Account'}
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const card = { background: '#211C2E', border: '1px solid rgba(226, 182, 238, 0.18)', borderRadius: 16, padding: '24px' };
const inp = { width: '100%', padding: '10px 14px', border: '1px solid rgba(226, 182, 238, 0.2)', borderRadius: 10, fontSize: 13, background: '#1A1624', color: '#f3f4f6', outline: 'none' };
const saveBtn = { padding: '10px 24px', background: '#482F4C', color: '#FFFFFF', border: '1px solid rgba(226, 182, 238, 0.4)', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13, marginTop: 8 };
const errBox = { padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 10, color: '#ef4444', fontSize: 13, marginBottom: 14 };
const successBox = { padding: '10px 14px', background: 'rgba(72, 47, 76, 0.12)', border: '1px solid rgba(72, 47, 76, 0.3)', borderRadius: 10, color: '#E2B6EE', fontSize: 13, marginBottom: 14 };
