import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  LayoutDashboard,
  ScanLine,
  History,
  Scale,
  FileText,
  RefreshCw,
  LogOut,
  User,
  Download,
  Menu,
  X,
  Package,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const installPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    }
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Inspect Product', path: '/inspect/new', icon: ScanLine },
    { label: 'History', path: '/history', icon: History },
    { label: 'Products', path: '/products', icon: Package },
    { label: 'Legal Rules', path: '/rules', icon: Scale },
    { label: 'Legal Sources', path: '/legal-sources', icon: FileText, roles: ['ADMIN', 'LEGAL_REVIEWER'] },
    { label: 'Rule Updates', path: '/rule-updates', icon: RefreshCw, roles: ['ADMIN', 'LEGAL_REVIEWER'] },
  ];

  const filteredLinks = navLinks.filter((link) => {
    if (!link.roles) return true;
    return user && link.roles.includes(user.role);
  });

  return (
    <header className="bg-legal-900 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2 font-bold text-xl tracking-tight">
            <div className="bg-legal-600 p-1.5 rounded-lg border border-legal-500">
              <ShieldCheck className="w-6 h-6 text-blue-300" />
            </div>
            <span>
              LEGAL<span className="text-blue-400">LENS</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {filteredLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-legal-700 text-blue-300 border-b-2 border-blue-400'
                      : 'text-gray-300 hover:bg-legal-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Controls & PWA Install Button */}
          <div className="hidden md:flex items-center space-x-3">
            {deferredPrompt && (
              <button
                onClick={installPWA}
                className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-full font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install PWA</span>
              </button>
            )}

            <div className="flex items-center space-x-2 bg-legal-800 px-3 py-1.5 rounded-lg border border-legal-700">
              <User className="w-4 h-4 text-blue-300" />
              <div className="text-left text-xs">
                <p className="font-semibold leading-none">{user?.name}</p>
                <span className="text-[10px] text-blue-300 bg-legal-700 px-1.5 rounded mt-0.5 inline-block font-mono">
                  {user?.role}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Sign Out"
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-legal-800 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-legal-800"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-legal-800 border-t border-legal-700 px-2 pt-2 pb-3 space-y-1">
          {filteredLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                  isActive ? 'bg-legal-700 text-blue-300' : 'text-gray-300 hover:bg-legal-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 border-t border-legal-700 flex items-center justify-between px-3">
            <div className="text-sm">
              <p className="font-medium text-white">{user?.name}</p>
              <p className="text-xs text-blue-300">{user?.role}</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="flex items-center space-x-1 text-red-400 text-sm font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
