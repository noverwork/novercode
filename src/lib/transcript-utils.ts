/**
 * Sanitizes transcript text by removing unsafe control characters.
 * Keeps printable text, spaces, and standard whitespace.
 *
 * @param text - Raw transcript text from ASR
 * @returns Sanitized text safe for terminal injection
 */
export function sanitizeTranscript(text: string): string {
  return (
    text
      // Remove control characters except tab, newline, carriage return
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim leading/trailing whitespace
      .trim()
  );
}

/**
 * Type guard to check if transcript is valid (non-empty after trimming).
 *
 * @param text - Text to validate
 * @returns True if text is a non-empty string after trimming
 */
export function isValidTranscript(text: string | null | undefined): text is string {
  return typeof text === 'string' && text.trim().length > 0;
}
