import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { createFakeApi } from './api/fakeApi';
import App from './App';
import { createAppStore } from './app/store';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import './styles/app.css';

const api = createFakeApi();
const store = createAppStore(api);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <App api={api} />
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
