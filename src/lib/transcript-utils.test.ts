import { describe, expect, it } from 'vitest';

import { isValidTranscript, sanitizeTranscript } from './transcript-utils';

describe('sanitizeTranscript', () => {
  it('removes null bytes', () => {
    const input = 'hello\x00world';
    expect(sanitizeTranscript(input)).toBe('helloworld');
  });

  it('removes escape sequences', () => {
    const input = 'hello\x1Bworld';
    expect(sanitizeTranscript(input)).toBe('helloworld');
  });

  it('preserves tabs and newlines', () => {
    const input = 'hello\tworld\nline2';
    expect(sanitizeTranscript(input)).toBe('hello\tworld\nline2');
  });

  it('trims leading and trailing whitespace', () => {
    const input = '   hello world   ';
    expect(sanitizeTranscript(input)).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(sanitizeTranscript('')).toBe('');
  });

  it('handles string with only control chars', () => {
    expect(sanitizeTranscript('\x00\x01\x02')).toBe('');
  });
});

describe('isValidTranscript', () => {
  it('returns true for valid text', () => {
    expect(isValidTranscript('hello world')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isValidTranscript('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(isValidTranscript('   ')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidTranscript(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidTranscript(undefined)).toBe(false);
  });
});
