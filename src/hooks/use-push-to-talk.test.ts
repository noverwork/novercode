import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePushToTalk } from './use-push-to-talk';

interface MockMediaRecorder {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  state: string;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
}

interface MockStream {
  getTracks: ReturnType<typeof vi.fn>;
}

describe('usePushToTalk', () => {
  let mockMediaRecorder: MockMediaRecorder;
  let mockStream: MockStream;

  beforeEach(() => {
    vi.useFakeTimers();

    mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
    });

    mockMediaRecorder = {
      start: vi.fn().mockImplementation(function (this: MockMediaRecorder) {
        this.state = 'recording';
      }),
      stop: vi.fn().mockImplementation(function (this: MockMediaRecorder) {
        this.state = 'inactive';
      }),
      state: 'inactive',
      ondataavailable: null,
      onstop: null,
    };

    (globalThis as Record<string, unknown>).MediaRecorder = vi.fn(() => mockMediaRecorder);
    (globalThis as Record<string, unknown>).Blob = vi.fn((content) => ({
      content,
      size: content.length,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePushToTalk());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should start recording successfully', async () => {
    const { result } = renderHook(() => usePushToTalk());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(mockMediaRecorder.start).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should stop recording and produce blob', async () => {
    const { result } = renderHook(() => usePushToTalk());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    const onstopHandler = mockMediaRecorder.onstop;
    if (onstopHandler) {
      act(() => {
        onstopHandler();
      });
    }

    expect(mockMediaRecorder.stop).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(false);
    expect(result.current.audioBlob).toBeTruthy();
  });

  it('should handle permission denied error', async () => {
    const error = new Error('Permission denied');
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    const { result } = renderHook(() => usePushToTalk());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBe(error);
  });

  it('should auto-stop after 30 seconds', async () => {
    const { result } = renderHook(() => usePushToTalk());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockMediaRecorder.stop).toHaveBeenCalled();
  });

  it('should stop on window blur', async () => {
    const { result } = renderHook(() => usePushToTalk());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });

    expect(mockMediaRecorder.stop).toHaveBeenCalled();
  });

  it('should cleanup tracks when stopping', async () => {
    const { result } = renderHook(() => usePushToTalk());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    const onstopHandler = mockMediaRecorder.onstop;
    if (onstopHandler) {
      act(() => {
        onstopHandler();
      });
    }

    const tracks = mockStream.getTracks();
    expect(tracks[0].stop).toHaveBeenCalled();
  });
});
