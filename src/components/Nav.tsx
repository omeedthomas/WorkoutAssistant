import { CalendarDays, Dumbbell, House, Network, Settings } from 'lucide-react';
import { exercises } from '../data';
import { lastTreeHref, type Route } from '../lib/router';
import { useProgress } from '../state/ProgressContext';
import { AccountButton } from './Account';

const items = [
  { name: 'train', label: 'Home', href: () => '#/train', Icon: House },
  { name: 'workout', label: 'Workout', href: () => '#/workout', Icon: Dumbbell },
  { name: 'history', label: 'History', href: () => '#/history', Icon: CalendarDays },
  { name: 'trees', label: 'Skill trees', href: lastTreeHref, Icon: Network },
  { name: 'settings', label: 'Settings', href: () => '#/settings', Icon: Settings },
] as const;

function isActive(route: Route, name: string) {
  return (
    route.name === name ||
    (name === 'train' && (route.name === 'start' || route.name === 'mobility')) ||
    (name === 'settings' && ['equipment', 'privacy', 'terms'].includes(route.name))
  );
}

function NavLinks({ route, className }: { route: Route; className: string }) {
  return (
    <>
      {items.map(({ name, label, href, Icon }) => (
        <a
          key={name}
          href={href()}
          className={className}
          aria-current={isActive(route, name) ? 'page' : undefined}
        >
          <Icon size={20} aria-hidden />
          <span>{label}</span>
        </a>
      ))}
    </>
  );
}

export function Header({ route }: { route: Route }) {
  const { state } = useProgress();
  const mastered = Object.keys(state.mastered).length;
  return (
    <header className="app-header">
      <a href="#/train" className="brand" aria-label="Ascent home">
        <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden>
          <path
            d="M14 46 L28 22 L36 34 L42 26 L52 46"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="28" cy="22" r="6" fill="var(--gold)" />
        </svg>
        <span>Ascent</span>
      </a>
      <nav className="top-nav" aria-label="Main">
        <NavLinks route={route} className="top-nav__link" />
      </nav>
      <div className="header-progress" title="Skills mastered">
        <strong>{mastered}</strong> / {exercises.length}
        <span className="header-progress__label"> mastered</span>
      </div>
      <AccountButton />
    </header>
  );
}

export function BottomNav({ route }: { route: Route }) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <NavLinks route={route} className="bottom-nav__link" />
    </nav>
  );
}
