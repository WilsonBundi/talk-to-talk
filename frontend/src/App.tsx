import { useEffect, useState, type FormEvent } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Upload from './pages/Upload';
import MediaDetail from './pages/MediaDetail';
import Profile from './pages/Profile';
import { loginUser, registerUser } from './services/api';

function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [role, setRole] = useState<string>('consumer');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('talk-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed.user);
      setToken(parsed.token);
      setRole(parsed.role || 'consumer');
    }
    const storedTheme = localStorage.getItem('talk-theme') as 'light' | 'dark' | null;
    const initialTheme = storedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('theme-dark', initialTheme === 'dark');
    setLoading(false);
  }, []);

  const authState = { user, token, role };

  const saveAuth = (userData: any, tokenValue: string, roleValue: string) => {
    setUser(userData);
    setToken(tokenValue);
    setRole(roleValue);
    localStorage.setItem('talk-auth', JSON.stringify({ user: userData, token: tokenValue, role: roleValue }));
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('talk-theme', nextTheme);
    document.documentElement.classList.toggle('theme-dark', nextTheme === 'dark');
  };

  const login = async (username: string, password: string) => {
    setAuthError('');
    try {
      const response = await loginUser(username, password);
      saveAuth(response.user, response.token, response.user.role || 'consumer');
      navigate('/');
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const register = async (username: string, password: string, email: string, displayName: string, selectedRole: string) => {
    setAuthError('');
    try {
      const response = await registerUser({ username, password, email, displayName, role: selectedRole });
      saveAuth(response.user, response.token, response.user.role || selectedRole);
      navigate('/');
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const logout = () => {
    setUser(null);
    setToken('');
    setRole('consumer');
    localStorage.removeItem('talk-auth');
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
        <h1 className="animate-fade-in-up">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="app-shell animate-fade-in-up">
      <header className="topbar animate-fade-in-down">
        <Link to="/" className="brand hover-lift">Talk We Talk</Link>
        <nav>
          <Link to="/" className="hover-lift">Browse</Link>
          {user && role === 'creator' && <Link to="/upload" className="hover-lift">Upload</Link>}
          <button type="button" onClick={toggleTheme} className="theme-toggle btn-bounce" title="Toggle theme">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          {user && <Link to="/profile" className="role-badge hover-lift" title={`Current role: ${role}`}>{role === 'creator' ? 'Creator' : 'Consumer'}</Link>}
          {user ? <button onClick={logout} className="btn-bounce">Sign Out</button> : <Link to="/auth" className="hover-lift">Sign In</Link>}
        </nav>
      </header>
      <main className="page-enter">
        <Routes>
          <Route path="/" element={<Home auth={authState} />} />
          <Route path="/upload" element={<Upload auth={authState} />} />
          <Route path="/media/:id" element={<MediaDetail auth={authState} />} />
          <Route path="/profile" element={<Profile auth={authState} />} />
          <Route path="/auth" element={<AuthPage login={login} register={register} authError={authError} setAuthError={setAuthError} user={user} />} />
        </Routes>
      </main>
    </div>
  );
}

function AuthPage({
  login,
  register,
  authError,
  setAuthError,
  user
}: {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email: string, displayName: string, role: string) => Promise<void>;
  authError: string;
  setAuthError: (error: string) => void;
  user: any;
}) {
  const [showRegister, setShowRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError('');
    await login(username, password);
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError('');
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }
    await register(username, password, email, displayName, 'consumer');
  };

  return (
    <div className="page auth-page animate-fade-in-up">
      <div className="card animate-scale-in">
        <h2 className="animate-fade-in-down">{showRegister ? 'Create Account' : 'Sign In'}</h2>
        {showRegister ? (
          <form onSubmit={handleRegister} className="upload-form animate-fade-in-left">
            <div className="form-group">
              <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} required className="animate-fade-in-up animate-stagger-1" /></label>
              <div className="input-border"></div>
            </div>
            <div className="form-group">
              <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="animate-fade-in-up animate-stagger-2" /></label>
              <div className="input-border"></div>
            </div>
            <div className="form-group">
              <label>Confirm Password<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="animate-fade-in-up animate-stagger-3" /></label>
              <div className="input-border"></div>
            </div>
            <div className="form-group">
              <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="animate-fade-in-up animate-stagger-4" /></label>
              <div className="input-border"></div>
            </div>
            <div className="form-group">
              <label>Display Name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="animate-fade-in-up animate-stagger-5" /></label>
              <div className="input-border"></div>
            </div>
            <button type="submit" className="btn-bounce animate-fade-in-up animate-stagger-6">Create Account</button>
            <p className="animate-fade-in-up animate-stagger-7">
              Already have an account? <button type="button" className="link-button hover-lift" onClick={() => setShowRegister(false)}>Sign In</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="upload-form animate-fade-in-right">
            <div className="form-group">
              <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} required className="animate-fade-in-up animate-stagger-1" /></label>
              <div className="input-border"></div>
            </div>
            <div className="form-group">
              <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="animate-fade-in-up animate-stagger-2" /></label>
              <div className="input-border"></div>
            </div>
            <button type="submit" className="btn-bounce animate-fade-in-up animate-stagger-3">Sign In</button>
            <div className="auth-note animate-fade-in-up animate-stagger-4">
              <strong>Test creator login:</strong> creator_admin / creator123
            </div>
            <p className="animate-fade-in-up animate-stagger-5">
              Don't have an account? <button type="button" className="link-button hover-lift" onClick={() => setShowRegister(true)}>Create Account</button>
            </p>
          </form>
        )}
        {authError && <p className="error animate-fade-in-up">{authError}</p>}
        {user && <p className="animate-fade-in-up">Currently signed in as <strong>{user.displayName || user.username}</strong></p>}
      </div>
    </div>
  );
}

export default App;
