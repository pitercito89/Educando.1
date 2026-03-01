# E2E Checklist - Flujo Completo Docente

## Objetivo
Validar flujo completo: docente -> calificar -> consolidar -> boletin -> notificacion.

## Pasos
1. Login como docente asignado.
2. Crear actividad evaluativa en materia asignada.
3. Cargar notas (planilla masiva) para curso asignado.
4. Consolidar trimestre de un estudiante.
5. Verificar `grade_records` actualizado.
6. Verificar notificacion registrada en `notification_logs`.
7. Login como admin/director.
8. Generar boletin del mismo estudiante y periodo.
9. Verificar materia consolidada en boletin.
10. Verificar materias no consolidadas como `Pendiente`.

## Resultado esperado
- No hay errores de permisos.
- No se puede operar fuera del alcance del docente.
- Boletin consistente con consolidacion.
- Notificacion y auditoria registradas.
