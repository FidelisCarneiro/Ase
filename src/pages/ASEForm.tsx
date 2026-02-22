import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Save, 
  Send, 
  Plus, 
  Trash2, 
  Clock, 
  Calendar, 
  Users, 
  FileText,
  ChevronLeft,
  AlertCircle,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

export const ASEForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '17:00',
    end_time: '19:00',
    sector_id: '',
    manager_id: '',
    supervisor_id: '',
    encarregado_id: '',
    discipline_id: '',
    subdiscipline_id: '',
    justification: '',
  });

  const [team, setTeam] = useState<any[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [subdisciplines, setSubdisciplines] = useState<any[]>([]);
  const [searchEmployee, setSearchEmployee] = useState('');

  useEffect(() => {
    fetchInitialData();
    if (id) fetchASE();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const [
        { data: sectorsData },
        { data: peopleData },
        { data: disciplinesData },
        { data: employeesData }
      ] = await Promise.all([
        supabase.from('sectors').select('*').order('name'),
        supabase.from('people').select('*').order('name'),
        supabase.from('disciplines').select('*').order('name'),
        supabase.from('employees').select('*').order('name')
      ]);

      setSectors(sectorsData || []);
      setPeople(peopleData || []);
      setDisciplines(disciplinesData || []);
      setAvailableEmployees(employeesData || []);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  const fetchASE = async () => {
    try {
      const { data: ase, error: aseError } = await supabase
        .from('ase')
        .select('*, ase_team(*)')
        .eq('id', id)
        .single();

      if (aseError) throw aseError;

      setFormData({
        date: ase.date,
        start_time: ase.start_time,
        end_time: ase.end_time,
        sector_id: ase.sector_id,
        manager_id: ase.manager_id,
        supervisor_id: ase.supervisor_id || '',
        encarregado_id: ase.encarregado_id || '',
        discipline_id: ase.discipline_id,
        subdiscipline_id: ase.subdiscipline_id,
        justification: ase.justification,
      });

      setTeam(ase.ase_team.map((t: any) => ({
        id: t.employee_id,
        matricula: t.snapshot_matricula,
        name: t.snapshot_name,
        function: t.snapshot_function
      })));

      // Fetch subdisciplines for the selected discipline
      if (ase.discipline_id) {
        const { data } = await supabase
          .from('subdisciplines')
          .select('*')
          .eq('discipline_id', ase.discipline_id);
        setSubdisciplines(data || []);
      }

    } catch (err) {
      console.error('Error fetching ASE:', err);
      setError('Não foi possível carregar a ASE');
    } finally {
      setFetching(false);
    }
  };

  const handleDisciplineChange = async (disciplineId: string) => {
    setFormData(prev => ({ ...prev, discipline_id: disciplineId, subdiscipline_id: '' }));
    const { data } = await supabase
      .from('subdisciplines')
      .select('*')
      .eq('discipline_id', disciplineId);
    setSubdisciplines(data || []);
  };

  const addToTeam = (employee: any) => {
    if (team.find(e => e.id === employee.id)) return;
    setTeam(prev => [...prev, employee]);
    setSearchEmployee('');
  };

  const removeFromTeam = (id: string) => {
    setTeam(prev => prev.filter(e => e.id !== id));
  };

  const handleSubmit = async (status: 'RASCUNHO' | 'PENDENTE') => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    try {
      const asePayload = {
        ...formData,
        requester_user_id: profile.id,
        status,
        supervisor_id: formData.supervisor_id || null,
        encarregado_id: formData.encarregado_id || null,
      };

      let aseId = id;

      if (id) {
        const { error } = await supabase.from('ase').update(asePayload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('ase').insert(asePayload).select().single();
        if (error) throw error;
        aseId = data.id;
      }

      // Update team
      if (aseId) {
        // Delete existing team members if editing
        if (id) {
          await supabase.from('ase_team').delete().eq('ase_id', aseId);
        }

        const teamPayload = team.map(member => ({
          ase_id: aseId,
          employee_id: member.id,
          snapshot_matricula: member.matricula,
          snapshot_name: member.name,
          snapshot_function: member.function
        }));

        const { error: teamError } = await supabase.from('ase_team').insert(teamPayload);
        if (teamError) throw teamError;
      }

      navigate('/ase/my');
    } catch (err: any) {
      console.error('Error saving ASE:', err);
      setError(err.message || 'Erro ao salvar ASE');
    } finally {
      setLoading(false);
    }
  };

  const calculateHH = () => {
    const start = new Date(`1970-01-01T${formData.start_time}`);
    const end = new Date(`1970-01-01T${formData.end_time}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return (hours * team.length).toFixed(1);
  };

  if (fetching) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-primary">{id ? 'Editar ASE' : 'Nova Autorização de Serviço'}</h1>
            <p className="text-gray-500">Preencha os campos abaixo para solicitar horas extras</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSubmit('RASCUNHO')}
            disabled={loading}
            className="px-6 py-2.5 bg-white border border-border text-primary font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            Salvar Rascunho
          </button>
          <button
            onClick={() => handleSubmit('PENDENTE')}
            disabled={loading}
            className="px-6 py-2.5 bg-secondary text-white font-bold rounded-xl shadow-lg shadow-secondary/20 hover:bg-secondary/90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Send size={18} />
            Enviar para Aprovação
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Info */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-border space-y-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
              <FileText size={20} className="text-secondary" />
              Informações Gerais
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Data</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Início Previsto</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Fim Previsto</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Setor</label>
                <select
                  value={formData.sector_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, sector_id: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">Selecione o setor</option>
                  {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Gerente Aprovador</label>
                <select
                  value={formData.manager_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, manager_id: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">Selecione o gerente</option>
                  {people.filter(p => p.type === 'GERENTE').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Disciplina</label>
                <select
                  value={formData.discipline_id}
                  onChange={(e) => handleDisciplineChange(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">Selecione</option>
                  {disciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Subdisciplina</label>
                <select
                  value={formData.subdiscipline_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, subdiscipline_id: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">Selecione</option>
                  {subdisciplines.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Justificativa</label>
              <textarea
                value={formData.justification}
                onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2 bg-gray-50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/10 resize-none"
                placeholder="Descreva o motivo da solicitação..."
              />
            </div>
          </div>

          {/* Team Section */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-border space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Users size={20} className="text-secondary" />
                Equipe ({team.length})
              </div>
              
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Adicionar colaborador..."
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/10"
                />
                
                {searchEmployee && (
                  <div className="absolute top-full left-0 w-full bg-white border border-border rounded-lg shadow-xl mt-1 z-20 max-h-60 overflow-y-auto">
                    {availableEmployees
                      .filter(e => 
                        e.name.toLowerCase().includes(searchEmployee.toLowerCase()) || 
                        e.matricula.includes(searchEmployee)
                      )
                      .map(e => (
                        <button
                          key={e.id}
                          onClick={() => addToTeam(e)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex flex-col border-b border-border last:border-none"
                        >
                          <span className="text-sm font-bold text-primary">{e.name}</span>
                          <span className="text-xs text-gray-400">{e.matricula} - {e.function}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden border border-border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-bold text-gray-400 uppercase text-[10px]">Matrícula</th>
                    <th className="px-4 py-3 font-bold text-gray-400 uppercase text-[10px]">Nome</th>
                    <th className="px-4 py-3 font-bold text-gray-400 uppercase text-[10px]">Função</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <AnimatePresence>
                    {team.map((member) => (
                      <motion.tr 
                        key={member.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                      >
                        <td className="px-4 py-3 font-mono text-xs">{member.matricula}</td>
                        <td className="px-4 py-3 font-bold text-primary">{member.name}</td>
                        <td className="px-4 py-3 text-gray-500">{member.function}</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => removeFromTeam(member.id)}
                            className="text-danger hover:bg-danger/10 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {team.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                        Nenhum colaborador adicionado à equipe.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Summary Card */}
          <div className="bg-primary text-white p-8 rounded-2xl shadow-xl shadow-primary/20 space-y-6">
            <h2 className="text-lg font-bold">Resumo da ASE</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60">Colaboradores</span>
                <span className="font-bold">{team.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60">Horas por pessoa</span>
                <span className="font-bold">
                  {(() => {
                    const start = new Date(`1970-01-01T${formData.start_time}`);
                    const end = new Date(`1970-01-01T${formData.end_time}`);
                    return ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1);
                  })()} h
                </span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between items-end">
                <span className="text-white/60 text-sm">Total HH</span>
                <span className="text-3xl font-bold text-secondary">{calculateHH()}</span>
              </div>
            </div>
          </div>

          {/* Responsible People */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-border space-y-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
              <Users size={20} className="text-secondary" />
              Responsáveis
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Supervisor</label>
              <select
                value={formData.supervisor_id}
                onChange={(e) => setFormData(prev => ({ ...prev, supervisor_id: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value="">Selecione</option>
                {people.filter(p => p.type === 'SUPERVISOR').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Encarregado</label>
              <select
                value={formData.encarregado_id}
                onChange={(e) => setFormData(prev => ({ ...prev, encarregado_id: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value="">Selecione</option>
                {people.filter(p => p.type === 'ENCARREGADO').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
