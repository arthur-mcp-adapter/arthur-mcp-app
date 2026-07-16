import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const signInWithPassword = vi.hoisted(() => vi.fn());
vi.mock('../../supabaseClient', () => ({
  supabase: { auth: { signInWithPassword } },
}));
vi.mock('../../supabaseConfigured.constant', () => ({ supabaseConfigured: false }));
vi.mock('../../features/auth', () => ({
  hcaptchaConfigured: true,
  HcaptchaChallenge: ({ onTokenChange }: { onTokenChange: (token: string) => void }) => (
    <button type="button" onClick={() => onTokenChange('captcha-token')}>Complete CAPTCHA</button>
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'action.signIn': 'Sign in',
      'error.invalidCredentials': 'Invalid username or password.',
      'heading.signIn': 'Sign in',
      'label.password': 'Password',
      'label.rememberMe': 'Remember me',
      'label.email': 'Email',
      'link.forgotPassword': 'Forgot password',
    }[key] ?? key),
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import Login from '.';

const renderLogin = () => render(<Login />, { wrapper: MemoryRouter });
const completeCaptcha = () => fireEvent.click(screen.getByRole('button', { name: /complete captcha/i }));

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders sign in button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  it('renders forgot password link', () => {
    renderLogin();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('shows error alert on failed login', async () => {
    signInWithPassword.mockResolvedValue({ error: new Error('Invalid credentials') });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    completeCaptcha();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid username or password.')).toBeInTheDocument();
    });
  });

  it('navigates to / on successful login', async () => {
    signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'tok123' } }, error: null });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'admin123' } });
    completeCaptcha();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('disables the submit button while the request is pending', async () => {
    let resolveSignIn: (v: any) => void;
    signInWithPassword.mockReturnValue(new Promise((r) => { resolveSignIn = r; }));
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'admin123' } });
    completeCaptcha();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // After submit, button shows CircularProgress so name changes — query by type
    await waitFor(() => {
      const submit = document.querySelector('button[type="submit"]');
      expect(submit).toBeDisabled();
    });

    resolveSignIn!({ data: { session: { access_token: 'tok' } }, error: null });
  });

  it('calls signInWithPassword with the provided credentials', async () => {
    signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'myuser@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'mypass' } });
    completeCaptcha();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'myuser@test.com',
        password: 'mypass',
        options: { captchaToken: 'captcha-token' },
      });
    });
  });
});
