# Manual de Usuario - Equipo Rehapp UACH

Este documento guía al equipo médico y técnico en el uso del prototipo.

## 🏥 Perfil Médico (Kinesiólogos/Fisiatras)

### 1. Ingreso al Sistema
Utilice sus credenciales corporativas. Al ingresar, verá el **Dashboard General**.
* **Credencial Demo:** `medico@test.com`

### 2. Interpretación de Alertas
El sistema prioriza visualmente a los pacientes:
* **🔴 ROJO (Crítico):** Paciente reportó dolor EVA 8, 9 o 10 en las últimas 48 horas. Requiere contacto inmediato.
* **🟠 NARANJA (Alerta):** Paciente no ha cumplido el mínimo de 3 sesiones semanales.
* **🟢 VERDE (OK):** Paciente cumpliendo metas sin dolor excesivo.

### 3. Ajuste de Tratamiento
1. Haga clic en "Ver Detalle" en la fila del paciente.
2. Revise el gráfico de **Pasos vs Dolor**.
3. En el panel derecho "Configuración", ajuste:
   * **Meta de Pasos:** Aumente progresivamente (ej. +10% semanal).
   * **Minutos:** Ajuste según tolerancia.
4. Presione "Guardar Cambios".

---

## 👴 Perfil Paciente (Adulto Mayor)

### Consideraciones de Diseño
La interfaz está simplificada para facilitar su uso:
* **Botones Gigantes:** Las acciones principales (Iniciar, Dolor) ocupan gran parte de la pantalla.
* **Feedback Inmediato:** Vibración y sonido al reportar dolor alto.

### Flujo de Caminata
1. El paciente presiona el botón verde **"INICIAR CAMINATA"**.
2. Camina con el teléfono en un bolsillo o koala.
3. Si siente dolor, presiona **"TENGO DOLOR"** (botón rojo).
4. Selecciona la cara que representa su dolor (1-10).
   * **Si es 8+:** La app le ordena detenerse y sentarse.
   * **Si es menor:** La app le anima a continuar con precaución.

### Asistente Nutricional
El paciente ingresa ingredientes por voz o texto (ej: "tengo pollo y acelga"). La IA (Gemini) genera una receta apta para EAP (baja en sodio, antiinflamatoria).