import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateEmpatheticResponse, generateSpeech, transcribeAudio } from './services/geminiService';
import { ChatMessage, Emotion, FusedEmotion } from './types';
import { useMediaStream } from './hooks/useMediaStream';
import ConsentModal from './components/ConsentModal';
import Header from './components/Header';
import SessionControl from './components/SessionControl';
import VideoFeed from './components/VideoFeed';
import EmotionDisplay from './components/EmotionDisplay';
import ChatPanel from './components/ChatPanel';
import { decode, decodeAudioData, blobToBase64 } from './utils/audioUtils';

// Mock emotion detection
const mockEmotions: Emotion[] = ['Happy', 'Sad', 'Neutral', 'Angry', 'Surprised', 'Calm'];

const App: React.FC = () => {
  const [consentGiven, setConsentGiven] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [facialEmotion, setFacialEmotion] = useState<Emotion>('Neutral');
  const [vocalEmotion, setVocalEmotion] = useState<Emotion>('Neutral');
  const [fusedEmotion, setFusedEmotion] = useState<FusedEmotion>('Neutral');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { stream, startStream, stopStream, error } = useMediaStream();

  const handleConsent = () => {
    setConsentGiven(true);
  };

  const toggleSession = () => {
    if (isSessionActive) {
      stopStream();
      setIsSessionActive(false);
    } else {
      startStream({ video: true, audio: true });
      setIsSessionActive(true);
    }
  };

  const updateFusedEmotion = useCallback(() => {
    // Simple fusion logic: prioritize stronger emotions
    if (facialEmotion === 'Angry' || vocalEmotion === 'Angry') setFusedEmotion('Angry');
    else if (facialEmotion === 'Sad' || vocalEmotion === 'Sad') setFusedEmotion('Sad');
    else if (facialEmotion === 'Happy' || vocalEmotion === 'Happy') setFusedEmotion('Happy');
    else if (facialEmotion === 'Surprised' || vocalEmotion === 'Surprised') setFusedEmotion('Surprised');
    else setFusedEmotion('Neutral');
  }, [facialEmotion, vocalEmotion]);

  useEffect(() => {
    updateFusedEmotion();
  }, [facialEmotion, vocalEmotion, updateFusedEmotion]);

  // Mock emotion detection simulation
  useEffect(() => {
    let intervalId: number | undefined;
    if (isSessionActive) {
      intervalId = window.setInterval(() => {
        setFacialEmotion(mockEmotions[Math.floor(Math.random() * mockEmotions.length)]);
        setVocalEmotion(mockEmotions[Math.floor(Math.random() * mockEmotions.length)]);
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSessionActive]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isGenerating) return;
  
    const userMessage: ChatMessage = { sender: 'user', text };
    setChatHistory(prev => [...prev, userMessage]);
    setIsGenerating(true);
  
    try {
      const aiTextResponse = await generateEmpatheticResponse(text, fusedEmotion);
      const aiMessage: ChatMessage = { sender: 'ai', text: aiTextResponse };
      setChatHistory(prev => [...prev, aiMessage]);
      
      setIsLoadingAudio(true);
      const audioData = await generateSpeech(aiTextResponse);
      if (audioData) {
        playAudio(audioData);
      }
    } catch (err) {
      console.error("Error processing message:", err);
      const errorMessage: ChatMessage = {
        sender: 'ai',
        text: "Sorry, I encountered an error. Please try again."
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setIsLoadingAudio(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } else {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsRecording(true);
        audioChunksRef.current = [];

        const recorder = new MediaRecorder(audioStream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          audioStream.getTracks().forEach(track => track.stop());
          setIsRecording(false);

          if (audioBlob.size === 0) return;

          setIsGenerating(true);
          try {
            const audioBase64 = await blobToBase64(audioBlob);
            const transcribedText = await transcribeAudio(audioBase64, mimeType);

            if (transcribedText && transcribedText.trim()) {
              await handleSendMessage(transcribedText);
            } else {
              throw new Error("Transcription failed or returned empty.");
            }
          } catch (err) {
            console.error("Error processing audio input:", err);
            const errorMessage: ChatMessage = { sender: 'ai', text: "Sorry, I had trouble understanding your audio. Please try again." };
            setChatHistory(prev => [...prev, errorMessage]);
            setIsGenerating(false);
          }
        };

        recorder.start();
      } catch (err) {
        console.error("Error starting recording:", err);
        // This assumes 'error' is a state setter from a useState hook, which is present in the component.
        // If not, you'd need to add: const [error, setError] = useState<string | null>(null);
        // But since useMediaStream provides it, we can re-use it.
      }
    }
  };

  const playAudio = async (base64Audio: string) => {
    try {
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(
            decode(base64Audio),
            outputAudioContext,
            24000,
            1,
        );
        const source = outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputAudioContext.destination);
        source.start();
    } catch (e) {
        console.error("Error playing audio: ", e);
    }
  };

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

  if (!consentGiven) {
    return <ConsentModal onConsent={handleConsent} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col font-sans">
      <Header />
      <main className="flex-grow p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Left Column: Video and Emotion */}
        <div className="lg:col-span-1 flex flex-col gap-4 lg:gap-6">
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg flex flex-col flex-grow">
            <h2 className="text-xl font-bold mb-3 text-cyan-400">Live Session</h2>
            <div className="relative aspect-video bg-black rounded-md overflow-hidden mb-4">
              <VideoFeed stream={stream} ref={videoRef} />
              {!isSessionActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <p className="text-gray-400">Camera is off</p>
                </div>
              )}
            </div>
            <SessionControl isActive={isSessionActive} onToggle={toggleSession} />
            {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
          </div>
          <EmotionDisplay 
            facialEmotion={facialEmotion} 
            vocalEmotion={vocalEmotion} 
            fusedEmotion={fusedEmotion}
            isActive={isSessionActive}
          />
        </div>

        {/* Right Column: Chat */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg shadow-lg flex flex-col h-[85vh] lg:h-auto">
          <ChatPanel 
            history={chatHistory}
            onSendMessage={handleSendMessage}
            isGenerating={isGenerating}
            isLoadingAudio={isLoadingAudio}
            onExport={exportLog}
            isRecording={isRecording}
            onToggleRecording={handleToggleRecording}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
