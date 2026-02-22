-- 001_init.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'GERENTE', 'COORDENADOR', 'SUPERVISOR', 'ENCARREGADO', 'VISUALIZADOR');
CREATE TYPE ase_status AS ENUM ('RASCUNHO', 'PENDENTE', 'APROVADA', 'REPROVADA', 'ENVIADA_DP', 'CONCLUIDA');
CREATE TYPE person_type AS ENUM ('GERENTE', 'COORDENADOR', 'SUPERVISOR', 'ENCARREGADO');

-- 2. TABLES

-- Profiles (1:1 with auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'VISUALIZADOR'::user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Sectors
CREATE TABLE public.sectors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- People (Managers, Coordinators, Supervisors, Encarregados)
CREATE TABLE public.people (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type person_type NOT NULL,
    sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Employees (Efetivo)
CREATE TABLE public.employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    matricula TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    function TEXT NOT NULL,
    sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Recipients (Destinatários finais)
CREATE TABLE public.recipients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Disciplines
CREATE TABLE public.disciplines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Subdisciplines
CREATE TABLE public.subdisciplines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(discipline_id, name)
);

-- ASE (Autorização de Serviço Extraordinário)
CREATE TABLE public.ase (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    number TEXT UNIQUE, -- Generated automatically
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    sector_id UUID REFERENCES public.sectors(id) ON DELETE RESTRICT NOT NULL,
    manager_id UUID REFERENCES public.people(id) ON DELETE RESTRICT NOT NULL,
    requester_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
    supervisor_id UUID REFERENCES public.people(id) ON DELETE RESTRICT,
    encarregado_id UUID REFERENCES public.people(id) ON DELETE RESTRICT,
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE RESTRICT NOT NULL,
    subdiscipline_id UUID REFERENCES public.subdisciplines(id) ON DELETE RESTRICT NOT NULL,
    justification TEXT NOT NULL,
    status ase_status DEFAULT 'RASCUNHO'::ase_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ASE Team
CREATE TABLE public.ase_team (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ase_id UUID REFERENCES public.ase(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE RESTRICT NOT NULL,
    snapshot_matricula TEXT NOT NULL,
    snapshot_name TEXT NOT NULL,
    snapshot_function TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(ase_id, employee_id)
);

-- Audit Log
CREATE TABLE public.audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    before JSONB,
    after JSONB,
    ip TEXT,
    user_agent TEXT
);

-- 3. TRIGGERS & FUNCTIONS

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'VISUALIZADOR');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to generate ASE number
CREATE SEQUENCE IF NOT EXISTS ase_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_ase_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL THEN
    NEW.number := 'ASE-' || LPAD(nextval('ase_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ase_number
  BEFORE INSERT ON public.ase
  FOR EACH ROW EXECUTE PROCEDURE public.generate_ase_number();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ase_updated_at
    BEFORE UPDATE ON public.ase
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 4. RLS POLICIES

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subdisciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ase_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: Anyone can read, only SUPER_ADMIN can update roles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super admins can update all profiles" ON public.profiles FOR UPDATE USING (public.get_current_user_role() = 'SUPER_ADMIN');

-- Cadastros (Sectors, People, Employees, Recipients, Disciplines, Subdisciplines)
-- Viewable by all authenticated users
CREATE POLICY "Cadastros viewable by all" ON public.sectors FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Cadastros viewable by all" ON public.people FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Cadastros viewable by all" ON public.employees FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Cadastros viewable by all" ON public.recipients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Cadastros viewable by all" ON public.disciplines FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Cadastros viewable by all" ON public.subdisciplines FOR SELECT USING (auth.uid() IS NOT NULL);

-- Editable by SUPER_ADMIN and ADMIN
CREATE POLICY "Cadastros editable by admins" ON public.sectors FOR ALL USING (public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));
CREATE POLICY "Cadastros editable by admins" ON public.people FOR ALL USING (public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));
CREATE POLICY "Cadastros editable by admins" ON public.employees FOR ALL USING (public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));
CREATE POLICY "Cadastros editable by admins" ON public.recipients FOR ALL USING (public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));
CREATE POLICY "Cadastros editable by admins" ON public.disciplines FOR ALL USING (public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));
CREATE POLICY "Cadastros editable by admins" ON public.subdisciplines FOR ALL USING (public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- ASE Policies
CREATE POLICY "ASE viewable by all authenticated" ON public.ase FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "ASE insertable by creators" ON public.ase FOR INSERT WITH CHECK (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'COORDENADOR', 'SUPERVISOR', 'ENCARREGADO')
    AND requester_user_id = auth.uid()
);

CREATE POLICY "ASE updatable by requester if RASCUNHO or PENDENTE" ON public.ase FOR UPDATE USING (
    requester_user_id = auth.uid() AND status IN ('RASCUNHO', 'PENDENTE')
);

CREATE POLICY "ASE updatable by admins" ON public.ase FOR UPDATE USING (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
);

-- ASE Team Policies
CREATE POLICY "ASE Team viewable by all authenticated" ON public.ase_team FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "ASE Team insertable by creators" ON public.ase_team FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.ase WHERE id = ase_id AND requester_user_id = auth.uid() AND status IN ('RASCUNHO', 'PENDENTE'))
    OR public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
);

CREATE POLICY "ASE Team deletable by creators" ON public.ase_team FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.ase WHERE id = ase_id AND requester_user_id = auth.uid() AND status IN ('RASCUNHO', 'PENDENTE'))
    OR public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
);

-- Audit Log Policies
CREATE POLICY "Audit log viewable by admins" ON public.audit_log FOR SELECT USING (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
);
CREATE POLICY "Audit log insertable by all" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. RPCs for Power Automate / Workflow

-- Approve ASE
CREATE OR REPLACE FUNCTION public.approve_ase(p_ase_id UUID, p_approver_user_id UUID, p_note TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_ase public.ase;
    v_manager_email TEXT;
    v_approver_email TEXT;
BEGIN
    SELECT * INTO v_ase FROM public.ase WHERE id = p_ase_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ASE not found';
    END IF;

    IF v_ase.status != 'PENDENTE' THEN
        RAISE EXCEPTION 'ASE is not PENDENTE';
    END IF;

    -- Check if approver is GERENTE or SUPER_ADMIN
    IF public.get_current_user_role() NOT IN ('GERENTE', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'User does not have permission to approve';
    END IF;

    -- Update status
    UPDATE public.ase SET status = 'APROVADA' WHERE id = p_ase_id;

    -- Log action
    INSERT INTO public.audit_log (actor_user_id, action, entity, entity_id, after)
    VALUES (p_approver_user_id, 'APPROVE_ASE', 'ase', p_ase_id, jsonb_build_object('status', 'APROVADA', 'note', p_note));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject ASE
CREATE OR REPLACE FUNCTION public.reject_ase(p_ase_id UUID, p_approver_user_id UUID, p_reason TEXT)
RETURNS VOID AS $$
DECLARE
    v_ase public.ase;
BEGIN
    SELECT * INTO v_ase FROM public.ase WHERE id = p_ase_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ASE not found';
    END IF;

    IF v_ase.status != 'PENDENTE' THEN
        RAISE EXCEPTION 'ASE is not PENDENTE';
    END IF;

    IF public.get_current_user_role() NOT IN ('GERENTE', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'User does not have permission to reject';
    END IF;

    UPDATE public.ase SET status = 'REPROVADA' WHERE id = p_ase_id;

    INSERT INTO public.audit_log (actor_user_id, action, entity, entity_id, after)
    VALUES (p_approver_user_id, 'REJECT_ASE', 'ase', p_ase_id, jsonb_build_object('status', 'REPROVADA', 'reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send to DP
CREATE OR REPLACE FUNCTION public.send_dp(p_ase_id UUID, p_actor_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_ase public.ase;
BEGIN
    SELECT * INTO v_ase FROM public.ase WHERE id = p_ase_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ASE not found';
    END IF;

    IF v_ase.status != 'APROVADA' THEN
        RAISE EXCEPTION 'ASE is not APROVADA';
    END IF;

    UPDATE public.ase SET status = 'ENVIADA_DP' WHERE id = p_ase_id;

    INSERT INTO public.audit_log (actor_user_id, action, entity, entity_id, after)
    VALUES (p_actor_user_id, 'SEND_DP', 'ase', p_ase_id, jsonb_build_object('status', 'ENVIADA_DP'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. VIEWS

-- View for Power Automate to poll pending ASEs
CREATE OR REPLACE VIEW public.v_ase_pending AS
SELECT 
    a.id,
    a.number,
    a.date,
    a.start_time,
    a.end_time,
    s.name AS sector_name,
    m.name AS manager_name,
    m.email AS manager_email,
    p.email AS requester_email,
    a.justification
FROM public.ase a
JOIN public.sectors s ON a.sector_id = s.id
JOIN public.people m ON a.manager_id = m.id
JOIN public.profiles p ON a.requester_user_id = p.id
WHERE a.status = 'PENDENTE';

-- 7. SEED DATA (Optional, for testing)
INSERT INTO public.sectors (name) VALUES 
('Planejamento'), ('Suprimentos'), ('Produção'), ('Qualidade'), ('QSMS'), 
('Elétrica'), ('Instrumentação'), ('Mecânica'), ('Tubulação'), ('Telecom'), 
('Estruturas Metálicas'), ('Andaime'), ('Transporte'), ('RH/DP'), ('Serviços Gerais'), ('Outros')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.disciplines (name) VALUES 
('Engenharia'), ('Construção'), ('Manutenção')
ON CONFLICT (name) DO NOTHING;

-- Insert some subdisciplines
DO $$
DECLARE
    v_eng_id UUID;
    v_const_id UUID;
BEGIN
    SELECT id INTO v_eng_id FROM public.disciplines WHERE name = 'Engenharia';
    SELECT id INTO v_const_id FROM public.disciplines WHERE name = 'Construção';
    
    IF v_eng_id IS NOT NULL THEN
        INSERT INTO public.subdisciplines (discipline_id, name) VALUES 
        (v_eng_id, 'Projetos'), (v_eng_id, 'Planejamento') ON CONFLICT DO NOTHING;
    END IF;
    
    IF v_const_id IS NOT NULL THEN
        INSERT INTO public.subdisciplines (discipline_id, name) VALUES 
        (v_const_id, 'Civil'), (v_const_id, 'Montagem') ON CONFLICT DO NOTHING;
    END IF;
END $$;
