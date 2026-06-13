import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Eye, EyeOff, AlertCircle, Loader2, Mail, Lock } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
export function Login() {
  const navigate = useNavigate();
  const {
    login,
    isLoading: authLoading,
    isAuthenticated
  } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/', {
        replace: true
      });
    }
  }, [authLoading, isAuthenticated, navigate]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    setIsLoading(true);
    try {
      const result = await login({ email, password });
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-muted/50 via-background to-muted/50 relative">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl border border-border shadow-xl p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex justify-center">
              <img src="/lovable-uploads/c9db809b-a260-417c-b42f-c908f00093c1.jpg" alt="Applied Nutrition" className="h-28 sm:h-32 w-auto rounded-xl shadow-lg" />
            </div>
          </div>

          {error && <div className="mb-6 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-3">
              <AlertCircle size={18} className="text-destructive shrink-0" />
              <span className="text-sm text-destructive">{error}</span>
            </div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email Address <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="input-field pl-10" autoComplete="email" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type={showPassword ? 'text' : 'password'} id="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input-field pl-10 pr-10" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
              {isLoading ? <>
                  <Loader2 size={20} className="animate-spin" />
                  Please wait...
                </> : <>
                  <LogIn size={20} />
                  Sign In
                </>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Accounts are created by administrators. Contact your manager for access.
          </p>
        </div>
      </div>
    </div>;
}
