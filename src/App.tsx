import { useEffect } from 'react';
import { BottomNav, Header } from './components/Nav';
import { StreakReminder } from './components/StreakReminder';
import { useRoute } from './lib/router';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { StartPage } from './pages/StartPage';
import { TrainPage } from './pages/TrainPage';
import { TreesPage } from './pages/TreesPage';
import { WorkoutPage } from './pages/WorkoutPage';

export default function App() {
  const route = useRoute();

  useEffect(() => {
    const titles: Record<typeof route.name, string> = {
      train: 'Home',
      workout: 'Workout',
      history: 'History',
      trees: 'Skill trees',
      start: 'Starting point',
      settings: 'Settings',
    };
    document.title = `${titles[route.name]} · Ascent`;
  }, [route.name]);

  return (
    <div className={`app app--${route.name}`}>
      <Header route={route} />
      <main className="app-main">
        {route.name === 'trees' && <TreesPage view={route.tree} skill={route.skill} />}
        {route.name === 'train' && <TrainPage />}
        {route.name === 'workout' && <WorkoutPage focus={route.focus} />}
        {route.name === 'history' && <HistoryPage day={route.day} />}
        {route.name === 'start' && <StartPage />}
        {route.name === 'settings' && <SettingsPage />}
      </main>
      <BottomNav route={route} />
      <StreakReminder />
    </div>
  );
}
