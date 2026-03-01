# Operacion y Despliegue - Educando

## 1) Variables de entorno obligatorias
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`

## 2) Despliegue recomendado
1. Desplegar app Next.js en Vercel/Render/Fly.io.
2. Configurar variables de entorno en plataforma.
3. Ejecutar `database/schema.sql` en Supabase SQL Editor.
4. (Opcional pruebas) ejecutar `database/seed_realistic.sql`.

## 3) Webhook Telegram estable
1. URL final: `https://TU_DOMINIO/api/telegram/webhook`
2. Registrar webhook:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://TU_DOMINIO/api/telegram/webhook`
3. Verificar:
   `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
4. Debe devolver `ok=true` y sin `last_error_message`.

## 4) Logs y monitoreo
- Registrar errores de acciones server en plataforma de logs (Datadog/Logtail/Sentry).
- Alertar por:
  - errores 5xx,
  - fallas en webhook Telegram,
  - caidas de conectividad Supabase.

## 5) Backup / Restore Supabase
### Backup (recomendado diario)
- Usar backups automáticos de Supabase (plan) y exportaciones SQL periódicas.
- Exportar tablas críticas:
  - `school_users`, `students`, `parents`,
  - `evaluation_activities`, `evaluation_scores`,
  - `grade_records`, `attendance_records`, `notification_logs`, `audit_logs`.

### Restore
1. Restaurar snapshot en entorno staging.
2. Validar integridad (FKs + conteos).
3. Promover restore a producción en ventana controlada.

## 6) Seguridad mínima en producción
- Rotar `TELEGRAM_BOT_TOKEN` si fue expuesto.
- No usar `.env.local` en repositorio.
- Mantener contraseñas hasheadas (bcrypt).
- Revisar periódicamente `audit_logs` para acciones sensibles.
