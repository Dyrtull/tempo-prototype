# TEMPO — prototipo (web cliente + panel admin)

Prototipo funcional de la plataforma de coworking musical TEMPO, con datos ficticios. Solo web app y panel administrativo (sin iOS/Android). Los pagos son una simulación visual: nunca se cobra nada.

## Cómo correrlo

```bash
npm install
npm run dev        # desarrollo: http://localhost:5173
npm run build      # genera dist/ (estático, listo para GitHub Pages o Vercel)
```

## Cuentas de demostración (pantalla "Ingresar")

| Cuenta | Rol | Qué muestra |
|---|---|---|
| Mariana Cano | Cliente | Membresía Pro (20 % de descuento), saldo a favor, reservas en cuotas |
| Daniela Mejía | Cliente | Cliente sin membresía |
| Valentina Ríos | Admin | Acceso total al panel (`/#/admin`) |
| Camilo Torres | Empleado | Solo reservas y acceso (el menú se recorta por permisos) |
| Laura Gómez | Empleada | Reservas, moderación y reportes |

Para ver la sincronización en vivo: abre el sitio cliente en una pestaña y el panel admin en otra (cada pestaña tiene su propia sesión). Una reserva hecha en una aparece en el calendario de la otra. "Configuración > Restablecer datos demo" regenera todo.

## Qué incluye

**Cliente:** catálogo y detalle de espacios, reserva con rejilla horaria de disponibilidad real (margen de 30 min, 1–10 h, mismo día, puestos combinables), checkout simulado (pago completo o en cuotas, saldo a favor, temporizador de retención), mis reservas (extender, modificar, cancelar con política de 24 h, código de acceso), membresías con renovación automática, pase diario sin cuenta, perfil personal y de grupo, comunidad (publicaciones, likes, comentarios, seguidores, reportes), recompensas, reseñas, notificaciones, ES/EN.

**Admin:** resumen, calendario por espacio y hora (reservas manuales, bloqueos de mantenimiento), CRUD de espacios, usuarios y empleados con permisos individuales y registro de actividad, finanzas, reportes diario/semanal/mensual (CSV y PDF), membresías y recompensas, acceso inteligente con simulador de puerta e historial, moderación, configuración general de todas las reglas.

## Cómo está organizado (pensado para agregar un backend después)

```
src/
  api/types.ts    Modelo de datos (el "contrato" con un backend futuro)
  api/seed.ts     Datos ficticios, generados relativos a la fecha de hoy
  api/store.ts    Única capa que toca localStorage (sustituible por HTTP/Supabase)
  api/index.ts    Todas las acciones (crear reserva, pagar, cancelar...)
  lib/rules.ts    Reglas de negocio puras: disponibilidad, precios, cuotas, política, validación de código
  hooks.tsx       Idioma (tr('es','en')), formato y hooks de datos/sesión
  components/     Layouts, modal, gráficas, etc.
  pages/client/   Sitio del cliente
  pages/admin/    Panel administrativo
```

Regla de diseño: las pantallas nunca leen ni escriben datos directamente; siempre llaman a `api/index.ts`. Para conectar un backend real se reimplementan esas mismas funciones con llamadas HTTP y las pantallas no cambian.

## Límites del prototipo (por diseño)

- Los datos viven en el navegador (localStorage); la "sincronización en tiempo real" funciona entre pestañas del mismo navegador, no entre personas.
- Sin autenticación real: el login elige una cuenta ficticia.
- Pagos, notificaciones por correo/SMS, renovaciones y reportes automáticos están simulados.
- El acceso inteligente se demuestra con un simulador de puerta; la integración con cerraduras físicas queda para la fase técnica.
- Las "fotografías" de los espacios son ilustraciones generadas (SVG) que se reemplazarían por fotos reales.
