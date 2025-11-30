import React, { useState, useRef, Suspense } from 'react';
import { Activity, Wind, Mountain, Droplets, Zap, Globe, Cpu, MapPin } from 'lucide-react';
import HoloEarth from './components/HoloEarth';
import InfoPanel from './components/InfoPanel';
import HandTracker, { HandData } from './components/HandTracker';
import { fetchEarthData, analyzeLocation } from './services/geminiService';
import { EarthCategory, LocationData } from './types';

const App: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>(EarthCategory.GEOLOGY);
  const [fact, setFact] = useState<string>("System Initialized. Select a planetary sector to begin analysis, or click on the globe to scan a region.");
  const [sources, setSources] = useState<{ uri: string; title: string }[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState("Standby");
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  
  // Hand tracking data ref (Avoids re-renders for high freq data)
  const handDataRef = useRef<HandData>({ x: 0.5, y: 0.5, active: false });

  const handleCategorySelect = async (category: EarthCategory) => {
    setActiveCategory(category);
    setSelectedLocation(null); // Deselect location when changing category
    setLoading(true);
    setFact(""); 
    setSources(undefined);
    
    const data = await fetchEarthData(category);
    setFact(data.text);
    setSources(data.sources);
    setLoading(false);
  };

  const handleLocationSelect = async (lat: number, lon: number) => {
    setSelectedLocation({ lat, lon });
    setActiveCategory("COORDINATE SCAN");
    setLoading(true);
    setFact("");
    setSources(undefined);

    const data = await analyzeLocation(lat, lon);
    setFact(data.text);
    setSources(data.sources);
    setLoading(false);
  };

  const menuItems = [
    { id: EarthCategory.ATMOSPHERE, icon: Wind, label: 'Atmosphere' },
    { id: EarthCategory.OCEANOGRAPHY, icon: Droplets, label: 'Hydrosphere' },
    { id: EarthCategory.GEOLOGY, icon: Mountain, label: 'Geosphere' },
    { id: EarthCategory.ECOLOGY, icon: Activity, label: 'Biosphere' },
    { id: EarthCategory.HUMAN_IMPACT, icon: Zap, label: 'Anthroposphere' },
  ];

  return (
    <div className="relative w-full h-screen overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* 3D Background - Now on Z-0, App background removed */}
      <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center text-cyan-500">INITIALIZING SATELLITE UPLINK...</div>}>
        <HoloEarth 
            handDataRef={handDataRef} 
            onLocationSelect={handleLocationSelect}
            selectedLocation={selectedLocation}
        />
      </Suspense>

      {/* Grid Overlay Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] z-0"></div>

      {/* Main UI Layout */}
      <main className="absolute inset-0 z-10 flex flex-col md:flex-row p-4 md:p-8 pointer-events-none">
        
        {/* Header / Top Bar */}
        <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-auto">
          <div className="flex items-center gap-3">
             <div className="p-2 border border-cyan-500 rounded-md bg-cyan-900/20 backdrop-blur-md">
                <Globe className="text-cyan-400 w-8 h-8 animate-pulse" />
             </div>
             <div>
                <h1 className="text-3xl font-holo text-cyan-50 tracking-widest drop-shadow-md">HOLO<span className="text-cyan-400">EARTH</span></h1>
                <p className="text-xs text-cyan-600 font-mono tracking-widest">REAL-TIME PLANETARY INTERFACE v2.0</p>
             </div>
          </div>
          <div className="hidden md:block text-right">
             <div className="text-xs font-mono text-cyan-700">SYS_STATUS</div>
             <div className={`text-sm font-bold ${systemStatus.includes("Online") ? "text-green-400" : "text-amber-400"}`}>
               {systemStatus}
             </div>
             {selectedLocation && (
                <div className="mt-1 text-xs font-mono text-cyan-400 animate-pulse">
                    LAT: {selectedLocation.lat.toFixed(2)} | LON: {selectedLocation.lon.toFixed(2)}
                </div>
             )}
          </div>
        </header>

        {/* Sidebar Navigation */}
        <nav className="mt-24 md:mt-32 w-full md:w-24 flex md:flex-col gap-4 pointer-events-auto z-20 overflow-x-auto md:overflow-visible pb-4 md:pb-0 scrollbar-hide">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleCategorySelect(item.id)}
              className={`
                group relative flex items-center justify-center p-3 rounded-xl transition-all duration-300
                border border-transparent hover:border-cyan-500/50 hover:bg-cyan-900/20
                ${activeCategory === item.id ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.3)]' : 'bg-black/40'}
              `}
            >
              <item.icon 
                className={`w-6 h-6 transition-colors ${activeCategory === item.id ? 'text-white' : 'text-cyan-600 group-hover:text-cyan-300'}`} 
              />
              <span className="absolute left-full ml-4 bg-cyan-900/80 text-cyan-100 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap backdrop-blur-sm border border-cyan-500/30">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Center/Right Content Area */}
        <div className="flex-1 flex flex-col justify-end md:justify-center items-end pb-20 md:pb-0 md:pr-12 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-lg">
             <InfoPanel 
                title={activeCategory} 
                content={fact} 
                loading={loading}
                sources={sources}
             />
             
             {/* Interaction Hint */}
             <div className="mt-4 flex flex-col gap-2 bg-black/60 backdrop-blur border border-cyan-900/50 p-3 rounded-lg w-fit">
                <div className="flex items-center gap-3">
                    <Cpu className="w-4 h-4 text-cyan-500" />
                    <span className="text-xs text-cyan-400 font-mono">
                    HAND: PINCH & DRAG TO ROTATE
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-cyan-500" />
                    <span className="text-xs text-cyan-400 font-mono">
                    MOUSE: CLICK GLOBE TO SCAN WEATHER
                    </span>
                </div>
             </div>
          </div>
        </div>

      </main>

      {/* Vision Component (Hidden/Overlay) */}
      <HandTracker 
        handDataRef={handDataRef} 
        onStatusChange={setSystemStatus}
      />
    </div>
  );
};

export default App;