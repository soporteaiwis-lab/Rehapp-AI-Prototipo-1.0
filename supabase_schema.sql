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

-- 6. EXERCISE VIDEOS
CREATE TABLE public.exercise_videos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    url_video TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('fuerza_eeii', 'calentamiento', 'estiramiento')),
    duracion_segundos INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDICES FOR OPTIMIZATION
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_plans_patient ON public.treatment_plans(patient_id);
CREATE INDEX idx_logs_patient ON public.activity_logs(patient_id);
CREATE INDEX idx_logs_date ON public.activity_logs(fecha_hora_inicio);
CREATE INDEX idx_pain_log ON public.pain_events(activity_log_id);

-- TRIGGER FUNCTION: Calculate Health Metrics (IMC & FC Max)
CREATE OR REPLACE FUNCTION calculate_health_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate Max Heart Rate (220 - Age)
    IF NEW.edad IS NOT NULL THEN
        NEW.frecuencia_cardiaca_maxima := 220 - NEW.edad;
    END IF;

    -- Calculate BMI (Weight / Height^2)
    IF NEW.peso IS NOT NULL AND NEW.estatura IS NOT NULL AND NEW.estatura > 0 THEN
        NEW.imc := ROUND((NEW.peso / (NEW.estatura * NEW.estatura))::numeric, 2);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Attach to clinical_profiles
CREATE TRIGGER update_health_metrics
BEFORE INSERT OR UPDATE ON public.clinical_profiles
FOR EACH ROW
EXECUTE FUNCTION calculate_health_metrics();

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pain_events ENABLE ROW LEVEL SECURITY;

-- 1. Users can see their own profile
CREATE POLICY "Users view own profile" ON public.users
FOR SELECT USING (auth.uid() = id);

-- 2. Doctors can view patients
CREATE POLICY "Doctors view patients" ON public.users
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'medico') 
    AND role = 'paciente'
);

-- 3. Clinical Profiles: Owner or Doctor
CREATE POLICY "View own clinical profile" ON public.clinical_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Doctors view clinical profiles" ON public.clinical_profiles
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'medico')
);

-- 4. Activity Logs: Patient creates/reads own, Doctors read
CREATE POLICY "Patient manages own logs" ON public.activity_logs
FOR ALL USING (auth.uid() = patient_id);

CREATE POLICY "Doctors view logs" ON public.activity_logs
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'medico')
);
