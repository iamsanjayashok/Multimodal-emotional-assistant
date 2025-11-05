import { GoogleGenAI, Modality } from "@google/genai";
import { FusedEmotion } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function generateEmpatheticResponse(
  userInput: string,
  emotion: FusedEmotion
): Promise<string> {
  try {
    const systemInstruction = `You are a friendly and empathetic emotional assistant. 
      The user is currently feeling ${emotion.toLowerCase()}. 
      Your goal is to provide a supportive, kind, and concise response. 
      Do not mention that you are an AI. Keep your response to 1-2 sentences.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userInput,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
            topP: 0.95,
        }
    });

    return response.text;
  } catch (error) {
    console.error("Error generating empathetic response:", error);
    return "I'm sorry, I'm having trouble understanding right now. Could you try rephrasing?";
  }
}

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  try {
    const audioPart = {
      inlineData: {
        mimeType,
        data: audioBase64,
      },
    };
    const textPart = {
      text: "Transcribe this audio.",
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [audioPart, textPart] },
    });

    return response.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return ""; // Return empty string on error, App will show a message.
  }
}

export async function generateSpeech(text: string): Promise<string | null> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // A calm and friendly voice
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
        return null;
    }
}
