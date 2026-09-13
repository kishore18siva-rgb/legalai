import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { ShieldCheck, User, Mail, Phone, BadgeCheck, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const RegisterInspectorPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    employeeNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return setError('Full Name is mandatory.');
    if (!formData.email.trim()) return setError('Official Email Address is mandatory.');
    if (!formData.phoneNumber.trim()) return setError('Phone Number is mandatory.');
    if (!formData.employeeNumber.trim()) return setError('Employee Number is mandatory.');
    if (!formData.password) return setError('Password is mandatory.');
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    setError(null);

    try {
      await api.post('/auth/register/inspector', formData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Inspector registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-legal-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Account Created Successfully</h2>
          <p className="text-xs text-gray-600">
            Your Compliance Officer account has been created. You can now sign in to the LegalLens Inspection Console.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-legal-700 hover:bg-legal-800 text-white font-bold py-3 rounded-lg text-sm transition"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-legal-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
        <div className="bg-legal-800 p-6 text-center text-white relative">
          <Link to="/login" className="absolute left-4 top-6 text-blue-300 hover:text-white flex items-center text-xs font-semibold">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Link>
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight">CREATE INSPECTOR ACCOUNT</h1>
          <p className="text-[11px] text-blue-300 uppercase tracking-wider font-semibold">
            Field Compliance Officer Registration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg font-medium text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Officer Full Name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Official Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="officer@legallens.gov.in"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Employee Number *</label>
              <div className="relative">
                <BadgeCheck className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  name="employeeNumber"
                  value={formData.employeeNumber}
                  onChange={handleChange}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="EMP-INS-005"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Confirm Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-legal-700 hover:bg-legal-800 text-white font-bold py-3 rounded-lg text-sm transition shadow-md mt-2"
          >
            {loading ? 'Creating Account...' : 'Create Inspector Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
