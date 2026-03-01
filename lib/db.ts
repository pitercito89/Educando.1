import { hashPassword, isBcryptHash, verifyPassword } from "./security";

export type UserRole = "admin" | "docente" | "director" | "estudiante" | "padre";

export type SchoolUser = {
  id: number;
  username: string;
  full_name: string;
  role: "admin" | "docente" | "director";
  telegram_chat_id: string | null;
  telegram_link_code: string | null;
  created_at: string;
};

export type Student = {
  id: number;
  full_name: string;
  course: string;
  username: string | null;
  password: string | null;
  telegram_chat_id: string | null;
  telegram_link_code: string | null;
  guardian_chat_id: string | null;
  created_at: string;
};

export type Parent = {
  id: number;
  student_id: number;
  full_name: string;
  username: string;
  password: string;
  telegram_chat_id: string | null;
  telegram_link_code: string | null;
  created_at: string;
  student?: Pick<Student, "id" | "full_name" | "course">;
};

export type Subject = {
  id: number;
  name: string;
  level: string;
  created_at: string;
};

export type TeacherSubjectAssignment = {
  id: number;
  teacher_user_id: number;
  subject_id: number;
  created_at: string;
  teacher?: Pick<SchoolUser, "id" | "full_name" | "role" | "username">;
  subject?: Pick<Subject, "id" | "name" | "level">;
};

export type SubjectStudentEnrollment = {
  id: number;
  subject_id: number;
  student_id: number;
  created_at: string;
  student?: Student;
  subject?: Pick<Subject, "id" | "name" | "level">;
};

export type EvaluationDimension = "ser" | "saber" | "hacer" | "decidir";
export type EvaluationInstrumentType =
  | "examen"
  | "practico"
  | "tarea"
  | "proyecto"
  | "participacion"
  | "otro";

export type EvaluationActivity = {
  id: number;
  subject_id: number;
  course: string;
  term: string;
  dimension: EvaluationDimension;
  instrument_type: EvaluationInstrumentType;
  title: string;
  weight: number;
  created_by_user_id: number | null;
  created_at: string;
  subject?: Pick<Subject, "id" | "name" | "level">;
};

export type EvaluationScore = {
  id: number;
  activity_id: number;
  student_id: number;
  score: number;
  created_at: string;
  student?: Pick<Student, "id" | "full_name" | "course">;
  activity?: EvaluationActivity;
};

export type GradeRecord = {
  id: number;
  student_id: number;
  subject_id: number;
  saber: number;
  hacer: number;
  ser: number;
  decidir: number;
  total: number;
  term: string;
  created_at: string;
  student: Pick<Student, "id" | "full_name" | "course">;
  subject: Pick<Subject, "id" | "name" | "level">;
};

export type AttendanceStatus = "presente" | "licencia" | "falta";

export type AttendanceRecord = {
  id: number;
  student_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  created_at: string;
  student: Pick<Student, "id" | "full_name" | "course">;
};

export type NotificationStatus = "enviado" | "pendiente" | "error";
export type NotificationChannel = "telegram" | "interno";

export type NotificationLog = {
  id: number;
  student_id: number | null;
  event_type: string;
  channel: NotificationChannel;
  message: string;
  status: NotificationStatus;
  created_at: string;
  student: Pick<Student, "id" | "full_name" | "course"> | null;
};

export type AttendanceAlert = {
  student_id: number;
  full_name: string;
  course: string;
  incidents: number;
};

export type AuthIdentity = {
  role: UserRole;
  username: string;
  fullName: string;
  schoolUserId?: number;
  studentId?: number;
  parentId?: number;
};

export type AuditEntity =
  | "usuarios"
  | "calificaciones"
  | "asistencias"
  | "notificaciones";

export type AuditAction =
  | "crear"
  | "actualizar"
  | "consolidar"
  | "enviar"
  | "eliminar";

export type AuditLog = {
  id: number;
  actor_role: string;
  actor_username: string;
  actor_user_id: number | null;
  entity: AuditEntity;
  action: AuditAction;
  entity_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};

type DbResult<T> = {
  data: T | null;
  error: string | null;
};

function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return { url, key };
}

function q(value: string): string {
  return encodeURIComponent(value);
}

async function dbRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<DbResult<T>> {
  const config = getSupabaseConfig();
  if (!config) {
    return {
      data: null,
      error:
        "Falta configurar SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  try {
    const response = await fetch(`${config.url}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
        details?: string;
      } | null;
      return {
        data: null,
        error: body?.details ?? body?.message ?? `Error de base de datos (${response.status}).`,
      };
    }

    if (response.status === 204) {
      return { data: null, error: null };
    }

    const data = (await response.json()) as T;
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Error de conexion.",
    };
  }
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<DbResult<AuthIdentity>> {
  const staff = await dbRequest<
    Array<{
      id: number;
      username: string;
      full_name: string;
      role: "admin" | "docente" | "director";
      password: string;
    }>
  >(
    `/rest/v1/school_users?select=id,username,full_name,role,password&username=eq.${q(username)}&limit=1`
  );

  if (staff.error) return { data: null, error: staff.error };
  if (staff.data && staff.data.length > 0) {
    const user = staff.data[0];
    const ok = await verifyPassword(password, user.password);
    if (ok) {
      if (!isBcryptHash(user.password)) {
        const newHash = await hashPassword(password);
        await updateSchoolUserPassword(user.id, newHash);
      }
      return {
        data: {
          role: user.role,
          username: user.username,
          fullName: user.full_name,
          schoolUserId: user.id,
        },
        error: null,
      };
    };
  }

  const students = await dbRequest<
    Array<{
      id: number;
      username: string | null;
      password: string | null;
      full_name: string;
      course: string;
    }>
  >(
    `/rest/v1/students?select=id,username,password,full_name,course&username=eq.${q(username)}&limit=1`
  );
  if (students.error) return { data: null, error: students.error };
  if (students.data && students.data.length > 0) {
    const student = students.data[0];
    const ok = await verifyPassword(password, student.password);
    if (ok) {
      if (!isBcryptHash(student.password)) {
        const newHash = await hashPassword(password);
        await updateStudentPassword(student.id, newHash);
      }
      return {
        data: {
          role: "estudiante",
          username: student.username ?? username,
          fullName: student.full_name,
          studentId: student.id,
        },
        error: null,
      };
    }
  }

  const parents = await dbRequest<
    Array<{
      id: number;
      student_id: number;
      username: string;
      password: string;
      full_name: string;
    }>
  >(
    `/rest/v1/parents?select=id,student_id,username,password,full_name&username=eq.${q(username)}&limit=1`
  );
  if (parents.error) return { data: null, error: parents.error };
  if (parents.data && parents.data.length > 0) {
    const parent = parents.data[0];
    const ok = await verifyPassword(password, parent.password);
    if (ok) {
      if (!isBcryptHash(parent.password)) {
        const newHash = await hashPassword(password);
        await updateParentPassword(parent.id, newHash);
      }
      return {
        data: {
          role: "padre",
          username: parent.username,
          fullName: parent.full_name,
          parentId: parent.id,
          studentId: parent.student_id,
        },
        error: null,
      };
    }
  }

  return { data: null, error: null };
}

export async function listSchoolUsers(): Promise<DbResult<SchoolUser[]>> {
  return dbRequest<SchoolUser[]>(
    "/rest/v1/school_users?select=id,username,full_name,role,telegram_chat_id,telegram_link_code,created_at&order=created_at.desc"
  );
}

export async function createSchoolUser(input: {
  username: string;
  password: string;
  full_name: string;
  role: "docente" | "director";
}): Promise<DbResult<SchoolUser[]>> {
  const secureInput = { ...input, password: await hashPassword(input.password) };
  return dbRequest<SchoolUser[]>("/rest/v1/school_users", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(secureInput),
  });
}

export async function listStudents(): Promise<DbResult<Student[]>> {
  return dbRequest<Student[]>(
    "/rest/v1/students?select=id,full_name,course,username,password,telegram_chat_id,telegram_link_code,guardian_chat_id,created_at&order=full_name.asc"
  );
}

export async function getStudentById(id: number): Promise<DbResult<Student>> {
  const result = await dbRequest<Student[]>(
    `/rest/v1/students?select=id,full_name,course,username,password,telegram_chat_id,telegram_link_code,guardian_chat_id,created_at&id=eq.${id}&limit=1`
  );
  if (result.error) return { data: null, error: result.error };
  return { data: result.data?.[0] ?? null, error: null };
}

export async function createStudent(input: {
  full_name: string;
  course: string;
  username: string;
  password: string;
  guardian_chat_id?: string | null;
}): Promise<DbResult<Student[]>> {
  const secureInput = { ...input, password: await hashPassword(input.password) };
  return dbRequest<Student[]>("/rest/v1/students", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(secureInput),
  });
}

export async function listParents(): Promise<DbResult<Parent[]>> {
  return dbRequest<Parent[]>(
    "/rest/v1/parents?select=id,student_id,full_name,username,password,telegram_chat_id,telegram_link_code,created_at,student:students(id,full_name,course)&order=created_at.desc"
  );
}

export async function listParentsByStudent(studentId: number): Promise<DbResult<Parent[]>> {
  return dbRequest<Parent[]>(
    `/rest/v1/parents?select=id,student_id,full_name,username,password,telegram_chat_id,telegram_link_code,created_at,student:students(id,full_name,course)&student_id=eq.${studentId}&order=created_at.desc`
  );
}

export async function getParentById(id: number): Promise<DbResult<Parent>> {
  const result = await dbRequest<Parent[]>(
    `/rest/v1/parents?select=id,student_id,full_name,username,password,telegram_chat_id,telegram_link_code,created_at,student:students(id,full_name,course)&id=eq.${id}&limit=1`
  );
  if (result.error) return { data: null, error: result.error };
  return { data: result.data?.[0] ?? null, error: null };
}

export async function createParent(input: {
  student_id: number;
  full_name: string;
  username: string;
  password: string;
}): Promise<DbResult<Parent[]>> {
  const secureInput = { ...input, password: await hashPassword(input.password) };
  return dbRequest<Parent[]>("/rest/v1/parents", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(secureInput),
  });
}

export async function updateSchoolUserPassword(
  id: number,
  passwordHash: string
): Promise<DbResult<SchoolUser[]>> {
  return dbRequest<SchoolUser[]>(`/rest/v1/school_users?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ password: passwordHash }),
  });
}

export async function updateStudentPassword(
  id: number,
  passwordHash: string
): Promise<DbResult<Student[]>> {
  return dbRequest<Student[]>(`/rest/v1/students?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ password: passwordHash }),
  });
}

export async function updateParentPassword(
  id: number,
  passwordHash: string
): Promise<DbResult<Parent[]>> {
  return dbRequest<Parent[]>(`/rest/v1/parents?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ password: passwordHash }),
  });
}

export async function listSubjects(): Promise<DbResult<Subject[]>> {
  return dbRequest<Subject[]>(
    "/rest/v1/subjects?select=id,name,level,created_at&order=name.asc"
  );
}

export async function createSubject(input: {
  name: string;
  level: string;
}): Promise<DbResult<Subject[]>> {
  return dbRequest<Subject[]>("/rest/v1/subjects", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(input),
  });
}

export async function listTeacherSubjectAssignments(): Promise<
  DbResult<TeacherSubjectAssignment[]>
> {
  return dbRequest<TeacherSubjectAssignment[]>(
    "/rest/v1/teacher_subject_assignments?select=id,teacher_user_id,subject_id,created_at,teacher:school_users(id,full_name,role,username),subject:subjects(id,name,level)&order=created_at.desc"
  );
}

export async function createTeacherSubjectAssignment(input: {
  teacher_user_id: number;
  subject_id: number;
}): Promise<DbResult<TeacherSubjectAssignment[]>> {
  return dbRequest<TeacherSubjectAssignment[]>(
    "/rest/v1/teacher_subject_assignments",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(input),
    }
  );
}

export async function listSubjectStudentEnrollments(): Promise<
  DbResult<SubjectStudentEnrollment[]>
> {
  return dbRequest<SubjectStudentEnrollment[]>(
    "/rest/v1/subject_student_enrollments?select=id,subject_id,student_id,created_at,student:students(id,full_name,course),subject:subjects(id,name,level)&order=created_at.desc"
  );
}

export async function createSubjectStudentEnrollment(input: {
  subject_id: number;
  student_id: number;
}): Promise<DbResult<SubjectStudentEnrollment[]>> {
  return dbRequest<SubjectStudentEnrollment[]>(
    "/rest/v1/subject_student_enrollments",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(input),
    }
  );
}

export async function listSubjectsByTeacherUserId(
  teacherUserId: number
): Promise<DbResult<Subject[]>> {
  const assignments = await dbRequest<TeacherSubjectAssignment[]>(
    `/rest/v1/teacher_subject_assignments?select=id,teacher_user_id,subject_id,subject:subjects(id,name,level,created_at)&teacher_user_id=eq.${teacherUserId}`
  );
  if (assignments.error || !assignments.data) {
    return { data: null, error: assignments.error ?? "No se pudo cargar materias asignadas." };
  }

  const subjects = assignments.data
    .map((item) => item.subject)
    .filter((item): item is Subject => Boolean(item));

  return { data: subjects, error: null };
}

export async function listStudentsBySubjectIds(
  subjectIds: number[]
): Promise<DbResult<Student[]>> {
  if (subjectIds.length === 0) {
    return { data: [], error: null };
  }

  const ids = subjectIds.join(",");
  const enrollments = await dbRequest<SubjectStudentEnrollment[]>(
    `/rest/v1/subject_student_enrollments?select=id,subject_id,student_id,student:students(id,full_name,course,username,password,telegram_chat_id,telegram_link_code,guardian_chat_id,created_at)&subject_id=in.(${ids})`
  );
  if (enrollments.error || !enrollments.data) {
    return { data: null, error: enrollments.error ?? "No se pudo cargar estudiantes." };
  }

  const unique = new Map<number, Student>();
  for (const row of enrollments.data) {
    if (row.student) unique.set(row.student.id, row.student);
  }
  return { data: Array.from(unique.values()), error: null };
}

export async function isTeacherAssignedToSubject(params: {
  teacher_user_id: number;
  subject_id: number;
}): Promise<DbResult<boolean>> {
  const result = await dbRequest<TeacherSubjectAssignment[]>(
    `/rest/v1/teacher_subject_assignments?select=id&teacher_user_id=eq.${params.teacher_user_id}&subject_id=eq.${params.subject_id}&limit=1`
  );
  if (result.error) return { data: null, error: result.error };
  return { data: Boolean(result.data && result.data.length > 0), error: null };
}

export async function isStudentEnrolledInSubject(params: {
  student_id: number;
  subject_id: number;
}): Promise<DbResult<boolean>> {
  const result = await dbRequest<SubjectStudentEnrollment[]>(
    `/rest/v1/subject_student_enrollments?select=id&student_id=eq.${params.student_id}&subject_id=eq.${params.subject_id}&limit=1`
  );
  if (result.error) return { data: null, error: result.error };
  return { data: Boolean(result.data && result.data.length > 0), error: null };
}

export async function isTeacherAllowedForStudent(params: {
  teacher_user_id: number;
  student_id: number;
}): Promise<DbResult<boolean>> {
  const subjectsResult = await dbRequest<TeacherSubjectAssignment[]>(
    `/rest/v1/teacher_subject_assignments?select=subject_id&teacher_user_id=eq.${params.teacher_user_id}`
  );
  if (subjectsResult.error || !subjectsResult.data) {
    return {
      data: null,
      error: subjectsResult.error ?? "No se pudo validar materias del docente.",
    };
  }
  if (subjectsResult.data.length === 0) return { data: false, error: null };

  const subjectIds = subjectsResult.data.map((item) => item.subject_id).join(",");
  const enrollmentResult = await dbRequest<SubjectStudentEnrollment[]>(
    `/rest/v1/subject_student_enrollments?select=id&student_id=eq.${params.student_id}&subject_id=in.(${subjectIds})&limit=1`
  );
  if (enrollmentResult.error) return { data: null, error: enrollmentResult.error };
  return { data: Boolean(enrollmentResult.data && enrollmentResult.data.length > 0), error: null };
}

export async function listGradeRecords(params?: {
  limit?: number;
  studentId?: number;
}): Promise<DbResult<GradeRecord[]>> {
  const limit = typeof params?.limit === "number" ? params.limit : 30;
  const studentQuery = params?.studentId ? `&student_id=eq.${params.studentId}` : "";
  return dbRequest<GradeRecord[]>(
    `/rest/v1/grade_records?select=id,student_id,subject_id,saber,hacer,ser,decidir,total,term,created_at,student:students(id,full_name,course),subject:subjects(id,name,level)&order=created_at.desc&limit=${limit}${studentQuery}`
  );
}

export async function listGradeRecordsWithLimit(
  limit?: number
): Promise<DbResult<GradeRecord[]>> {
  return listGradeRecords({ limit });
}

export async function upsertGradeRecord(input: {
  student_id: number;
  subject_id: number;
  term: string;
  saber: number;
  hacer: number;
  ser: number;
  decidir: number;
  total: number;
}): Promise<DbResult<GradeRecord[]>> {
  return dbRequest<GradeRecord[]>(
    "/rest/v1/grade_records?on_conflict=student_id%2Csubject_id%2Cterm",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(input),
    }
  );
}

export async function createGradeRecord(input: {
  student_id: number;
  subject_id: number;
  term: string;
  saber: number;
  hacer: number;
  ser: number;
  decidir: number;
  total: number;
}): Promise<DbResult<GradeRecord[]>> {
  return dbRequest<GradeRecord[]>("/rest/v1/grade_records", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(input),
  });
}

export async function listEvaluationActivities(params?: {
  subjectIds?: number[];
  term?: string;
  limit?: number;
}): Promise<DbResult<EvaluationActivity[]>> {
  const limit = typeof params?.limit === "number" ? params.limit : 200;
  const subjectQuery =
    params?.subjectIds && params.subjectIds.length > 0
      ? `&subject_id=in.(${params.subjectIds.join(",")})`
      : "";
  const termQuery = params?.term ? `&term=eq.${q(params.term)}` : "";
  return dbRequest<EvaluationActivity[]>(
    `/rest/v1/evaluation_activities?select=id,subject_id,course,term,dimension,instrument_type,title,weight,created_by_user_id,created_at,subject:subjects(id,name,level)&order=created_at.desc&limit=${limit}${subjectQuery}${termQuery}`
  );
}

export async function getEvaluationActivityById(
  id: number
): Promise<DbResult<EvaluationActivity>> {
  const result = await dbRequest<EvaluationActivity[]>(
    `/rest/v1/evaluation_activities?select=id,subject_id,course,term,dimension,instrument_type,title,weight,created_by_user_id,created_at,subject:subjects(id,name,level)&id=eq.${id}&limit=1`
  );
  if (result.error) return { data: null, error: result.error };
  return { data: result.data?.[0] ?? null, error: null };
}

export async function createEvaluationActivity(input: {
  subject_id: number;
  course: string;
  term: string;
  dimension: EvaluationDimension;
  instrument_type: EvaluationInstrumentType;
  title: string;
  weight: number;
  created_by_user_id?: number | null;
}): Promise<DbResult<EvaluationActivity[]>> {
  return dbRequest<EvaluationActivity[]>("/rest/v1/evaluation_activities", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(input),
  });
}

export async function listEvaluationScores(limit = 120): Promise<DbResult<EvaluationScore[]>> {
  return dbRequest<EvaluationScore[]>(
    `/rest/v1/evaluation_scores?select=id,activity_id,student_id,score,created_at,student:students(id,full_name,course),activity:evaluation_activities(id,subject_id,course,term,dimension,instrument_type,title,weight,created_by_user_id,created_at,subject:subjects(id,name,level))&order=created_at.desc&limit=${limit}`
  );
}

export async function upsertEvaluationScore(input: {
  activity_id: number;
  student_id: number;
  score: number;
}): Promise<DbResult<EvaluationScore[]>> {
  return dbRequest<EvaluationScore[]>(
    "/rest/v1/evaluation_scores?on_conflict=activity_id%2Cstudent_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(input),
    }
  );
}

export async function listEvaluationScoresForConsolidation(params: {
  student_id: number;
  subject_id: number;
  term: string;
}): Promise<DbResult<EvaluationScore[]>> {
  return dbRequest<EvaluationScore[]>(
    `/rest/v1/evaluation_scores?select=id,activity_id,student_id,score,created_at,activity:evaluation_activities!inner(id,subject_id,course,term,dimension,instrument_type,title,weight,created_by_user_id,created_at)&student_id=eq.${params.student_id}&activity.subject_id=eq.${params.subject_id}&activity.term=eq.${q(params.term)}&limit=500`
  );
}

export async function listAttendanceRecords(params?: {
  date?: string;
  limit?: number;
  studentId?: number;
}): Promise<DbResult<AttendanceRecord[]>> {
  const dateQuery = params?.date ? `&attendance_date=eq.${params.date}` : "";
  const limit = typeof params?.limit === "number" ? params.limit : 50;
  const studentQuery = params?.studentId ? `&student_id=eq.${params.studentId}` : "";
  return dbRequest<AttendanceRecord[]>(
    `/rest/v1/attendance_records?select=id,student_id,attendance_date,status,created_at,student:students(id,full_name,course)&order=attendance_date.desc&limit=${limit}${dateQuery}${studentQuery}`
  );
}

export async function upsertAttendanceRecord(input: {
  student_id: number;
  attendance_date: string;
  status: AttendanceStatus;
}): Promise<DbResult<AttendanceRecord[]>> {
  return dbRequest<AttendanceRecord[]>(
    "/rest/v1/attendance_records?on_conflict=student_id%2Cattendance_date",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(input),
    }
  );
}

export async function listAttendanceAlerts(minIncidents = 3): Promise<DbResult<AttendanceAlert[]>> {
  const source = await dbRequest<AttendanceRecord[]>(
    "/rest/v1/attendance_records?select=id,student_id,attendance_date,status,created_at,student:students(id,full_name,course)&status=in.(falta)&order=attendance_date.desc&limit=500"
  );
  if (source.error || !source.data) {
    return { data: null, error: source.error ?? "No se pudo calcular alertas." };
  }

  const grouped = new Map<number, AttendanceAlert>();
  for (const item of source.data) {
    const existing = grouped.get(item.student_id);
    if (existing) {
      existing.incidents += 1;
      continue;
    }
    grouped.set(item.student_id, {
      student_id: item.student_id,
      full_name: item.student.full_name,
      course: item.student.course,
      incidents: 1,
    });
  }

  const alerts = Array.from(grouped.values())
    .filter((item) => item.incidents >= minIncidents)
    .sort((a, b) => b.incidents - a.incidents);
  return { data: alerts, error: null };
}

export async function listNotificationLogs(
  limit = 50
): Promise<DbResult<NotificationLog[]>> {
  return dbRequest<NotificationLog[]>(
    `/rest/v1/notification_logs?select=id,student_id,event_type,channel,message,status,created_at,student:students(id,full_name,course)&order=created_at.desc&limit=${limit}`
  );
}

export async function createNotificationLog(input: {
  student_id?: number | null;
  event_type: string;
  channel: NotificationChannel;
  message: string;
  status: NotificationStatus;
}): Promise<DbResult<NotificationLog[]>> {
  return dbRequest<NotificationLog[]>("/rest/v1/notification_logs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(input),
  });
}

export async function createAuditLog(input: {
  actor_role: string;
  actor_username: string;
  actor_user_id?: number | null;
  entity: AuditEntity;
  action: AuditAction;
  entity_id?: string | null;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
}): Promise<DbResult<AuditLog[]>> {
  return dbRequest<AuditLog[]>("/rest/v1/audit_logs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      ...input,
      actor_user_id: input.actor_user_id ?? null,
      entity_id: input.entity_id ?? null,
      before_data: input.before_data ?? null,
      after_data: input.after_data ?? null,
    }),
  });
}

export async function listAuditLogs(params?: {
  limit?: number;
  entity?: AuditEntity;
  action?: AuditAction;
  actorRole?: string;
  actorUsername?: string;
}): Promise<DbResult<AuditLog[]>> {
  const limit = typeof params?.limit === "number" ? params.limit : 200;
  const entityQuery = params?.entity ? `&entity=eq.${q(params.entity)}` : "";
  const actionQuery = params?.action ? `&action=eq.${q(params.action)}` : "";
  const roleQuery = params?.actorRole ? `&actor_role=eq.${q(params.actorRole)}` : "";
  const usernameQuery = params?.actorUsername
    ? `&actor_username=eq.${q(params.actorUsername)}`
    : "";
  return dbRequest<AuditLog[]>(
    `/rest/v1/audit_logs?select=id,actor_role,actor_username,actor_user_id,entity,action,entity_id,before_data,after_data,created_at&order=created_at.desc&limit=${limit}${entityQuery}${actionQuery}${roleQuery}${usernameQuery}`
  );
}

export async function assignTelegramCode(params: {
  role: "estudiante" | "padre";
  id: number;
  code: string;
}): Promise<DbResult<boolean>> {
  const table = params.role === "estudiante" ? "students" : "parents";
  const result = await dbRequest<Array<{ id: number }>>(
    `/rest/v1/${table}?id=eq.${params.id}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ telegram_link_code: params.code }),
    }
  );
  if (result.error) return { data: null, error: result.error };
  return { data: true, error: null };
}

export async function consumeTelegramCode(params: {
  code: string;
  chatId: string;
}): Promise<
  DbResult<{ role: "estudiante" | "padre"; fullName: string; username: string }>
> {
  const students = await dbRequest<Student[]>(
    `/rest/v1/students?select=id,full_name,username,telegram_link_code&telegram_link_code=eq.${q(params.code)}&limit=1`
  );
  if (students.error) return { data: null, error: students.error };
  if (students.data && students.data.length > 0) {
    const student = students.data[0];
    const update = await dbRequest<Student[]>(
      `/rest/v1/students?id=eq.${student.id}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          telegram_chat_id: params.chatId,
          telegram_link_code: null,
          guardian_chat_id: params.chatId,
        }),
      }
    );
    if (update.error) return { data: null, error: update.error };
    return {
      data: {
        role: "estudiante",
        fullName: student.full_name,
        username: student.username ?? "",
      },
      error: null,
    };
  }

  const parents = await dbRequest<Parent[]>(
    `/rest/v1/parents?select=id,full_name,username,telegram_link_code&telegram_link_code=eq.${q(params.code)}&limit=1`
  );
  if (parents.error) return { data: null, error: parents.error };
  if (parents.data && parents.data.length > 0) {
    const parent = parents.data[0];
    const update = await dbRequest<Parent[]>(
      `/rest/v1/parents?id=eq.${parent.id}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          telegram_chat_id: params.chatId,
          telegram_link_code: null,
        }),
      }
    );
    if (update.error) return { data: null, error: update.error };
    return {
      data: {
        role: "padre",
        fullName: parent.full_name,
        username: parent.username,
      },
      error: null,
    };
  }

  return { data: null, error: "Codigo invalido o expirado." };
}
