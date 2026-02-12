import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '@/app';

describe('App Smoke Test', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText(/novercode/i)).toBeInTheDocument();
  });
});
