
export type OptionType = Record<string, string>;

export interface SceneAnalysisResult {
  sceneList: string[];
  formattedLyrics: string;
}

export type ShotIdea = string;

export interface ShotGenerationParams {
  activeScene: string;
  sceneLyrics: string;
  videoConcept: string;
  visualStyle: string;
  shotStyle: string;
  shotType: string;
  lensChoice: string;
  cameraMovement: string;
  lightingStyle: string;
}
