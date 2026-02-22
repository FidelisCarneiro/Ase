import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Send,
  Download,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx } from 'clsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ASEListProps {
  mode: 'my' | 'all';
}

export const ASEList: React.FC<ASEListProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [ases, setAses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAses();
  }, [mode, profile]);

  const fetchAses = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let query = supabase
        .from('ase')
        .select(`
          *,
          sector:sectors(name),
          manager:people(name, email),
          requester:profiles(email),
          ase_team(id)
        `)
        .order('created_at', { ascending: false });

      if (mode === 'my') {
        query = query.eq('requester_user_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAses(data || []);
    } catch (err) {
      console.error('Error fetching ASEs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      RASCUNHO: 'bg-gray-100 text-gray-500',
      PENDENTE: 'bg-trama-2/10 text-trama-2',
      APROVADA: 'bg-emerald-100 text-emerald-600',
      REPROVADA: 'bg-danger/10 text-danger',
      ENVIADA_DP: 'bg-primary/10 text-primary',
      CONCLUIDA: 'bg-trama-1/10 text-trama-1',
    };
    
    const icons: Record<string, any> = {
      RASCUNHO: Edit,
      PENDENTE: Clock,
      APROVADA: CheckCircle2,
      REPROVADA: XCircle,
      ENVIADA_DP: Send,
      CONCLUIDA: CheckCircle2,
    };

    const Icon = icons[status] || Clock;

    return (
      <span className={clsx("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit", styles[status])}>
        <Icon size={12} />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const generatePDF = (ase: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(24, 37, 84); // Primary color
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('ASE FIDEL', 20, 25);
    doc.setFontSize(10);
    doc.text('Autorização de Serviço Extraordinário', 20, 32);
    doc.text(`Nº ${ase.number}`, 160, 25);
    doc.text(`Status: ${ase.status}`, 160, 32);

    // Body
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Informações Gerais', 20, 55);
    doc.line(20, 57, 190, 57);

    autoTable(doc, {
      startY: 60,
      body: [
        ['Data:', format(new Date(ase.date), 'dd/MM/yyyy'), 'Setor:', ase.sector?.name],
        ['Início:', ase.start_time, 'Fim:', ase.end_time],
        ['Solicitante:', ase.requester?.email, 'Gerente:', ase.manager?.name],
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
    });

    doc.text('Justificativa', 20, (doc as any).lastAutoTable.finalY + 15);
    doc.line(20, (doc as any).lastAutoTable.finalY + 17, 190, (doc as any).lastAutoTable.finalY + 17);
    doc.setFontSize(10);
    const splitJustification = doc.splitTextToSize(ase.justification, 170);
    doc.text(splitJustification, 20, (doc as any).lastAutoTable.finalY + 25);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} - HC Engenharia`, 20, 285);

    doc.save(`${ase.number}.pdf`);
  };

  const shareWhatsApp = (ase: any) => {
    const text = encodeURIComponent(
      `*ASE Fidel - HC Engenharia*\n` +
      `*Nº:* ${ase.number}\n` +
      `*Status:* ${ase.status}\n` +
      `*Data:* ${format(new Date(ase.date), 'dd/MM/yyyy')}\n` +
      `*Setor:* ${ase.sector?.name}\n` +
      `*Link:* ${window.location.origin}/#/ase/${ase.id}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const filteredAses = ases.filter(ase => 
    ase.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ase.sector?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {mode === 'my' ? 'Minhas Autorizações' : 'Todas as Autorizações'}
          </h1>
          <p className="text-gray-500">Gerencie e acompanhe o status das ASEs</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <button className="p-2.5 bg-white border border-border text-gray-500 rounded-xl hover:bg-gray-50 transition-all">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Número</th>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Data</th>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Setor</th>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Equipe</th>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Status</th>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredAses.map((ase) => (
              <tr key={ase.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <span className="font-bold text-primary">{ase.number}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-primary">
                      {format(new Date(ase.date), "dd 'de' MMM", { locale: ptBR })}
                    </span>
                    <span className="text-xs text-gray-400">{ase.start_time} - {ase.end_time}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{ase.sector?.name}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-primary">
                      {ase.ase_team?.length || 0}
                    </span>
                    <span className="text-xs text-gray-400">pessoas</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(ase.status)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => shareWhatsApp(ase)}
                      className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Compartilhar WhatsApp"
                    >
                      <Share2 size={18} />
                    </button>
                    <button 
                      onClick={() => generatePDF(ase)}
                      className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      title="Baixar PDF"
                    >
                      <Download size={18} />
                    </button>
                    <button 
                      onClick={() => navigate(`/ase/edit/${ase.id}`)}
                      className="p-2 text-secondary hover:bg-secondary/5 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => navigate(`/ase/view/${ase.id}`)}
                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Visualizar"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredAses.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                  Nenhuma autorização encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
