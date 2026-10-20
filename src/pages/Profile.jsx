import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  MapPin, 
  DollarSign, 
  Radio, 
  Mic, 
  Headphones, 
  Camera, 
  Shuffle, 
  Edit3, 
  Check, 
  X, 
  Calendar, 
  MessageSquare, 
  Globe, 
  Sparkles, 
  ShieldCheck, 
  Star,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CreateBookingModal from '../components/CreateBookingModal';

export default function Profile() {
  const { id } = useParams();
  const { user, authFetch, setUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const isOwnProfile = !id || id === 'me' || id === user?._id || id === user?.id;
  const effectiveId = id && id !== 'me' ? id : (user?._id || user?.id);

  const [profile, setProfile] = useState(isOwnProfile ? user : null);
  const [loading, setLoading] = useState(!isOwnProfile);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPodcastName, setEditPodcastName] = useState('');
  const [editPodcastCategory, setEditPodcastCategory] = useState('');
  const [editRateDollars, setEditRateDollars] = useState('1500');
  const [editTopics, setEditTopics] = useState([]);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [editPortfolioUrl, setEditPortfolioUrl] = useState('');

  // Booking modal for other profiles
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Initialize form fields when profile data loads or changes
  const initFormFields = (data) => {
    if (!data) return;
    setEditName(data.name || '');
    setEditBio(data.bio || '');
    setEditAvatar(data.avatar || data.profilePicture || '');
    setEditLocation(data.location || data.studioLocation || '');
    setEditPodcastName(data.podcastName || '');
    setEditPodcastCategory(data.podcastCategory || '');
    const rateDollars = data.sessionRateCents ? Math.round(data.sessionRateCents / 100) : (data.sessionRate || 1500);
    setEditRateDollars(String(rateDollars));
    setEditTopics(Array.isArray(data.expertise) ? data.expertise : (Array.isArray(data.speakingTopics) ? data.speakingTopics : []));
    setEditPortfolioUrl(data.portfolioUrl || '');
  };

  useEffect(() => {
    if (isOwnProfile && user) {
      setProfile(user);
      initFormFields(user);
      setLoading(false);
    } else if (effectiveId) {
      setLoading(true);
      authFetch(`/users/${effectiveId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setProfile(data.user);
          initFormFields(data.user);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [effectiveId, isOwnProfile, user]);

  const generateRandomIllustrativePic = () => {
    const randomSeed = Math.random().toString(36).substring(2, 9);
    const styles = ['micah', 'notionists', 'adventurer', 'lorelei', 'bottts-neutral'];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const bgColors = ['181622', '1f1d36', '241d3b', '171520', '251c38'];
    const randomBg = bgColors[Math.floor(Math.random() * bgColors.length)];
    return `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${randomSeed}&backgroundColor=${randomBg}`;
  };

  const handleShuffleAvatar = () => {
    const newPic = generateRandomIllustrativePic();
    setEditAvatar(newPic);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('Image must be under 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setEditAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTopic = () => {
    const trimmed = newTopicInput.trim();
    if (trimmed && !editTopics.includes(trimmed)) {
      setEditTopics([...editTopics, trimmed]);
      setNewTopicInput('');
    }
  };

  const handleRemoveTopic = (t) => {
    setEditTopics(editTopics.filter((x) => x !== t));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const parsedRateCents = Math.round((parseFloat(editRateDollars) || 0) * 100);
      const updates = {
        name: editName.trim() || profile?.name || 'CastReach Creator',
        bio: editBio.trim(),
        avatar: editAvatar || profile?.avatar || generateRandomIllustrativePic(),
        profilePicture: editAvatar || profile?.avatar || generateRandomIllustrativePic(),
        location: editLocation.trim(),
        studioLocation: profile?.role === 'host' ? editLocation.trim() : undefined,
        podcastName: profile?.role === 'host' ? editPodcastName.trim() : undefined,
        podcastCategory: profile?.role === 'host' ? editPodcastCategory.trim() : undefined,
        sessionRateCents: profile?.role === 'guest' ? parsedRateCents : undefined,
        expertise: editTopics,
        speakingTopics: editTopics,
        portfolioUrl: editPortfolioUrl.trim(),
      };

      const res = await authFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setProfile(data.user);
      if (setUser) setUser(data.user);
      setIsEditing(false);
      setSuccessToast('Profile updated successfully!');
      setTimeout(() => setSuccessToast(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const roleColor = profile?.role === 'host' ? '#22C55E' : (profile?.role === 'guest' ? '#A855F7' : '#38BDF8');
  const roleLabel = profile?.role === 'host' ? 'Host' : (profile?.role === 'guest' ? 'Guest' : 'Listener');

  const currentAvatar = (isEditing ? editAvatar : (profile?.avatar || profile?.profilePicture)) || 
    `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(profile?.name || 'user')}&backgroundColor=181622`;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#09080F',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      {/* ── Standard Homepage-Style Navbar ── */}
      <Navbar />

      {/* Toast Notification */}
      {successToast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          background: 'rgba(34, 197, 94, 0.95)',
          color: '#000000',
          fontWeight: 700,
          fontSize: 13,
          padding: '10px 20px',
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)',
        }}>
          <CheckCircle2 size={16} /> {successToast}
        </div>
      )}

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        maxWidth: 900,
        width: '100%',
        margin: '0 auto',
        padding: '36px clamp(16px, 4vw, 32px) 64px',
        boxSizing: 'border-box',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#A1A1AA' }}>
            <div style={{
              width: 36,
              height: 36,
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#A855F7',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              margin: '0 auto 16px',
            }} />
            Loading profile…
          </div>
        ) : error && !profile ? (
          <div style={{
            padding: 24,
            borderRadius: 16,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#F87171',
            textAlign: 'center',
          }}>
            <p>{error || 'Profile not found'}</p>
            <button
              onClick={() => navigate(-1)}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                borderRadius: 8,
                background: '#EF4444',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Go Back
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header Banner & Card */}
            <div style={{
              borderRadius: 20,
              backgroundColor: '#12101B',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            }}>
              {/* Cover Gradient */}
              <div style={{
                height: 120,
                background: profile?.role === 'host'
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(9, 8, 15, 0.8) 100%)'
                  : profile?.role === 'guest'
                    ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(9, 8, 15, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(9, 8, 15, 0.8) 100%)',
                position: 'relative',
              }} />

              {/* Profile Details Container */}
              <div style={{ padding: '0 28px 28px', marginTop: -48 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}>
                  {/* Avatar Preview */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: 96,
                      height: 96,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: '#1E1B2E',
                      border: `3px solid ${roleColor}`,
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
                    }}>
                      <img 
                        src={currentAvatar} 
                        alt={profile?.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                  </div>

                  {/* Actions (Edit Profile or Book/Message) */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {isOwnProfile ? (
                      !isEditing ? (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '9px 18px',
                            borderRadius: 12,
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            color: '#FFFFFF',
                            fontSize: 13.5,
                            fontWeight: 650,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.14)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
                        >
                          <Edit3 size={15} color="#A855F7" />
                          <span>Edit Profile</span>
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditing(false);
                              initFormFields(profile);
                            }}
                            style={{
                              padding: '9px 16px',
                              borderRadius: 12,
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#CBD5E1',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '9px 20px',
                              borderRadius: 12,
                              backgroundColor: roleColor,
                              border: 'none',
                              color: '#09080F',
                              fontSize: 13,
                              fontWeight: 750,
                              cursor: 'pointer',
                              boxShadow: `0 4px 16px ${roleColor}40`,
                            }}
                          >
                            <Check size={15} />
                            <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
                          </button>
                        </div>
                      )
                    ) : (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => setIsBookingModalOpen(true)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '9px 20px',
                            borderRadius: 12,
                            backgroundColor: roleColor,
                            color: '#09080F',
                            border: 'none',
                            fontWeight: 750,
                            fontSize: 13.5,
                            cursor: 'pointer',
                            boxShadow: `0 4px 16px ${roleColor}40`,
                          }}
                        >
                          <Calendar size={15} />
                          <span>{profile?.role === 'guest' ? 'Book Guest' : 'Schedule Session'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Identity info */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                      {profile?.name}
                    </h1>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 999,
                      backgroundColor: `${roleColor}18`,
                      border: `1px solid ${roleColor}40`,
                      color: roleColor,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>
                      {roleLabel}
                    </span>
                    {profile?.avgRating > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#FACC15', fontWeight: 650 }}>
                        <Star size={14} fill="#FACC15" />
                        <span>{profile.avgRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {profile?.podcastName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A1A1AA', fontSize: 14, marginTop: 4 }}>
                      <Radio size={14} color="#22C55E" />
                      <span>{profile.podcastName}</span>
                    </div>
                  )}

                  {profile?.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#71717A', fontSize: 13, marginTop: 4 }}>
                      <MapPin size={13} />
                      <span>{profile.location}</span>
                    </div>
                  )}

                  {profile?.bio && !isEditing && (
                    <p style={{
                      color: '#CBD5E1',
                      fontSize: 14,
                      lineHeight: 1.6,
                      marginTop: 14,
                      maxWidth: 680,
                    }}>
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* In-Place Edit Form */}
            {isEditing ? (
              <form onSubmit={handleSaveProfile} style={{
                borderRadius: 20,
                backgroundColor: '#12101B',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}>
                <div style={{ fontSize: 17, fontWeight: 750, color: '#FFFFFF', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 12 }}>
                  Edit Profile Information
                </div>

                {/* Avatar Updater */}
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#CBD5E1', marginBottom: 8 }}>
                    Profile Avatar
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: '#1E1B2E',
                      border: '2px solid rgba(255, 255, 255, 0.15)',
                    }}>
                      <img src={editAvatar || currentAvatar} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 10,
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        color: '#FFFFFF',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Camera size={14} />
                      <span>Upload Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShuffleAvatar}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 10,
                        backgroundColor: 'rgba(168, 85, 247, 0.15)',
                        border: '1px solid rgba(168, 85, 247, 0.35)',
                        color: '#C084FC',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Shuffle size={14} />
                      <span>Shuffle Illustrative</span>
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                    Full Name
                  </label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      backgroundColor: '#181622',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Bio */}
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                    Bio & Description
                  </label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Write a brief overview of your background, perspective, or show…"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      backgroundColor: '#181622',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                </div>

                {/* Location */}
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                    Location (City / Studio)
                  </label>
                  <input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. San Francisco, CA / Remote"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      backgroundColor: '#181622',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Host Specific Fields */}
                {profile?.role === 'host' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                        Podcast Show Name
                      </label>
                      <input
                        value={editPodcastName}
                        onChange={(e) => setEditPodcastName(e.target.value)}
                        placeholder="e.g. The Quantum Frontier"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 10,
                          backgroundColor: '#181622',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#FFFFFF',
                          fontSize: 14,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                        Podcast Category / Genre
                      </label>
                      <input
                        value={editPodcastCategory}
                        onChange={(e) => setEditPodcastCategory(e.target.value)}
                        placeholder="e.g. Tech & AI Pioneers"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 10,
                          backgroundColor: '#181622',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#FFFFFF',
                          fontSize: 14,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Guest Specific Fields */}
                {profile?.role === 'guest' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                      Predefined Session Fee ($ USD)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={16} color="#A855F7" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={editRateDollars}
                        onChange={(e) => setEditRateDollars(e.target.value)}
                        placeholder="1500"
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 34px',
                          borderRadius: 10,
                          backgroundColor: '#181622',
                          border: '1px solid rgba(168, 85, 247, 0.35)',
                          color: '#FFFFFF',
                          fontSize: 14,
                          fontWeight: 700,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Topics / Expertise */}
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                    Topics & Areas of Expertise
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {editTopics.map((topic, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 12px',
                          borderRadius: 999,
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.14)',
                          fontSize: 12.5,
                          color: '#FFFFFF',
                        }}
                      >
                        {topic}
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(topic)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#A1A1AA',
                            cursor: 'pointer',
                            display: 'flex',
                            padding: 0,
                          }}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={newTopicInput}
                      onChange={(e) => setNewTopicInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTopic(); } }}
                      placeholder="Add a topic (e.g. AI Engineering, Venture Capital)…"
                      style={{
                        flex: 1,
                        padding: '9px 14px',
                        borderRadius: 10,
                        backgroundColor: '#181622',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#FFFFFF',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddTopic}
                      style={{
                        padding: '9px 16px',
                        borderRadius: 10,
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        color: '#FFFFFF',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Form Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      initFormFields(profile);
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 12,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#CBD5E1',
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 24px',
                      borderRadius: 12,
                      backgroundColor: roleColor,
                      border: 'none',
                      color: '#09080F',
                      fontSize: 13.5,
                      fontWeight: 750,
                      cursor: 'pointer',
                      boxShadow: `0 4px 16px ${roleColor}40`,
                    }}
                  >
                    <Check size={16} />
                    <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* View Mode Cards */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Role Specific Highlight Card */}
                {profile?.role === 'guest' && (
                  <div style={{
                    borderRadius: 16,
                    backgroundColor: '#12101B',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    padding: '22px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#C084FC', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Predefined Guest Session Rate
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', marginTop: 4 }}>
                        ${((profile?.sessionRateCents ? Math.round(profile.sessionRateCents / 100) : (profile?.sessionRate || 1500))).toLocaleString()}
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#A1A1AA', marginLeft: 6 }}>/ 60-min session</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#71717A', marginTop: 4 }}>
                        Secured through CastReach Stripe Escrow prior to studio recording.
                      </div>
                    </div>
                    {!isOwnProfile && (
                      <button
                        type="button"
                        onClick={() => setIsBookingModalOpen(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 22px',
                          borderRadius: 12,
                          backgroundColor: '#A855F7',
                          border: 'none',
                          color: '#09080F',
                          fontWeight: 750,
                          fontSize: 14,
                          cursor: 'pointer',
                        }}
                      >
                        <Calendar size={15} />
                        <span>Book Session</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Topics / Expertise Card */}
                {(profile?.expertise?.length > 0 || profile?.speakingTopics?.length > 0) && (
                  <div style={{
                    borderRadius: 16,
                    backgroundColor: '#12101B',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '22px 24px',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                      {profile?.role === 'host' ? 'Show Focus & Topics' : (profile?.role === 'guest' ? 'Speaking Topics & Expertise' : 'Favorite Interests')}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(profile.expertise || profile.speakingTopics).map((t, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 999,
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            fontSize: 13,
                            color: '#FFFFFF',
                            fontWeight: 500,
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Booking Modal when viewing other profiles */}
      {profile && !isOwnProfile && (
        <CreateBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          recipientUser={profile}
          recipient={profile}
          initialRecipient={profile}
          guest={profile}
          onSuccess={() => {
            setIsBookingModalOpen(false);
            navigate('/bookings');
          }}
        />
      )}

      {/* ── Standard Footer ── */}
      <Footer />
    </div>
  );
}
