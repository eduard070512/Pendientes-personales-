# Pendientes personales

App personal (solo para ti, con inicio de sesión) para organizar:

| Sección | Qué hace |
|---|---|
| **Inicio** | Lo de hoy y atrasado, lo de las próximas 2 semanas y un resumen del dinero del mes. |
| **Pendientes** | Agregar, editar y completar pendientes con fecha, prioridad y categoría. Cada uno tiene **seguimiento** (bitácora) y un botón **Trabajar con Claude** que abre Claude (web o app en el celular) con todo el contexto del pendiente. |
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
| `APP_USER` | Tu usuario para entrar |
| `APP_PASSWORD` | Una contraseña larga |
| `SESSION_SECRET` | 64 caracteres aleatorios (`openssl rand -hex 32`) |
| `APP_URL` *(opcional)* | La URL de tu app, p. ej. `https://pendientes.vercel.app`, para que el mensaje a Claude incluya el enlace al pendiente |

### 3. Deploy
1. Vercel → **Add New → Project → Import** este repositorio. Framework: Next.js (lo detecta solo).
2. **Deploy.** Las tablas se crean solas: el build aplica las migraciones de `drizzle/` a Neon.

### 4. En el celular
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
  app/login/        Inicio de sesión
  db/schema.ts      Tablas
  lib/              Fechas, sesión, parser de estados de cuenta, categorías, estadísticas
  proxy.ts          Protege todas las páginas con la sesión
drizzle/            Migraciones SQL
```

El plan de internships original está en [internships.md](internships.md) y la checklist anterior en [PENDIENTES-INTERNSHIPS.md](PENDIENTES-INTERNSHIPS.md).
