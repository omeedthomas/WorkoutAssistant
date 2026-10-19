import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@xyflow/react/dist/style.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/map.css';
import './styles/detail.css';
import './styles/pages.css';
import './styles/history.css';
import './styles/home.css';
import App from './App';
import { ToastProvider } from './components/Toast';
import { CloudProvider } from './state/CloudContext';
import { ProgressProvider } from './state/ProgressContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProgressProvider>
      <ToastProvider>
        <CloudProvider>
          <App />
        </CloudProvider>
      </ToastProvider>
    </ProgressProvider>
  </StrictMode>,
);
