
import { GoogleGenAI } from "@google/genai";
import type { SceneAnalysisResult, ShotGenerationParams } from '../types';
import { VIDEO_CONCEPTS, VISUAL_STYLES, SHOT_STYLES, SHOT_TYPES, LENS_CHOICES, CAMERA_MOVEMENTS, LIGHTING_STYLES } from '../constants';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  // This error will be caught by the App's error boundary or should be handled by the UI
  // For now, we are assuming API_KEY is set in the environment as per instructions.
  // In a real app, you might want to show a more user-friendly message or disable API features.
  console.warn("API_KEY environment variable is not set. Gemini API calls will fail.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY! }); // The "!" asserts API_KEY is non-null

const parseJsonSafely = <T,>(jsonString: string): T => {
  let cleanedJsonString = jsonString.trim();
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
  const match = cleanedJsonString.match(fenceRegex);
  if (match && match[1]) {
    cleanedJsonString = match[1].trim();
  }
  try {
    return JSON.parse(cleanedJsonString) as T;
  } catch (error) {
    console.error("Failed to parse JSON:", error, "Original string:", jsonString);
    throw new Error(`Failed to parse AI response as JSON. Content: ${cleanedJsonString.substring(0,100)}...`);
  }
};

export const analyzeLyricsStructure = async (lyrics: string): Promise<SceneAnalysisResult> => {
  const prompt = `Analyze the following song lyrics. Your task is to rewrite the entire lyrics text, inserting standardized scene markers (like "--- VERSE 1 ---", "--- CHORUS 1 ---", etc.) just before each distinct section (verse, chorus, bridge, intro, outro).

Then, return a single, valid JSON object with two keys:
1. "sceneList": A JSON array of strings containing only the markers you added, in order. Example: ["--- INTRO ---", "--- VERSE 1 ---", "--- CHORUS 1 ---"]
2. "formattedLyrics": A single string containing the entire lyrics text, now with your markers inserted. Example: "--- INTRO ---\\n(Intro lyrics...)\\n--- VERSE 1 ---\\n(Verse 1 lyrics...)"

Here are the lyrics to process:
${lyrics}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text;
    const parsedResult = parseJsonSafely<SceneAnalysisResult>(resultText);

    if (!parsedResult || !Array.isArray(parsedResult.sceneList) || typeof parsedResult.formattedLyrics !== 'string') {
        console.error("Parsed result is not in the expected format for structure analysis:", parsedResult);
        throw new Error("AI response format is invalid. Expected sceneList (array) and formattedLyrics (string).");
    }
    
    return parsedResult;

  } catch (error) {
    console.error("Error in analyzeLyricsStructure service:", error);
    if (error instanceof Error) throw error;
    throw new Error("An unknown error occurred while analyzing lyrics structure.");
  }
};

export const generateShotIdeas = async (params: ShotGenerationParams): Promise<string[]> => {
  const {
    activeScene,
    sceneLyrics,
    videoConcept,
    visualStyle,
    shotStyle,
    shotType,
    lensChoice,
    cameraMovement,
    lightingStyle,
  } = params;

  const prompt = `Act as an expert Director of Photography and Music Video Director. Your task is to generate 5 extremely detailed and creative shot ideas for a specific scene in a music video.

**--- CORE PROJECT DNA ---**
* **Video Concept:** ${VIDEO_CONCEPTS[videoConcept as keyof typeof VIDEO_CONCEPTS]}
* **Overall Visual Style:** ${VISUAL_STYLES[visualStyle as keyof typeof VISUAL_STYLES]}. All shot descriptions must conform to this style.

**--- SCENE-SPECIFIC BRIEF ---**
* **Scene:** ${activeScene}
* **Lyrics for this specific scene:** "${sceneLyrics}"
* **Creative Direction:**
    * **Emotional Style:** ${SHOT_STYLES[shotStyle as keyof typeof SHOT_STYLES]}
    * **Key Shot Type to Emphasize:** ${SHOT_TYPES[shotType as keyof typeof SHOT_TYPES]}
    * **Lens Philosophy:** ${LENS_CHOICES[lensChoice as keyof typeof LENS_CHOICES]}
    * **Core Camera Movement:** ${CAMERA_MOVEMENTS[cameraMovement as keyof typeof CAMERA_MOVEMENTS]}
    * **Lighting Mood:** ${LIGHTING_STYLES[lightingStyle as keyof typeof LIGHTING_STYLES]}

**--- YOUR TASK ---**
For each of the 5 shots, provide a detailed description.
The output must be a valid JSON array of 5 strings. Each string must detail:
1.  **Framing & Angle:** (e.g., "Medium Close-Up, low angle...")
2.  **Lens & Focus:** (e.g., "...on a 85mm lens, shallow depth of field, focus pulling from...")
3.  **Action & Environment:** (e.g., "...the singer looks up as rain starts to fall in a neon-lit alley.")
4.  **Connection to Lyrics/Emotion:** (e.g., "This shot visually captures the feeling of 'isolation' from the lyrics.")

Example output:
["Detailed shot description 1...", "Detailed shot description 2...", "Detailed shot description 3...", "Detailed shot description 4...", "Detailed shot description 5..."]

Be inspiring and specific.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text;
    const shotIdeas = parseJsonSafely<string[]>(resultText);

    if (!shotIdeas || !Array.isArray(shotIdeas) || shotIdeas.some(s => typeof s !== 'string')) {
      console.error("Parsed shot ideas are not in the expected format:", shotIdeas);
      throw new Error("AI response format is invalid. Expected an array of strings for shot ideas.");
    }
    if (shotIdeas.length === 0) {
      console.warn("AI returned an empty array for shot ideas.");
      // Optionally throw error or return empty array based on desired behavior
      // For now, returning empty array is fine.
    }
    
    return shotIdeas;

  } catch (error) {
    console.error("Error in generateShotIdeas service:", error);
    if (error instanceof Error) throw error;
    throw new Error("An unknown error occurred while generating shot ideas.");
  }
  // This line is added to satisfy TypeScript's control flow analysis,
  // ensuring all paths explicitly return or throw. It should be unreachable
  // if the try/catch logic above is sound.
  throw new Error("generateShotIdeas function reached an unreachable state.");
};
