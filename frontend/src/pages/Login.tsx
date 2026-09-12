import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoUser = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-legal-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        <div className="bg-legal-800 p-8 text-center text-white relative">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-blue-400">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">LEGAL LENS</h1>
          <p className="text-xs text-blue-300 mt-1 uppercase tracking-wider font-semibold">
            Legal Metrology (Packaged Commodities) Compliance Inspection System
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Official Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                placeholder="inspector@legallens.gov.in"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-legal-700 hover:bg-legal-800 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center space-x-2 transition shadow-md"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Inspection Console'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick Demo Credentials Buttons */}
          <div className="pt-4 border-t border-gray-200 text-center">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quick Dev / Demo Logins</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoUser('inspector@legallens.gov.in', 'Inspector@123')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-1.5 px-2 rounded font-semibold transition"
              >
                Inspector
              </button>
              <button
                type="button"
                onClick={() => fillDemoUser('reviewer@legallens.gov.in', 'Admin@123456')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-1.5 px-2 rounded font-semibold transition"
              >
                Reviewer
              </button>
              <button
                type="button"
                onClick={() => fillDemoUser('admin@legallens.gov.in', 'Admin@123456')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-1.5 px-2 rounded font-semibold transition"
              >
                Admin
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
