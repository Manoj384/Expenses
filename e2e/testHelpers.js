/**
 * Playwright E2E Mock Session Helper
 * Seeds authenticated Supabase session into local storage
 */

export const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
}

export const MOCK_SESSION = {
  access_token: 'fake-jwt-token-for-e2e-testing',
  token_type: 'bearer',
  expires_in: 360000,
  expires_at: Math.floor(Date.now() / 1000) + 360000,
  refresh_token: 'fake-refresh-token-for-e2e',
  user: MOCK_USER,
}

export async function injectMockAuthSession(page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('sb-finance-auth-token', JSON.stringify(session))
    window.localStorage.setItem('ft_onboarding_complete_00000000-0000-0000-0000-000000000001', 'true')
    window.sessionStorage.setItem('ft_welcome_shown_00000000-0000-0000-0000-000000000001', 'true')
  }, MOCK_SESSION)
}
