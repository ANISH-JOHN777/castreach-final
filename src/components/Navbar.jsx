import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radio, Mic, Headphones, LogOut, LayoutDashboard, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'host') return '/host';
    return '/guest';
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(255, 255, 255, 0.94)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #eef2f6',
      transition: 'all 0.2s',
    }}>
      <div style={{
        maxWidth: 1240,
        margin: '0 auto',
        padding: '0 24px',
        height: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand Logo matching Image 1: Podcast antenna icon + "Podcast" */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: '#0f172a',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
          }}>
            <Radio size={20} color="#fff" />
          </div>
          <div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 21,
              letterSpacing: '-0.02em',
              color: '#0f172a',
            }}>
              Podcast
            </span>
            <span style={{
              display: 'inline-block',
              marginLeft: 6,
              fontSize: 10,
              fontWeight: 700,
              color: '#0284c7',
              background: '#e0f2fe',
              padding: '2px 6px',
              borderRadius: 6,
              verticalAlign: 'middle',
              letterSpacing: '0.04em',
            }}>
              CastReach
            </span>
          </div>
        </Link>

        {/* Center Nav links matching Image 1: Features, Pricing, Blog, Support */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: 32,
        }}>
          <Link
            to="/discover"
            style={{ fontWeight: 500, color: '#475569', fontSize: 14, transition: 'color 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
          >
            Features
          </Link>
          <Link
            to="/about"
            style={{ fontWeight: 500, color: '#475569', fontSize: 14, transition: 'color 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
          >
            Pricing
          </Link>
          <Link
            to="/explore"
            style={{ fontWeight: 500, color: '#475569', fontSize: 14, transition: 'color 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
          >
            Blog
          </Link>
          <Link
            to="/shorts"
            style={{ fontWeight: 500, color: '#475569', fontSize: 14, transition: 'color 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
          >
            Support
          </Link>
        </nav>

        {/* Right Auth buttons matching Image 1: "Sign up" and "Log in" black pill button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => navigate(getDashboardPath())}
                style={{
                  background: '#0f172a',
                  color: '#fff',
                  padding: '9px 18px',
                  borderRadius: 9999,
                  fontWeight: 600,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                }}
              >
                <LayoutDashboard size={15} />
                <span>Dashboard ({user.role})</span>
              </button>
              <button
                type="button"
                onClick={() => logout().then(() => navigate('/'))}
                style={{
                  background: 'transparent',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  padding: '8px 14px',
                  borderRadius: 9999,
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/register"
                style={{
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: 14,
                  padding: '8px 16px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#334155')}
              >
                Sign up
              </Link>
              <Link
                to="/login"
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '9px 22px',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
