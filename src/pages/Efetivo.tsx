import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Upload, 
  Download, 
  Plus, 
  Search, 
  Trash2, 
  Edit,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';

export const Efetivo: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: empData }, { data: secData }] = await Promise.all([
        supabase.from('employees').select('*, sector:sectors(name)').order('name'),
        supabase.from('sectors').select('*').order('name')
      ]);
      setEmployees(empData || []);
      setSectors(secData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Map columns (adjust based on expected Excel structure)
      const mappedData = data.map((row: any) => ({
        matricula: String(row.matricula || row.Matricula || row.MATRICULA || ''),
        name: String(row.nome || row.Nome || row.NOME || ''),
        function: String(row.funcao || row.Funcao || row.FUNCAO || row.Cargo || ''),
        sector_name: String(row.setor || row.Setor || row.SETOR || ''),
        email: String(row.email || row.Email || row.EMAIL || '')
      })).filter(r => r.matricula && r.name);

      setImportPreview(mappedData);
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      for (const row of importPreview) {
        // Find sector ID
        const sector = sectors.find(s => s.name.toLowerCase() === row.sector_name.toLowerCase());
        
        const payload = {
          matricula: row.matricula,
          name: row.name,
          function: row.function,
          sector_id: sector?.id || null,
          email: row.email || null
        };

        const { error } = await supabase
          .from('employees')
          .upsert(payload, { onConflict: 'matricula' });
        
        if (error) console.error(`Error importing ${row.matricula}:`, error);
      }
      
      setImportPreview(null);
      fetchData();
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.matricula.includes(searchTerm)
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Efetivo</h1>
          <p className="text-gray-500">Gerenciamento de colaboradores e importação via Excel</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-white border border-border text-primary font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Upload size={18} />
            Importar Excel
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx,.xls" 
            className="hidden" 
          />
          <button className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2">
            <Plus size={18} />
            Novo Colaborador
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou matrícula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Matrícula</th>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Nome</th>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Função</th>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Setor</th>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs">{emp.matricula}</td>
                <td className="px-6 py-4 font-bold text-primary">{emp.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{emp.function}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{emp.sector?.name || '-'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit size={16} />
                    </button>
                    <button className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Import Preview Modal */}
      <AnimatePresence>
        {importPreview && (
          <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-primary">Prévia da Importação</h2>
                  <p className="text-sm text-gray-500">Verifique os dados antes de confirmar o salvamento</p>
                </div>
                <button onClick={() => setImportPreview(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-bold text-gray-400 uppercase text-[10px]">Matrícula</th>
                      <th className="px-4 py-2 font-bold text-gray-400 uppercase text-[10px]">Nome</th>
                      <th className="px-4 py-2 font-bold text-gray-400 uppercase text-[10px]">Função</th>
                      <th className="px-4 py-2 font-bold text-gray-400 uppercase text-[10px]">Setor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {importPreview.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 font-mono">{row.matricula}</td>
                        <td className="px-4 py-2 font-bold text-primary">{row.name}</td>
                        <td className="px-4 py-2">{row.function}</td>
                        <td className="px-4 py-2">{row.sector_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-6 border-t border-border bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <AlertCircle size={18} className="text-secondary" />
                  {importPreview.length} registros encontrados
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setImportPreview(null)}
                    className="px-6 py-2 text-primary font-bold hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmImport}
                    disabled={importing}
                    className="px-8 py-2 bg-secondary text-white font-bold rounded-xl shadow-lg shadow-secondary/20 hover:bg-secondary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {importing ? 'Importando...' : 'Confirmar Importação'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
