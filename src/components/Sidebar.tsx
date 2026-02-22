import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  Users, 
  Settings, 
  History, 
  BarChart3,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: PlusCircle, label: 'Novo ASE', path: '/ase/new' },
  { icon: FileText, label: 'Minhas ASE', path: '/ase/my' },
  { icon: FileText, label: 'Todas ASE', path: '/ase/all', roles: ['SUPER_ADMIN', 'ADMIN', 'GERENTE'] },
  { 
    icon: Users, 
    label: 'Cadastros', 
    path: '/cadastros',
    children: [
      { label: 'Efetivo', path: '/cadastros/efetivo' },
      { label: 'Pessoas', path: '/cadastros/pessoas' },
      { label: 'Setores', path: '/cadastros/setores' },
      { label: 'Disciplinas', path: '/cadastros/disciplinas' },
      { label: 'Destinatários', path: '/cadastros/destinatarios' },
    ]
  },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: History, label: 'Logs', path: '/logs', roles: ['SUPER_ADMIN', 'ADMIN'] },
];

export const Sidebar: React.FC = () => {
  const { profile, signOut } = useAuth();

  const filteredMenu = menuItems.filter(item => {
    if (!item.roles) return true;
    return profile && item.roles.includes(profile.role);
  });

  return (
    <aside className="w-64 bg-primary text-white h-screen fixed left-0 top-0 flex flex-col z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center font-bold text-xl">
          AF
        </div>
        <span className="text-xl font-bold tracking-tight">ASE Fidel</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {filteredMenu.map((item) => (
          <div key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
                isActive ? "bg-secondary text-white" : "hover:bg-white/10 text-white/70 hover:text-white"
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
              {item.children && <ChevronRight size={16} className="ml-auto opacity-50" />}
            </NavLink>
            
            {item.children && (
              <div className="ml-9 mt-1 space-y-1">
                {item.children.map(child => (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    className={({ isActive }) => clsx(
                      "block px-3 py-1.5 text-sm rounded-lg transition-colors",
                      isActive ? "text-secondary font-semibold" : "text-white/50 hover:text-white"
                    )}
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-trama-2 flex items-center justify-center text-xs font-bold">
            {profile?.email?.[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.email}</p>
            <p className="text-xs text-white/50 truncate">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};
