import React, { useState, useEffect, useCallback } from 'react';

/**
 * Phase E3 — AI Podcast Intelligence Panel Component
 * Displays status, generation triggers, retries, formatted viewer, chapter seek buttons,
 * and explicit confirmation controls for applying AI suggestions to episode fields.
 */

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
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/ai/${sourceType}/${sourceId}`, {
        headers: { Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/ai/${sourceType}/${sourceId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/ai/${sourceType}/${sourceId}/${artifactType}/retry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/ai/${sourceType}/${sourceId}/${artifactType}`, {
        headers: { Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/podcasts/${podcastId}/episodes/${sourceId}/apply-ai-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm flex items-center justify-center space-x-3">
        <svg className="animate-spin h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>Loading AI Podcast Intelligence...</span>
      </div>
    );
  }

  const types = Object.keys(ARTIFACT_TITLES);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <span className="text-indigo-400">✨</span>
            <span>AI Podcast Intelligence</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Asynchronous AI content generation grounded in your E2 timestamped recording transcript.
          </p>
        </div>
        <button
          onClick={fetchStatuses}
          className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition"
        >
          Refresh Status
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-lg flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white font-bold ml-2">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs rounded-lg flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white font-bold ml-2">×</button>
        </div>
      )}

      {/* Artifact Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {types.map((type) => {
          const meta = statuses[type] || {};
          const status = meta.status || 'NOT_REQUESTED';
          const isBusy = actionLoading[type];

          return (
            <div
              key={type}
              className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-sm text-slate-200">{ARTIFACT_TITLES[type]}</h4>
                  {/* Status Badge */}
                  {status === 'NOT_REQUESTED' && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-400 rounded-full">
                      Not Generated
                    </span>
                  )}
                  {status === 'QUEUED' && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-950 text-amber-300 border border-amber-800 rounded-full animate-pulse">
                      Queued
                    </span>
                  )}
                  {status === 'PROCESSING' && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full flex items-center space-x-1">
                      <svg className="animate-spin h-3 w-3 text-indigo-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Generating...</span>
                    </span>
                  )}
                  {status === 'READY' && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full">
                      Ready
                    </span>
                  )}
                  {status === 'FAILED' && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-red-950 text-red-300 border border-red-800 rounded-full">
                      Failed
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {ARTIFACT_DESCRIPTIONS[type]}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-end space-x-2">
                {status === 'NOT_REQUESTED' && (
                  <button
                    onClick={() => handleGenerate(type)}
                    disabled={isBusy}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition"
                  >
                    {isBusy ? 'Queueing...' : 'Generate'}
                  </button>
                )}

                {(status === 'QUEUED' || status === 'PROCESSING') && (
                  <button
                    disabled
                    className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-slate-400 rounded-lg cursor-not-allowed flex items-center space-x-1"
                  >
                    <svg className="animate-spin h-3 w-3 text-slate-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Processing...</span>
                  </button>
                )}

                {status === 'READY' && (
                  <>
                    <button
                      onClick={() => handleView(type)}
                      disabled={fetchingContent}
                      className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                    >
                      View Artifact
                    </button>
                    <button
                      onClick={() => handleGenerate(type)}
                      disabled={isBusy}
                      className="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
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
                    className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
                  >
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <h3 className="font-bold text-base text-white">{ARTIFACT_TITLES[activeModal.type]}</h3>
                <span className="text-xs text-indigo-400 font-mono">STATUS: {activeModal.status}</span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-300">
              {/* SUMMARY */}
              {activeModal.type === 'SUMMARY' && (
                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-white mb-1">Overview</h5>
                    <p className="leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">{activeModal.content.overview}</p>
                  </div>
                  {activeModal.content.majorPoints?.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-white mb-1">Major Discussion Points</h5>
                      <ul className="list-disc list-inside space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300">
                        {activeModal.content.majorPoints.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activeModal.content.conclusions?.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-white mb-1">Conclusions</h5>
                      <ul className="list-disc list-inside space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300">
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
                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-white mb-1">Overview</h5>
                    <p className="leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">{activeModal.content.overview}</p>
                  </div>
                  {activeModal.content.keyPoints?.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-white mb-1">Key Points</h5>
                      <ul className="list-disc list-inside space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800">
                        {activeModal.content.keyPoints.map((kp, i) => (
                          <li key={i}>{kp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activeModal.content.takeaways?.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-white mb-1">Takeaways</h5>
                      <ul className="list-disc list-inside space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800">
                        {activeModal.content.takeaways.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* DESCRIPTION */}
              {activeModal.type === 'DESCRIPTION' && (
                <div>
                  <h5 className="font-semibold text-white mb-1">Episode Description</h5>
                  <p className="leading-relaxed whitespace-pre-wrap bg-slate-950 p-4 rounded-lg border border-slate-800 font-sans">
                    {activeModal.content.description}
                  </p>
                </div>
              )}

              {/* TITLE_SUGGESTIONS */}
              {activeModal.type === 'TITLE_SUGGESTIONS' && (
                <div>
                  <h5 className="font-semibold text-white mb-2">Suggested Titles</h5>
                  <div className="space-y-2">
                    {activeModal.content.titleSuggestions?.map((title, i) => (
                      <div
                        key={i}
                        className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between"
                      >
                        <span className="font-medium text-white">{title}</span>
                        {sourceType === 'episode' && podcastId && (
                          <button
                            onClick={() => handleApplyContent('title', title)}
                            disabled={applying}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded transition"
                          >
                            Use This Title
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
                  <h5 className="font-semibold text-white mb-2">Timestamped Chapters</h5>
                  <div className="space-y-2">
                    {activeModal.content.chapters?.map((ch, i) => (
                      <div
                        key={i}
                        className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                      >
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => onSeek && onSeek(ch.start)}
                            className="font-mono text-xs bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 px-2 py-1 rounded"
                            title="Seek to timestamp"
                          >
                            ▶ {formatSeconds(ch.start)}
                          </button>
                          <span className="font-medium text-slate-200">{ch.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KEY_TOPICS */}
              {activeModal.type === 'KEY_TOPICS' && (
                <div>
                  <h5 className="font-semibold text-white mb-2">Topics & Tags</h5>
                  <div className="flex flex-wrap gap-2">
                    {activeModal.content.keyTopics?.map((topic, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-medium"
                      >
                        #{topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* GUEST_BRIEF */}
              {activeModal.type === 'GUEST_BRIEF' && (
                <div className="space-y-3">
                  {activeModal.content.background && (
                    <div>
                      <h5 className="font-semibold text-white mb-1">Guest Background</h5>
                      <p className="bg-slate-950 p-3 rounded-lg border border-slate-800">{activeModal.content.background}</p>
                    </div>
                  )}
                  {activeModal.content.keyTalkingPoints?.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-white mb-1">Key Talking Points</h5>
                      <ul className="list-disc list-inside space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800">
                        {activeModal.content.keyTalkingPoints.map((tp, i) => (
                          <li key={i}>{tp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* INTERVIEW_PREP */}
              {activeModal.type === 'INTERVIEW_PREP' && (
                <div>
                  <h5 className="font-semibold text-white mb-2">Suggested Interview Questions</h5>
                  <ol className="list-decimal list-inside space-y-2 bg-slate-950 p-4 rounded-lg border border-slate-800">
                    {activeModal.content.questions?.map((q, i) => (
                      <li key={i} className="text-slate-200 leading-relaxed font-medium">
                        {q}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Modal Footer / Explicit Confirmation Buttons */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                AI output suggestions require explicit user confirmation before replacing episode metadata.
              </span>
              <div className="flex items-center space-x-2">
                {sourceType === 'episode' && podcastId && activeModal.type === 'DESCRIPTION' && (
                  <button
                    onClick={() => handleApplyContent('description', activeModal.content.description)}
                    disabled={applying}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                  >
                    {applying ? 'Applying...' : 'Use This Description'}
                  </button>
                )}

                {sourceType === 'episode' && podcastId && activeModal.type === 'SHOW_NOTES' && (
                  <button
                    onClick={() => handleApplyContent('showNotes', activeModal.content)}
                    disabled={applying}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                  >
                    {applying ? 'Applying...' : 'Use These Show Notes'}
                  </button>
                )}

                <button
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
