import React, { useEffect, useState, useRef } from 'react';
import Webcam from 'react-webcam';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Camera, Mic, Play, Activity, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import babyCry from '../audio/baby-crying.mp3';
import belchyBurp from '../audio/belchy-burp.mp3';
import coughingMan from '../audio/coughing-man.mp3';
import coughingWoman from '../audio/coughing-woman.mp3';
import crispPacket from '../audio/crisp-packet.mp3';
import dudududu from '../audio/dudududu.mp3';
import iphoneNote from '../audio/iphone-note.mp3';
import phoneRing from '../audio/phone-ring.mp3';
import sneezeMan from '../audio/sneeze-man.mp3';

const AUDIO_CLIPS = [
  babyCry,
  belchyBurp,
  coughingMan,
  coughingWoman,
  crispPacket,
  dudududu,
  iphoneNote,
  phoneRing,
  sneezeMan,
];

const generateMockData = () => {
  const data = [];
  const distractions = [15, 38, 52];
  let currentWPM = 130;

  for (let i = 0; i <= 60; i++) {
    const fluctuation = Math.floor(Math.random() * 15) - 7;
    currentWPM = Math.max(90, Math.min(180, currentWPM + fluctuation));

    const isDistractionNear = distractions.some((d) => Math.abs(d - i) <= 2);
    const gaze = isDistractionNear ? Math.random() > 0.7 : Math.random() > 0.15;

    data.push({
      time: i,
      wpm: currentWPM,
      gaze,
      isDistraction: distractions.includes(i),
    });
  }

  return { data, distractions };
};

const { data: MOCK_SESSION_DATA, distractions: MOCK_DISTRACTIONS } = generateMockData();

const GazeDot = ({ cx, cy, payload }: any) => {
  if (cx === undefined || cy === undefined) return null;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={payload.gaze ? '#10b981' : '#f43f5e'}
      stroke='#fff'
      strokeWidth={1}
    />
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className='bg-white p-3 border border-slate-200 shadow-lg rounded-md text-sm'>
        <p className='font-bold text-slate-800 mb-1'>{`Time: ${label}s`}</p>
        <p className='text-blue-600'>{`Speed: ${data.wpm} WPM`}</p>
        <p className={data.gaze ? 'text-emerald-600' : 'text-rose-600'}>
          {data.gaze ? 'Looking at camera' : 'Looking away'}
        </p>
        {data.isDistraction && (
          <p className='text-amber-500 font-semibold mt-1 flex items-center gap-1'>
            <AlertCircle size={14} /> Distraction Played
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function PresentationMock() {
  const { settings, setSettings } = useSettings();
  const [view, setView] = useState<'setup' | 'prep' | 'recording' | 'results'>('setup');
  const [recordingMode, setRecordingMode] = useState<'video' | 'audio'>('video');
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(settings.recordDuration);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStats, setSessionStats] = useState({ avgWpm: 0, gazePercentage: 0 });
  const webcamRef = useRef<Webcam>(null);
  const [prompt, setPrompt] = useState('Prompt loading...');
  const activeStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const distractionTimerRef = useRef<number | null>(null);

  const canCameraRun = settings.useCamera && cameraActive && permissionsGranted;
  const canRecord = recordingMode === 'video' ? canCameraRun : true;

  useEffect(() => {
    setTimeLeft(settings.recordDuration);
  }, [settings.recordDuration]);

  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const res = await fetch('http://52.56.138.157:5000/api/getprompt', {method: 'POST', credentials: 'include' });
        if (!res.ok) {
          console.warn('Failed to fetch prompt', res.status);
          return;
        }

        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const json = await res.json();
          const value = typeof json === 'string' ? json : json.prompt ?? JSON.stringify(json);
          setPrompt(value);
        } else {
          const text = await res.text();
          setPrompt(text);
        }
      } catch (err) {
        console.error('Error fetching prompt:', err);
      }
    };

    fetchPrompt();
  }, []);

  useEffect(() => {
    if (settings.useCamera && !cameraActive && !permissionsGranted && view === 'setup') {
      startCamera();
    }
  }, [settings.useCamera, cameraActive, permissionsGranted, view]);

  const startCamera = async () => {
    if (!settings.useCamera) {
      setSettings((prev) => ({ ...prev, useCamera: true }));
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { frameRate: 10, width: 1280, height: 720 },
      });
      activeStreamRef.current = stream;
      setPermissionsGranted(true);
      setCameraActive(true);
    } catch (err) {
      console.error('Camera permission problem', err);
      setPermissionsGranted(false);
    }
  };
/*
  const recordSnapshot = (blob: Blob, mode: 'video' | 'audio') => {
    // deprecated single-file uploader left for backwards compatibility
    const formData = new FormData();
    formData.append('file', blob, mode === 'audio' ? 'session-audio.webm' : 'session-video.webm');

    fetch('/api/upload', {
      method: 'POST',
      body: formData,
    }).catch((err) => console.error('Upload failed', err));
  };
*/
  const uploadPresentation = async (blob: Blob, mode: 'video' | 'audio') => {
    try {
      const fd = new FormData();
      if (mode === 'video') {
        fd.append('video', blob, 'presentation-video.webm');
      } else {
        fd.append('audio', blob, 'presentation-audio.webm');
      }

      // include other metadata
      fd.append('prompt', prompt || '');
      fd.append('presentation_length', String(settings.recordDuration));
      fd.append('prep_length', String(settings.prepDuration));

      // POST to backend uploadpresentation route (use relative path so nginx proxy works)
      const res = await fetch('http://52.56.138.157:5000/api/uploadpresentation', { method: 'POST', credentials: 'include', body: fd });
      if (!res.ok) {
        console.error('Presentation upload failed', await res.text());
      } else {
        console.log('Presentation uploaded successfully');
      }
    } catch (err) {
      console.error('Upload error', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (distractionTimerRef.current) {
      window.clearInterval(distractionTimerRef.current);
      distractionTimerRef.current = null;
    }

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }

    setIsRecording(false);
    setView('results');
    setSessionStats(calculateStats());
  };

  const beginRecording = async () => {
    if (recordingMode === 'video' && (!cameraActive || !permissionsGranted)) {
      await startCamera();
    }

    if (!canRecord) {
      if (recordingMode === 'video') {
        alert('Camera not ready. Please enable camera preview first or use audio-only mode.');
      }
      setView('setup');
      return;
    }

    let stream: MediaStream | null = null;

    if (recordingMode === 'video') {
      stream = activeStreamRef.current || (webcamRef.current as any)?.stream;
      if (!stream || !canCameraRun) {
        alert('Video recording not ready. Please enable camera preview first.');
        setView('setup');
        return;
      }
    } else {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error('Audio permission problem', err);
        setView('setup');
        return;
      }
    }

    if (!stream) {
      console.warn('No media stream available for recording.');
      setView('setup');
      return;
    }

    activeStreamRef.current = stream;
    recordedChunksRef.current = [];

    const options = { mimeType: 'video/webm;codecs="vp8, opus"', videoBitsPerSecond: 2_000_000 };
    const mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: recordingMode === 'audio' ? 'audio/webm' : 'video/webm' });
      //recordSnapshot(blob, recordingMode);
      // attempt to upload presentation (video or audio) with metadata
      uploadPresentation(blob, recordingMode);
    };

    mediaRecorder.start(100);
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
    setView('recording');
    setTimeLeft(settings.recordDuration);

    if (settings.enableDistractions) {
      distractionTimerRef.current = window.setInterval(() => {
        if (Math.random() < 0.33) {
          const randomClip = AUDIO_CLIPS[Math.floor(Math.random() * AUDIO_CLIPS.length)];
          const audio = new Audio(randomClip);
          audio.volume = 0.76;
          audio.play().catch(() => {});
        }
      }, 5000);
    }
  };

  useEffect(() => {
    if (view !== 'prep') return;

    if (timeLeft <= 0) {
      beginRecording();
      return;
    }

    const timer = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [view, timeLeft]);

  useEffect(() => {
    if (view !== 'recording') return;

    if (timeLeft <= 0) {
      stopRecording();
      return;
    }

    const timer = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [view, timeLeft]);

  const calculateStats = () => {
    const avgWpm = Math.round(
      MOCK_SESSION_DATA.reduce((acc, curr) => acc + curr.wpm, 0) / MOCK_SESSION_DATA.length,
    );
    const gazeTime = MOCK_SESSION_DATA.filter((d) => d.gaze).length;
    const gazePercentage = Math.round((gazeTime / MOCK_SESSION_DATA.length) * 100);
    return { avgWpm, gazePercentage };
  };

  const beginSession = async (mode: 'video' | 'audio') => {
    setRecordingMode(mode);

    if (mode === 'video') {
      if (!cameraActive || !permissionsGranted) {
        await startCamera();
      }
    } else {
      setCameraActive(false);
    }

    setView('prep');
    setTimeLeft(settings.prepDuration);
  };

  const renderSetup = () => {
    const cameraReady = settings.useCamera && cameraActive && permissionsGranted;

    return (
      <div className='flex flex-col items-center justify-center min-h-[600px] bg-[var(--card)] text-[var(--on-surface)] p-8 rounded-xl shadow-[var(--shadow)] border border-[var(--border)]'>
        <h1 className='text-3xl font-bold text-[var(--on-surface)] mb-4'>{settings.recordDuration}-Second Pressure Drill</h1>
        <p className='text-sm mb-8 max-w-md text-center text-[var(--muted)]'>
          You will be presented with a prompt. Speak continuously for {settings.recordDuration} seconds. The app tracks pace, eye contact, and random audio distractions.
        </p>


        {cameraReady ? (
          <div className='relative w-full max-w-3xl rounded-xl overflow-hidden border border-[var(--border)]'>
            <Webcam
              audio
              ref={webcamRef}
              mirrored
              screenshotFormat='image/jpeg'
              videoConstraints={{ width: 1280, height: 720, frameRate: 10 }}
              className='h-[480px] w-full object-cover'
            />
            <div className='absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2'>
              <button
                onClick={() => beginSession('video')}
                className='rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-bold text-white shadow-lg hover:bg-[var(--accent-strong)]'
              >
                Record video
              </button>
              <button
                onClick={() => beginSession('audio')}
                className='rounded-full bg-[var(--card)] px-6 py-2 text-sm font-bold text-[var(--on-surface)] shadow-lg hover:bg-[var(--surface)]'
              >
                Audio only
              </button>
            </div>
          </div>
        ) : (
          <div className='rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3'>
            <p className='text-[var(--on-surface)]'>
              {settings.useCamera ? 'Camera preview initialising; please allow camera access.' : 'Camera preview is disabled in settings.'}
            </p>
            <div className='flex flex-wrap gap-2'>
              <button
                onClick={startCamera}
                className='rounded-lg border border-[var(--border)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]'
              >
                <Camera size={16} /> Enable camera
              </button>
              <button
                onClick={() => beginSession('audio')}
                className='rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--on-surface)] hover:bg-[var(--card)]'
              >
                <Mic size={16} /> Record audio only
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRecording = () => {
    const isVideo = recordingMode === 'video';

    return (
      <div className='flex flex-col min-h-[600px] bg-[var(--surface)] text-[var(--on-surface)] border border-[var(--border)] p-6 rounded-xl relative overflow-hidden'>
        <div className='absolute inset-0 bg-[var(--card)]' />
        <div className='relative z-10 w-full max-w-3xl mx-auto'>
          <div className='mb-4'>
            <p className='text-3xl font-semibold'>Recording in progress ({recordingMode === 'audio' ? 'audio only' : 'video'})</p>
            <p className='text-xs text-[var(--muted)]'>Remaining: {timeLeft}s</p>
          </div>

          {isVideo ? (
            cameraActive ? (
              <div className='mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden'>
                <Webcam
                  audio
                  ref={webcamRef}
                  mirrored
                  screenshotFormat='image/jpeg'
                  videoConstraints={{ width: 1280, height: 720, frameRate: 10 }}
                  className='h-[440px] w-full object-cover'
                />
              </div>
            ) : (
              <div className='mb-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center'>
                <p className='text-slate-200'>Camera preview unavailable during recording.</p>
              </div>
            )
          ) : (
            <div className='mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center'>
              <p className='text-sm text-[var(--on-surface)]'>Audio-only recording; no video captured.</p>
              <p className='text-sm text-[var(--on-surface)] mt-1'>The system captures microphone input and saves separately.</p>
            </div>
          )}

          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          <div className='rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4'>
            <p className='text-xs text-[var(--on-surface)]'>Preparation time</p>
            <p className='font-semibold'>{settings.prepDuration}s</p>
          </div>
          <div className='rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4'>
            <p className='text-xs text-[var(--on-surface)]'>Recording time</p>
            <p className='font-semibold'>{settings.recordDuration}s</p>
          </div>
          <div className='rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4'>
            <p className='text-xs text-[var(--on-surface)]'>Distractions</p>
            <p className='font-semibold'>{settings.enableDistractions ? 'On' : 'Off'}</p>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const renderResults = () => {
    const stats = sessionStats.avgWpm === 0 ? calculateStats() : sessionStats;

    return (
      <div className='flex flex-col min-h-[600px] bg-[var(--card)] text-[var(--on-surface)] p-8 rounded-xl border border-[var(--border)] shadow-sm'>
        <div className='flex justify-between items-end mb-8'>
          <div>
            <h2 className='text-3xl font-bold text-[var(--on-card)]'>Session Analysis</h2>
            <p className='text-[var(--muted)] mt-2'>Review your session performance.</p>
          </div>
          <button
            onClick={() => {
              setView('setup');
              setCameraActive(false);
              setIsRecording(false);
              setTimeLeft(settings.recordDuration);
            }}
            className='flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-blue-600 transition-colors'
          >
            New Session
          </button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
          <div className='bg-[var(--card)] p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4'>
            <div className='p-3 bg-blue-50 text-blue-600 rounded-lg'>
              <Activity size={28} />
            </div>
            <div>
              <p className='text-sm text-slate-500 font-medium'>Average Speaking Pace</p>
              <p className='text-2xl font-bold text-slate-900'>
                {stats.avgWpm} <span className='text-lg font-normal text-slate-500'>WPM</span>
              </p>
            </div>
          </div>
          <div className='bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4'>
            <div className='p-3 bg-emerald-50 text-emerald-600 rounded-lg'>
              <Eye size={28} />
            </div>
            <div>
              <p className='text-sm text-slate-500 font-medium'>Eye Contact Maintained</p>
              <p className='text-2xl font-bold text-slate-900'>
                {stats.gazePercentage}% <span className='text-lg font-normal text-slate-500'>of session</span>
              </p>
            </div>
          </div>
        </div>

        <div className='bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1'>
          <h3 className='text-lg font-semibold text-slate-800 mb-6'>Performance Timeline</h3>
          <div className='h-72 w-full' style={{ minWidth: '300px', minHeight: '250px' }}>
            <ResponsiveContainer width='100%' height='100%' minWidth={100} minHeight={100}>
              <LineChart data={MOCK_SESSION_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                <XAxis
                  dataKey='time'
                  type='number'
                  domain={[0, 60]}
                  tickCount={13}
                  stroke='#94a3b8'
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(val) => `${val}s`}
                />
                <YAxis
                  domain={['dataMin - 20', 'dataMax + 20']}
                  stroke='#94a3b8'
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(val) => `${val} WPM`}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                {MOCK_DISTRACTIONS.map((time, index) => (
                  <ReferenceLine key={index} x={time} stroke='#fbbf24' strokeDasharray='4 4' />
                ))}
                <Line
                  type='monotone'
                  dataKey='wpm'
                  stroke='#cbd5e1'
                  strokeWidth={2}
                  dot={<GazeDot />}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='w-full max-w-5xl mx-auto p-4 font-sans'>
      {view === 'setup' && renderSetup()}
      {view === 'prep' && (
        <div className='rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center'>
          <h2 className='text-2xl font-semibold text-[var(--on-surface)] mb-3'>{prompt}</h2>
          <p className='text-sm text-[var(--muted)] mb-2'>Starting in {timeLeft}s. Stay focused!</p>
          {recordingMode === 'video' ? (
            cameraActive ? (
              <div className='mt-4 mx-auto w-full max-w-3xl rounded-xl overflow-hidden border border-[var(--border)]'>
                <Webcam
                  audio
                  ref={webcamRef}
                  mirrored
                  screenshotFormat='image/jpeg'
                  videoConstraints={{ width: 1280, height: 720, frameRate: 10 }}
                  className='h-[420px] w-full object-cover'
                />
              </div>
            ) : (
              <p className='mt-4 text-sm text-[var(--muted)]'>Camera preview unavailable during prep. Please enable camera if needed.</p>
            )
          ) : (
            <p className='mt-4 text-sm text-[var(--muted)]'>Audio-only session: recording audio track only.</p>
          )}
        </div>
      )}
      {view === 'recording' && renderRecording()}
      {view === 'results' && renderResults()}
    </div>
  );
}
