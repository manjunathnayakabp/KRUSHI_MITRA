"use client";
import { useState, useEffect } from 'react';
import { submitNodeData, getChartData, registerFarmer, loginFarmer, startCropCycle, getAllCropCycles, getCommunityPosts, createCommunityPost } from '../lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- TRANSLATION DICTIONARY ---
const translations = {
  en: {
    title: "Krushi Mitra",
    subtitle: "Smart Agriculture Dashboard",
    loginText: "Farmer Login",
    welcome: "Welcome",
    tabDashboard: "Field Dashboard",
    tabLifecycle: "Crop Lifecycle",
    tabWeather: "Weather & Forecast",
    nodeSelect: "Select Field Location",
    n: "Nitrogen (N)",
    p: "Phosphorus (P)",
    k: "Potassium (K)",
    moisture: "Soil Moisture %",
    temp: "Temperature °C",
    ec: "Electrical Conductivity",
    upload: "Upload Crop Image",
    submit: "Generate Daily Report",
    analyzing: "Analyzing data...",
    aiReport: "AI Diagnostic Report",
    condition: "Crop Condition",
    precautions: "Actionable Guidance",
    conclusion: "Overall Conclusion",
    history: "Historical Trends: Node",
  },
  kn: {
    title: "ಕೃಷಿ ಮಿತ್ರ",
    subtitle: "ಸ್ಮಾರ್ಟ್ ಕೃಷಿ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    loginText: "ರೈತರ ಲಾಗಿನ್",
    welcome: "ಸ್ವಾಗತ",
    tabDashboard: "ಕ್ಷೇತ್ರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    tabLifecycle: "ಬೆಳೆ ಜೀವನಚಕ್ರ",
    tabWeather: "ಹವಾಮಾನ",
    nodeSelect: "ಕ್ಷೇತ್ರದ ಸ್ಥಳವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    n: "ಸಾರಜನಕ (N)",
    p: "ರಂಜಕ (P)",
    k: "ಪೊಟ್ಯಾಸಿಯಮ್ (K)",
    moisture: "ಮಣ್ಣಿನ ತೇವಾಂಶ %",
    temp: "ತಾಪಮಾನ °C",
    ec: "ವಿದ್ಯುತ್ ವಾಹಕತೆ (EC)",
    upload: "ಬೆಳೆಯ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    submit: "ವರದಿ ರಚಿಸಿ",
    analyzing: "ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...",
    aiReport: "AI ರೋಗನಿರ್ಣಯ ವರದಿ",
    condition: "ಬೆಳೆಯ ಸ್ಥಿತಿ",
    precautions: "ಮಾರ್ಗದರ್ಶನ",
    conclusion: "ಒಟ್ಟಾರೆ ತೀರ್ಮಾನ",
    history: "ಐತಿಹಾಸಿಕ ಡೇಟಾ: ನೋಡ್",
  }
};

export default function Home() {
  const [lang, setLang] = useState('en');
  const t = translations[lang]; // Active translation

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [farmerName, setFarmerName] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [farmerNotes, setFarmerNotes] = useState("");
  const [activeSchemes, setActiveSchemes] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [marketProducts, setMarketProducts] = useState([]);
  const [isFieldMode, setIsFieldMode] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState([]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [activeNode, setActiveNode] = useState(1);
  const [allCrops, setAllCrops] = useState([]);

  // --- 1. THE VOICE ASSISTANT FUNCTION ---
  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any currently playing audio
      const utterance = new SpeechSynthesisUtterance(text);
      // Automatically switch accent/engine based on the selected language
      utterance.lang = lang === 'kn' ? 'kn-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported in this browser.");
    }
  };

  // --- NEW: SPEECH TO TEXT ASSISTANT ---
  const handleListen = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input. Try Chrome or Edge.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    // Smart language switching based on your existing UI toggle!
    recognition.lang = lang === 'kn' ? 'kn-IN' : 'en-IN'; 
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Append the spoken words to whatever is already in the text box
      setFarmerNotes((prev) => prev + (prev ? " " : "") + transcript);
    };
    
    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // --- 2. THE PDF GENERATION FUNCTION ---
  const handleDownloadPDF = async () => {
    // We dynamically import it so it doesn't crash Next.js Server-Side Rendering
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('ai-report-content'); // The section we want to capture
    
    const opt = {
      margin:       0.5,
      filename:     `Krushi_Mitra_Report_Node_${activeNode}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadChart(activeNode);
      // NEW: Load the community feed
      getCommunityPosts().then(data => setCommunityPosts(data));
    }
  }, [activeNode, isAuthenticated]);

  const loadChart = async (nodeId) => {
    const data = await getChartData(nodeId);
    setChartData(data);
    const crops = await getAllCropCycles(); // <-- NEW
    setAllCrops(crops);
  };

  // --- NEW: ALERT PRIORITY ENGINE ---
  const processAlerts = (insightData) => {
    const newAlerts = [];
    
    // Safely grab strings to prevent crashes if Gemini misses a key
    const condition = insightData?.crop_condition ? insightData.crop_condition.toLowerCase() : "";
    const action = insightData?.top_action ? insightData.top_action.toLowerCase() : "";

    // Tier 1: CRITICAL (Disease, Severe Drops, Immediate Action)
    if (condition.includes('disease') || condition.includes('blight') || action.includes('immediate') || action.includes('today')) {
      newAlerts.push({
        id: Date.now() + 1,
        tier: 1,
        title: "URGENT: Immediate Action Required",
        message: insightData.top_action || "Critical issue detected.",
        snoozed: false
      });
    } 
    // Tier 2: WARNING (Low moisture, moderate changes)
    else if (condition.includes('low') || condition.includes('drop') || action.includes('soon')) {
      newAlerts.push({
        id: Date.now() + 2,
        tier: 2,
        title: "ATTENTION: Sub-Optimal Conditions",
        message: insightData.top_action || "Conditions are degrading.",
        snoozed: false
      });
    }
    
    // Tier 3 is silent logging (no banner needed)
    setActiveAlerts(newAlerts);
  };

  const handleSnooze = (id) => {
    setActiveAlerts(prev => prev.map(alert => alert.id === id ? { ...alert, snoozed: true } : alert));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setInsight(null);
    const formData = new FormData(e.target);
    const submittedNodeId = formData.get("node_id");
    
    formData.append("language", lang); // <-- NEW: Tell the backend which language!

    try {
      const response = await submitNodeData(formData);
      setInsight(response.insight);
      processAlerts(response.insight);
      setActiveSchemes(response.schemes || []);
      setMarketProducts(response.marketplace || []);
      setActiveNode(submittedNodeId);
      await loadChart(submittedNodeId);
      setFarmerNotes("");
    } catch (error) {
      alert("Network Error: Ensure your backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e, type) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (type === 'login') {
      const res = await loginFarmer({ phone_number: data.phone_number, password: data.password });
      if (res.access_token) {
        setIsAuthenticated(true);
        setFarmerName(res.farmer_name);
      } else {
        alert(res.error || "Login failed");
      }
    } else {
      const res = await registerFarmer(data);
      if (res.message) {
        alert("Success! Please log in.");
        setShowRegister(false);
      } else {
        alert(res.error || "Registration failed");
      }
    }
  };

  // --- RENDER LOGIN SCREEN IF NOT AUTHENTICATED ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-100">
          <div className="text-center mb-8">
             <svg className="w-12 h-12 text-emerald-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg>
             <h1 className="text-3xl font-bold text-gray-800">{t.title}</h1>
             <p className="text-gray-500 mt-2">{showRegister ? "Create your farmer account" : "Secure Farmer Login"}</p>
          </div>

          <form onSubmit={(e) => handleAuth(e, showRegister ? 'register' : 'login')} className="space-y-4">
            {showRegister && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-600">Full Name</label>
                  <input required name="farmer_name" type="text" className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Enter your name" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600">Farm Location</label>
                  <input name="farm_location" type="text" className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Village / District" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-600">Phone Number</label>
              <input required name="phone_number" type="tel" className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="10-digit mobile number" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600">Password</label>
              <input required name="password" type="password" className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-md transition-all mt-6">
              {showRegister ? "Register Account" : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => setShowRegister(!showRegister)} className="text-emerald-600 hover:text-emerald-800 text-sm font-semibold">
              {showRegister ? "Already have an account? Login" : "New user? Create an account"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER YOUR PROFESSIONAL DASHBOARD IF AUTHENTICATED ---
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-800 font-sans flex flex-col">
      
      {/* PROFESSIONAL TOP NAVIGATION BAR */}
      <nav className="bg-emerald-800 text-white shadow-lg relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo Lockup */}
          <div className="flex items-center space-x-3 cursor-pointer hover:opacity-90 transition">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <svg className="w-8 h-8 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none">{t.title}</h1>
              <p className="text-[11px] uppercase tracking-widest text-emerald-300 mt-1 font-semibold opacity-90">Enterprise Edition</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Language Toggle */}
            <div className="hidden md:flex bg-emerald-900 rounded-lg p-1 shadow-inner border border-emerald-700">
              <button onClick={() => setLang('en')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${lang === 'en' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-300 hover:text-white'}`}>ENG</button>
              <button onClick={() => setLang('kn')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${lang === 'kn' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-300 hover:text-white'}`}>Kannada</button>
            </div>

            {/* Notification Bell */}
            <button className="text-emerald-200 hover:text-white transition relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-emerald-800"></span>
            </button>

            {/* Interactive Profile Dropdown */}
            <div className="relative">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center space-x-3 focus:outline-none bg-emerald-700 hover:bg-emerald-600 px-3 py-2 rounded-xl transition border border-emerald-600">
                <div className="w-9 h-9 rounded-full bg-emerald-500 border border-emerald-300 flex items-center justify-center text-white font-bold shadow-sm">
                  {farmerName ? farmerName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-white leading-none">{farmerName}</p>
                  <p className="text-xs text-emerald-200 mt-1">Admin Account</p>
                </div>
                <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
              
              {/* Dropdown Menu Panel */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl py-2 border border-gray-100 z-50 transform origin-top-right transition-all">
                  <div className="px-4 py-3 border-b border-gray-100 mb-1 bg-gray-50 rounded-t-xl">
                     <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Signed in as</p>
                     <p className="text-sm font-bold text-gray-800 truncate mt-1">{farmerName}</p>
                  </div>
                  <button className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition">
                    <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    Account Settings
                  </button>
                  <button className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition">
                    <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                    Subscription & Billing
                  </button>
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button onClick={() => { setIsAuthenticated(false); setShowProfileMenu(false); }} className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium transition">
                      <svg className="w-4 h-4 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                      Secure Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* --- UPGRADED: "BIG THUMB" SUB-NAVIGATION TABS --- */}
      <div className="bg-white border-b border-gray-200 shadow-sm relative z-10 overflow-x-auto no-scrollbar">
        {/* min-w-max and flex-nowrap allows horizontal swiping on small screens */}
        <div className="flex flex-nowrap p-2 sm:p-0 sm:justify-start max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 space-x-2 sm:space-x-8">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`min-w-max flex-1 sm:flex-none py-4 px-6 font-black text-sm md:text-base rounded-xl sm:rounded-none sm:border-b-4 transition-all h-14 flex items-center justify-center ${
              activeTab === 'dashboard' ? 'bg-emerald-100 sm:bg-transparent border-emerald-600 text-emerald-900' : 'bg-gray-50 sm:bg-transparent border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t?.tabDashboard || "Dashboard"}
          </button>
          
          <button 
            onClick={() => setActiveTab('lifecycle')} 
            className={`min-w-max flex-1 sm:flex-none py-4 px-6 font-black text-sm md:text-base rounded-xl sm:rounded-none sm:border-b-4 transition-all h-14 flex items-center justify-center ${
              activeTab === 'lifecycle' ? 'bg-emerald-100 sm:bg-transparent border-emerald-600 text-emerald-900' : 'bg-gray-50 sm:bg-transparent border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t?.tabLifecycle || "Lifecycle"}
          </button>
          
          <button 
            onClick={() => setActiveTab('community')} 
            className={`min-w-max flex-1 sm:flex-none py-4 px-6 font-black text-sm md:text-base rounded-xl sm:rounded-none sm:border-b-4 transition-all h-14 flex items-center justify-center ${
              activeTab === 'community' ? 'bg-emerald-100 sm:bg-transparent border-emerald-600 text-emerald-900' : 'bg-gray-50 sm:bg-transparent border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Community
          </button>

          <button 
            onClick={() => setActiveTab('weather')} 
            className={`min-w-max flex-1 sm:flex-none py-4 px-6 font-black text-sm md:text-base rounded-xl sm:rounded-none sm:border-b-4 transition-all h-14 flex items-center justify-center ${
              activeTab === 'weather' ? 'bg-emerald-100 sm:bg-transparent border-emerald-600 text-emerald-900' : 'bg-gray-50 sm:bg-transparent border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t?.tabWeather || "Weather"}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* --- SPRINT 2: PRIORITY ALERT STACK --- */}
        <div className="mb-4 space-y-3">
          {activeAlerts.filter(a => !a.snoozed).map((alert) => (
            <div 
              key={alert.id} 
              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl shadow-lg border-2 transition-all ${
                alert.tier === 1 
                  ? 'bg-red-600 border-red-800 text-white' // Tier 1: Bold Red
                  : 'bg-yellow-400 border-yellow-600 text-black' // Tier 2: High Contrast Yellow
              }`}
            >
              <div className="flex items-center mb-3 sm:mb-0">
                {/* Micro-interaction: Only pulse on Tier 1 Danger */}
                <div className={`p-2 rounded-full mr-4 flex-shrink-0 ${alert.tier === 1 ? 'bg-red-800 animate-pulse' : 'bg-yellow-600'}`}>
                  {alert.tier === 1 ? (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  ) : (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-wide">{alert.title}</h3>
                  <p className={`text-lg font-bold mt-1 ${alert.tier === 1 ? 'text-red-100' : 'text-yellow-900'}`}>{alert.message}</p>
                </div>
              </div>
              
              {/* Massive "Rough-Use" Snooze Button */}
              <button 
                onClick={() => handleSnooze(alert.id)}
                className={`w-full sm:w-auto h-14 px-8 rounded-xl font-black text-lg transition-transform active:scale-95 flex-shrink-0 ${
                  alert.tier === 1 
                    ? 'bg-white text-red-700 hover:bg-red-50' 
                    : 'bg-black text-yellow-400 hover:bg-gray-900'
                }`}
              >
                SNOOZE
              </button>
            </div>
          ))}
        </div>

        {/* --- SPRINT 1: ACTION-FIRST, FARMER-PROOF DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className={isFieldMode ? "bg-white text-black p-2" : "bg-transparent"}>
            
            {/* Field Mode Toggle & Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-black ${isFieldMode ? 'text-black text-3xl' : 'text-gray-800'}`}>
                {isFieldMode ? "TODAY'S PLAN" : "Farm Overview"}
              </h2>
              <button 
                onClick={() => setIsFieldMode(!isFieldMode)}
                className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all shadow-sm border-2 ${
                  isFieldMode 
                    ? 'bg-black text-yellow-400 border-black text-lg w-full max-w-xs justify-center' 
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                {isFieldMode ? "EXIT FIELD MODE" : "Enable Field Mode (Sunlight)"}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* --- THE NEW ACTION ENGINE (Takes up the whole top section in Mobile/Field Mode) --- */}
              <div className={`lg:col-span-12 ${isFieldMode ? 'mb-4' : 'mb-8'}`}>
                {insight ? (
                  <div className={`${
                    isFieldMode 
                      ? 'bg-yellow-400 border-4 border-black p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' 
                      : 'bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-xl'
                  }`}>
                    <div className="flex flex-col md:flex-row justify-between md:items-center">
                      <div className="mb-4 md:mb-0">
                        <p className={`font-bold uppercase tracking-widest mb-2 ${isFieldMode ? 'text-black text-xl' : 'text-emerald-200 text-sm'}`}>
                          Highest Priority Action
                        </p>
                        <h1 className={`font-black leading-tight ${isFieldMode ? 'text-black text-4xl md:text-5xl' : 'text-white text-3xl md:text-4xl'}`}>
                          {insight.top_action || insight.crop_condition.split('.')[0]}
                        </h1>
                      </div>
                      
                      {/* Explainability Layer */}
                      <div className={`p-4 md:w-1/3 ${isFieldMode ? 'bg-white border-2 border-black text-black' : 'bg-black/20 backdrop-blur-md rounded-2xl text-emerald-50'}`}>
                        <div className="mb-2">
                          <span className="text-xs uppercase font-bold opacity-80 block mb-1">Reason:</span>
                          <span className={`font-semibold ${isFieldMode ? 'text-lg' : 'text-sm'}`}>{insight.reason || "Based on latest soil and weather patterns."}</span>
                        </div>
                        <div className="flex items-center mt-3 pt-3 border-t border-current/20">
                          <span className="text-xs uppercase font-bold opacity-80 mr-2">AI Confidence:</span>
                          <span className={`px-2 py-0.5 text-xs font-black uppercase rounded ${
                            insight.confidence_level === 'High' ? 'bg-green-500 text-white' : 
                            insight.confidence_level === 'Medium' ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
                          }`}>
                            {insight.confidence_level || "High"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`${isFieldMode ? 'bg-gray-200 border-4 border-black p-10 text-center' : 'bg-gray-50 border-2 border-dashed border-gray-300 p-12 rounded-3xl flex flex-col items-center justify-center'}`}>
                    <svg className={`w-16 h-16 mb-4 ${isFieldMode ? 'text-black' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    <p className={`font-black ${isFieldMode ? 'text-2xl text-black' : 'text-xl text-gray-600'}`}>Awaiting Sensor Sync</p>
                    <p className={`${isFieldMode ? 'text-lg text-black font-bold mt-2' : 'text-sm text-gray-500 mt-1'}`}>Submit reading to generate action plan.</p>
                  </div>
                )}
              </div>

              {/* --- DATA INPUT & RAW METRICS (Hidden behind toggle to reduce cognitive load) --- */}
              <div className="lg:col-span-12 flex justify-center mb-6">
                <button 
                  onClick={() => setShowRawData(!showRawData)}
                  className={`font-bold px-8 py-4 w-full md:w-auto transition-all ${
                    isFieldMode 
                      ? 'bg-black text-white text-xl border-4 border-black hover:bg-gray-800' 
                      : 'bg-white text-emerald-700 border-2 border-emerald-200 rounded-full hover:bg-emerald-50 shadow-sm'
                  }`}
                >
                  {showRawData ? "Hide Raw Data & Input Form" : "View Raw Data & Update Sensors"}
                </button>
              </div>

              {showRawData && (
                 <>
                   <div className={`lg:col-span-5 ${isFieldMode ? 'border-4 border-black bg-white p-4' : ''}`}>
                      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                        <form onSubmit={handleSubmit} className="space-y-5">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">{t.nodeSelect}</label>
                            <select name="node_id" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none transition shadow-sm">
                              <option value="1">Node 1 (North-West)</option>
                              <option value="2">Node 2 (North-East)</option>
                              <option value="3">Node 3 (Center)</option>
                              <option value="4">Node 4 (South-West)</option>
                              <option value="5">Node 5 (South-East)</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div><label className="text-xs font-semibold text-gray-600">{t.n}</label><input required type="number" step="0.1" name="nitrogen" defaultValue="45.5" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 mt-1 shadow-sm" /></div>
                            <div><label className="text-xs font-semibold text-gray-600">{t.p}</label><input required type="number" step="0.1" name="phosphorus" defaultValue="20.1" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 mt-1 shadow-sm" /></div>
                            <div><label className="text-xs font-semibold text-gray-600">{t.k}</label><input required type="number" step="0.1" name="potassium" defaultValue="30.2" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 mt-1 shadow-sm" /></div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div><label className="text-xs font-semibold text-gray-600">{t.moisture}</label><input required type="number" step="0.1" name="moisture" defaultValue="65.0" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 mt-1 shadow-sm" /></div>
                            <div><label className="text-xs font-semibold text-gray-600">{t.temp}</label><input required type="number" step="0.1" name="temperature" defaultValue="24.5" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 mt-1 shadow-sm" /></div>
                            <div><label className="text-xs font-semibold text-gray-600">{t.ec}</label><input required type="number" step="0.1" name="ec" defaultValue="1.2" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 mt-1 shadow-sm" /></div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">{t.upload}</label>
                            <input required type="file" name="image" accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-gray-300 rounded-lg p-2 bg-gray-50" />
                          </div>

                          {/* --- NEW: VOICE-ENABLED SYMPTOM INPUT --- */}
                          <div className="md:col-span-2 mt-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                            <label className="block text-sm font-semibold text-emerald-800 mb-2 flex justify-between items-center">
                              <span>Describe Visual Symptoms</span>
                              
                              {/* The Microphone Button */}
                              <button
                                type="button"
                                onClick={handleListen}
                                className={`flex items-center text-xs px-3 py-1.5 rounded-full font-bold transition-all shadow-sm ${
                                  isListening 
                                    ? 'bg-red-500 text-white animate-pulse shadow-red-200' 
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                                }`}
                              >
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-2a5 5 0 01-10 0H3a7.001 7.001 0 006 6.93V17H6v2h8v-2h-3v-2.07z" clipRule="evenodd"></path></svg>
                                {isListening ? "Listening..." : "Tap to Speak"}
                              </button>
                            </label>
                            
                            <textarea
                              name="farmer_notes"
                              value={farmerNotes}
                              onChange={(e) => setFarmerNotes(e.target.value)}
                              className="w-full p-3 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-gray-700 placeholder-gray-400"
                              placeholder={lang === 'kn' ? "ನಿಮ್ಮ ಬೆಳೆಯ ಸಮಸ್ಯೆಗಳನ್ನು ಇಲ್ಲಿ ವಿವರಿಸಿ..." : "E.g., The leaves have brown spots and the stems are drooping..."}
                              rows="2"
                            ></textarea>
                          </div>

                          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all mt-4 disabled:opacity-70 flex justify-center items-center">
                            {loading ? (
                               <span className="flex items-center space-x-2">
                                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                 <span>{t.analyzing}</span>
                               </span>
                            ) : t.submit}
                          </button>
                        </form>
                      </div>
                   </div>
 
                   <div className={`lg:col-span-7 ${isFieldMode ? 'border-4 border-black bg-white p-4' : ''}`}>
                      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                        <h2 className="text-lg font-bold text-gray-800 mb-6">{t.history} {activeNode}</h2>
                        {chartData.length === 0 ? (
                          <p className="text-gray-400 text-center py-6">No data yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                            
                            {/* GRADIENT NPK CHART */}
                            <div className="h-80 w-full bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">NPK Levels (mg/kg)</h3>
                                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-semibold">Last 7 Days</span>
                              </div>
                              <ResponsiveContainer width="100%" height="85%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="colorN" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#D97706" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorK" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                  <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px' }}/>
                                  <Area type="monotone" dataKey="nitrogen" stroke="#059669" fillOpacity={1} fill="url(#colorN)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} name="N" />
                                  <Area type="monotone" dataKey="phosphorus" stroke="#D97706" fillOpacity={1} fill="url(#colorP)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} name="P" />
                                  <Area type="monotone" dataKey="potassium" stroke="#2563EB" fillOpacity={1} fill="url(#colorK)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} name="K" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>

                            {/* GRADIENT MOISTURE & TEMP CHART */}
                            <div className="h-80 w-full bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Moisture & Temp</h3>
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold">Environment</span>
                              </div>
                              <ResponsiveContainer width="100%" height="85%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                  <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px' }}/>
                                  <Area type="monotone" dataKey="moisture" stroke="#3B82F6" fillOpacity={1} fill="url(#colorMoisture)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} name="Moisture %" />
                                  <Area type="monotone" dataKey="temperature" stroke="#EF4444" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} name="Temp (C)" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>

                          </div>
                        )}
                      </div>
                   </div>

                   <div className={`lg:col-span-12 ${isFieldMode ? 'border-4 border-black bg-white p-4' : ''}`}>
                      {/* RIGHT COLUMN: AI Results (UPGRADED WITH HOVER EFFECTS & NEW EMPTY STATE) */}
                      <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col relative group">
                         
                         <div className="flex justify-between items-center mb-6">
                           <h2 className="text-xl font-bold text-gray-800 flex items-center">
                             <div className="bg-emerald-100 p-2 rounded-lg mr-3">
                               <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                             </div>
                             {t.aiReport}
                           </h2>
                           
                           {insight && !loading && (
                             <button onClick={handleDownloadPDF} className="flex items-center space-x-1 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg transition-all border border-gray-200 shadow-sm hover:shadow">
                               <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                               <span className="font-semibold">Export PDF</span>
                             </button>
                           )}
                         </div>
                         
                         {/* THE NEW BEAUTIFUL EMPTY STATE */}
                         {!insight && !loading && (
                           <div className="flex-grow flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-200 p-10 transition-all hover:border-emerald-300 hover:bg-emerald-50/50">
                             <div className="bg-white p-4 rounded-full shadow-sm mb-4 transform transition-transform group-hover:scale-110">
                               <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                             </div>
                             <p className="text-gray-600 font-bold text-lg text-center">{t.nodeSelect}</p>
                             <p className="text-sm text-gray-400 text-center mt-2 max-w-xs">Upload your sensor data and visual input to generate a localized AI diagnosis.</p>
                           </div>
                         )}

                         {/* We wrap the content in 'ai-report-content' so the PDF captures exactly this! */}
                         {insight && !loading && (
                           <div id="ai-report-content" className="space-y-4 p-2">
                             
                             {/* PDF Title Header (Invisible on website, visible on PDF) */}
                             <div className="hidden print:block mb-6 text-center border-b-2 border-emerald-600 pb-4">
                                <h1 className="text-2xl font-black text-emerald-800">Krushi Mitra - Official Farm Report</h1>
                                <p className="text-gray-500">Node ID: {activeNode} | Date: {new Date().toLocaleDateString()}</p>
                             </div>

                             <div className="bg-green-50 p-5 rounded-lg border border-green-100">
                               <h3 className="text-green-800 font-bold mb-1">{t.condition}</h3>
                               <p className="text-green-900 text-sm leading-relaxed">{insight.crop_condition}</p>
                             </div>
                             
                             <div className="bg-amber-50 p-5 rounded-lg border border-amber-100 relative group">
                               <div className="flex justify-between items-start mb-1">
                                 <h3 className="text-amber-800 font-bold">{t.precautions}</h3>
                                 
                                 {/* VOICE ASSISTANT BUTTON */}
                                 <button 
                                   onClick={() => handleSpeak(insight.precautions)} 
                                   className="text-amber-600 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 p-1.5 rounded-full transition"
                                   title="Read Aloud"
                                 >
                                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd"></path></svg>
                                 </button>
                               </div>
                               <p className="text-amber-900 text-sm leading-relaxed">{insight.precautions}</p>
                             </div>
                             
                             <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                               <h3 className="text-blue-800 font-bold mb-1">{t.conclusion}</h3>
                               <p className="text-blue-900 text-sm leading-relaxed">{insight.overall_conclusion}</p>
                             </div>

                             {/* --- NEW: PREDICTIVE FINANCIAL SIMULATION CARD --- */}
                             {insight.financial_simulation && (
                               <div className="mt-6 border-t border-gray-100 pt-6">
                                 <h3 className="text-lg font-black text-gray-800 flex items-center mb-4">
                                   <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                                   Predictive ROI & Yield Simulation
                                 </h3>
                                 
                                 <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                                   {/* Decorative background circle */}
                                   <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-5"></div>
                                   
                                   <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-1">Recommended Investment</p>
                                   <p className="text-xl font-bold mb-6">{insight.financial_simulation.action_required}</p>
                                   
                                   <div className="grid grid-cols-3 gap-4 mb-6">
                                     <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                                       <p className="text-xs text-indigo-200 uppercase mb-1">Est. Cost</p>
                                       <p className="text-2xl font-black text-red-400">₹{insight.financial_simulation.estimated_cost_inr}</p>
                                     </div>
                                     
                                     <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                                       <p className="text-xs text-indigo-200 uppercase mb-1">Yield Impact</p>
                                       <p className="text-2xl font-black text-blue-400">+{insight.financial_simulation.yield_increase_pct}%</p>
                                     </div>
                                     
                                     <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 border-b-4 border-b-emerald-400">
                                       <p className="text-xs text-indigo-200 uppercase mb-1">Net Profit</p>
                                       <p className="text-2xl font-black text-emerald-400">₹{insight.financial_simulation.estimated_profit_inr}</p>
                                     </div>
                                   </div>
                                   
                                   <div className="flex items-start bg-indigo-800/50 p-3 rounded-lg border border-indigo-500/30">
                                     <svg className="w-5 h-5 text-indigo-300 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                     <p className="text-sm text-indigo-100 leading-relaxed">{insight.financial_simulation.roi_explanation}</p>
                                   </div>
                                 </div>
                               </div>
                             )}

                             {/* --- NEW: GOVERNMENT SCHEMES & SUBSIDIES --- */}
                             {activeSchemes.length > 0 && (
                               <div className="mt-6 border-t border-gray-100 pt-6">
                                 <h3 className="text-lg font-black text-gray-800 flex items-center mb-4">
                                   <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                   Eligible Government Schemes
                                 </h3>
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   {activeSchemes.map((scheme, index) => (
                                     <div key={index} className="bg-white border border-orange-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                       <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                                       <h4 className="font-bold text-gray-800 mb-1 pr-6">{scheme.name}</h4>
                                       
                                       <p className="text-xs text-gray-500 mb-3 font-medium border-b border-gray-100 pb-2">
                                         <span className="text-orange-600 font-bold uppercase tracking-wider">Eligibility:</span> {scheme.eligibility}
                                       </p>
                                       
                                       <p className="text-sm text-gray-700 leading-relaxed mb-4">{scheme.benefit}</p>
                                       
                                       <a href={scheme.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-bold text-orange-600 hover:text-orange-800 transition-colors group-hover:underline">
                                         Apply / Learn More
                                         <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                       </a>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}

                             {/* --- NEW: LOCAL FERTILIZER MARKETPLACE --- */}
                             {marketProducts.length > 0 && (
                               <div className="mt-6 border-t border-gray-100 pt-6 mb-4">
                                 <div className="flex justify-between items-center mb-4">
                                   <h3 className="text-lg font-black text-gray-800 flex items-center">
                                     <svg className="w-5 h-5 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                     Local Vendor Availability
                                   </h3>
                                   <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2 py-1 rounded-full uppercase tracking-wider">In Stock Nearby</span>
                                 </div>
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   {marketProducts.map((item, index) => (
                                     <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-teal-400 hover:shadow-md transition-all group relative">
                                       
                                       <div className="flex justify-between items-start mb-2">
                                         <h4 className="font-bold text-gray-900 text-sm w-3/4 leading-tight">{item.product}</h4>
                                         <p className="font-black text-teal-700">₹{item.price}</p>
                                       </div>
                                       
                                       <p className="text-xs text-gray-500 mb-3">{item.unit}</p>
                                       
                                       <div className="bg-gray-50 p-2 rounded-lg mb-3 border border-gray-100">
                                         <p className="text-xs font-semibold text-gray-700 flex items-center">
                                           <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                           {item.vendor}
                                         </p>
                                         <p className="text-xs text-gray-500 mt-1 flex justify-between">
                                           <span className="flex items-center text-amber-500">
                                             <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                             {item.rating}
                                           </span>
                                           <span className="text-teal-600 font-medium">{item.distance}</span>
                                         </p>
                                       </div>
                                       
                                       <button className="w-full bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-700 font-bold py-2 rounded-lg transition-colors border border-teal-200 hover:border-teal-600 text-sm flex justify-center items-center">
                                         Contact Vendor
                                         <svg className="w-4 h-4 ml-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                       </button>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}
                           </div>
                         )}
                      </div>
                   </div>
                 </>
              )}

            </div>
          </div>
        )}
        {/* THE NEW ADVANCED MULTI-CROP TAB */}
        {activeTab === 'lifecycle' && (
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              Active Plantations Overview
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Registration Form */}
              <div className="lg:col-span-1 bg-gray-50 p-6 rounded-xl border border-gray-200 h-fit">
                <h3 className="text-lg font-bold text-gray-700 mb-4">Start Tracking New Crop</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const data = Object.fromEntries(new FormData(e.target));
                  await startCropCycle(data);
                  await loadChart(activeNode); // Refresh the list
                  e.target.reset();
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600">Select Node</label>
                    <select name="node_id" className="w-full mt-1 p-2 border rounded-md">
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>Node {n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600">Crop Type</label>
                    <input required name="crop_name" type="text" placeholder="e.g., Tomato, Sugarcane" className="w-full mt-1 p-2 border rounded-md" />
                  </div>
                  <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 rounded-md hover:bg-green-700 transition">Plant Crop</button>
                </form>
              </div>

              {/* Grid of All Active Crops */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {allCrops.length === 0 ? (
                  <div className="col-span-2 text-center text-gray-500 py-10">No active crops tracked. Register one to the left.</div>
                ) : (
                  allCrops.map((crop) => (
                    <div key={crop.node_id} className="bg-white border border-green-100 rounded-xl p-5 shadow-sm hover:shadow-md transition relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
                      <p className="text-xs text-green-600 font-bold tracking-wider uppercase mb-1">Node {crop.node_id}</p>
                      <h4 className="text-2xl font-black text-gray-800 mb-1">{crop.crop_name}</h4>
                      
                      <div className="flex justify-between items-end mt-4 mb-2">
                        <div>
                          <p className="text-sm text-gray-500">Auto-Stage:</p>
                          <p className="font-bold text-green-700">{crop.stage}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-800">{crop.days_active}</p>
                          <p className="text-xs text-gray-500 uppercase">Days Old</p>
                        </div>
                      </div>

                      {/* Automated Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${crop.progress}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-right">Planted: {crop.planting_date}</p>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        )}

        {/* THE NEW LIVE WEATHER TAB */}
        {activeTab === 'weather' && (
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
              Meteorological Integration
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 flex flex-col items-center justify-center text-center">
                <p className="text-blue-800 font-semibold mb-2 uppercase tracking-wide text-xs">Current Outside Temp</p>
                <div className="text-4xl font-black text-blue-600">Live</div>
                <p className="text-sm text-blue-700 mt-2">Fetched via Open-Meteo Satellite</p>
              </div>

              <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 rounded-xl border border-slate-600 flex flex-col items-center justify-center text-center">
                <p className="text-slate-300 font-semibold mb-2 uppercase tracking-wide text-xs">Expected Rainfall (24h)</p>
                <div className="text-4xl font-black text-white">Predictive</div>
                <p className="text-sm text-slate-400 mt-2">Informing Irrigation AI</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 flex flex-col items-center justify-center text-center">
                <p className="text-orange-800 font-semibold mb-2 uppercase tracking-wide text-xs">Tomorrow's High</p>
                <div className="text-4xl font-black text-orange-600">Forecast</div>
                <p className="text-sm text-orange-700 mt-2">Informing Crop Stress AI</p>
              </div>

            </div>
            
            <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-600">
              <strong>System Note:</strong> The Gemini AI Engine is now actively monitoring local weather patterns. If heavy rain is forecast for your registered village, the AI will automatically suspend irrigation recommendations in your daily guidance plan to prevent root rot and conserve water.
            </div>
          </div>
        )}

        {/* THE NEW COMMUNITY HUB TAB */}
        {activeTab === 'community' && (
          <div className="bg-transparent">
            
            {/* Header Area */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-800 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
                  Farmer Knowledge Network
                </h2>
                <p className="text-gray-500 text-sm mt-1">Share diagnoses and learn from local outbreaks.</p>
              </div>
              
              {/* Button to Share Current AI Insight */}
              {insight && (
                <button 
                  onClick={async () => {
                    const postData = {
                      farmer_name: farmerName,
                      crop_name: activeSchemes.length > 0 && activeSchemes[0].eligibility.includes('Tomato') ? 'Tomato' : 'Current Crop', // Simplified for prototype
                      issue_description: insight.crop_condition,
                      ai_solution: insight.precautions
                    };
                    await createCommunityPost(postData);
                    const freshPosts = await getCommunityPosts();
                    setCommunityPosts(freshPosts);
                    alert("Shared to the community!");
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md transition font-bold text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                  Share My Latest Report
                </button>
              )}
            </div>

            {/* The Feed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {communityPosts.length === 0 ? (
                <div className="col-span-2 bg-white p-10 rounded-xl border border-gray-200 text-center text-gray-500">
                  No community posts yet. Be the first to share an insight!
                </div>
              ) : (
                communityPosts.map((post) => (
                  <div key={post.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-lg">
                          {post.farmer_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{post.farmer_name}</p>
                          <p className="text-xs text-gray-400">{post.time_ago} • {post.crop_name}</p>
                        </div>
                      </div>
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold border border-gray-200">
                        {post.crop_name}
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-1">Observed Issue</h4>
                      <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">{post.issue_description}</p>
                    </div>

                    {post.ai_solution && (
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                          AI Recommended Solution
                        </h4>
                        <p className="text-emerald-900 text-sm leading-relaxed bg-emerald-50 p-3 rounded-lg border border-emerald-100">{post.ai_solution}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 pt-3 border-t border-gray-50 mt-2">
                      <button className="flex items-center text-sm font-semibold text-gray-400 hover:text-indigo-600 transition">
                        <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.514"></path></svg>
                        Helpful ({post.likes})
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ENTERPRISE FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
               <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg>
               <span className="text-lg font-bold text-slate-200">Krushi Mitra</span>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} Krushi Mitra Agritech Systems. All rights reserved.</p>
            <p className="text-xs mt-1 text-slate-500">Version 2.4.0 (Secure Mode)</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
            <button className="hover:text-emerald-400 transition">Help Center & Support</button>
            <button className="hover:text-emerald-400 transition">API Documentation</button>
            <button className="hover:text-emerald-400 transition">Privacy Policy</button>
            <button className="hover:text-emerald-400 transition">Terms of Service</button>
          </div>
        </div>
      </footer>
      
    </div>
  );
}
