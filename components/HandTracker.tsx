import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, GestureRecognizer, DrawingUtils } from '@mediapipe/tasks-vision';

export interface HandData {
    x: number;
    y: number;
    active: boolean;
}

interface HandTrackerProps {
  handDataRef: React.MutableRefObject<HandData>;
  onStatusChange: (status: string) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ handDataRef, onStatusChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // FIX: Use Ref instead of State to avoid closure staleness in the RequestAnimationFrame loop
  const recognizerRef = useRef<GestureRecognizer | null>(null); 
  
  const [error, setError] = useState<string | null>(null);
  const [isAiReady, setIsAiReady] = useState(false);
  const [pinchDist, setPinchDist] = useState(0); // For debug UI
  const requestRef = useRef<number | null>(null);
  const lastVideoTime = useRef<number>(-1);

  // Smoothing variables
  const prevHand = useRef<{x: number, y: number}>({ x: 0.5, y: 0.5 });

  const stopCamera = useCallback(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = async () => {
    stopCamera();
    setError(null);
    onStatusChange("Acquiring Feed...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 320 },
          height: { ideal: 240 },
          frameRate: { ideal: 30 }
        } 
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise((resolve) => {
           if (!videoRef.current) return resolve(true);
           videoRef.current.onloadeddata = () => {
               resolve(true);
           };
        });
        
        onStatusChange("Feed Active. Loading AI...");
        // Start prediction loop immediately, checks for recognizerRef internally
        predictWebcam();
        return true;
      }
    } catch (err: any) {
      console.error("Camera Error:", err);
      let msg = "Camera Failure";
      if (err.name === 'NotReadableError') msg = "Camera Busy (Close other apps)";
      else if (err.name === 'NotAllowedError') msg = "Permission Denied";
      else if (err.name === 'NotFoundError') msg = "No Camera Found";
      
      setError(msg);
      onStatusChange("Camera Offline");
      return false;
    }
    return false;
  };

  const initAi = async () => {
    try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        // Store in ref so the loop sees it immediately
        recognizerRef.current = gestureRecognizer;
        setIsAiReady(true);
        onStatusChange("Systems Online");
    } catch (err) {
        console.error("AI Init Error:", err);
        onStatusChange("AI Module Failed");
    }
  };

  useEffect(() => {
    let isMounted = true;
    const bootstrap = async () => {
        const camSuccess = await startCamera();
        if (camSuccess && isMounted) {
            await initAi();
        }
    };
    bootstrap();
    return () => {
      isMounted = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const predictWebcam = () => {
    // Recursive loop
    requestRef.current = requestAnimationFrame(predictWebcam);

    if (videoRef.current && videoRef.current.readyState === 4 && canvasRef.current) {
        // Access ref directly
        if (recognizerRef.current) {
            const nowInMs = Date.now();
            if (videoRef.current.currentTime !== lastVideoTime.current) {
                lastVideoTime.current = videoRef.current.currentTime;
                
                try {
                    const results = recognizerRef.current.recognizeForVideo(videoRef.current, nowInMs);
                    
                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                        
                        canvasRef.current.width = videoRef.current.videoWidth;
                        canvasRef.current.height = videoRef.current.videoHeight;
                        
                        if (results.landmarks && results.landmarks.length > 0) {
                            const hand = results.landmarks[0];
                            const indexTip = hand[8];
                            const thumbTip = hand[4];
                            
                            // Calculate Pinch
                            const distance = Math.sqrt(
                                Math.pow(thumbTip.x - indexTip.x, 2) + 
                                Math.pow(thumbTip.y - indexTip.y, 2)
                            );
                            
                            // Update debug state occasionally (not every frame to save React renders)
                            if (Math.random() > 0.9) setPinchDist(distance);

                            // Tuned Threshold: 0.15 is forgiving enough for most hands
                            const isPinching = distance < 0.15; 
                            
                            // Draw Skeleton
                            const drawingUtils = new DrawingUtils(ctx);
                            
                            // Draw connectors
                            drawingUtils.drawConnectors(hand, GestureRecognizer.HAND_CONNECTIONS, {
                                color: isPinching ? "#00FF00" : "#00FFFF",
                                lineWidth: 4
                            });
                            
                            // Draw large contact points for thumb and index
                            ctx.fillStyle = isPinching ? "#00FF00" : "#FF0000";
                            [thumbTip, indexTip].forEach(pt => {
                                ctx.beginPath();
                                ctx.arc(pt.x * canvasRef.current!.width, pt.y * canvasRef.current!.height, 8, 0, 2 * Math.PI);
                                ctx.fill();
                            });

                            // Visual "Pinch Line"
                            ctx.beginPath();
                            ctx.moveTo(thumbTip.x * canvasRef.current.width, thumbTip.y * canvasRef.current.height);
                            ctx.lineTo(indexTip.x * canvasRef.current.width, indexTip.y * canvasRef.current.height);
                            ctx.strokeStyle = isPinching ? "#00FF00" : "rgba(255, 255, 255, 0.5)";
                            ctx.lineWidth = 2;
                            ctx.stroke();

                            // Smooth the input coordinates using Linear Interpolation (Lerp)
                            const rawX = 1 - indexTip.x; // Mirror X
                            const rawY = indexTip.y;
                            
                            // Lerp factor (0.2 = heavy smoothing for stability)
                            const alpha = 0.2; 
                            const smoothX = prevHand.current.x + (rawX - prevHand.current.x) * alpha;
                            const smoothY = prevHand.current.y + (rawY - prevHand.current.y) * alpha;
                            
                            prevHand.current = { x: smoothX, y: smoothY };

                            handDataRef.current = {
                                x: smoothX, 
                                y: smoothY,
                                active: isPinching
                            };
                            
                            onStatusChange(isPinching ? "GRIPPING (MOVE HAND)" : "HAND DETECTED");
                        } else {
                            handDataRef.current = { ...handDataRef.current, active: false };
                            onStatusChange("LOOKING FOR HAND...");
                        }
                    }

                } catch (e) {
                    console.error("Frame prediction error", e);
                }
            }
        }
    }
  };

  return (
    <div className="absolute bottom-4 left-4 z-50 pointer-events-auto opacity-95 border-2 border-cyan-500/50 bg-black/90 overflow-hidden rounded-xl w-52 h-40 flex flex-col items-center justify-center transition-all hover:opacity-100 shadow-[0_0_25px_rgba(0,255,255,0.3)]">
      
      <div className="relative w-full h-full">
          {/* Video Feed */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 mix-blend-screen ${error ? 'hidden' : 'block'}`}
          />
          {/* Canvas Overlay for Skeleton */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
          />
          
          {/* Pinch Strength Meter */}
          {!error && isAiReady && (
            <div className="absolute bottom-1 left-2 right-2 h-1 bg-gray-800 rounded overflow-hidden">
                <div 
                    className={`h-full transition-all duration-100 ${handDataRef.current.active ? 'bg-green-500' : 'bg-cyan-500'}`}
                    style={{ width: `${Math.max(0, Math.min(100, (1 - (pinchDist / 0.3)) * 100))}%` }}
                />
            </div>
          )}
      </div>

      {/* Loading Overlay */}
      {!error && !isAiReady && (
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <span className="text-[10px] text-cyan-400 font-holo animate-pulse tracking-widest">INITIALIZING AI...</span>
         </div>
      )}

      {/* Error / Manual Start UI */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/90 z-20">
            <p className="text-red-500 text-[10px] font-mono mb-3 font-bold">{error.toUpperCase()}</p>
            <button 
                onClick={() => startCamera()}
                className="px-4 py-2 bg-cyan-900/50 border border-cyan-500 text-cyan-300 text-xs rounded hover:bg-cyan-500/20 font-holo transition-colors"
            >
                RETRY CAMERA
            </button>
        </div>
      )}
    </div>
  );
};

export default HandTracker;