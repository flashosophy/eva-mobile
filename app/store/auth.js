import * as SecureStore from 'expo-secure-store';

const AUTH_KEY = 'eva-mobile-auth';

export async function loadAuthSession() {
  const raw = await SecureStore.getItemAsync(AUTH_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const token = String(parsed?.token || '').trim();
    if (!token) return null;

    return {
      token,
      user: parsed?.user || null,
    };
  } catch (_) {
    return null;
  }
}

export async function saveAuthSession(token, user) {
  const payload = {
    token: String(token || '').trim(),
    user: user || null,
    savedAt: Date.now(),
  };

  await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(payload));
}

export async function clearAuthSession() {
  await SecureStore.deleteItemAsync(AUTH_KEY);
}
