-- Ejecuta este script en Supabase SQL Editor (PostgreSQL)
create extension if not exists pgcrypto;

create table if not exists public.school_users (
  id bigint generated always as identity primary key,
  username text not null unique,
  password text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'docente', 'director')),
  is_active boolean not null default true,
  telegram_chat_id text,
  telegram_link_code text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id bigint generated always as identity primary key,
  full_name text not null,
  course text not null,
  academic_status text not null default 'activo' check (academic_status in ('activo', 'graduado', 'retirado')),
  is_active boolean not null default true,
  username text unique,
  password text,
  telegram_chat_id text,
  telegram_link_code text unique,
  guardian_chat_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.parents (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students (id) on delete cascade,
  full_name text not null,
  username text not null unique,
  password text not null,
  is_active boolean not null default true,
  telegram_chat_id text,
  telegram_link_code text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id bigint generated always as identity primary key,
  name text not null,
  level text not null,
  created_at timestamptz not null default now(),
  unique (name, level)
);

create table if not exists public.teacher_subject_assignments (
  id bigint generated always as identity primary key,
  teacher_user_id bigint not null references public.school_users (id) on delete cascade,
  subject_id bigint not null references public.subjects (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_user_id, subject_id)
);

create table if not exists public.subject_student_enrollments (
  id bigint generated always as identity primary key,
  subject_id bigint not null references public.subjects (id) on delete cascade,
  student_id bigint not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (subject_id, student_id)
);

create table if not exists public.evaluation_activities (
  id bigint generated always as identity primary key,
  subject_id bigint not null references public.subjects (id) on delete cascade,
  course text not null,
  term text not null,
  dimension text not null check (dimension in ('ser', 'saber', 'hacer', 'decidir')),
  instrument_type text not null check (instrument_type in ('examen', 'practico', 'tarea', 'proyecto', 'participacion', 'otro')),
  title text not null,
  weight numeric(6,3) not null check (weight > 0 and weight <= 100),
  created_by_user_id bigint references public.school_users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.evaluation_scores (
  id bigint generated always as identity primary key,
  activity_id bigint not null references public.evaluation_activities (id) on delete cascade,
  student_id bigint not null references public.students (id) on delete cascade,
  score numeric(5,2) not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (activity_id, student_id)
);

create table if not exists public.grade_records (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students (id) on delete restrict,
  subject_id bigint not null references public.subjects (id) on delete restrict,
  term text not null,
  saber numeric(5,2) not null check (saber between 0 and 100),
  hacer numeric(5,2) not null check (hacer between 0 and 100),
  ser numeric(5,2) not null check (ser between 0 and 100),
  decidir numeric(5,2) not null check (decidir between 0 and 100),
  total numeric(5,2) not null check (total between 0 and 100),
  created_at timestamptz not null default now(),
  unique (student_id, subject_id, term)
);

create table if not exists public.attendance_records (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students (id) on delete restrict,
  attendance_date date not null,
  status text not null check (status in ('presente', 'licencia', 'falta')),
  created_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);

create table if not exists public.notification_logs (
  id bigint generated always as identity primary key,
  student_id bigint references public.students (id) on delete set null,
  event_type text not null,
  channel text not null check (channel in ('telegram', 'interno')),
  message text not null,
  status text not null check (status in ('enviado', 'pendiente', 'error')),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_role text not null,
  actor_username text not null,
  actor_user_id bigint,
  entity text not null check (entity in ('usuarios', 'calificaciones', 'asistencias', 'notificaciones')),
  action text not null check (action in ('crear', 'actualizar', 'consolidar', 'enviar', 'eliminar')),
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.school_users add column if not exists password text;
alter table public.school_users add column if not exists telegram_chat_id text;
alter table public.school_users add column if not exists telegram_link_code text unique;
alter table public.school_users add column if not exists is_active boolean not null default true;

alter table public.students add column if not exists username text;
alter table public.students add column if not exists password text;
alter table public.students add column if not exists telegram_chat_id text;
alter table public.students add column if not exists telegram_link_code text;
alter table public.students add column if not exists academic_status text not null default 'activo';
alter table public.students add column if not exists is_active boolean not null default true;

alter table public.parents add column if not exists is_active boolean not null default true;

alter table public.students drop constraint if exists students_academic_status_check;
alter table public.students
  add constraint students_academic_status_check
  check (academic_status in ('activo', 'graduado', 'retirado'));

-- Migracion de seguridad: hashear passwords legadas en texto plano usando bcrypt (pgcrypto/crypt)
update public.school_users
set password = crypt(password, gen_salt('bf', 10))
where password is not null
  and password <> ''
  and password !~ '^\$2[aby]\$';

update public.students
set password = crypt(password, gen_salt('bf', 10))
where password is not null
  and password <> ''
  and password !~ '^\$2[aby]\$';

update public.parents
set password = crypt(password, gen_salt('bf', 10))
where password is not null
  and password <> ''
  and password !~ '^\$2[aby]\$';

-- Eliminar cualquier check previo de status (aunque el nombre sea distinto)
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint pc
    join pg_class t on t.oid = pc.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'attendance_records'
      and pc.contype = 'c'
      and pg_get_constraintdef(pc.oid) ilike '%status%'
  loop
    execute format('alter table public.attendance_records drop constraint %I', c.conname);
  end loop;
end $$;

-- Normalizar datos legados despues de quitar constraints viejas
update public.attendance_records
set status = lower(trim(status))
where status is not null
  and status <> lower(trim(status));

-- Mapear estados antiguos al nuevo modelo
update public.attendance_records set status = 'licencia' where status in ('justificado', 'tarde');
update public.attendance_records set status = 'falta' where status = 'ausente';

-- Cualquier valor antiguo/invalido se convierte a falta
update public.attendance_records
set status = 'falta'
where status not in ('presente', 'licencia', 'falta');

alter table public.attendance_records
  add constraint attendance_records_status_check
  check (status in ('presente', 'licencia', 'falta')) not valid;

alter table public.attendance_records
  validate constraint attendance_records_status_check;

alter table public.school_users enable row level security;
alter table public.students enable row level security;
alter table public.parents enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_subject_assignments enable row level security;
alter table public.subject_student_enrollments enable row level security;
alter table public.evaluation_activities enable row level security;
alter table public.evaluation_scores enable row level security;
alter table public.grade_records enable row level security;
alter table public.attendance_records enable row level security;
alter table public.notification_logs enable row level security;
alter table public.audit_logs enable row level security;

-- Para esta fase, el servidor usa SERVICE ROLE KEY.
-- Si luego quieres acceso desde cliente, definimos politicas RLS por rol.
