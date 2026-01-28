-- REHAPP UACH - INITIALIZATION SCRIPT
-- Run this in the Supabase SQL Editor

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- Users (Links to Supabase Auth)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('paciente', 'medico', 'admin')) NOT NULL,
    nombre_completo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clinical Profiles (Health Data)
CREATE TABLE public.clinical_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) NOT NULL UNIQUE,
    edad INTEGER NOT NULL,
    peso DECIMAL(5,2), -- kg
    estatura DECIMAL(3,2), -- meters
    frecuencia_cardiaca_maxima INTEGER, -- Calculated trigger
    imc DECIMAL(5,2), -- Calculated trigger
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Treatment Plans
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

-- Activity Logs (Walk Sessions)
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

-- Pain Events (Detailed tracking)
CREATE TABLE public.pain_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_log_id UUID REFERENCES public.activity_logs(id) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    nivel_eva INTEGER CHECK (nivel_eva >= 0 AND nivel_eva <= 10) NOT NULL,
    accion_tomada TEXT CHECK (accion_tomada IN ('continuo', 'pausa', 'finalizo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SECURITY (Row Level Security)

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pain_events ENABLE ROW LEVEL SECURITY;

-- Policy Examples (Simplified)
CREATE POLICY "Public Read Own Data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Doctors Read All Patients" ON public.users FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'medico')
);

-- 4. TRIGGERS

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