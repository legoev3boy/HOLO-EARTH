import React from 'react';
import { ExternalLink } from 'lucide-react';

interface InfoPanelProps {
  title: string;
  content: string;
  loading: boolean;
  sources?: { uri: string; title: string }[];
}

const InfoPanel: React.FC<InfoPanelProps> = ({ title, content, loading, sources }) => {
  return (
    <div className="glass-panel p-6 rounded-tr-3xl rounded-bl-3xl max-w-md w-full relative overflow-hidden group transition-all duration-300 hover:bg-opacity-80 flex flex-col max-h-[80vh]">
      {/* Decorative HUD Lines */}
      <div className="absolute top-0 left-0 w-16 h-[2px] bg-cyan-400"></div>
      <div className="absolute top-0 right-0 w-[2px] h-8 bg-cyan-400"></div>
      <div className="absolute bottom-0 right-0 w-16 h-[2px] bg-cyan-400"></div>
      <div className="absolute bottom-0 left-0 w-[2px] h-8 bg-cyan-400"></div>

      <div className="flex items-center justify-between mb-4 border-b border-cyan-500/30 pb-2 shrink-0">
        <h2 className="text-2xl font-holo text-cyan-300 tracking-wider uppercase drop-shadow-[0_0_5px_rgba(0,255,255,0.8)] truncate pr-2">
          {title}
        </h2>
        <div className="flex space-x-1 shrink-0">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
            <div className="w-2 h-2 bg-cyan-800 rounded-full"></div>
            <div className="w-2 h-2 bg-cyan-900 rounded-full"></div>
        </div>
      </div>

      <div className="relative overflow-y-auto pr-2 custom-scrollbar grow">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
             <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-cyan-600 text-sm animate-pulse font-mono">SCANNING SECTOR...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-cyan-100/90 leading-relaxed font-light text-lg tracking-wide shadow-black drop-shadow-md whitespace-pre-wrap">
              {content}
            </p>
            
            {sources && sources.length > 0 && (
              <div className="border-t border-cyan-500/20 pt-3 mt-4">
                <p className="text-[10px] text-cyan-500 uppercase font-mono mb-2 tracking-widest">Data Sources</p>
                <ul className="space-y-1">
                  {sources.map((source, index) => (
                    <li key={index}>
                      <a 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-xs text-cyan-400 hover:text-white transition-colors truncate"
                      >
                        <ExternalLink className="w-3 h-3 mr-1 inline" />
                        <span className="truncate">{source.title || source.uri}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-2 flex justify-between items-center text-xs text-cyan-600 font-mono shrink-0">
        <span>DATA_SRC: GEMINI_CORE_V2.5</span>
        <span>LIVE_FEED</span>
      </div>
    </div>
  );
};

export default InfoPanel;