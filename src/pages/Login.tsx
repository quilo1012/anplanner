import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/applied-nutrition-logo.png';
import factoryImage from '@/assets/factory-line.jpg';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = login({ email, password });

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 bg-[hsl(var(--background))]">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <img src={logo} alt="Applied Nutrition" className="h-12 w-auto" />
          </div>

          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">
            Welcome back
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mb-8">
            Sign in to access the Shift Report App
          </p>

          {error && (
            <div className="mb-6 p-4 bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 rounded-lg flex items-center gap-3">
              <AlertCircle size={20} className="text-[hsl(var(--destructive))]" />
              <span className="text-sm text-[hsl(var(--destructive))]">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
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
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-3"
            >
              <LogIn size={18} />
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-[hsl(var(--muted))] rounded-lg">
            <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">
              Demo Credentials:
            </p>
            <div className="space-y-1 text-xs text-[hsl(var(--muted-foreground))]">
              <p><strong>Admin:</strong> admin@appliednutrition.com / admin123</p>
              <p><strong>Supervisor:</strong> supervisor@appliednutrition.com / super123</p>
              <p><strong>Operator:</strong> operator@appliednutrition.com / oper123</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src={factoryImage}
          alt="Factory Line"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary))]/80 to-[hsl(var(--primary))]/40 flex items-center justify-center">
          <div className="text-center text-white p-8">
            <h2 className="text-4xl font-bold mb-4">Shift Report App</h2>
            <p className="text-xl opacity-90">
              Production monitoring and performance tracking
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
