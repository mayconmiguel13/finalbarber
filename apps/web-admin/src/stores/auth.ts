import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'OWNER' | 'BARBER' | 'RECEPTIONIST';
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  ownerName?: string;
  logoUrl?: string;
  planStatus: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'PAST_DUE';
  planTier: 'STARTER' | 'PRO' | 'ENTERPRISE';
  trialEndsAt?: string;
  trialDaysRemaining: number;
  onboardingCompleted: boolean;
  themeColor?: string;
  themeMode?: string;
}

function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem('barber_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getStoredOrg(): Organization | null {
  try {
    const stored = localStorage.getItem('barber_org');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('barber_token'));
  const user = ref<User | null>(getStoredUser());
  const organization = ref<Organization | null>(getStoredOrg());

  const isAuthenticated = computed(() => Boolean(token.value));
  const isTrial = computed(() => organization.value?.planStatus === 'TRIAL');
  const trialDaysRemaining = computed(() => organization.value?.trialDaysRemaining ?? 30);
  const needsOnboarding = computed(() => isAuthenticated.value && organization.value?.onboardingCompleted === false);

  function setSession(newToken: string, newUser: User, newOrg: Organization) {
    token.value = newToken;
    user.value = newUser;
    organization.value = newOrg;
    localStorage.setItem('barber_token', newToken);
    localStorage.setItem('barber_user', JSON.stringify(newUser));
    localStorage.setItem('barber_org', JSON.stringify(newOrg));
  }

  async function register(payload: {
    ownerName: string;
    barberShopName: string;
    phone: string;
    email: string;
    password: string;
  }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao realizar cadastro');
    }

    setSession(data.token, data.user, data.organization);
    return data;
  }

  async function login(payload: { email: string; password: string }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Credenciais inválidas');
    }

    setSession(data.token, data.user, data.organization);
    return data;
  }

  async function fetchMe() {
    if (!token.value) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token.value}` },
      });
      if (res.ok) {
        const data = await res.json();
        user.value = data.user;
        organization.value = data.organization;
        localStorage.setItem('barber_user', JSON.stringify(data.user));
        localStorage.setItem('barber_org', JSON.stringify(data.organization));

        if (data.organization?.themeColor) {
          localStorage.setItem('barber_accent_color', data.organization.themeColor);
          document.documentElement.setAttribute('data-accent', data.organization.themeColor);
        }
        if (data.organization?.themeMode) {
          localStorage.setItem('barber_theme_mode', data.organization.themeMode);
          if (data.organization.themeMode === 'light') {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
          } else {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          }
        }

        return data;
      } else if (res.status === 401) {
        logout();
      }
    } catch (err) {
      console.warn('Could not verify me endpoint:', err);
    }
    return null;
  }

  async function completeOnboarding(options?: { themeColor?: string }) {
    if (!token.value) return;
    try {
      await fetch('/api/auth/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(options || {}),
      });

      if (organization.value) {
        organization.value.onboardingCompleted = true;
        localStorage.setItem('barber_org', JSON.stringify(organization.value));
      }
    } catch (err) {
      console.error(err);
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    organization.value = null;
    localStorage.removeItem('barber_token');
    localStorage.removeItem('barber_user');
    localStorage.removeItem('barber_org');
  }

  async function forgotPassword(email: string) {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao solicitar recuperação de senha.');
    }
    return data;
  }

  async function verifyResetCode(email: string, code: string) {
    const res = await fetch('/api/auth/verify-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Código inválido ou expirado.');
    }
    return data;
  }

  async function resetPassword(payload: { email: string; code?: string; token?: string; newPassword: string }) {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao redefinir senha.');
    }
    return data;
  }

  return {
    token,
    user,
    organization,
    isAuthenticated,
    isTrial,
    trialDaysRemaining,
    needsOnboarding,
    register,
    login,
    fetchMe,
    completeOnboarding,
    logout,
    forgotPassword,
    verifyResetCode,
    resetPassword,
  };
});
