-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS (Extends Supabase Auth)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('paciente', 'medico', 'admin')) NOT NULL,
    nombre_completo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CLINICAL PROFILES
CREATE TABLE public.clinical_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) NOT NULL UNIQUE,
    edad INTEGER NOT NULL,
    peso DECIMAL(5,2), -- kg
    estatura DECIMAL(3,2), -- meters
    frecuencia_cardiaca_maxima INTEGER, -- Calculated
    imc DECIMAL(5,2), -- Calculated
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TREATMENT PLANS
CREATE TABLE public.treatment_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.users(id) NOT NULL,
    assigned_by_doctor_id UUID REFERENCES public.users(id) NOT NULL,
    meta_pasos_diaria INTEGER NOT NULL,
    meta_minutos_semana INTEGER DEFAULT 180 NOT NULL,
    velocidad_inicial_porcentaje INTEGER DEFAULT 60,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ACTIVITY LOGS (Walking/Exercise Sessions)
CREATE TABLE public.activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.users(id) NOT NULL,
    treatment_plan_id UUID REFERENCES public.treatment_plans(id),
    tipo_actividad TEXT CHECK (tipo_actividad IN ('caminata', 'ejercicio_fuerza')) NOT NULL,
    fecha_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_hora_fin TIMESTAMP WITH TIME ZONE,
    pasos_realizados INTEGER,
    distancia_metros DECIMAL(10,2),
    tiempo_actividad_minutos INTEGER,
    dolor_eva_maximo INTEGER CHECK (dolor_eva_maximo >= 0 AND dolor_eva_maximo <= 10),
    termino_por_dolor BOOLEAN DEFAULT FALSE,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. PAIN EVENTS (Granular tracking during session)
CREATE TABLE public.pain_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_log_id UUID REFERENCES public.activity_logs(id) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    nivel_eva INTEGER CHECK (nivel_eva >= 0 AND nivel_eva <= 10) NOT NULL,
    accion_tomada TEXT CHECK (accion_tomada IN ('continuo', 'pausa', 'finalizo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- NEW VIDEO MODULE (PHASE 2)
-- ==========================================

-- 7. EXERCISE VIDEOS (Master Table)
CREATE TABLE public.exercise_videos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero_orden INTEGER UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    youtube_video_id TEXT NOT NULL,
    youtube_url TEXT NOT NULL,
    tipo_ejercicio TEXT CHECK (tipo_ejercicio IN ('fuerza_eeii', 'resistencia', 'equilibrio')),
    grupos_musculares TEXT[], -- Array of strings
    duracion_segundos INTEGER,
    repeticiones_sugeridas TEXT,
    equipamiento_necesario TEXT[], -- Array of strings
    nivel_dificultad TEXT CHECK (nivel_dificultad IN ('principiante', 'intermedio', 'avanzado')),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. PATIENT EXERCISE ASSIGNMENTS (Prescriptions)
CREATE TABLE public.patient_exercise_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.users(id) NOT NULL,
    video_id UUID REFERENCES public.exercise_videos(id) NOT NULL,
    assigned_by_doctor_id UUID REFERENCES public.users(id) NOT NULL,
    fecha_asignacion DATE DEFAULT CURRENT_DATE NOT NULL,
    frecuencia_semanal INTEGER DEFAULT 3,
    series_asignadas INTEGER DEFAULT 2,
    repeticiones_asignadas INTEGER DEFAULT 10,
    activo BOOLEAN DEFAULT TRUE,
    notas_medico TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. EXERCISE SESSION LOGS (Execution History)
CREATE TABLE public.exercise_session_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.users(id) NOT NULL,
    video_id UUID REFERENCES public.exercise_videos(id) NOT NULL,
    fecha_realizacion DATE DEFAULT CURRENT_DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME,
    series_completadas INTEGER,
    repeticiones_completadas INTEGER,
    dificultad_percibida INTEGER CHECK (dificultad_percibida >= 1 AND dificultad_percibida <= 10),
    completado BOOLEAN DEFAULT FALSE,
    dolor_durante_ejercicio INTEGER CHECK (dolor_durante_ejercicio >= 1 AND dolor_durante_ejercicio <= 10),
    notas_paciente TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- CONSTRAINT: Patient cannot log the same exercise twice in one day
    CONSTRAINT unique_exercise_per_day UNIQUE (patient_id, video_id, fecha_realizacion)
);

-- INDICES FOR OPTIMIZATION
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_plans_patient ON public.treatment_plans(patient_id);
CREATE INDEX idx_logs_patient ON public.activity_logs(patient_id);
CREATE INDEX idx_logs_date ON public.activity_logs(fecha_hora_inicio);
CREATE INDEX idx_pain_log ON public.pain_events(activity_log_id);

-- New Indices for Video Module
CREATE INDEX idx_exercise_sessions_patient_date ON public.exercise_session_logs(patient_id, fecha_realizacion DESC);
CREATE INDEX idx_exercise_assignments_patient ON public.patient_exercise_assignments(patient_id) WHERE activo = TRUE;
CREATE INDEX idx_videos_orden ON public.exercise_videos(numero_orden);

-- ==========================================
-- MATERIALIZED VIEW: COMPLIANCE
-- ==========================================
CREATE MATERIALIZED VIEW public.patient_exercise_compliance AS
SELECT 
    p.id as patient_id,
    p.nombre_completo,
    v.titulo as ejercicio,
    COUNT(DISTINCT DATE_TRUNC('week', esl.fecha_realizacion)) as semanas_activas,
    COUNT(esl.id) as total_sesiones,
    ROUND(
        (COUNT(DISTINCT esl.fecha_realizacion)::DECIMAL / 
        NULLIF(pea.frecuencia_semanal, 0)) * 100, 
        2
    ) as porcentaje_cumplimiento_semanal
FROM public.users p
JOIN public.patient_exercise_assignments pea ON p.id = pea.patient_id
JOIN public.exercise_videos v ON pea.video_id = v.id
LEFT JOIN public.exercise_session_logs esl ON p.id = esl.patient_id 
    AND v.id = esl.video_id 
    AND esl.fecha_realizacion >= CURRENT_DATE - INTERVAL '7 days'
WHERE p.role = 'paciente' AND pea.activo = TRUE
GROUP BY p.id, p.nombre_completo, v.titulo, pea.frecuencia_semanal;

-- Unique index to allow concurrent refresh
CREATE UNIQUE INDEX idx_compliance_view_unique ON public.patient_exercise_compliance(patient_id, ejercicio);

-- ==========================================
-- LOGIC: TRIGGERS
-- ==========================================

-- 1. Health Metrics Trigger
CREATE OR REPLACE FUNCTION calculate_health_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.edad IS NOT NULL THEN
        NEW.frecuencia_cardiaca_maxima := 220 - NEW.edad;
    END IF;
    IF NEW.peso IS NOT NULL AND NEW.estatura IS NOT NULL AND NEW.estatura > 0 THEN
        NEW.imc := ROUND((NEW.peso / (NEW.estatura * NEW.estatura))::numeric, 2);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_metrics
BEFORE INSERT OR UPDATE ON public.clinical_profiles
FOR EACH ROW
EXECUTE FUNCTION calculate_health_metrics();

-- 2. Compliance View Refresh Trigger
CREATE OR REPLACE FUNCTION refresh_compliance_view()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.patient_exercise_compliance;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_compliance_on_log
AFTER INSERT OR UPDATE OR DELETE ON public.exercise_session_logs
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_compliance_view();

CREATE TRIGGER refresh_compliance_on_assignment
AFTER INSERT OR UPDATE OR DELETE ON public.patient_exercise_assignments
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_compliance_view();

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_exercise_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_session_logs ENABLE ROW LEVEL SECURITY;

-- Existing Policies
CREATE POLICY "Users view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Doctors view patients" ON public.users FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'medico') AND role = 'paciente');
CREATE POLICY "View own clinical profile" ON public.clinical_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Doctors view clinical profiles" ON public.clinical_profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'medico'));
CREATE POLICY "Patient manages own logs" ON public.activity_logs FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Doctors view logs" ON public.activity_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'medico'));

-- New Video Module Policies
-- Videos are public read for authenticated users
CREATE POLICY "Authenticated users view videos" ON public.exercise_videos FOR SELECT TO authenticated USING (true);

-- Assignments: Patients view own, Doctors manage all
CREATE POLICY "Patients view assignments" ON public.patient_exercise_assignments FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctors manage assignments" ON public.patient_exercise_assignments FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'medico'));

-- Session Logs: Patients manage own, Doctors view
CREATE POLICY "Patients manage session logs" ON public.exercise_session_logs FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Doctors view session logs" ON public.exercise_session_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'medico'));

-- ==========================================
-- DATA SEED: 8 EXERCISE VIDEOS
-- ==========================================
INSERT INTO public.exercise_videos (numero_orden, titulo, youtube_video_id, youtube_url, tipo_ejercicio, grupos_musculares, repeticiones_sugeridas, equipamiento_necesario, nivel_dificultad) VALUES
(1, 'Variante Pararse y Sentarse', 'O7oFiCMN25E', 
 'https://www.youtube.com/watch?v=O7oFiCMN25E&list=PLzfvYX2AWOMQbgL7_d0wlgA0u2QJX2YNw',
 'fuerza_eeii', 
 ARRAY['cuadriceps', 'gluteos', 'isquiotibiales'],
 '2-3 series de 8-15 repeticiones',
 ARRAY['silla'],
 'principiante'),

(2, 'Remo con Banda Elástica', 'J3VFboUbubo',
 'https://www.youtube.com/watch?v=J3VFboUbubo&list=PLzfvYX2AWOMQbgL7_d0wlgA0u2QJX2YNw&index=2',
 'resistencia',
 ARRAY['dorsal', 'trapecio', 'romboides'],
 '2-3 series de 10-15 repeticiones',
 ARRAY['banda_elastica'],
 'intermedio'),

(3, 'Pararse y Sentarse', 'gWdgSzPrncU',
 'https://www.youtube.com/watch?v=gWdgSzPrncU&list=PLzfvYX2AWOMQbgL7_d0wlgA0u2QJX2YNw&index=3',
 'fuerza_eeii',
 ARRAY['cuadriceps', 'gluteos'],
 '2-3 series de 8-12 repeticiones',
 ARRAY['silla'],
 'principiante'),

(4, 'Extensión de Glúteo', 'G00dG-33QqA',
 'https://www.youtube.com/watch?v=G00dG-33QqA&list=PLzfvYX2AWOMQbgL7_d0wlgA0u2QJX2YNw&index=4',
 'fuerza_eeii',
 ARRAY['gluteos', 'isquiotibiales'],
 '2-3 series de 10-15 repeticiones por pierna',
 ARRAY['banda_elastica', 'silla'],
 'intermedio'),

(5, 'Extensión de Cuádriceps (Versión 1)', 'pX7DEPwYXEE',
 'https://www.youtube.com/watch?v=pX7DEPwYXEE&list=PLzfvYX2AWOMQbgL7_d0wlgA0u2QJX2YNw&index=5',
 'fuerza_eeii',
 ARRAY['cuadriceps'],
 '2-3 series de 10-15 repeticiones',
 ARRAY['banda_elastica', 'silla'],
 'principiante'),

(6, 'Extensión de Cuádriceps (Versión 2)', 'zEa1Eq3yIsw',
 'https://www.youtube.com/watch?v=zEa1Eq3yIsw&list=PLzfvYX2AWOMQbgL7_d0wlgA0u2QJX2YNw&index=6',
 'fuerza_eeii',
 ARRAY['cuadriceps'],
 '2-3 series de 10-15 repeticiones',
 ARRAY['tobilleras', 'silla'],
 'intermedio'),

(7, 'Elevación de Talones', '0caP82ZUo1I',
 'https://www.youtube.com/watch?v=0caP82ZUo1I&list=PLzfvYX2AWOMQbgL7_d0wlgA0u2QJX2YNw&index=7',
 'fuerza_eeii',
 ARRAY['pantorrillas', 'gemelos'],
 '2-3 series de 15-20 repeticiones',
 ARRAY['silla'],
 'principiante'),

(8, 'Curl de Bíceps (Flexión de Codo)', '-FNnffnCPxE',
 'https://www.youtube.com/watch?v=-FNnffnCPxE&list=PLzfvYX2AWOMQbgL7_d0wlgA0u2QJX2YNw&index=8',
 'resistencia',
 ARRAY['biceps', 'antebrazo'],
 '2-3 series de 10-15 repeticiones',
 ARRAY['banda_elastica', 'mancuernas'],
 'principiante');
