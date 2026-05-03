import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiUrl } from '../../config/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'interviewer' | 'admin';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ACCESS_TOKEN_KEY = 'accessToken';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token: string) => {
    const response = await fetch(apiUrl('/auth/profile'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch profile');
    }

    const data = await response.json();
    setUser(data.profile);
    return data.profile as User;
  };

  const refreshProfile = async () => {
    if (!accessToken) return;
    await fetchProfile(accessToken);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);

        if (token && mounted) {
          setAccessToken(token);
          await fetchProfile(token);
        }
      } catch {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        if (mounted) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await fetch(apiUrl('/auth/signin'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.accessToken) {
      throw new Error(data.error || 'Invalid credentials');
    }

    const token = data.accessToken as string;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    setAccessToken(token);
    await fetchProfile(token);
  };

  const signOut = async () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setUser(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
