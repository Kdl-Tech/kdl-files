import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell   from './components/layout/AppShell';
import Dashboard  from './pages/Dashboard';
import Explorer   from './pages/Explorer';
import Search     from './pages/Search';
import Duplicates from './pages/Duplicates';
import DiskMap    from './pages/DiskMap';
import Organizer  from './pages/Organizer';
import Rename     from './pages/Rename';
import Tags       from './pages/Tags';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/"           element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/explorer"   element={<Explorer />} />
        <Route path="/search"     element={<Search />} />
        <Route path="/duplicates" element={<Duplicates />} />
        <Route path="/diskmap"    element={<DiskMap />} />
        <Route path="/organizer"  element={<Organizer />} />
        <Route path="/rename"     element={<Rename />} />
        <Route path="/tags"       element={<Tags />} />
      </Routes>
    </AppShell>
  );
}
