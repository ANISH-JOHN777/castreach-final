import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Mic, 
  Headphones, 
  Check, 
  ArrowRight, 
  DollarSign, 
  Sparkles, 
  Radio, 
  Camera, 
  Shuffle, 
  X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import brandIcon from '../media/brand_icon_transparent.png';

const EXPERTISE_OPTIONS = [
  'Technology & AI', 'Neuroscience & Health', 'Comedy & Entertainment', 'Business & Startups',
  'Finance & Wealth', 'Mindset & Psychology', 'Sports & Fitness', 'Pop Culture',
  'Science & Space', 'Education & Learning', 'True Crime & Mystery', 'Philosophy'
];

const STEPS = ['Role', 'Profile', 'Topics'];

export default function Onboarding() {
  const { user, authFetch, setUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(0);
  const [role, setRole] = useState(user?.role && ['host', 'guest', 'listener'].includes(user.role) ? user.role : 'host');
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || user?.profilePicture || '');
  const [podcast, setPodcast] = useState(user?.podcastName || '');
  const [guestRate, setGuestRate] = useState(user?.sessionRateCents ? String(user.sessionRateCents / 100) : '1500');
  const [topics, setTopics] = useState(user?.expertise && user.expertise.length > 0 ? user.expertise : ['Technology & AI']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const generateRandomIllustrativePic = () => {
    const randomSeed = Math.random().toString(36).substring(2, 9);
    const styles = ['micah', 'notionists', 'adventurer', 'lorelei', 'bottts-neutral'];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const bgColors = ['111111', '1a1a1a', '222222', '0d0d0d'];
    const randomBg = bgColors[Math.floor(Math.random() * bgColors.length)];
    return `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${randomSeed}&backgroundColor=${randomBg}`;
  };

  const handleShuffleAvatar = () => {
    const newPic = generateRandomIllustrativePic();
    setAvatar(newPic);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setError('Image file must be under 3MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTopic = (t) =>
    setTopics((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const finish = async () => {
    setSaving(true);
    setError('');
    try {
      const parsedRateCents = Math.round((parseFloat(guestRate) || 0) * 100);
      const defaultRoleName = role === 'host' ? 'Podcast Host' : (role === 'guest' ? 'Guest Speaker' : 'Listener');
      
      const effectiveAvatar = avatar || generateRandomIllustrativePic();

      const res = await authFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim() || user?.name || defaultRoleName,
          bio: bio.trim(),
          role,
          avatar: effectiveAvatar,
          profilePicture: effectiveAvatar,
          podcastName: role === 'host' ? (podcast.trim() || 'My CastReach Podcast') : undefined,
          sessionRateCents: role === 'guest' ? parsedRateCents : 0,
          expertise: topics,
          isOnboarded: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete onboarding');
      
      if (setUser) setUser(data.user, data.token);
      
      if (role === 'host') {
        navigate('/host', { replace: true });
      } else if (role === 'guest') {
        navigate('/guest', { replace: true });
      } else {
        navigate('/listen', { replace: true });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      {/* ── TOP HEADER ── */}
      <header style={{
        padding: '18px clamp(20px, 4vw, 48px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#000000',
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={brandIcon}
            alt="CastReach Logo"
            style={{ width: 38, height: 38, objectFit: 'contain', display: 'block' }}
          />
          <span style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.06em' }}>
            CASTREACH
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#888888' }} className="hidden sm:inline">
            Already have an account?
          </span>
          <Link
            to="/login"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#FFFFFF',
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              transition: 'all 0.15s ease',
            }}
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* ── ONBOARDING CONTAINER ── */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 20px',
      }}>
        {/* Minimal Stepper Bar */}
        <div style={{ width: '100%', maxWidth: 520, marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            {STEPS.map((s, i) => (
              <span
                key={s}
                style={{
                  fontSize: 12,
                  fontWeight: i <= step ? 700 : 500,
                  color: i <= step ? '#FFFFFF' : '#555555',
                  letterSpacing: '0.02em',
                }}
              >
                {i + 1}. {s}
              </span>
            ))}
          </div>
          <div style={{ height: 3, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${((step + 1) / STEPS.length) * 100}%`,
                background: '#FFFFFF',
                borderRadius: 999,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Minimal Black Card Container */}
        <div style={{
          width: '100%',
          maxWidth: 520,
          backgroundColor: '#0A0A0A',
          borderRadius: 20,
          padding: '32px clamp(20px, 4vw, 36px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.8)',
        }}>

          {/* Step 0 — Role Selection */}
          {step === 0 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                I am joining as a…
              </h2>
              <p style={{ color: '#888888', fontSize: 13, marginBottom: 24 }}>
                Select your primary role on CastReach. You can adjust this anytime.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 12 }}>
                {/* Host Card */}
                <div
                  onClick={() => setRole('host')}
                  style={{
                    padding: '20px 14px',
                    borderRadius: 14,
                    border: role === 'host' ? '1.5px solid #FFFFFF' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: role === 'host' ? '#141414' : '#0D0D0D',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: role === 'host' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}>
                    <Headphones size={20} color={role === 'host' ? '#FFFFFF' : '#888888'} />
                  </div>
                  <div style={{ fontWeight: 750, fontSize: 15, color: '#FFFFFF' }}>Host</div>
                  <div style={{ fontSize: 11.5, color: role === 'host' ? '#FFFFFF' : '#888888', marginTop: 4 }}>
                    I host a podcast
                  </div>
                  <div style={{ fontSize: 10.5, color: '#666666', marginTop: 6, lineHeight: 1.35 }}>
                    Book guests, secure escrow, run sessions
                  </div>
                </div>

                {/* Guest Card */}
                <div
                  onClick={() => setRole('guest')}
                  style={{
                    padding: '20px 14px',
                    borderRadius: 14,
                    border: role === 'guest' ? '1.5px solid #FFFFFF' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: role === 'guest' ? '#141414' : '#0D0D0D',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: role === 'guest' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}>
                    <Mic size={20} color={role === 'guest' ? '#FFFFFF' : '#888888'} />
                  </div>
                  <div style={{ fontWeight: 750, fontSize: 15, color: '#FFFFFF' }}>Guest</div>
                  <div style={{ fontSize: 11.5, color: role === 'guest' ? '#FFFFFF' : '#888888', marginTop: 4 }}>
                    I speak on shows
                  </div>
                  <div style={{ fontSize: 10.5, color: '#666666', marginTop: 6, lineHeight: 1.35 }}>
                    Set your honorarium, accept session dates
                  </div>
                </div>

                {/* Listener Card */}
                <div
                  onClick={() => setRole('listener')}
                  style={{
                    padding: '20px 14px',
                    borderRadius: 14,
                    border: role === 'listener' ? '1.5px solid #FFFFFF' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: role === 'listener' ? '#141414' : '#0D0D0D',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: role === 'listener' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}>
                    <Radio size={20} color={role === 'listener' ? '#FFFFFF' : '#888888'} />
                  </div>
                  <div style={{ fontWeight: 750, fontSize: 15, color: '#FFFFFF' }}>Listener</div>
                  <div style={{ fontSize: 11.5, color: role === 'listener' ? '#FFFFFF' : '#888888', marginTop: 4 }}>
                    I want to listen
                  </div>
                  <div style={{ fontSize: 10.5, color: '#666666', marginTop: 6, lineHeight: 1.35 }}>
                    Stream high-fidelity episodes and shorts
                  </div>
                </div>
              </div>

              {/* Bottom Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#FFFFFF',
                    color: '#000000',
                    fontWeight: 750,
                    cursor: 'pointer',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <span>Continue</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Step 1 — Profile Details */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                Profile details
              </h2>
              <p style={{ color: '#888888', fontSize: 13, marginBottom: 20 }}>
                {role === 'host' 
                  ? 'Set up your podcast details and photo' 
                  : role === 'guest' 
                    ? 'Set your session rate and profile' 
                    : 'Set up your listener profile'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Photo / Avatar Section */}
                <div style={{
                  padding: '14px',
                  borderRadius: 12,
                  backgroundColor: '#0D0D0D',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}>
                  <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                    <div style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: '#181818',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {avatar ? (
                        <img 
                          src={avatar} 
                          alt="Profile preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <img 
                          src={`https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(name || 'user')}&backgroundColor=111111`}
                          alt="Illustrative preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    {avatar && (
                      <button
                        type="button"
                        onClick={() => setAvatar('')}
                        style={{
                          position: 'absolute',
                          top: -3,
                          right: -3,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          backgroundColor: '#EF4444',
                          color: '#FFFFFF',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Remove photo"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>
                      Profile Photo
                    </div>
                    <div style={{ fontSize: 11, color: '#888888', marginBottom: 8 }}>
                      Upload a photo or generate an avatar.
                    </div>

                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                    />

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 10px',
                          borderRadius: 6,
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#FFFFFF',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Camera size={12} />
                        <span>Upload</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleShuffleAvatar}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 10px',
                          borderRadius: 6,
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#CCCCCC',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Shuffle size={12} />
                        <span>Random</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#AAAAAA', marginBottom: 6 }}>
                    Full Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      backgroundColor: '#121212',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: 13.5,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {role === 'host' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#AAAAAA', marginBottom: 6 }}>
                      Podcast Show Title
                    </label>
                    <input
                      value={podcast}
                      onChange={(e) => setPodcast(e.target.value)}
                      placeholder="e.g. The Deep Dive Podcast"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        backgroundColor: '#121212',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#FFFFFF',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ) : role === 'guest' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#AAAAAA', marginBottom: 6 }}>
                      Session Honorarium Fee ($ USD)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={15} color="#888888" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={guestRate}
                        onChange={(e) => setGuestRate(e.target.value)}
                        placeholder="1500"
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 30px',
                          borderRadius: 8,
                          backgroundColor: '#121212',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#FFFFFF',
                          fontSize: 13.5,
                          fontWeight: 700,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: '#666666', marginTop: 4, display: 'block' }}>
                      Held safely in escrow when a host invites you; released upon recording wrap.
                    </span>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#AAAAAA', marginBottom: 6 }}>
                      Favorite Genres
                    </label>
                    <input
                      value={podcast}
                      onChange={(e) => setPodcast(e.target.value)}
                      placeholder="e.g. Tech, Neuroscience, Comedy"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        backgroundColor: '#121212',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#FFFFFF',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#AAAAAA', marginBottom: 6 }}>
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Brief background and topics..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      backgroundColor: '#121212',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: 13,
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'transparent',
                    color: '#AAAAAA',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13.5,
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{
                    flex: 1.5,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#FFFFFF',
                    color: '#000000',
                    fontWeight: 750,
                    cursor: 'pointer',
                    fontSize: 13.5,
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Topics / Expertise */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                {role === 'host' 
                  ? 'Show topics' 
                  : role === 'guest' 
                    ? 'Expertise & domains' 
                    : 'Interests'}
              </h2>
              <p style={{ color: '#888888', fontSize: 13, marginBottom: 20 }}>
                Select topics that align with your profile.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {EXPERTISE_OPTIONS.map((t) => {
                  const isSelected = topics.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTopic(t)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        border: isSelected 
                          ? '1px solid #FFFFFF'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        background: isSelected ? '#FFFFFF' : '#141414',
                        color: isSelected ? '#000000' : '#CCCCCC',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              {error && (
                <div style={{ color: '#EF4444', fontSize: 12.5, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'transparent',
                    color: '#AAAAAA',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13.5,
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={finish}
                  disabled={saving}
                  style={{
                    flex: 1.5,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#FFFFFF',
                    color: '#000000',
                    fontWeight: 750,
                    cursor: 'pointer',
                    fontSize: 13.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {saving ? 'Completing…' : <><Check size={14} /> Finish Setup</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
