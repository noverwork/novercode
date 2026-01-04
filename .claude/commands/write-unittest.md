# Write Unit Tests

Write unit tests for the specified file or module.

## What to Test

### Backend (NestJS) - Must Test

| Type | Description | Example |
|------|-------------|---------|
| **Services** | Business logic, external API calls, data processing | `speech.service.ts`, `blob-storage.service.ts` |
| **Controllers** | HTTP endpoint logic, request validation, response formatting | `coins.controller.ts` |
| **Guards** | Authentication/authorization logic | `teams-auth.guard.ts` |
| **Interceptors** | Request/response transformation with logic | Custom interceptors |
| **Command Handlers** | Write operations (CQRS) | `add-coin.command.ts` |
| **Query Handlers** | Read operations (CQRS) | `get-user-balance.query.ts` |
| **Activities** | Temporal workflow activities | `kube-client.activity.ts` |
| **Workflows** | Temporal workflow orchestration | Integration tests preferred |
| **Utilities** | Helper functions with logic | `cursor-pagination.ts` |
| **Validators** | Custom validation logic | `validators.constraint.ts` |

### Backend - Do NOT Test

| Type | Reason |
|------|--------|
| **Modules** | Pure configuration, no logic - NestJS handles wiring |
| **DTOs** | Pure data structures, no logic |
| **Entities** | Unless they have computed properties or methods |
| **Constants** | Unless they involve computation |
| **Types/Interfaces** | TypeScript compile-time only |
| **Index files** | Re-exports only |

### Frontend (React) - Must Test

| Type | Description | Example |
|------|-------------|---------|
| **Components with logic** | Conditional rendering, event handlers, state management | `feature-gate.tsx`, `role-gate.tsx` |
| **Custom Hooks** | Hooks with business logic, side effects | `use-meeting-mutation.ts` |
| **Utility functions** | Data transformation, validation, formatting | `context-encoder.ts`, `device-detection.ts` |
| **Store slices** | Zustand stores with actions and computed values | `use-user-profile-store.ts` |
| **Context providers** | Context with logic or state management | Custom context providers |

### Frontend - Do NOT Test

| Type | Reason |
|------|--------|
| **Pure presentational components** | No logic, only props → JSX |
| **Type definitions** | TypeScript compile-time only |
| **Constants** | Static values, no computation |
| **Index files** | Re-exports only |
| **CSS/Style files** | Visual testing preferred |
| **API client wrappers** | Thin wrappers around TanStack Query |

## Testing Patterns

### Backend (Jest + NestJS Testing)

```typescript
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('MyService', () => {
  let service: MyService;
  let mockDependency: jest.Mocked<SomeDependency>;

  beforeEach(async () => {
    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    // Create mock
    mockDependency = {
      someMethod: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        { provide: SomeDependency, useValue: mockDependency },
      ],
    }).compile();

    service = module.get(MyService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('methodName', () => {
    it('should do something successfully', async () => {
      mockDependency.someMethod.mockResolvedValue(expectedResult);

      const result = await service.methodName(input);

      expect(result).toEqual(expected);
      expect(mockDependency.someMethod).toHaveBeenCalledWith(expectedArgs);
    });

    it('should handle errors', async () => {
      mockDependency.someMethod.mockRejectedValue(new Error('Failed'));

      await expect(service.methodName(input)).rejects.toThrow('Failed');
    });
  });
});
```

### Frontend (Vitest + React Testing Library)

#### Basic Component Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils/test-utils';

import { MyComponent } from './my-component';
import { useUserProfileStore } from '@/stores/use-user-profile-store';

// Mock stores/hooks at module level
vi.mock('@/stores/use-user-profile-store');

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly when user is authenticated', () => {
    vi.mocked(useUserProfileStore).mockReturnValue({
      profile: { id: '123', name: 'Test User' },
    } as any);

    render(<MyComponent />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should handle null profile gracefully', () => {
    vi.mocked(useUserProfileStore).mockReturnValue({
      profile: null,
    } as any);

    render(<MyComponent />);

    expect(screen.queryByText('Test User')).not.toBeInTheDocument();
  });
});
```

#### Testing Components with User Interactions

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils/test-utils';
import userEvent from '@testing-library/user-event';

import { MyForm } from './my-form';

describe('MyForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onSubmit with form data', async () => {
    const user = userEvent.setup();

    render(<MyForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'John Doe');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
  });

  it('should show validation error for empty input', async () => {
    const user = userEvent.setup();

    render(<MyForm onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
```

#### Testing Custom Hooks

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useMeetingData } from './use-meeting-data';

// Mock API calls
vi.mock('@/api/meetings', () => ({
  fetchMeeting: vi.fn(),
}));

import { fetchMeeting } from '@/api/meetings';

describe('useMeetingData', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch meeting data successfully', async () => {
    const mockMeeting = { id: '123', title: 'Test Meeting' };
    vi.mocked(fetchMeeting).mockResolvedValue(mockMeeting);

    const { result } = renderHook(() => useMeetingData('123'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockMeeting);
  });

  it('should handle fetch error', async () => {
    vi.mocked(fetchMeeting).mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useMeetingData('invalid'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('Not found');
  });
});
```

#### Testing Zustand Stores

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

import { useUserProfileStore } from './use-user-profile-store';

describe('useUserProfileStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUserProfileStore.setState({ profile: null, isLoading: false });
  });

  it('should set profile correctly', () => {
    const mockProfile = { id: '123', name: 'Test User', isAdmin: false };

    act(() => {
      useUserProfileStore.getState().setProfile(mockProfile);
    });

    expect(useUserProfileStore.getState().profile).toEqual(mockProfile);
  });

  it('should clear profile on logout', () => {
    useUserProfileStore.setState({
      profile: { id: '123', name: 'Test' },
    });

    act(() => {
      useUserProfileStore.getState().logout();
    });

    expect(useUserProfileStore.getState().profile).toBeNull();
  });
});
```

#### Testing Utility Functions

```typescript
import { describe, it, expect } from 'vitest';

import { formatMeetingDuration, parseTimeString } from './time-utils';

describe('formatMeetingDuration', () => {
  it('should format seconds to human readable string', () => {
    expect(formatMeetingDuration(3661)).toBe('1h 1m');
    expect(formatMeetingDuration(120)).toBe('2m');
    expect(formatMeetingDuration(45)).toBe('45s');
  });

  it('should handle zero duration', () => {
    expect(formatMeetingDuration(0)).toBe('0s');
  });
});

describe('parseTimeString', () => {
  it('should parse valid time strings', () => {
    expect(parseTimeString('1:30:00')).toBe(5400);
    expect(parseTimeString('0:05:30')).toBe(330);
  });

  it('should throw on invalid input', () => {
    expect(() => parseTimeString('invalid')).toThrow();
  });
});
```

#### Testing Conditional Rendering Components (Gate Pattern)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils/test-utils';

import { FeatureGate } from './feature-gate';
import { useUserProfileStore } from '@/stores/use-user-profile-store';
import { FeatureFlag } from '@truley-companion/interfaces';

vi.mock('@/stores/use-user-profile-store');

describe('FeatureGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when feature flag is enabled', () => {
    vi.mocked(useUserProfileStore).mockReturnValue({
      profile: {
        featureFlags: { [FeatureFlag.MVP1]: true },
      },
    } as any);

    render(
      <FeatureGate flag={FeatureFlag.MVP1}>
        <div>Feature Content</div>
      </FeatureGate>
    );

    expect(screen.getByText('Feature Content')).toBeInTheDocument();
  });

  it('renders fallback when feature flag is disabled', () => {
    vi.mocked(useUserProfileStore).mockReturnValue({
      profile: {
        featureFlags: { [FeatureFlag.MVP1]: false },
      },
    } as any);

    render(
      <FeatureGate flag={FeatureFlag.MVP1} fallback={<div>Fallback</div>}>
        <div>Feature Content</div>
      </FeatureGate>
    );

    expect(screen.queryByText('Feature Content')).not.toBeInTheDocument();
    expect(screen.getByText('Fallback')).toBeInTheDocument();
  });

  it('handles missing profile gracefully', () => {
    vi.mocked(useUserProfileStore).mockReturnValue({
      profile: null,
    } as any);

    render(
      <FeatureGate flag={FeatureFlag.MVP1}>
        <div>Feature Content</div>
      </FeatureGate>
    );

    expect(screen.queryByText('Feature Content')).not.toBeInTheDocument();
  });
});
```

## Test Coverage Checklist

For each function/method, test:

- [ ] **Happy path** - Normal successful execution
- [ ] **Edge cases** - Empty inputs, boundary values, null/undefined
- [ ] **Error handling** - Expected errors are thrown/caught correctly
- [ ] **Side effects** - Verify mocks were called with correct arguments

## Running Tests

```bash
# Run all tests
npm run test

# Run specific project
npx nx run backend:test
npx nx run teams-tab:test
npx nx run notetaker-listener:test
npx nx run teams-notetaker:test

# Run specific test file
npx nx run backend:test --testPathPattern=my-service

# Run with coverage
npx nx run backend:test --coverage
```

## File Naming

- Test files: `*.spec.ts` or `*.spec.tsx`
- Located alongside source files (not in separate `__tests__` folder)

## Common Gotchas

### Backend (Jest)

1. **Always mock Logger** - Suppress output during tests
2. **Use `jest.restoreAllMocks()` in afterEach** - Clean up spies
3. **Mock external dependencies** - Don't make real API calls
4. **Test async code properly** - Use `async/await` with `expect().rejects`

### Frontend (Vitest)

1. **Use `vi` not `jest`** - Vitest uses `vi.fn()`, `vi.mock()`, etc.
2. **Always use custom render** - Import from `@/test-utils/test-utils` (wraps with providers)
3. **Mock at module level** - `vi.mock()` must be called at top level, before imports
4. **Use `vi.mocked()` for type safety** - Wrap mocked functions for proper TypeScript types
5. **Reset store state in beforeEach** - Zustand stores persist between tests
6. **Use `userEvent` for interactions** - More realistic than `fireEvent`
7. **Use `waitFor` for async assertions** - Don't use `sleep` or fixed timeouts
8. **Query patterns**:
   - `getBy*` - Throws if not found (use for elements that should exist)
   - `queryBy*` - Returns null if not found (use for asserting absence)
   - `findBy*` - Async, waits for element to appear

### Project-Specific Setup

The test setup (`apps/teams-tab/src/test-utils/setup.ts`) already mocks:
- `@microsoft/teams-js` (Teams SDK)
- `window.matchMedia`
- `IntersectionObserver`
- `ResizeObserver`

No need to mock these in individual tests.
