import { NavLink } from 'react-router-dom';

const NAV = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard',  icon: '⬛', label: 'Tableau de bord' },
      { to: '/explorer',   icon: '📁', label: 'Explorateur' },
      { to: '/search',     icon: '🔍', label: 'Recherche' },
    ]
  },
  {
    label: 'Outils',
    items: [
      { to: '/duplicates', icon: '🔁', label: 'Doublons' },
      { to: '/diskmap',    icon: '💾', label: 'Espace disque' },
      { to: '/organizer',  icon: '⚙️',  label: 'Organisateur' },
      { to: '/rename',     icon: '✏️',  label: 'Renommage' },
      { to: '/tags',       icon: '🏷️',  label: 'Tags' },
    ]
  }
];

export default function Sidebar() {
  return (
    <nav className="flex flex-col h-full py-3 px-2 gap-1 overflow-y-auto">
      {NAV.map(group => (
        <div key={group.label} className="mb-2">
          <p className="section-title px-2 mb-1">{group.label}</p>
          {group.items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand/20 text-brand-light border border-brand/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700'
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
