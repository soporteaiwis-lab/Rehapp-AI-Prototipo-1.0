# Rehapp - Plataforma de Telerehabilitación EAP

Prototipo desarrollado para la **Universidad Austral de Chile (UACH)** y el Hospital Regional de Valdivia.

## 📋 Descripción
Aplicación web progresiva (PWA) diseñada para adultos mayores con Enfermedad Arterial Periférica. Permite el seguimiento de caminatas, monitoreo de dolor (Escala EVA) y asistencia nutricional mediante IA.

## 🛠️ Stack Tecnológico
- **Frontend:** HTML5, CSS3, React (ES Modules via Vite/CDN style).
- **Backend/DB:** Supabase (PostgreSQL + Auth).
- **Inteligencia Artificial:** Google Gemini API (Model: gemini-3-flash-preview).
- **Gráficos:** Chart.js.

## 🚀 Instrucciones de Instalación

### 1. Clonar y Configurar
```bash
git clone https://github.com/uach-ehealth/rehapp.git
cd rehapp
npm install # Instala dependencias del backend (opcional para el servidor)
```

### 2. Variables de Entorno
Crea un archivo `.env` en la raíz (para el backend) o configura tus variables en la plataforma de despliegue:
```
SUPABASE_URL=tu_url_supabase
SUPABASE_ANON_KEY=tu_key_anonima
API_KEY=tu_api_key_google_gemini
```

### 3. Base de Datos
1. Accede a tu proyecto en Supabase.
2. Ve al "SQL Editor".
3. Copia y pega el contenido de `database/init_db.sql`.
4. Ejecuta el script para crear tablas y políticas de seguridad.

## ✅ Testing Checklist

### Módulo Paciente
- [ ] **Login:** Ingreso exitoso con email (paciente/medico).
- [ ] **Home:** Visualización correcta de pasos y metas diarias.
- [ ] **Caminata:**
    - [ ] Cronómetro inicia correctamente.
    - [ ] Botón "TENGO DOLOR" abre modal.
    - [ ] **EVA < 5:** Permite continuar.
    - [ ] **EVA >= 8:** Bloquea la pantalla inmediatamente (Alerta Roja).
- [ ] **Nutrición:** Generación de receta usando ingredientes personalizados.

### Módulo Médico
- [ ] **Dashboard:** Carga lista de pacientes.
- [ ] **Alertas:** Identifica pacientes con EVA >= 8 o baja adherencia.
- [ ] **Detalle:** Abre modal con gráfico de historial y permite editar metas.

## 📦 Deployment

### Opción A: Vercel / Netlify (Frontend)
1. Sube este repositorio a GitHub.
2. Importa el proyecto en Vercel.
3. Configura las Environment Variables.
4. Deploy.

### Opción B: Servidor Propio (Node.js)
1. Ejecuta `npm start`.
2. Configura un proxy inverso (Nginx) hacia el puerto 3000.