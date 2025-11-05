
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { startLiveSession, generateEmpatheticResponse, generateSpeech } from './services/geminiService';
import { ChatMessage, Emotion, FusedEmotion, Theme, TTSVoice } from './types';
import ApiKeyModal from './components/ApiKeyModal';
import ConsentModal from './components/ConsentModal';
import Header from './components/Header';
import SessionControl from './components/SessionControl';
import VideoFeed from './components/VideoFeed';
import EmotionDisplay from './components/EmotionDisplay';
import { decode, decodeAudioData, encode } from './utils/audioUtils';
import ChatPanel from './components/ChatPanel';
import { useMediaStream } from './hooks/useMediaStream';
import { LiveServerMessage, Blob as GenAI_Blob } from '@google/genai';

// High-quality voices available from the Gemini TTS API
const ttsVoices: TTSVoice[] = [
    { name: 'Kore (Calm, Female)', value: 'Kore' },
    { name: 'Stella (Clear, Female)', value: 'Stella' },
    { name: 'Nova (Bright, Female)', value: 'Nova' },
    { name: 'Puck (Youthful, Male)', value: 'Puck' },
    { name: 'Zephyr (Warm, Male)', value: 'Zephyr' },
    { name: 'Charon (Deep, Male)', value: 'Charon' },
    { name: 'Fenrir (Harsh, Male)', value: 'Fenrir' },
];

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
    faceapi?: any;
    webkitAudioContext: typeof AudioContext;
  }
}

declare const faceapi: any;

/**
 * Converts a Float32Array of PCM data to a Int16Array.
 * @param buffer The Float32Array of audio data (samples between -1.0 and 1.0).
 * @returns An Int16Array of the audio data.
 */
const float32ToInt16 = (buffer: Float32Array): Int16Array => {
    const int16 = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        const s = Math.max(-1, Math.min(1, buffer[i]));
        // Convert to 16-bit integer, handling the asymmetric range.
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
};

const App: React.FC = () => {
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [facialEmotion, setFacialEmotion] = useState<Emotion>('Neutral');
  const [vocalEmotion, setVocalEmotion] = useState<Emotion>('Neutral');
  const [fusedEmotion, setFusedEmotion] = useState<FusedEmotion>('Neutral');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [theme, setTheme] = useState<Theme>('dark');
  const [selectedVoice, setSelectedVoice] = useState<string>(ttsVoices[0].value);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const { stream, startStream, stopStream, error: streamError } = useMediaStream();
  
  const liveAudioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const liveAudioStreamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef(0);
  
  const isUserTurnActive = useRef(false);
  const isAiTurnActive = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
        if (sessionStorage.getItem('gemini-api-key')) {
            setApiKeySelected(true);
            return;
        }
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setApiKeySelected(hasKey);
        } else {
            // Not in AI Studio and no key in session storage
            setApiKeySelected(false);
        }
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    const loadModels = async () => {
        const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
            setModelsLoaded(true);
        } catch (error) {
            console.error("Error loading facial recognition models:", error);
            setMediaError("Could not load emotion detection models. Please refresh the page.");
        }
    };
    if (consentGiven && typeof faceapi !== 'undefined') {
        loadModels();
    }
  }, [consentGiven]);

  const handleApiError = (err: any, context: string) => {
    console.error(`Error in ${context}:`, err);
    const errorMessage = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
    if (errorMessage.includes("API key not valid") || errorMessage.includes("Requested entity was not found.")) {
        sessionStorage.removeItem('gemini-api-key'); // Clear invalid local key
        setApiKeySelected(false);
        setApiKeyError(true);
    }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleConsent = () => {
    setConsentGiven(true);
  };

  const toggleSession = () => {
    if (isSessionActive) {
      stopStream();
      setIsSessionActive(false);
    } else {
      startStream({ video: true, audio: false });
      setIsSessionActive(true);
    }
    setFacialEmotion('Neutral');
    setVocalEmotion('Neutral');
  };

  const updateFusedEmotion = useCallback(() => {
    if (facialEmotion === 'Angry' || vocalEmotion === 'Angry') setFusedEmotion('Angry');
    else if (facialEmotion === 'Sad' || vocalEmotion === 'Sad') setFusedEmotion('Sad');
    else if (facialEmotion === 'Happy' || vocalEmotion === 'Happy') setFusedEmotion('Happy');
    else if (facialEmotion === 'Surprised' || vocalEmotion === 'Surprised') setFusedEmotion('Surprised');
    else setFusedEmotion('Neutral');
  }, [facialEmotion, vocalEmotion]);

  useEffect(() => {
    updateFusedEmotion();
  }, [facialEmotion, vocalEmotion, updateFusedEmotion]);
  
  const stopAllAudio = useCallback(() => {
    liveAudioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    liveAudioSourcesRef.current.clear();
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isGenerating || isLiveActive) return;

    stopAllAudio();
    const userMessage: ChatMessage = { sender: 'user', text };
    const currentChatHistory = [...chatHistory, userMessage];
    setChatHistory([...currentChatHistory, { sender: 'ai', text: '...' }]);
    setIsGenerating(true);
    setInputText('');

    try {
        const aiText = await generateEmpatheticResponse(text, fusedEmotion, currentChatHistory);
        
        setChatHistory(prev => {
            const newHistory = [...prev];
            const lastMessage = newHistory[newHistory.length - 1];
            if (lastMessage.sender === 'ai') {
                lastMessage.text = aiText;
            }
            return newHistory;
        });
        
        setIsLoadingAudio(true);
        const audioData = await generateSpeech(aiText, selectedVoice);

        if (audioData) {
            if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
                outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
            const source = outputAudioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContextRef.current.destination);
            source.start();
        }

    } catch (err) {
        handleApiError(err, "generating empathetic response");
        setChatHistory(prev => prev.map(m => m.text === '...' ? { sender: 'ai', text: 'Sorry, an error occurred.' } : m));
    } finally {
        setIsGenerating(false);
        setIsLoadingAudio(false);
    }
  };

  const handleToggleLiveSession = useCallback(async () => {
    stopAllAudio();

    if (isLiveActive) {
      sessionPromiseRef.current?.then(session => session.close());
      return; // onclose callback will handle state updates
    }
    
    setMediaError(null);
    setIsLiveActive(true);

    const callbacks = {
        onopen: async () => {
          try {
            inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;
  
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            liveAudioStreamRef.current = stream;
  
            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const int16Data = float32ToInt16(inputData);
              const pcmBlob: GenAI_Blob = {
                data: encode(new Uint8Array(int16Data.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
  
            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          } catch(err) {
            console.error("Error initializing live session:", err);
            setMediaError("Could not start live session. Please check microphone permissions and refresh the page.");
            sessionPromiseRef.current?.then(session => session.close());
          }
        },
        onmessage: async (message: LiveServerMessage) => {
            // Handle User Input Transcription
            if (message.serverContent?.inputTranscription) {
                const textChunk = message.serverContent.inputTranscription.text;
                if (!isUserTurnActive.current) {
                    isUserTurnActive.current = true;
                    isAiTurnActive.current = false; // User speaking interrupts AI
                    setChatHistory(prev => [...prev, { sender: 'user', text: textChunk }]);
                } else {
                    setChatHistory(prev => {
                        const newHistory = [...prev];
                        const lastMessage = newHistory[newHistory.length - 1];
                        if (lastMessage && lastMessage.sender === 'user') {
                            lastMessage.text += textChunk;
                        }
                        return newHistory;
                    });
                }
            }

            // Handle AI Output Transcription
            if (message.serverContent?.outputTranscription) {
                const textChunk = message.serverContent.outputTranscription.text;
                if (!isAiTurnActive.current) {
                    isAiTurnActive.current = true;
                    isUserTurnActive.current = false; // AI speaking means user is done
                    setChatHistory(prev => [...prev, { sender: 'ai', text: textChunk }]);
                } else {
                    setChatHistory(prev => {
                        const newHistory = [...prev];
                        const lastMessage = newHistory[newHistory.length - 1];
                        if (lastMessage && lastMessage.sender === 'ai') {
                            lastMessage.text += textChunk;
                        }
                        return newHistory;
                    });
                }
            }
            
            if (message.serverContent?.turnComplete) {
                isUserTurnActive.current = false;
                isAiTurnActive.current = false;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContextRef.current.destination);
                source.onended = () => liveAudioSourcesRef.current.delete(source);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                liveAudioSourcesRef.current.add(source);
            }
        },
        onerror: (e: ErrorEvent) => {
          console.error("Live session error:", e);
          setMediaError("Live session connection error. Please try again.");
          setIsLiveActive(false);
        },
        onclose: () => {
          scriptProcessorRef.current?.disconnect();
          mediaStreamSourceRef.current?.disconnect();
          liveAudioStreamRef.current?.getTracks().forEach(track => track.stop());
          inputAudioContextRef.current?.close().catch(console.error);
          outputAudioContextRef.current?.close().catch(console.error);
          isUserTurnActive.current = false;
          isAiTurnActive.current = false;
          setIsLiveActive(false);
          sessionPromiseRef.current = null;
        },
    };

    try {
        sessionPromiseRef.current = startLiveSession(fusedEmotion, selectedVoice, callbacks);
    } catch(err) {
        handleApiError(err, "starting live session");
        setIsLiveActive(false);
    }
  }, [isLiveActive, fusedEmotion, selectedVoice, stopAllAudio]);

  const exportLog = () => {
    const logContent = chatHistory.map(msg => `[${msg.sender.toUpperCase()}] ${msg.text}`).join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-log-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const mapEmotion = (emotion: string): Emotion => {
      const emotionMap: { [key: string]: Emotion } = {
          happy: 'Happy',
          sad: 'Sad',
          angry: 'Angry',
          surprised: 'Surprised',
          neutral: 'Neutral',
      };
      return emotionMap[emotion] || 'Neutral';
  };

  useEffect(() => {
    let detectionInterval: number | null = null;
    if (isSessionActive && modelsLoaded && videoRef.current) {
        detectionInterval = window.setInterval(async () => {
            const video = videoRef.current;
            const canvas = overlayCanvasRef.current;
            if (!video || video.paused || video.ended || !canvas) return;

            const displaySize = { width: video.clientWidth, height: video.clientHeight };
            faceapi.matchDimensions(canvas, displaySize);
            const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 })).withFaceExpressions();
            
            const context = canvas.getContext('2d');
            if (!context) return;
            context.clearRect(0, 0, canvas.width, canvas.height);

            if (detections) {
                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                faceapi.draw.drawDetections(canvas, resizedDetections);
                faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
                const expressions = detections.expressions;
                const dominantEmotion = Object.keys(expressions).reduce((a, b) => (expressions as any)[a] > (expressions as any)[b] ? a : b);
                setFacialEmotion(mapEmotion(dominantEmotion));
            } else {
                setFacialEmotion('Neutral');
            }
        }, 200);
    }
    return () => {
        if (detectionInterval) clearInterval(detectionInterval);
        if (overlayCanvasRef.current) {
            overlayCanvasRef.current.getContext('2d')?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
    };
  }, [isSessionActive, modelsLoaded]);


  if (!apiKeySelected) {
    return <ApiKeyModal onKeyProvided={() => {
        setApiKeySelected(true);
        setApiKeyError(false);
    }} hadError={apiKeyError} />;
  }

  if (!consentGiven) {
    return <ConsentModal onConsent={handleConsent} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col font-sans">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className="flex-grow p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-1 flex flex-col gap-4 lg:gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg flex flex-col flex-grow">
            <h2 className="text-xl font-bold mb-3 text-cyan-600 dark:text-cyan-400">Live Session</h2>
            <div className="relative aspect-video bg-black rounded-md overflow-hidden mb-4">
              <VideoFeed stream={stream} ref={videoRef} />
              <canvas ref={overlayCanvasRef} className="absolute top-0 left-0" />
              {!isSessionActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-center p-4">
                  <p className="text-gray-500 dark:text-gray-400">Session is not active</p>
                </div>
              )}
            </div>
            <SessionControl 
              isActive={isSessionActive} 
              onToggle={toggleSession}
              disabled={!modelsLoaded && !isSessionActive}
            />
            {(mediaError || streamError) && <p className="text-red-500 mt-2 text-sm">{mediaError || streamError}</p>}
          </div>
          <EmotionDisplay 
            facialEmotion={facialEmotion} 
            vocalEmotion={vocalEmotion} 
            fusedEmotion={fusedEmotion}
            isActive={isSessionActive}
          />
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col h-[85vh] lg:h-auto">
          <ChatPanel 
            history={chatHistory}
            onSendMessage={handleSendMessage}
            isGenerating={isGenerating}
            isLoadingAudio={isLoadingAudio}
            onExport={exportLog}
            isLive={isLiveActive}
            onToggleLiveSession={handleToggleLiveSession}
            inputText={inputText}
            onInputChange={setInputText}
            voices={ttsVoices}
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            mediaError={mediaError}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
