import { GoogleGenAI } from "@google/genai";
import { EarthCategory, GeminiResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchEarthData = async (category: EarthCategory, query?: string): Promise<GeminiResponse> => {
  try {
    const prompt = `
      You are a futuristic planetary database interface (JARVIS style).
      Generate a concise, scientific, yet engaging summary about Earth's ${category}.
      ${query ? `Specific focus: ${query}` : ''}
      
      Keep it under 100 words. 
      Format the response as raw text, no markdown bolding, just clean text for a HUD display.
      Tone: Analytical, sophisticated, educational.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return { text: response.text || "Database unreachable." };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "Error establishing uplink with Knowledge Core." };
  }
};

export const analyzeLocation = async (lat: number, lon: number): Promise<GeminiResponse> => {
  try {
    const prompt = `
      Identify the geographical region at Latitude ${lat.toFixed(2)}, Longitude ${lon.toFixed(2)}.
      Provide a real-time status report including:
      1. Current Weather conditions (use the search tool).
      2. Estimated Population (if applicable to the region).
      3. One brief historical or scientific fact.

      Keep the total response under 100 words.
      Style: HUD Data Stream.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }] // Enable Google Search for real-time weather
      }
    });

    // Extract grounding sources if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks
      ?.map(chunk => chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)
      .filter(source => source !== null) as { uri: string; title: string }[];

    return { 
      text: response.text || "Signal lost. Unable to scan coordinates.",
      sources: sources
    };
  } catch (error) {
    console.error("Gemini Location Error:", error);
    return { text: "Telemetry link failed." };
  }
};