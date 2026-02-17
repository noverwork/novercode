import { invoke } from '@tauri-apps/api/core';

export interface TranscriptionResponse {
  text: string;
}

export type TranscriptionErrorCode =
  | 'missing_api_key'
  | 'invalid_audio'
  | 'api_error'
  | 'rate_limited';

export interface TranscriptionError {
  code: TranscriptionErrorCode;
  message: string;
}

/**
 * Transcribe audio data using OpenAI gpt-4o-transcribe model.
 * @param audioData - Audio data as ArrayBuffer (will be converted to bytes array)
 * @returns Transcription response with text
 */
export async function transcribeAudio(audioData: ArrayBuffer): Promise<TranscriptionResponse> {
  const audioArray = Array.from(new Uint8Array(audioData));
  return invoke<TranscriptionResponse>('transcribe_audio', {
    request: { audioData: audioArray },
  });
}
