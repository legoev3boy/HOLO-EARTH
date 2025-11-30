export interface EarthFact {
  title: string;
  content: string;
  category: EarthCategory;
}

export enum EarthCategory {
  ATMOSPHERE = 'Atmosphere',
  GEOLOGY = 'Geology',
  OCEANOGRAPHY = 'Oceans',
  ECOLOGY = 'Ecology',
  HUMAN_IMPACT = 'Human Impact'
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureData {
  landmarks: HandLandmark[][];
  handedness: any[];
}

export interface GeminiResponse {
  text: string;
  sources?: { uri: string; title: string }[];
}

export interface LocationData {
  lat: number;
  lon: number;
}