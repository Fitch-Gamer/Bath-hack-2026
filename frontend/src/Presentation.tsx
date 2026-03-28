import React, {useEffect, useState, useRef, useCallback} from 'react';
import Webcam from 'react-webcam';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { Camera, Mic, Play, Square, Activity, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';

const generateMockData = () => {
    const data = [];
    const distractions = [15, 38, 52];
    let currentWPM = 130;

    for (let i = 0; i <= 60; i++) {
        const fluctuation = Math.floor(Math.random() * 15) - 7;
        currentWPM = Math.max(90, Math.min(180, currentWPM + fluctuation))

        const isDistractionNear = distractions.some(d => Math.abs(d - i) <= 2);
        const gaze = isDistractionNear ? Math.random() > 0.7 : Math.random() > 0.15;

        data.push({
            time: i,
            wpm: currentWPM,
            gaze: gaze,
            isDistraction: distractions.includes(i)
        });
    }
    return { data, distractions };
};

const { data: MOCK_SESSION_DATA, distractions: MOCK_DISTRACTIONS } = generateMockData();

const GazeDot = (props) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;

    return (
        <circle
            cx={cx}
            cy={cy}
            r={4}
            fill={payload.gaze ? '#' : '#'}
            stroke='#fff'
            strokeWidth={1}
        />
    );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-md text-sm">
        <p className="font-bold text-slate-800 mb-1">{`Time: ${label}s`}</p>
        <p className="text-blue-600">{`Speed: ${data.wpm} WPM`}</p>
        <p className={data.gaze ? "text-emerald-600" : "text-rose-600"}>
          {data.gaze ? "Looking at camera" : "Looking away"}
        </p>
        {data.isDistraction && (
          <p className="text-amber-500 font-semibold mt-1 flex items-center gap-1">
            <AlertCircle size={14} /> Distraction Played
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function PresentationMock() {
    const [view, setView] = useState(`setup`);
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const webcamRef = useRef(null);

    const requestPermissions = async () => {
        try {
            // simulate approval
            setTimeout(() => setPermissionsGranted(true), 500);
        } catch (err) {
            console.error("Permission denied.", err)
        }
    }

    useEffect(() => {
        let timer;
        if (view == 'recording' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
                // send data to websockets
                // receive gaze boolean and wpm

            }, 1000);
        } else if (view === 'recording' && timeLeft === 0) {
            setView('results');
        }
        return () => clearInterval(timer);
    }, [view, timeLeft]);

    const calculateStats = () => {
        const avgWpm = Math.round(MOCK_SESSION_DATA.reduce((acc, curr) => acc + curr.wpm, 0) / MOCK_SESSION_DATA.length);
        const gazeTime = MOCK_SESSION_DATA.filter(d => d.gaze).length;
        const gazePercentage = Math.round((gazeTime / MOCK_SESSION_DATA.length) * 100);
        return { avgWpm, gazePercentage };
    };

    const renderSetup = () => (
        <div className="flex flex-col items-center justify-center min-h-[600px] bg-slate-50 text-slate-800 p-8 rounded-xl shadow-sm border border-slate-200">
            <h1 className="text-3xl font-bold mb-4">60-Second Pressure Drill</h1>
            <p className="text-slate-600 mb-8 max-w-md text-center">
                You will be presented with a prompt. Speak continuously for 60 seconds. Our system will track your speaking pace, eye contact, and test your focus with random audio distractions.
            </p>
            
            <div className="flex flex-col gap-4 w-full max-w-xs">
                <button 
                    onClick={requestPermissions}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                        permissionsGranted 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default' 
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                    disabled={permissionsGranted}
                >
                    {permissionsGranted ? <CheckCircle2 size={20} /> : <Camera size={20} />}
                    {permissionsGranted ? 'Camera & Mic Ready' : 'Enable Camera & Mic'}
                </button>

                <button 
                    onClick={() => { setView('recording'); setTimeLeft(60); }}
                    disabled={!permissionsGranted}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                        permissionsGranted 
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-md' 
                        : 'bg-slate-300 cursor-not-allowed'
                    }`}
                >
                    <Play size={20} />
                    Start Drill
                </button>
            </div>
        </div>
    );

    const renderRecording = () => (
        <div className="flex flex-col items-center min-h-[600px] bg-slate-900 text-white p-6 rounded-xl relative overflow-hidden">
        {/* High-pressure minimalistic UI */}
        <div className="w-full max-w-3xl mb-6 bg-slate-800 border border-slate-700 p-6 rounded-xl text-center shadow-lg">
            <p className="text-sm text-slate-400 uppercase tracking-widest mb-2 font-semibold">Current Prompt</p>
            <h2 className="text-2xl font-medium text-slate-100">"Explain a complex technical concept to a non-technical stakeholder."</h2>
        </div>

        <div className="relative w-full max-w-3xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-700">
            {permissionsGranted && (
            <Webcam 
                audio={true}
                ref={webcamRef}
                muted={true} // Muted locally to prevent feedback loop
                className="w-full h-full object-cover"
            />
            )}
            
            {/* Recording Indicator & Timer Overlay */}
            <div className="absolute top-4 right-4 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-600/50">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-sm font-medium tracking-wide">REC</span>
            </div>
            </div>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <div className="bg-black/70 backdrop-blur-md px-8 py-3 rounded-full border border-slate-600/50">
                <span className={`text-4xl font-mono font-bold ${timeLeft <= 10 ? 'text-rose-500' : 'text-white'}`}>
                    00:{timeLeft.toString().padStart(2, '0')}
                </span>
            </div>
            </div>
        </div>
        </div>
    );

    const renderResults = () => {
        const stats = calculateStats();

        return (
        <div className="flex flex-col min-h-[600px] bg-slate-50 text-slate-800 p-8 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-end mb-8">
            <div>
                <h2 className="text-3xl font-bold text-slate-900">Session Analysis</h2>
                <p className="text-slate-500 mt-1">Review your 60-second drill performance.</p>
            </div>
            <button 
                onClick={() => { setView('setup'); setPermissionsGranted(false); }}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
                <Square size={16} /> New Session
            </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Activity size={28} />
                </div>
                <div>
                <p className="text-sm text-slate-500 font-medium">Average Speaking Pace</p>
                <p className="text-2xl font-bold text-slate-900">{stats.avgWpm} <span className="text-lg font-normal text-slate-500">WPM</span></p>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <Eye size={28} />
                </div>
                <div>
                <p className="text-sm text-slate-500 font-medium">Eye Contact Maintained</p>
                <p className="text-2xl font-bold text-slate-900">{stats.gazePercentage}% <span className="text-lg font-normal text-slate-500">of session</span></p>
                </div>
            </div>
            </div>

            {/* Timeline Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Performance Timeline</h3>
            
            {/* Custom Legend */}
            <div className="flex flex-wrap gap-6 mb-6 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" /> Looking at Camera
                </div>
                <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" /> Looking Away
                </div>
                <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-amber-400 border-t border-dashed border-amber-600" /> Distraction Played
                </div>
            </div>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_SESSION_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                    dataKey="time" 
                    type="number" 
                    domain={[0, 60]} 
                    tickCount={13} 
                    stroke="#94a3b8" 
                    tick={{fill: '#64748b', fontSize: 12}}
                    tickFormatter={(val) => `${val}s`}
                    />
                    <YAxis 
                    domain={['dataMin - 20', 'dataMax + 20']} 
                    stroke="#94a3b8"
                    tick={{fill: '#64748b', fontSize: 12}}
                    tickFormatter={(val) => `${val} WPM`}
                    width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* Distraction Markers */}
                    {MOCK_DISTRACTIONS.map((time, index) => (
                    <ReferenceLine key={index} x={time} stroke="#fbbf24" strokeDasharray="4 4" />
                    ))}

                    {/* Main WPM Line with Custom Gaze Dots */}
                    <Line 
                    type="monotone" 
                    dataKey="wpm" 
                    stroke="#cbd5e1" 
                    strokeWidth={2}
                    dot={<GazeDot />}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    isAnimationActive={true}
                    />
                </LineChart>
                </ResponsiveContainer>
            </div>
            </div>
        </div>
        );
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-4 font-sans">
            {view === 'setup' && renderSetup()}
            {view === 'recording' && renderRecording()}
            {view === 'results' && renderResults()}
        </div>
    )

}
