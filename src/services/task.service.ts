// לוגיקת המשימות: רשימה, פרטים, הוספה, עריכה, סימון "בוצעה",
// הצטרפות, ביטול הצטרפות ודיווח ביצוע.
//
// כללי הצפייה:
//   - רכז/ת רואה את כל המשימות.
//   - מתנדב מאושר רואה משימות פתוחות + משימות שהוא פעיל בהן.
//   - מתנדב ממתין או נדחה רואה משימות פתוחות בלבד.
//
// סטטוס המשימה (פתוחה / נתפסה) מחושב בשרת לפי מספר המתנדבים הפעילים.
import { Prisma, type Task, type TaskStatus } from '@prisma/client';
import { AREA_LABELS, SIGNUP_STATUS_LABELS, TASK_STATUS_LABELS, TASK_TYPE_LABELS } from '../constants/labels';
import { prisma } from '../db/prisma';
import type { TaskBodyInput, TaskListQuery } from '../schemas/task.schema';
import { AppError } from '../utils/AppError';
import { dateStringToDate, dateToDateString, todayInIsrael } from '../utils/dates';
import { canParticipate, type PublicUser } from './user.mapper';

type Tx = Prisma.TransactionClient;

// ---------- מבנה התשובה ----------

/** מה נשלף ממסד הנתונים עבור כל משימה ברשימה */
const taskSummaryInclude = {
  createdBy: { select: { id: true, fullName: true } },
  signups: { where: { status: 'ACTIVE' }, select: { volunteerId: true, reportedDone: true } },
} satisfies Prisma.TaskInclude;

type TaskWithSummary = Prisma.TaskGetPayload<{ include: typeof taskSummaryInclude }>;

/** משימה כפי שהיא נשלחת ללקוח ברשימה. privateDetails לא נכלל כאן לעולם */
function toTaskSummary(task: TaskWithSummary, user: PublicUser) {
  const mySignup = task.signups.find((signup) => signup.volunteerId === user.id) ?? null;
  const isCreator = user.role === 'COORDINATOR' && task.createdById === user.id;
  const notDone = task.status !== 'DONE';

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    type: task.type,
    typeLabel: TASK_TYPE_LABELS[task.type],
    area: task.area,
    areaLabel: AREA_LABELS[task.area],
    date: dateToDateString(task.date),
    time: task.time,
    volunteersNeeded: task.volunteersNeeded,
    joinedCount: task.signups.length,
    status: task.status,
    statusLabel: TASK_STATUS_LABELS[task.status],
    createdBy: task.createdBy,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    // ההשתתפות של המשתמש המחובר במשימה (או null אם לא הצטרף)
    mySignup: mySignup ? { reportedDone: mySignup.reportedDone } : null,
    // אילו פעולות המשתמש המחובר יכול לבצע - עוזר להחליט אילו כפתורים להציג.
    // השרת בודק את ההרשאות בעצמו בכל מקרה.
    actions: {
      canEdit: isCreator && notDone,
      canComplete: isCreator && notDone,
      canJoin: canParticipate(user) && task.status === 'OPEN' && !mySignup,
      canCancel: canParticipate(user) && Boolean(mySignup) && notDone,
      canReportDone: canParticipate(user) && Boolean(mySignup) && !mySignup?.reportedDone && notDone,
    },
  };
}

// ---------- הרשאות צפייה ----------

/** תנאי ה-where של המשימות שהמשתמש רשאי לראות */
function visibilityFilter(user: PublicUser): Prisma.TaskWhereInput {
  if (user.role === 'COORDINATOR') {
    return {};
  }
  if (!canParticipate(user)) {
    return { status: 'OPEN' };
  }
  return {
    OR: [{ status: 'OPEN' }, { signups: { some: { volunteerId: user.id, status: 'ACTIVE' } } }],
  };
}

function hasActiveSignup(task: TaskWithSummary, userId: number): boolean {
  return task.signups.some((signup) => signup.volunteerId === userId);
}

function canView(task: TaskWithSummary, user: PublicUser): boolean {
  if (user.role === 'COORDINATOR' || task.status === 'OPEN') {
    return true;
  }
  return canParticipate(user) && hasActiveSignup(task, user.id);
}

// ---------- רשימה ופרטים ----------

export async function listTasks(query: TaskListQuery, user: PublicUser) {
  const filters: Prisma.TaskWhereInput[] = [visibilityFilter(user)];

  if (query.search) {
    filters.push({
      OR: [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ],
    });
  }
  if (query.area) filters.push({ area: query.area });
  if (query.type) filters.push({ type: query.type });
  if (query.status) filters.push({ status: query.status });
  if (query.mine) filters.push({ signups: { some: { volunteerId: user.id, status: 'ACTIVE' } } });

  const direction = query.sort === 'date_desc' ? 'desc' : 'asc';
  const tasks = await prisma.task.findMany({
    where: { AND: filters },
    include: taskSummaryInclude,
    orderBy: [{ date: direction }, { time: direction }, { id: direction }],
  });

  return tasks.map((task) => toTaskSummary(task, user));
}

export async function getTask(id: number, user: PublicUser) {
  const task = await prisma.task.findUnique({ where: { id }, include: taskSummaryInclude });
  if (!task) {
    throw AppError.notFound('המשימה לא נמצאה');
  }
  if (!canView(task, user)) {
    throw AppError.forbidden('אין לך הרשאה לצפות במשימה זו');
  }

  const isCoordinator = user.role === 'COORDINATOR';
  const canSeePrivate = isCoordinator || hasActiveSignup(task, user.id);

  return {
    ...toTaskSummary(task, user),
    // פרטים למתנדבים: רק לרכזים ולמי שפעיל במשימה
    ...(canSeePrivate ? { privateDetails: task.privateDetails } : {}),
    // רשימת המתנדבים (כולל מי שביטל): רק לרכזים
    ...(isCoordinator ? { signups: await listSignups(task.id) } : {}),
  };
}

async function listSignups(taskId: number) {
  const signups = await prisma.signup.findMany({
    where: { taskId },
    include: { volunteer: { select: { id: true, fullName: true, phone: true } } },
    orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
  });
  return signups.map((signup) => ({
    id: signup.id,
    volunteer: signup.volunteer,
    status: signup.status,
    statusLabel: SIGNUP_STATUS_LABELS[signup.status],
    reportedDone: signup.reportedDone,
    joinedAt: signup.joinedAt,
    cancelledAt: signup.cancelledAt,
  }));
}

// ---------- הוספה, עריכה וסימון "בוצעה" (רכזים) ----------

function taskData(input: TaskBodyInput) {
  return {
    title: input.title,
    description: input.description,
    type: input.type,
    area: input.area,
    date: dateStringToDate(input.date),
    time: input.time,
    volunteersNeeded: input.volunteersNeeded,
    privateDetails: input.privateDetails,
  };
}

export async function createTask(input: TaskBodyInput, user: PublicUser) {
  if (input.date < todayInIsrael()) {
    throw AppError.badRequest('הנתונים שנשלחו אינם תקינים', [
      { field: 'date', message: 'תאריך המשימה חייב להיות היום או בעתיד' },
    ]);
  }
  const task = await prisma.task.create({
    data: { ...taskData(input), status: 'OPEN', createdById: user.id },
  });
  return getTask(task.id, user);
}

/** בודק שהמשימה קיימת, שהמשתמש הוא הרכז/ת שיצר/ה אותה, ושהיא לא בוצעה */
async function findOwnTaskForChange(tx: Tx, id: number, user: PublicUser): Promise<Task> {
  const task = await lockTask(tx, id);
  if (task.createdById !== user.id) {
    throw AppError.forbidden('ניתן לשנות רק משימות שיצרת');
  }
  if (task.status === 'DONE') {
    throw AppError.conflict('המשימה כבר סומנה כבוצעה, ולא ניתן לשנות אותה');
  }
  return task;
}

export async function updateTask(id: number, input: TaskBodyInput, user: PublicUser) {
  await prisma.$transaction(async (tx) => {
    await findOwnTaskForChange(tx, id, user);
    const activeCount = await countActive(tx, id);
    if (input.volunteersNeeded < activeCount) {
      throw AppError.badRequest('הנתונים שנשלחו אינם תקינים', [
        {
          field: 'volunteersNeeded',
          message: `כבר הצטרפו ${activeCount} מתנדבים, ולכן הכמות לא יכולה להיות קטנה מ-${activeCount}`,
        },
      ]);
    }
    await tx.task.update({ where: { id }, data: taskData(input) });
    await refreshStatus(tx, id);
  });
  return getTask(id, user);
}

export async function completeTask(id: number, user: PublicUser) {
  await prisma.$transaction(async (tx) => {
    await findOwnTaskForChange(tx, id, user);
    await tx.task.update({ where: { id }, data: { status: 'DONE' } });
  });
  return getTask(id, user);
}

// ---------- הצטרפות, ביטול ודיווח (מתנדבים מאושרים ורכזים) ----------

function assertCanParticipate(user: PublicUser) {
  if (canParticipate(user)) return;
  throw AppError.forbidden(
    user.status === 'PENDING'
      ? 'החשבון שלך ממתין לאישור רכז/ת, ולכן עדיין אי אפשר להצטרף למשימות'
      : 'החשבון שלך אינו מאושר להשתתפות במשימות',
  );
}

export async function joinTask(id: number, user: PublicUser) {
  assertCanParticipate(user);
  await prisma.$transaction(async (tx) => {
    const task = await lockTask(tx, id);
    const existing = await tx.signup.findUnique({ where: { taskId_volunteerId: { taskId: id, volunteerId: user.id } } });

    if (existing?.status === 'ACTIVE') {
      throw AppError.conflict('כבר הצטרפת למשימה זו');
    }
    if (task.status === 'DONE') {
      throw AppError.conflict('המשימה כבר בוצעה');
    }
    if (task.status === 'TAKEN') {
      throw AppError.conflict('המשימה כבר מלאה - הצטרף המספר הנדרש של מתנדבים');
    }

    // מתנדב שביטל ומצטרף שוב: אותה רשומה חוזרת להיות פעילה
    await tx.signup.upsert({
      where: { taskId_volunteerId: { taskId: id, volunteerId: user.id } },
      create: { taskId: id, volunteerId: user.id },
      update: { status: 'ACTIVE', reportedDone: false, joinedAt: new Date(), cancelledAt: null },
    });
    await refreshStatus(tx, id);
  });
  return getTask(id, user);
}

/** מחזיר את ההצטרפות הפעילה של המשתמש למשימה שלא בוצעה, או זורק שגיאה מתאימה */
async function findActiveSignupForChange(tx: Tx, id: number, user: PublicUser) {
  assertCanParticipate(user);
  const task = await lockTask(tx, id);
  const signup = await tx.signup.findUnique({ where: { taskId_volunteerId: { taskId: id, volunteerId: user.id } } });
  if (!signup || signup.status !== 'ACTIVE') {
    throw AppError.conflict('לא הצטרפת למשימה זו');
  }
  if (task.status === 'DONE') {
    throw AppError.conflict('המשימה כבר סומנה כבוצעה');
  }
  return signup;
}

export async function cancelSignup(id: number, user: PublicUser) {
  await prisma.$transaction(async (tx) => {
    const signup = await findActiveSignupForChange(tx, id, user);
    // הביטול לא נמחק - הרכז/ת יראה/תראה שהמתנדב ביטל
    await tx.signup.update({
      where: { id: signup.id },
      data: { status: 'CANCELLED', reportedDone: false, cancelledAt: new Date() },
    });
    await refreshStatus(tx, id);
  });
  return getTask(id, user);
}

export async function reportDone(id: number, user: PublicUser) {
  const signup = await prisma.$transaction(async (tx) => {
    const active = await findActiveSignupForChange(tx, id, user);
    return tx.signup.update({ where: { id: active.id }, data: { reportedDone: true } });
  });
  return {
    id: signup.id,
    taskId: signup.taskId,
    status: signup.status,
    statusLabel: SIGNUP_STATUS_LABELS[signup.status],
    reportedDone: signup.reportedDone,
    joinedAt: signup.joinedAt,
    cancelledAt: signup.cancelledAt,
  };
}

// ---------- עזרים פנימיים ----------

/**
 * נועל את שורת המשימה עד סוף הטרנזקציה.
 * כך שני מתנדבים שלוחצים "הצטרפות" באותו רגע לא יעברו את מספר המקומות.
 */
async function lockTask(tx: Tx, id: number): Promise<Task> {
  await tx.$queryRaw`SELECT "id" FROM "tasks" WHERE "id" = ${id} FOR UPDATE`;
  const task = await tx.task.findUnique({ where: { id } });
  if (!task) {
    throw AppError.notFound('המשימה לא נמצאה');
  }
  return task;
}

function countActive(tx: Tx, taskId: number) {
  return tx.signup.count({ where: { taskId, status: 'ACTIVE' } });
}

/** מחשב מחדש את סטטוס המשימה: "נתפסה" כשהגיעו מספיק מתנדבים, אחרת "פתוחה" */
async function refreshStatus(tx: Tx, id: number) {
  const task = await tx.task.findUniqueOrThrow({ where: { id } });
  if (task.status === 'DONE') return;
  const activeCount = await countActive(tx, id);
  const status: TaskStatus = activeCount >= task.volunteersNeeded ? 'TAKEN' : 'OPEN';
  if (status !== task.status) {
    await tx.task.update({ where: { id }, data: { status } });
  }
}
