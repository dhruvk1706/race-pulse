// Mirrors backend/app/ask.py (AskRequest / AskResponse); errors come back as { error }.
export const MAX_QUESTION = 500;

export interface AskRequest {
  question: string;
  sessionKey: number;
  lap: number;
}

export interface AskResponse {
  answer: string;
}

export interface AskError {
  error: string;
}
