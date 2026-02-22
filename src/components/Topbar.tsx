import React from 'react';
import { Bell, Search, User } from 'lucide-react';

export const Topbar: React.FC = () => {
  return (
    <header className="h-16 bg-white border-b border-border fixed top-0 right-0 left-64 z-10 px-8 flex items-center justify-between">
      <div className="flex items-center gap-4 bg-gray-100 px-4 py-2 rounded-lg w-96">
        <Search size={18} className="text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar ASE, matrícula ou setor..." 
          className="bg-transparent border-none outline-none text-sm w-full"
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="relative text-gray-500 hover:text-primary transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-secondary text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
            3
          </span>
        </button>
        
        <div className="h-8 w-px bg-border" />
        
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="text-right">
            <p className="text-sm font-semibold text-primary group-hover:text-secondary transition-colors">Portal Fidel</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">HC Engenharia</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 border border-border">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
};
