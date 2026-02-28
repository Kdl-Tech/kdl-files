import TitleBar  from './TitleBar';
import Sidebar   from './Sidebar';
import StatusBar from './StatusBar';

export default function AppShell({ children }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden select-none">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar gauche */}
        <aside className="w-52 shrink-0 flex flex-col border-r border-white/5 bg-dark-900/50">
          <Sidebar />
        </aside>

        {/* Zone principale */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>

      <StatusBar />
    </div>
  );
}
