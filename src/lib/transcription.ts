import { invoke } from '@tauri-apps/api/core';

import { terminalSessionManager } from './terminal-session-manager';

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

export type TranscriptionResult = TranscriptionResponse | TranscriptionError;

export function isTranscriptionResponse(
  result: TranscriptionResult
): result is TranscriptionResponse {
  return 'text' in result;
}

export async function transcribeAudio(audioData: ArrayBuffer): Promise<TranscriptionResult> {
  try {
    const byteData = Array.from(new Uint8Array(audioData));

    const response = await invoke<TranscriptionResponse>('transcribe_audio', {
      request: { audioData: byteData },
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      code: mapErrorToErrorCode(errorMessage),
      message: errorMessage,
    };
  }
}

function mapErrorToErrorCode(message: string): TranscriptionErrorCode {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('missing api key') || lowerMessage.includes('api key not configured')) {
    return 'missing_api_key';
  }

  if (lowerMessage.includes('invalid audio') || lowerMessage.includes('empty or corrupted')) {
    return 'invalid_audio';
  }

  if (lowerMessage.includes('rate limit')) {
    return 'rate_limited';
  }

  return 'api_error';
}

export { terminalSessionManager };
