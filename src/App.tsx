import type { FakeApi } from './api/fakeApi';
import { AppHeader } from './components/AppHeader';
import { ToastViewport } from './components/ToastViewport';
import { ListingsPage } from './features/listings/ui/ListingsPage';

export default function App({ api }: { api: FakeApi }) {
  return (
    <>
      <AppHeader api={api} />
      <ListingsPage />
      <ToastViewport />
    </>
  );
}
