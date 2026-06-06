import React, { useState, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export default function SafetyAudit({ contractorId, language, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
      setPreview(null);
      setFile(null);
      setReport(null);
    } catch (err) {
      setError('Camera access denied or unavailable.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      canvasRef.current.toBlob((blob) => {
        const capturedFile = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
        setFile(capturedFile);
        setPreview(URL.createObjectURL(capturedFile));
        
        // Stop camera stream
        const stream = videoRef.current.srcObject;
        if (stream) stream.getTracks().forEach(track => track.stop());
        setIsCameraOpen(false);
      }, 'image/jpeg');
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setReport(null);
      if (isCameraOpen) {
        const stream = videoRef.current?.srcObject;
        if (stream) stream.getTracks().forEach(track => track.stop());
        setIsCameraOpen(false);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('contractor_id', contractorId);

    try {
      const res = await fetch(`${API_BASE}/api/safety/analyze`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
      } else {
        setError(data.detail || 'Analysis failed.');
      }
    } catch (err) {
      setError('Network error during analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500 stroke-green-500 shadow-green-500/50';
    if (score >= 50) return 'text-yellow-500 stroke-yellow-500 shadow-yellow-500/50';
    return 'text-red-500 stroke-red-500 shadow-red-500/50';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl bg-gray-900 border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl">🛡️</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Outfit' }}>Safety AI Inspector</h2>
              <p className="text-white/50 text-sm font-medium">Powered by Gemini Vision</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-8 h-full">
            
            {/* Left: Camera / Upload */}
            <div className="flex flex-col gap-4">
              <div className="relative w-full aspect-video bg-black rounded-2xl border-2 border-dashed border-white/20 overflow-hidden flex flex-col items-center justify-center group">
                
                {isCameraOpen ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <button onClick={capturePhoto} className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                      📸 Capture
                    </button>
                  </>
                ) : preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6">
                    <span className="text-4xl mb-4 block">📷</span>
                    <p className="text-white/60 font-medium">Capture or Upload site photo</p>
                  </div>
                )}

                {/* Scanning Overlay */}
                {analyzing && (
                  <div className="absolute inset-0 bg-blue-900/30 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                    <div className="w-full h-1 bg-blue-400 absolute top-0 animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_20px_rgba(96,165,250,0.8)]"></div>
                    <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4"></div>
                    <p className="text-white font-bold tracking-widest uppercase animate-pulse">Gemini is Analyzing...</p>
                  </div>
                )}
              </div>

              {/* Hidden Canvas for capture */}
              <canvas ref={canvasRef} className="hidden" />

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={startCamera} 
                  disabled={analyzing}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  <span>📹</span> Live Camera
                </button>
                
                <label className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex justify-center items-center gap-2">
                  <span>📂</span> Upload File
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={analyzing} />
                </label>
              </div>

              <button 
                onClick={handleAnalyze} 
                disabled={!file || analyzing || isCameraOpen}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-lg py-4 rounded-xl shadow-xl shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
              >
                {analyzing ? 'Scanning Site...' : 'Run Safety Analysis'}
              </button>
              
              {error && <p className="text-red-400 text-center font-bold text-sm bg-red-400/10 p-3 rounded-xl">{error}</p>}
            </div>

            {/* Right: Results */}
            <div className="bg-black/50 rounded-2xl border border-white/5 p-6 flex flex-col overflow-y-auto">
              {!report ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <div className="w-20 h-20 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center text-3xl">🤖</div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Awaiting Image</h3>
                    <p className="text-sm text-white/50 max-w-[250px] mt-2">Upload an image of your construction site to receive an instant OSHA-style safety audit.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  
                  {/* Score Card */}
                  <div className="flex items-center gap-6 bg-white/5 p-6 rounded-2xl border border-white/10">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="stroke-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" />
                        <path className={`${getScoreColor(report.safety_score).split(' ')[1]}`} strokeDasharray={`${report.safety_score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className={`text-3xl font-black ${getScoreColor(report.safety_score).split(' ')[0]}`}>{report.safety_score}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-wider">Safety Score</h3>
                      <p className="text-white/60 font-medium">Overall Site Compliance</p>
                    </div>
                  </div>

                  {/* Hazards */}
                  <div>
                    <h4 className="text-red-400 font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Detected Hazards
                    </h4>
                    <ul className="space-y-2">
                      {report.hazards_list?.length > 0 ? report.hazards_list.map((hazard, i) => (
                        <li key={i} className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl flex items-start gap-3">
                          <span className="mt-0.5 text-red-500">⚠️</span>
                          <span className="text-sm font-medium leading-relaxed">{hazard}</span>
                        </li>
                      )) : (
                        <li className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm font-bold">
                          ✅ No significant hazards detected.
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> Action Plan
                    </h4>
                    <ul className="space-y-2">
                      {report.recommendations_list?.length > 0 ? report.recommendations_list.map((rec, i) => (
                        <li key={i} className="bg-blue-500/10 border border-blue-500/20 text-blue-200 px-4 py-3 rounded-xl flex items-start gap-3">
                          <span className="mt-0.5 text-blue-400">💡</span>
                          <span className="text-sm font-medium leading-relaxed">{rec}</span>
                        </li>
                      )) : (
                        <li className="text-white/50 text-sm italic px-4">No specific recommendations.</li>
                      )}
                    </ul>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
