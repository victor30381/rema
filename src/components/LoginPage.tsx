import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import logoUrl from '../assets/logo.png';
import './LoginPage.css';

// Inline Google "G" SVG to avoid external dependency
function GoogleIcon() {
  return (
    <svg className="login-google-icon" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export function LoginPage() {
  const { signInWithGoogle, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      // Don't show error for user-cancelled popups
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError('Error al iniciar sesión. Inténtalo de nuevo.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  // Loading state while Firebase checks session
  if (loading) {
    return (
      <div className="login-loading-screen">
        <img src={logoUrl} alt="Rema" className="login-logo" />
        <div className="login-loading-bar">
          <div className="login-loading-bar-fill" />
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* Background effects */}
      <div className="login-bg-orb login-bg-orb--1" />
      <div className="login-bg-orb login-bg-orb--2" />
      <div className="login-bg-orb login-bg-orb--3" />
      <div className="login-grid-overlay" />

      {/* Floating particles */}
      <div className="login-particles">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="login-particle" />
        ))}
      </div>

      {/* Card */}
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo-wrapper">
          <div className="login-logo-glow" />
          <img src={logoUrl} alt="Rema – Análisis Bíblico" className="login-logo" />
        </div>

        {/* Title */}
        <div className="login-title-section">
          <h1 className="login-title">Rema</h1>
          <p className="login-subtitle">
            Análisis bíblico profundo impulsado por inteligencia artificial
          </p>
        </div>

        {/* Divider */}
        <div className="login-divider">
          <span>Iniciar sesión</span>
        </div>

        {/* Error */}
        {error && <div className="login-error">{error}</div>}

        {/* Google Sign In Button */}
        <button
          className="login-google-btn"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          id="google-sign-in-btn"
        >
          {signingIn ? (
            <div className="login-spinner" />
          ) : (
            <GoogleIcon />
          )}
          <span>{signingIn ? 'Conectando...' : 'Continuar con Google'}</span>
        </button>

        {/* Footer */}
        <p className="login-footer">
          Al iniciar sesión, aceptas nuestros términos de servicio y política de privacidad.
        </p>
      </div>
    </div>
  );
}
