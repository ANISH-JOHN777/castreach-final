import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, AlertCircle, CheckCircle, Clock, FileText, Play, X, ArrowRight, Zap } from 'lucide-react';

const ARTIFACT_TITLES = {
  SUMMARY: 'AI Episode Summary',
  SHOW_NOTES: 'AI Show Notes',
  DESCRIPTION: 'AI Episode Description',
  TITLE_SUGGESTIONS: 'AI Title Suggestions',
  CHAPTERS: 'AI Episode Chapters',
  KEY_TOPICS: 'Key Topics & Highlights',
  GUEST_BRIEF: 'Guest Preparation Brief',
  INTERVIEW_PREP: 'Interview Preparation Questions',
};

const ARTIFACT_DESCRIPTIONS = {
  SUMMARY: 'Overview, key takeaways, and discussion conclusions.',
  SHOW_NOTES: 'Structured show notes for listener distribution.',
  DESCRIPTION: 'Public podcast episode description draft.',
  TITLE_SUGGESTIONS: 'Catchy title alternatives for maximum engagement.',
  CHAPTERS: 'Timestamped chapter markers linked to the media player.',
  KEY_TOPICS: 'Extracted topics, tags, and core discussion themes.',
  GUEST_BRIEF: 'Background information and discussed areas for guest prep.',
  INTERVIEW_PREP: 'Compelling follow-up questions grounded in transcript context.',
};

export default function AIIntelligencePanel({
  sourceType = 'booking', // 'booking' | 'episode'
  sourceId,
  podcastId,
  onSeek,
  onAppliedContent,
}) {
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [activeModal, setActiveModal] = useState(null); // { type, content, status }
  const [fetchingContent, setFetchingContent] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch status summary
  const fetchStatuses = useCallback(async () => {
    if (!sourceId) return;
    try {
      const token = localStorage.getItem('cr_token') || localStorage.getItem('token');
      const res = await fetch(`/api/ai/${sourceType}/${sourceId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch AI statuses.');
      }
      const data = await res.json();
      setStatuses(data.artifacts || {});
    } catch (err) {
      console.error('[AIIntelligencePanel] Error fetching statuses:', err.message);
    } finally {
      setLoading(false);
    }
  }, [sourceType, sourceId]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Polling logic when any artifact is QUEUED or PROCESSING
  useEffect(() => {
    const hasActiveJob = Object.values(statuses).some(
      (a) => a?.status === 'QUEUED' || a?.status === 'PROCESSING'
    );
    if (!hasActiveJob) return;

    const interval = setInterval(() => {
      fetchStatuses();
    }, 4000);

    return () => clearInterval(interval);
  }, [statuses, fetchStatuses]);

  // Generate trigger
  const handleGenerate = async (artifactType) => {
    setActionLoading((prev) => ({ ...prev, [artifactType]: true }));
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('cr_token') || localStorage.getItem('token');
      const res = await fetch(`/api/ai/${sourceType}/${sourceId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ artifactType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger AI generation.');

      setStatuses((prev) => ({
        ...prev,
        [artifactType]: {
          status: data.status,
          jobId: data.jobId,
          updatedAt: new Date().toISOString(),
        },
      }));
      setSuccessMsg(`Requested ${ARTIFACT_TITLES[artifactType]} generation.`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [artifactType]: false }));
    }
  };

  // Retry trigger
  const handleRetry = async (artifactType) => {
    setActionLoading((prev) => ({ ...prev, [artifactType]: true }));
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('cr_token') || localStorage.getItem('token');
      const res = await fetch(`/api/ai/${sourceType}/${sourceId}/${artifactType}/retry`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to retry AI generation.');

      setStatuses((prev) => ({
        ...prev,
        [artifactType]: {
          status: 'QUEUED',
          jobId: data.jobId,
          updatedAt: new Date().toISOString(),
        },
      }));
      setSuccessMsg(`Retrying ${ARTIFACT_TITLES[artifactType]} generation.`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [artifactType]: false }));
    }
  };

  // View artifact content
  const handleView = async (artifactType) => {
    setFetchingContent(true);
    setErrorMsg(null);
    try {
      const token = localStorage.getItem('cr_token') || localStorage.getItem('token');
      const res = await fetch(`/api/ai/${sourceType}/${sourceId}/${artifactType}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load artifact content.');

      setActiveModal({
        type: artifactType,
        content: data.content,
        status: data.status,
      });
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setFetchingContent(false);
    }
  };

  // Apply AI content (User explicit confirmation)
  const handleApplyContent = async (field, content) => {
    if (!podcastId || sourceType !== 'episode') return;
    setApplying(true);
    try {
      const token = localStorage.getItem('cr_token') || localStorage.getItem('token');
      const res = await fetch(`/api/podcasts/${podcastId}/episodes/${sourceId}/apply-ai-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ field, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply content to episode.');

      setSuccessMsg(`Applied AI suggestion to Episode ${field}!`);
      if (onAppliedContent) onAppliedContent(field, content);
      setActiveModal(null);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setApplying(false);
    }
  };

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={panelContainerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 30, color: 'var(--text-muted)' }}>
          <RefreshCw size={20} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--plum-primary)' }} />
          <span style={{ fontSize: 14 }}>Loading AI Podcast Intelligence...</span>
        </div>
      </div>
    );
  }

  const types = Object.keys(ARTIFACT_TITLES);

  return (
    <div style={panelContainerStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--lavender-mist)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="var(--plum-deep)" />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--plum-deep)' }}>AI Podcast Intelligence</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Asynchronous AI content generation grounded in your timestamped recording transcript.
            </p>
          </div>
        </div>
        <button onClick={fetchStatuses} style={secondaryBtnStyle}>
          <RefreshCw size={14} /> Refresh Status
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '10px 14px', background: 'var(--color-error-bg)', border: '1px solid var(--color-error)', borderRadius: 10, color: 'var(--color-error)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontWeight: 'bold', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '10px 14px', background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', borderRadius: 10, color: 'var(--color-success)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', color: 'var(--color-success)', fontWeight: 'bold', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Artifact Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {types.map((type) => {
          const meta = statuses[type] || {};
          const status = meta.status || 'NOT_REQUESTED';
          const isBusy = actionLoading[type];

          return (
            <div key={type} style={artifactCardStyle}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--plum-deep)' }}>{ARTIFACT_TITLES[type]}</h4>

                  {/* Status Badges */}
                  {status === 'NOT_REQUESTED' && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: 'var(--lavender-mist)', color: 'var(--text-muted)' }}>
                      Not Generated
                    </span>
                  )}
                  {status === 'QUEUED' && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                      ⏳ Queued
                    </span>
                  )}
                  {status === 'PROCESSING' && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: 'var(--lavender-mist)', color: 'var(--plum-deep)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generating...
                    </span>
                  )}
                  {status === 'READY' && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                      ✓ Ready
                    </span>
                  )}
                  {status === 'FAILED' && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
                      ⚠️ Failed
                    </span>
                  )}
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  {ARTIFACT_DESCRIPTIONS[type]}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {status === 'NOT_REQUESTED' && (
                  <button
                    onClick={() => handleGenerate(type)}
                    disabled={isBusy}
                    style={primaryBtnStyle}
                  >
                    {isBusy ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
                    {isBusy ? 'Queueing...' : 'Generate'}
                  </button>
                )}

                {(status === 'QUEUED' || status === 'PROCESSING') && (
                  <button disabled style={{ ...secondaryBtnStyle, opacity: 0.6, cursor: 'not-allowed' }}>
                    <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Processing...
                  </button>
                )}

                {status === 'READY' && (
                  <>
                    <button
                      onClick={() => handleView(type)}
                      disabled={fetchingContent}
                      style={{ ...primaryBtnStyle, background: 'var(--color-success)' }}
                    >
                      View Artifact
                    </button>
                    <button
                      onClick={() => handleGenerate(type)}
                      disabled={isBusy}
                      style={secondaryBtnStyle}
                      title="Regenerate artifact"
                    >
                      Regenerate
                    </button>
                  </>
                )}

                {status === 'FAILED' && (
                  <button
                    onClick={() => handleRetry(type)}
                    disabled={isBusy}
                    style={{ ...primaryBtnStyle, background: 'var(--color-error)' }}
                  >
                    <RefreshCw size={13} style={{ animation: isBusy ? 'spin 1s linear infinite' : 'none' }} />
                    {isBusy ? 'Retrying...' : 'Retry'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Artifact Viewer Modal */}
      {activeModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--lavender-mist)' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--plum-deep)' }}>{ARTIFACT_TITLES[activeModal.type]}</h3>
                <span style={{ fontSize: 11, color: 'var(--plum-primary)', fontWeight: 600, fontFamily: 'monospace' }}>STATUS: {activeModal.status}</span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20, maxHeight: '60vh', overflowY: 'auto' }}>
              {/* SUMMARY */}
              {activeModal.type === 'SUMMARY' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <h5 style={modalSectionHeaderStyle}>Overview</h5>
                    <p style={modalBoxStyle}>{activeModal.content?.overview}</p>
                  </div>
                  {activeModal.content?.majorPoints?.length > 0 && (
                    <div>
                      <h5 style={modalSectionHeaderStyle}>Major Discussion Points</h5>
                      <ul style={modalListStyle}>
                        {activeModal.content.majorPoints.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activeModal.content?.conclusions?.length > 0 && (
                    <div>
                      <h5 style={modalSectionHeaderStyle}>Conclusions</h5>
                      <ul style={modalListStyle}>
                        {activeModal.content.conclusions.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* SHOW_NOTES */}
              {activeModal.type === 'SHOW_NOTES' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <h5 style={modalSectionHeaderStyle}>Overview</h5>
                    <p style={modalBoxStyle}>{activeModal.content?.overview}</p>
                  </div>
                  {activeModal.content?.keyPoints?.length > 0 && (
                    <div>
                      <h5 style={modalSectionHeaderStyle}>Key Points</h5>
                      <ul style={modalListStyle}>
                        {activeModal.content.keyPoints.map((kp, i) => (
                          <li key={i}>{kp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* DESCRIPTION */}
              {activeModal.type === 'DESCRIPTION' && (
                <div>
                  <h5 style={modalSectionHeaderStyle}>Episode Description</h5>
                  <p style={{ ...modalBoxStyle, whiteSpace: 'pre-wrap' }}>
                    {activeModal.content?.description}
                  </p>
                </div>
              )}

              {/* TITLE_SUGGESTIONS */}
              {activeModal.type === 'TITLE_SUGGESTIONS' && (
                <div>
                  <h5 style={modalSectionHeaderStyle}>Suggested Titles</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activeModal.content?.titleSuggestions?.map((title, i) => (
                      <div key={i} style={{ ...modalBoxStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--plum-deep)' }}>{title}</span>
                        {sourceType === 'episode' && podcastId && (
                          <button
                            onClick={() => handleApplyContent('title', title)}
                            disabled={applying}
                            style={primaryBtnStyle}
                          >
                            Use Title
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CHAPTERS */}
              {activeModal.type === 'CHAPTERS' && (
                <div>
                  <h5 style={modalSectionHeaderStyle}>Timestamped Chapters</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activeModal.content?.chapters?.map((ch, i) => (
                      <div key={i} style={{ ...modalBoxStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          onClick={() => onSeek && onSeek(ch.start)}
                          style={{ background: 'var(--plum-deep)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700, fontFamily: 'monospace', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Play size={10} /> {formatSeconds(ch.start)}
                        </button>
                        <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{ch.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KEY_TOPICS */}
              {activeModal.type === 'KEY_TOPICS' && (
                <div>
                  <h5 style={modalSectionHeaderStyle}>Topics &amp; Tags</h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {activeModal.content?.keyTopics?.map((topic, i) => (
                      <span key={i} style={{ padding: '6px 12px', background: 'var(--lavender-mist)', color: 'var(--plum-deep)', border: '1px solid var(--border-subtle)', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                        #{topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* INTERVIEW_PREP */}
              {activeModal.type === 'INTERVIEW_PREP' && (
                <div>
                  <h5 style={modalSectionHeaderStyle}>Suggested Interview Questions</h5>
                  <ol style={{ ...modalListStyle, listStyleType: 'decimal' }}>
                    {activeModal.content?.questions?.map((q, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>{q}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--color-background-primary)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveModal(null)} style={secondaryBtnStyle}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const panelContainerStyle = {
  background: '#ffffff',
  border: '1px solid var(--border-subtle)',
  borderRadius: 16,
  padding: 24,
  boxShadow: 'var(--shadow-md)',
  marginBottom: 24,
};

const artifactCardStyle = {
  background: 'var(--color-background-primary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  justify: 'space-between',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const primaryBtnStyle = {
  background: 'var(--plum-deep)',
  color: '#ffffff',
  border: 'none',
  borderRadius: 8,
  padding: '7px 14px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  boxShadow: 'var(--shadow-sm)',
  transition: 'all 0.2s',
};

const secondaryBtnStyle = {
  background: 'var(--white-pure)',
  color: 'var(--text-dark)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  padding: '7px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  transition: 'all 0.2s',
};

const modalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(50, 31, 58, 0.65)',
  backdropFilter: 'blur(6px)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justify: 'center',
  padding: 20,
};

const modalContentStyle = {
  background: '#ffffff',
  borderRadius: 16,
  maxWidth: 640,
  width: '100%',
  overflow: 'hidden',
  boxShadow: 'var(--shadow-plum)',
  border: '1px solid var(--border-subtle)',
};

const modalSectionHeaderStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--plum-deep)',
  marginBottom: 6,
};

const modalBoxStyle = {
  background: 'var(--color-background-secondary)',
  padding: 12,
  borderRadius: 10,
  border: '1px solid var(--border-subtle)',
  fontSize: 13,
  color: 'var(--text-dark)',
  lineHeight: 1.5,
  margin: 0,
};

const modalListStyle = {
  background: 'var(--color-background-secondary)',
  padding: '12px 12px 12px 28px',
  borderRadius: 10,
  border: '1px solid var(--border-subtle)',
  fontSize: 13,
  color: 'var(--text-dark)',
  lineHeight: 1.6,
  margin: 0,
};
