import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VoiceInputButton } from './voice-input-button';

const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockReset = vi.fn();

vi.mock('@/hooks/use-push-to-talk', () => ({
  usePushToTalk: () => ({
    isRecording: global.mockIsRecording,
    audioBlob: global.mockAudioBlob,
    error: global.mockError,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    reset: mockReset,
  }),
}));

declare global {
  var mockIsRecording: boolean;
  var mockAudioBlob: Blob | null;
  var mockError: Error | null;
}

describe('VoiceInputButton', () => {
  const onTranscriptReady = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.mockIsRecording = false;
    global.mockAudioBlob = null;
    global.mockError = null;
  });

  it('renders idle state correctly', () => {
    render(<VoiceInputButton onTranscriptReady={onTranscriptReady} />);
    expect(screen.getByText('Voice')).toBeInTheDocument();
  });

  it('starts recording on pointer down', () => {
    render(<VoiceInputButton onTranscriptReady={onTranscriptReady} />);
    const button = screen.getByRole('button');

    fireEvent.pointerDown(button);
    expect(mockStartRecording).toHaveBeenCalled();
  });

  it('stops recording on pointer up', () => {
    global.mockIsRecording = true;
    render(<VoiceInputButton onTranscriptReady={onTranscriptReady} />);

    expect(screen.getByText('Recording...')).toBeInTheDocument();

    const button = screen.getByRole('button');
    fireEvent.pointerUp(button);
    expect(mockStopRecording).toHaveBeenCalled();
  });

  it('calls onTranscriptReady when blob is available', async () => {
    const blob = new Blob(['test'], { type: 'audio/webm' });
    global.mockAudioBlob = blob;

    render(<VoiceInputButton onTranscriptReady={onTranscriptReady} />);

    expect(screen.getByText('Transcribing...')).toBeInTheDocument();

    await waitFor(() => {
      expect(onTranscriptReady).toHaveBeenCalledWith(blob);
    });

    expect(mockReset).toHaveBeenCalled();
  });

  it('shows error state', () => {
    global.mockError = new Error('Microphone blocked');
    render(<VoiceInputButton onTranscriptReady={onTranscriptReady} />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByTitle('Microphone blocked')).toBeInTheDocument();
  });

  it('stops recording on pointer leave', () => {
    global.mockIsRecording = true;
    render(<VoiceInputButton onTranscriptReady={onTranscriptReady} />);

    const button = screen.getByRole('button');
    fireEvent.pointerLeave(button);
    expect(mockStopRecording).toHaveBeenCalled();
  });
});
