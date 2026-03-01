-- Seed realista para pruebas funcionales (Santa Cruz - colegio)
-- Requiere schema.sql ya ejecutado.

begin;

create extension if not exists pgcrypto;

-- 1) Usuarios de sistema
insert into public.school_users (username, password, full_name, role)
select v.username, crypt(v.raw_password, gen_salt('bf', 10)), v.full_name, v.role
from (
  values
    ('admin', 'Admin123*', 'Administrador General', 'admin'),
    ('dir_maria', 'Director123*', 'Maria Elena Vargas', 'director'),
    ('doc_mat_1', 'Docente123*', 'Carlos Rojas', 'docente'),
    ('doc_len_1', 'Docente123*', 'Lucia Fernandez', 'docente'),
    ('doc_cie_1', 'Docente123*', 'Jorge Suárez', 'docente'),
    ('doc_soc_1', 'Docente123*', 'Ana Gutierrez', 'docente'),
    ('doc_ing_1', 'Docente123*', 'Pedro Salinas', 'docente')
) as v(username, raw_password, full_name, role)
where not exists (
  select 1
  from public.school_users su
  where su.username = v.username
);

-- 2) Materias
insert into public.subjects (name, level)
select v.name, v.level
from (
  values
    ('Matematicas', 'Secundaria'),
    ('Lenguaje', 'Secundaria'),
    ('Ciencias Naturales', 'Secundaria'),
    ('Ciencias Sociales', 'Secundaria'),
    ('Ingles', 'Secundaria'),
    ('Fisica', 'Secundaria'),
    ('Quimica', 'Secundaria'),
    ('Educacion Fisica', 'Secundaria'),
    ('Musica', 'Secundaria'),
    ('Artes Plasticas', 'Secundaria')
) as v(name, level)
where not exists (
  select 1
  from public.subjects s
  where s.name = v.name and s.level = v.level
);

-- 3) Estudiantes (60: 20 por curso)
with src as (
  select gs as n,
         case
           when gs between 1 and 20 then '1ro A'
           when gs between 21 and 40 then '2do A'
           else '3ro A'
         end as course
  from generate_series(1, 60) gs
)
insert into public.students (full_name, course, username, password, guardian_chat_id)
select
  'Estudiante ' || lpad(n::text, 2, '0') as full_name,
  course,
  'std' || lpad(n::text, 3, '0') as username,
  crypt('Std12345*', gen_salt('bf', 10)) as password,
  case when n % 7 = 0 then null else null end as guardian_chat_id
from src
where not exists (
  select 1
  from public.students st
  where st.username = 'std' || lpad(src.n::text, 3, '0')
);

-- 4) Padres (se omiten algunos a proposito para escenario borde)
insert into public.parents (student_id, full_name, username, password)
select
  s.id,
  'Padre de ' || s.full_name,
  'pad' || lpad(s.id::text, 3, '0'),
  crypt('Padre123*', gen_salt('bf', 10))
from public.students s
where (s.id % 8) <> 0
  and not exists (
    select 1
    from public.parents p
    where p.username = 'pad' || lpad(s.id::text, 3, '0')
  );

-- 5) Asignacion docente -> materia
insert into public.teacher_subject_assignments (teacher_user_id, subject_id)
select u.id, sub.id
from public.school_users u
join public.subjects sub on
  (u.username = 'doc_mat_1' and sub.name in ('Matematicas', 'Fisica')) or
  (u.username = 'doc_len_1' and sub.name in ('Lenguaje', 'Artes Plasticas')) or
  (u.username = 'doc_cie_1' and sub.name in ('Ciencias Naturales', 'Quimica')) or
  (u.username = 'doc_soc_1' and sub.name in ('Ciencias Sociales', 'Musica')) or
  (u.username = 'doc_ing_1' and sub.name in ('Ingles', 'Educacion Fisica'))
where u.role = 'docente'
  and not exists (
    select 1
    from public.teacher_subject_assignments tsa
    where tsa.teacher_user_id = u.id
      and tsa.subject_id = sub.id
  );

-- 6) Inscripciones estudiante -> materia (todas para pruebas masivas)
insert into public.subject_student_enrollments (subject_id, student_id)
select sub.id, st.id
from public.subjects sub
cross join public.students st
where not exists (
  select 1
  from public.subject_student_enrollments sse
  where sse.subject_id = sub.id
    and sse.student_id = st.id
);

-- 7) Asistencias (escenarios: faltas altas y mixtas)
insert into public.attendance_records (student_id, attendance_date, status)
select
  st.id,
  current_date - ((gs % 10)::int),
  case
    when st.id % 11 = 0 then 'falta'
    when st.id % 9 = 0 then 'licencia'
    else 'presente'
  end
from public.students st
cross join generate_series(1, 4) gs
where not exists (
  select 1
  from public.attendance_records ar
  where ar.student_id = st.id
    and ar.attendance_date = current_date - ((gs % 10)::int)
);

-- 8) Actividades evaluativas por trimestre (1T-2026)
insert into public.evaluation_activities (
  subject_id, course, term, dimension, instrument_type, title, weight, created_by_user_id
)
select
  sub.id,
  course_item.course,
  '1T-2026',
  dim.dimension,
  case
    when dim.dimension in ('saber', 'hacer') then 'examen'
    else 'practico'
  end as instrument_type,
  sub.name || ' - ' || dim.dimension || ' - A1' as title,
  50 as weight,
  tsa.teacher_user_id
from public.subjects sub
join public.teacher_subject_assignments tsa on tsa.subject_id = sub.id
cross join (values ('1ro A'), ('2do A'), ('3ro A')) as course_item(course)
cross join (values ('ser'), ('saber'), ('hacer'), ('decidir')) as dim(dimension)
on conflict do nothing;

insert into public.evaluation_activities (
  subject_id, course, term, dimension, instrument_type, title, weight, created_by_user_id
)
select
  sub.id,
  course_item.course,
  '1T-2026',
  dim.dimension,
  case
    when dim.dimension in ('saber', 'hacer') then 'practico'
    else 'tarea'
  end as instrument_type,
  sub.name || ' - ' || dim.dimension || ' - A2' as title,
  50 as weight,
  tsa.teacher_user_id
from public.subjects sub
join public.teacher_subject_assignments tsa on tsa.subject_id = sub.id
cross join (values ('1ro A'), ('2do A'), ('3ro A')) as course_item(course)
cross join (values ('ser'), ('saber'), ('hacer'), ('decidir')) as dim(dimension)
on conflict do nothing;

-- 9) Notas por actividad (no se cargan todas para dejar "pendientes" en algunos casos)
insert into public.evaluation_scores (activity_id, student_id, score)
select
  ea.id,
  st.id,
  round((55 + (random() * 40))::numeric, 2) as score
from public.evaluation_activities ea
join public.students st on st.course = ea.course
where not (st.id % 13 = 0 and ea.dimension = 'decidir')
  and not exists (
    select 1
    from public.evaluation_scores es
    where es.activity_id = ea.id
      and es.student_id = st.id
  );

-- 10) Algunas consolidaciones de ejemplo en grade_records
insert into public.grade_records (student_id, subject_id, term, saber, hacer, ser, decidir, total)
select
  st.id,
  sub.id,
  '1T-2026',
  70 + (st.id % 25),
  68 + (st.id % 23),
  75 + (st.id % 20),
  65 + (st.id % 22),
  round(((70 + (st.id % 25)) * 0.35 + (68 + (st.id % 23)) * 0.35 + (75 + (st.id % 20)) * 0.15 + (65 + (st.id % 22)) * 0.15)::numeric, 2)
from public.students st
cross join lateral (
  select id from public.subjects order by id limit 3
) sub
where st.id % 5 <> 0 -- deja alumnos con materias pendientes
  and not exists (
    select 1
    from public.grade_records gr
    where gr.student_id = st.id
      and gr.subject_id = sub.id
      and gr.term = '1T-2026'
  );

commit;

-- Credenciales seed:
-- admin / Admin123*
-- dir_maria / Director123*
-- doc_* / Docente123*
-- std001..std060 / Std12345*
-- pad*** / Padre123*
