import { invoke } from '@tauri-apps/api/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isTranscriptionResponse, transcribeAudio } from './transcription';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('transcribeAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully transcribe audio and return text', async () => {
    const mockAudioData = new ArrayBuffer(1000);
    const mockResponse = { text: 'Hello world' };

    vi.mocked(invoke).mockResolvedValueOnce(mockResponse);

    const result = await transcribeAudio(mockAudioData);

    expect(isTranscriptionResponse(result)).toBe(true);
    if (isTranscriptionResponse(result)) {
      expect(result.text).toBe('Hello world');
    }
    expect(invoke).toHaveBeenCalledWith('transcribe_audio', {
      request: { audioData: expect.any(Array) },
    });
  });

  it('should convert ArrayBuffer to Uint8Array and convert to array', async () => {
    const mockAudioData = new ArrayBuffer(1000);

    vi.mocked(invoke).mockResolvedValueOnce({ text: 'test' });

    await transcribeAudio(mockAudioData);

    expect(invoke).toHaveBeenCalledWith(
      'transcribe_audio',
      expect.objectContaining({
        request: expect.objectContaining({
          audioData: expect.any(Array),
        }),
      })
    );
  });

  it('should return typed error for missing API key error', async () => {
    const mockAudioData = new ArrayBuffer(1000);

    vi.mocked(invoke).mockRejectedValueOnce(new Error('Missing API key'));

    const result = await transcribeAudio(mockAudioData);

    expect(isTranscriptionResponse(result)).toBe(false);
    if (!isTranscriptionResponse(result)) {
      expect(result.code).toBe('missing_api_key');
      expect(result.message).toBe('Missing API key');
    }
  });

  it('should return typed error for invalid audio error', async () => {
    const mockAudioData = new ArrayBuffer(1000);

    vi.mocked(invoke).mockRejectedValueOnce(new Error('Invalid audio data: empty or corrupted'));

    const result = await transcribeAudio(mockAudioData);

    expect(isTranscriptionResponse(result)).toBe(false);
    if (!isTranscriptionResponse(result)) {
      expect(result.code).toBe('invalid_audio');
      expect(result.message).toBe('Invalid audio data: empty or corrupted');
    }
  });

  it('should return typed error for API error', async () => {
    const mockAudioData = new ArrayBuffer(1000);

    vi.mocked(invoke).mockRejectedValueOnce(
      new Error('OpenAI transcription request failed with status 500')
    );

    const result = await transcribeAudio(mockAudioData);

    expect(isTranscriptionResponse(result)).toBe(false);
    if (!isTranscriptionResponse(result)) {
      expect(result.code).toBe('api_error');
      expect(result.message).toBe('OpenAI transcription request failed with status 500');
    }
  });

  it('should return typed error for rate limited error', async () => {
    const mockAudioData = new ArrayBuffer(1000);

    vi.mocked(invoke).mockRejectedValueOnce(new Error('OpenAI API rate limit exceeded'));

    const result = await transcribeAudio(mockAudioData);

    expect(isTranscriptionResponse(result)).toBe(false);
    if (!isTranscriptionResponse(result)) {
      expect(result.code).toBe('rate_limited');
      expect(result.message).toBe('OpenAI API rate limit exceeded');
    }
  });

  it('should handle any unexpected error', async () => {
    const mockAudioData = new ArrayBuffer(1000);
    const unexpectedError = new Error('Unexpected error occurred');

    vi.mocked(invoke).mockRejectedValueOnce(unexpectedError);

    const result = await transcribeAudio(mockAudioData);

    expect(isTranscriptionResponse(result)).toBe(false);
    if (!isTranscriptionResponse(result)) {
      expect(result.code).toBe('api_error');
      expect(result.message).toBe(unexpectedError.message);
    }
  });
});
