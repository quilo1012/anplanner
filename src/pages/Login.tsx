import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Eye, EyeOff, AlertCircle, UserPlus, Loader2 } from 'lucide-react';
export function Login() {
  const navigate = useNavigate();
  const {
    login,
    signup,
    isLoading: authLoading
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isSignup) {
        const result = await signup({
          email,
          password,
          name
        });
        if (result.success) {
          setSignupSuccess(true);
          // Auto-login after signup since auto-confirm is enabled
          const loginResult = await login({
            email,
            password
          });
          if (loginResult.success) {
            navigate('/');
          } else {
            setError('Account created! Please log in.');
            setIsSignup(false);
          }
        } else {
          setError(result.error || 'Signup failed');
        }
      } else {
        const result = await login({
          email,
          password
        });
        if (result.success) {
          navigate('/');
        } else {
          setError(result.error || 'Login failed');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  const toggleMode = () => {
    setIsSignup(!isSignup);
    setError('');
    setSignupSuccess(false);
  };
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-[hsl(var(--primary))]" />
          <p className="text-[hsl(var(--muted-foreground))]">Loading...</p>
        </div>
      </div>;
  }
  return (
    <div className="min-h-screen flex bg-background">
      {/* Login form - Full width */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 max-w-xl mx-auto">
        {/* Logo */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-primary">APPLIED NUTRITION</h2>
          <p className="text-sm text-muted-foreground">Shift Report System</p>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          {isSignup ? 'Create Account' : 'Welcome back'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isSignup ? 'Sign up to access the Shift Report App' : 'Sign in to access the Shift Report App'}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} className="text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {signupSuccess && (
          <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
            <span className="text-sm text-success">Account created successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignup && (
            <div>
              <label htmlFor="name" className="label">Full Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                className="input-field"
                required={isSignup}
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="label">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="input-field"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pr-10"
                required
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={isSignup ? 6 : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isSignup && (
              <p className="text-xs text-muted-foreground mt-1">
                Password must be at least 6 characters
              </p>
            )}
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3">
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : isSignup ? <UserPlus size={18} /> : <LogIn size={18} />}
            {isLoading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* Toggle between login and signup */}
        <div className="mt-6 text-center">
          <button type="button" onClick={toggleMode} className="text-sm text-primary hover:underline">
            {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {/* Help text */}
        {!isSignup && (
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium text-foreground mb-2">New here?</p>
            <p className="text-xs text-muted-foreground">
              Create an account to get started. New users are assigned the Operator role by default.
              An admin can upgrade your role later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}