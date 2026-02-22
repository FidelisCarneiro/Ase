import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Users, 
  TrendingUp 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalHH: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: ases, error } = await supabase
        .from('ase')
        .select(`
          status,
          start_time,
          end_time,
          ase_team (id)
        `);

      if (error) throw error;

      const counts = {
        total: ases.length,
        pending: ases.filter(a => a.status === 'PENDENTE').length,
        approved: ases.filter(a => ['APROVADA', 'ENVIADA_DP', 'CONCLUIDA'].includes(a.status)).length,
        rejected: ases.filter(a => a.status === 'REPROVADA').length,
        totalHH: 0
      };

      // Calculate HH
      ases.forEach(ase => {
        if (['APROVADA', 'ENVIADA_DP', 'CONCLUIDA'].includes(ase.status)) {
          const start = new Date(`1970-01-01T${ase.start_time}`);
          const end = new Date(`1970-01-01T${ase.end_time}`);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          counts.totalHH += hours * (ase.ase_team?.length || 0);
        }
      });

      setStats(counts);

      // Mock chart data for now
      setChartData([
        { name: 'Jan', hh: 450 },
        { name: 'Fev', hh: 520 },
        { name: 'Mar', hh: 380 },
        { name: 'Abr', hh: 610 },
        { name: 'Mai', hh: 490 },
        { name: 'Jun', hh: 720 },
      ]);

    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total de ASEs', value: stats.total, icon: FileText, color: 'bg-primary' },
    { label: 'Pendentes', value: stats.pending, icon: Clock, color: 'bg-trama-2' },
    { label: 'Aprovadas', value: stats.approved, icon: CheckCircle2, color: 'bg-emerald-500' },
    { label: 'Reprovadas', value: stats.rejected, icon: XCircle, color: 'bg-danger' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <p className="text-gray-500">Visão geral do sistema ASE Fidel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-border flex items-center gap-5">
            <div className={`${card.color} w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg`}>
              <card.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">{card.label}</p>
              <p className="text-2xl font-bold text-primary">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <TrendingUp size={20} className="text-secondary" />
              Consumo de HH por Mês
            </h2>
            <select className="bg-gray-50 border border-border rounded-lg px-3 py-1 text-sm outline-none">
              <option>Últimos 6 meses</option>
              <option>Este ano</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="hh" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#e56c35' : '#182554'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-border">
          <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
            <Users size={20} className="text-secondary" />
            Resumo de Efetivo
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-trama-1 rounded-lg flex items-center justify-center text-white">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">Total Efetivo</p>
                  <p className="text-xs text-gray-400">Colaboradores ativos</p>
                </div>
              </div>
              <span className="text-xl font-bold text-primary">1,248</span>
            </div>

            <div className="p-4 border border-border rounded-xl">
              <p className="text-sm font-bold text-primary mb-4">HH Acumulado (Mês)</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-secondary">{stats.totalHH.toFixed(1)}</span>
                <span className="text-sm text-gray-400 mb-1">horas</span>
              </div>
              <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
                <div className="bg-secondary h-2 rounded-full w-[65%]" />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-wider">65% da meta mensal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
