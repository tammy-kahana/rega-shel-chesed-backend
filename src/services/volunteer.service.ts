// לוגיקת ניהול מתנדבים (לרכזים בלבד): רשימה, אישור/דחייה, קידום לרכז/ת
import { prisma } from '../db/prisma';
import type { VolunteerListQuery, VolunteerStatusInput } from '../schemas/volunteer.schema';
import { AppError } from '../utils/AppError';
import { publicUserSelect, toUserResponse } from './user.mapper';

export async function listVolunteers(query: VolunteerListQuery) {
  const volunteers = await prisma.user.findMany({
    where: { role: 'VOLUNTEER', ...(query.status ? { status: query.status } : {}) },
    select: {
      ...publicUserSelect,
      _count: { select: { signups: { where: { status: 'ACTIVE' } } } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

  return volunteers.map(({ _count, ...volunteer }) => ({
    ...toUserResponse(volunteer),
    activeSignupsCount: _count.signups,
  }));
}

/** מחזיר מתנדב לפי מזהה, או 404 אם אין מתנדב כזה */
async function findVolunteerOrThrow(id: number) {
  const volunteer = await prisma.user.findFirst({ where: { id, role: 'VOLUNTEER' }, select: publicUserSelect });
  if (!volunteer) {
    throw AppError.notFound('המתנדב לא נמצא');
  }
  return volunteer;
}

/** אישור או דחייה (חסימה) של מתנדב */
export async function setVolunteerStatus(id: number, input: VolunteerStatusInput) {
  await findVolunteerOrThrow(id);
  const updated = await prisma.user.update({
    where: { id },
    data: { status: input.status },
    select: publicUserSelect,
  });
  return toUserResponse(updated);
}

/** קידום מתנדב מאושר לרכז/ת. הקידום חד-כיווני, וההצטרפויות של המתנדב נשארות */
export async function promoteVolunteer(id: number) {
  const volunteer = await findVolunteerOrThrow(id);
  if (volunteer.status !== 'APPROVED') {
    throw AppError.conflict('ניתן לקדם לרכז/ת רק מתנדב מאושר');
  }
  const updated = await prisma.user.update({
    where: { id },
    data: { role: 'COORDINATOR' },
    select: publicUserSelect,
  });
  return toUserResponse(updated);
}
