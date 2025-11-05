
import { GoogleGenAI, Modality, Content, LiveServerMessage } from "@google/genai";
import { FusedEmotion, ChatMessage } from "../types";

function getAiClient() {
    // Prioritize key from sessionStorage for local development,
    // then fallback to process.env.API_KEY for the hosted environment.
    const apiKey = sessionStorage.getItem('gemini-api-key') || process.env.API_KEY;
    
    if (!apiKey) {
      throw new Error("Gemini API key not found. Please provide a key in the modal.");
    }
    return new GoogleGenAI({ apiKey: apiKey });
}

export type LiveSessionCallbacks = {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
}

export function startLiveSession(
  emotion: FusedEmotion,
  voiceName: string,
  callbacks: LiveSessionCallbacks
) {
  try {
    const ai = getAiClient();
    const systemInstruction = `You are a friendly and empathetic emotional assistant. The user is currently feeling ${emotion.toLowerCase()}. Your goal is to provide a supportive, kind, and conversational response. Keep your answers concise and natural, similar to how a person would talk. Do not mention that you are an AI.`;

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
            },
            systemInstruction: systemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
        },
    });

    return sessionPromise;
  } catch (error) {
    console.error("Error starting live session:", error);
    throw error;
  }
}


export async function generateEmpatheticResponse(
  userInput: string,
  emotion: FusedEmotion,
  chatHistory: ChatMessage[]
) {
  try {
    const ai = getAiClient();
    const systemInstruction = `You are a friendly and empathetic emotional assistant. 
      The user is currently feeling ${emotion.toLowerCase()}. 
      Your goal is to provide a supportive, kind, and conversational response. 
      Keep your answers concise and natural, similar to how a person would talk. 
      Do not mention that you are an AI.`;

    // Format the history for the API, excluding the last empty AI message placeholder
    const contents: Content[] = chatHistory
        .filter(m => m.text) // Ensure message has content
        .map(message => ({
            role: message.sender === 'user' ? 'user' : 'model',
            parts: [{ text: message.text }],
        }));
    
    // The last message is the current user input, which is handled separately
    // So we remove it from the history before adding the new input.
    contents.pop();

    const finalContents = [
        ...contents,
        { role: 'user', parts: [{ text: userInput }] }
    ];

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: finalContents,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
            topP: 0.95,
        }
    });

    return response.text;
  } catch (error) {
    console.error("Error generating empathetic response:", error);
    throw error;
  }
}

export async function generateSpeech(text: string, voiceName: string): Promise<string | null> {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return base64Audio;
        }
        return null;

    } catch (error) {
        console.error("Error generating speech:", error);
        throw error;
    }
}
