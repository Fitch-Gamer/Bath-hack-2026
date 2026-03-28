import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { SettingsProvider } from './contexts/SettingsContext';
import Record from './pages/Record';
import './index.css';
import Index from './pages/Index';
import Settings from './pages/Settings';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <SettingsProvider>
      <Router>
        <div className="min-h-screen w-full bg-[var(--surface)] text-[var(--on-surface)] transition-colors duration-300">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
            <h1 className="text-xl font-bold text-[var(--on-surface)]">BathHack 2026</h1>

            <div className="flex items-center gap-3">
              <nav className="flex gap-2 text-sm font-semibold text-[var(--muted)]">
                <Link className="rounded-lg px-3 py-1 hover:bg-[var(--surface)]" to="/">
                  Home
                </Link>
                <Link className="rounded-lg px-3 py-1 hover:bg-[var(--surface)]" to="/record">
                  Record
                </Link>
                <Link className="rounded-lg px-3 py-1 hover:bg-[var(--surface)]" to="/settings">
                  Settings
                </Link>
              </nav>

              <button
                onClick={toggleTheme}
                className="rounded-full border border-[var(--border)] bg-[var(--card)] p-2 shadow-[var(--shadow)] transition hover:bg-[var(--surface)]"
                aria-label="Toggle light-dark mode"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-8 md:px-8">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/record" element={<Record />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  </SettingsProvider>
  );
}

export default App;

