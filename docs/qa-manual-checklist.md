# QA Manual - Educando

## 1) Matriz por rol

### Admin
- Login correcto.
- Crea docente/director con validaciones.
- Crea estudiante/padre.
- Asigna docente->materia.
- Asigna estudiante->materia.
- Crea actividad evaluativa.
- Carga notas individuales y planilla masiva.
- Consolida trimestre.
- Genera boletin trimestral.
- Consulta reportes y CSV.

### Director
- Login correcto.
- No puede crear usuarios.
- No puede registrar notas/asistencias (solo lectura donde aplique).
- Puede ver reportes/boletin.
- Puede enviar notificaciones institucionales.

### Docente
- Login correcto.
- Solo ve materias asignadas.
- Solo ve estudiantes de sus materias.
- Crea actividades solo en materias asignadas.
- Carga notas solo de sus cursos/materias.
- Consolida solo sus materias.
- No puede enviar global (solo estudiantes/cursos de su alcance).

### Estudiante
- Login correcto.
- Ve sus calificaciones/asistencias.
- Vincula Telegram.

### Padre/Madre
- Login correcto.
- Ve seguimiento del estudiante vinculado.
- Vincula Telegram.

## 2) Casos de permisos prohibidos
- Docente intenta calificar materia no asignada.
- Docente intenta cargar asistencia de estudiante fuera de su alcance.
- Docente intenta enviar notificacion global.
- Director intenta crear usuario.
- Estudiante/padre intenta abrir modulos admin.

## 3) Datos incompletos / borde
- Crear usuario sin password.
- Crear estudiante con username invalido.
- Actividad sin dimension o sin peso.
- Nota fuera de rango (menor 0 o mayor 100).
- Consolidacion sin todas las dimensiones.
- Boletin de estudiante sin notas consolidadas.
- Padres sin Telegram (estado pendiente en notificacion).

## 4) Telegram y reportes
- Verificar vinculo Telegram exitoso via codigo.
- Envio de alerta por falta al estudiante.
- Envio de alerta por falta a padre.
- Envio de reunion a padres por curso.
- Descarga CSV calificaciones.
- Descarga CSV asistencias.
- Boletin con materias consolidadas y materias pendientes.
