import { beforeEach, describe, expect, it, vi } from 'vitest';

import { transcribeAudio } from './transcription';

const mockInvoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe('transcription', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('transcribeAudio', () => {
    it('calls invoke with correct parameters', async () => {
      const mockText = 'Hello, world!';
      mockInvoke.mockResolvedValueOnce({ text: mockText });

      const audioData = new TextEncoder().encode('fake audio data').buffer;
      const result = await transcribeAudio(audioData);

      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockInvoke).toHaveBeenCalledWith('transcribe_audio', {
        request: { audioData: expect.any(Array) },
      });
      expect(result).toEqual({ text: mockText });
    });

    it('converts ArrayBuffer to byte array correctly', async () => {
      mockInvoke.mockResolvedValueOnce({ text: 'test' });

      // Create a simple buffer with known bytes
      const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
      const audioData = uint8.buffer;

      await transcribeAudio(audioData);

      const callArgs = mockInvoke.mock.calls[0]?.[1] as { request: { audioData: number[] } };
      expect(callArgs.request.audioData).toEqual([1, 2, 3, 4, 5]);
    });

    it('propagates errors from backend', async () => {
      const mockError = { code: 'missing_api_key', message: 'API key not configured' };
      mockInvoke.mockRejectedValueOnce(mockError);

      const audioData = new ArrayBuffer(10);

      await expect(transcribeAudio(audioData)).rejects.toEqual(mockError);
    });
  });
});
