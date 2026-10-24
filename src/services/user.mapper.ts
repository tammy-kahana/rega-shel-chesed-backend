// הופך משתמש ממסד הנתונים למבנה שמותר להחזיר ללקוח - בלי passwordHash.
import type { User } from '@prisma/client';
import { ROLE_LABELS, USER_STATUS_LABELS } from '../constants/labels';

export type PublicUser = Omit<User, 'passwordHash'>;

/** השדות שנשלפים ממסד הנתונים כשצריך משתמש "ציבורי" (בלי סיסמה) */
export const publicUserSelect = {
  id: true,
  fullName: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

/** מבנה המשתמש בתשובות ה-API: השדות הציבוריים + שמות בעברית לתפקיד ולסטטוס */
export function toUserResponse(user: PublicUser) {
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role],
    status: user.status,
    statusLabel: USER_STATUS_LABELS[user.status],
    createdAt: user.createdAt,
  };
}

/** האם המשתמש יכול להשתתף במשימות: רכז/ת, או מתנדב מאושר */
export function canParticipate(user: PublicUser): boolean {
  return user.role === 'COORDINATOR' || user.status === 'APPROVED';
}
