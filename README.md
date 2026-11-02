# Pendientes personales

App para organizar tu vida: cada persona se **registra gratis** con su correo y ve solo sus datos.

| Sección | Qué hace |
|---|---|
| **Cuentas** | Registro gratis, inicio de sesión, **recuperar contraseña por correo**, Mi cuenta (perfil, cambiar contraseña, cerrar sesión en todos lados, borrar cuenta). Cada usuario tiene su plan (`free` por ahora) para cobrar en el futuro. |
| **Inicio** | Lo de hoy y atrasado, lo de las próximas 2 semanas y un resumen del dinero del mes. |
| **Pendientes** | Agregar, editar y completar pendientes con fecha, prioridad y categoría. Cada uno tiene **seguimiento** (bitácora) y un botón **Trabajar con Claude** que abre Claude (web o app en el celular) con todo el contexto del pendiente. |
| **Classroom** | Tus tareas de Google Classroom: por entregar, atrasadas, entregadas y calificadas, por clase. Botón para **pasarla a pendientes** (se marca hecha sola cuando la entregas) y para **hacerla con Claude**. Aparecen en el calendario y en el inicio. |
| **Calendario** | Vista del mes con todo lo que tiene fecha: pendientes, fechas límite y pasos de internships, seguimientos de trabajos y clientes, pagos fijos y de deudas. Abajo, la agenda día por día (ideal en el celular). |
| **Internships** | Cada internship con su enlace, fecha límite, estado ("¿en qué voy?") y una lista de **pasos** que marcas conforme avanzas. Botón para cargar el plan 2026–2027. |
| **Trabajos** | Vacantes posibles, dónde enviaste tu CV, contacto, sueldo, estado e historial de correos/entrevistas, con fecha de próximo seguimiento. |
| **Clientes** | Prospectos de menús digitales: contacto, teléfono (botón de WhatsApp y llamada), etapa de venta, valor, próximo seguimiento y "¿en qué me quedé?". |
| **Finanzas** | Ingresos y gastos (fijos, variables y extras), gastos/ingresos fijos que se registran con un clic cada mes, deudas con abonos, **importación de estados de cuenta** (PDF, CSV o texto pegado) y estadísticas: cuánto entra, cuánto sale, cuánto te queda, tasa de ahorro, en qué se te va el dinero y los últimos 12 meses. |

> **Estados de cuenta del 23 al 23:** cada movimiento se guarda con su fecha real, así que un estado del 23 de septiembre al 23 de octubre reparte sus gastos entre septiembre y octubre. Si el PDF no trae el año en cada línea, se deduce del periodo. Subir el mismo estado dos veces no duplica movimientos, y cada importación se puede deshacer.

Hecho con Next.js 16, TypeScript, Tailwind, Drizzle ORM y Postgres en Neon.

---

## Puesta en marcha (Neon + Vercel)

### 1. Base de datos en Neon
1. En [console.neon.tech](https://console.neon.tech) crea un proyecto (región **AWS São Paulo / sa-east-1**).
2. En **Connect**, copia la cadena de conexión **pooled** (`…-pooler.sa-east-1.aws.neon.tech/…`).

### 2. Variables de entorno
En Vercel → tu proyecto → **Settings → Environment Variables** agrega:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La cadena de Neon |
| `SESSION_SECRET` | 64 caracteres aleatorios (`openssl rand -hex 32`) |
| `APP_URL` | La URL de tu app, p. ej. `https://pendientes.vercel.app` (para los enlaces de los correos) |
| `N8N_EMAIL_WEBHOOK_URL` / `N8N_EMAIL_SECRET` | Para mandar el correo de "olvidé mi contraseña" con n8n + Gmail (ver abajo) |
| `RESEND_API_KEY` / `EMAIL_FROM` *(alternativa)* | Lo mismo pero con Resend; si está, tiene prioridad sobre n8n |
| `OWNER_EMAIL` *(opcional)* | Si ya usabas la app antes de las cuentas: tus datos viejos pasan a quien se registre con este correo |
| `CRON_SECRET` | Secreto del cron diario de Classroom (`openssl rand -hex 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` *(opcional)* | Para conectar Classroom (ver paso 4) |

### Correos para recuperar contraseña con n8n (recomendado para empezar)
1. Inventa el secreto: abre https://generate-secret.vercel.app/32 y copia el texto.
2. En n8n: **Workflows → Import from file** y elige `public/n8n/enviar-correo.json`.
3. Abre el nodo **Webhook de la app → Credential for Header Auth → Create new**: en *Name* escribe `x-pendientes-secret` y en *Value* pega el secreto. Guarda.
4. Abre el nodo **Enviar con Gmail** y elige (o crea) tu credencial de Gmail.
5. **Activa** el workflow (interruptor arriba a la derecha). Vuelve al nodo Webhook, pestaña **Production URL**, y copia la URL (`https://tu-n8n…/webhook/pendientes-correo`).
6. En Vercel agrega `N8N_EMAIL_WEBHOOK_URL` (esa URL) y `N8N_EMAIL_SECRET` (el mismo secreto) y vuelve a hacer deploy.
7. Prueba: en la app, **¿Olvidaste tu contraseña?** con tu correo.

### Alternativa: Resend (cuando tengas dominio propio)
1. Crea una cuenta gratis en [resend.com](https://resend.com) (3,000 correos al mes).
2. **Domains → Add domain** y agrega los registros DNS que te da (si no tienes dominio, mientras tanto solo puedes enviarte correos a ti mismo con `onboarding@resend.dev`).
3. **API Keys → Create** y pégala en `RESEND_API_KEY`. En `EMAIL_FROM` pon algo como `Pendientes <no-reply@tudominio.com>`.

Si no configuras ni n8n ni Resend, la app funciona igual, pero el enlace para restablecer la contraseña solo aparece en los logs de Vercel.

### 3. Deploy
1. Vercel → **Add New → Project → Import** este repositorio. Framework: Next.js (lo detecta solo).
2. **Deploy.** Las tablas se crean solas: el build aplica las migraciones de `drizzle/` a Neon.

### 4. Classroom (opcional)

Hay dos formas de traer tus tareas. Puedes usar una o las dos.

**A. API de Classroom (recomendada: trae fechas, si ya entregaste y calificación)**
1. En [console.cloud.google.com](https://console.cloud.google.com) crea un proyecto y habilita **Google Classroom API**.
2. **Google Auth Platform → Branding / Audience:** tipo *External*, agrega tu correo de la escuela como usuario de prueba y luego pulsa **Publish app**. Si la dejas en *Testing*, Google borra el acceso cada 7 días. Al conectar verás "app no verificada": entra en *Avanzado → Ir a la app*.
3. **Clients → Create client → Web application**. En *Authorized redirect URIs* pon `https://TU-APP.vercel.app/api/google/callback`.
4. Agrega en Vercel `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `CRON_SECRET` (`openssl rand -hex 32`), y vuelve a hacer deploy.
5. En la app: **Classroom → Conexión con Classroom → Conectar mi cuenta de la escuela**.

Cada usuario conecta su propia cuenta de Google. Se sincroniza con el botón **Sincronizar ahora**, una vez al día para todos con el cron de Vercel (`vercel.json`, 7:00 a. m. de México) y cada vez que n8n llame a `GET /api/cron/classroom` con el **token personal** del usuario (Mi cuenta → Token para n8n).

> Si al conectar Google dice que tu institución bloqueó el acceso (*admin_policy_enforced*), usa la opción B.

**B. Correos de Classroom con n8n (respaldo)**
1. En la app, Classroom → Conexión → descarga el workflow (o usa `public/n8n/classroom-gmail.json`) e impórtalo en n8n.
2. En el nodo **Correo de Classroom** elige tu credencial de Gmail (la de la escuela, o la personal si reenvías ahí los correos de Classroom con un filtro).
3. En la app ve a **Mi cuenta → Token para n8n → Generar token**.
4. En los dos nodos HTTP cambia `TU-APP.vercel.app` por tu dominio y `TU_TOKEN_PERSONAL` por ese token. Actívalo.

El workflow también trae un disparador cada 2 horas que llama a la sincronización de la API (puedes borrarlo si solo usas correos). Desde los correos se obtiene título, clase, enlace y, si viene, la fecha de entrega; cuando llega un correo de "trabajo devuelto" la tarea se marca como devuelta.

### 5. En el celular
Abre la URL y usa **Compartir → Agregar a pantalla de inicio**; se abre como app.

---

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y llena los valores
npm run db:migrate
npm run dev
```

Funciona con Neon o con un Postgres local (`postgresql://postgres@localhost:5432/pp`).

Si cambias `src/db/schema.ts`, genera la migración con `npm run db:generate` y súbela; el siguiente deploy la aplica.

## Estructura

```
src/
  app/(app)/        Secciones (pendientes, calendario, internships, trabajos, clientes, finanzas)
  app/(auth)/       Registro, inicio de sesión y recuperar contraseña
  db/schema.ts      Tablas
  lib/              Fechas, sesión, parser de estados de cuenta y de correos de Classroom, estadísticas
  app/api/          Google OAuth, cron de Classroom y webhook para n8n
  proxy.ts          Protege todas las páginas con la sesión
drizzle/            Migraciones SQL
```

El plan de internships original está en [internships.md](internships.md) y la checklist anterior en [PENDIENTES-INTERNSHIPS.md](PENDIENTES-INTERNSHIPS.md).
