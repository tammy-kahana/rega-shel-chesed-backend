// ולידציה לניהול מתנדבים
import { z } from 'zod';
import { USER_STATUSES } from '../constants/labels';

export const volunteerListQuerySchema = z.object({
  status: z.enum(USER_STATUSES, { error: 'סטטוס לא תקין' }).optional(),
});

export const volunteerStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    error: 'הסטטוס חייב להיות APPROVED (אישור) או REJECTED (דחייה)',
  }),
});

export type VolunteerListQuery = z.output<typeof volunteerListQuerySchema>;
export type VolunteerStatusInput = z.output<typeof volunteerStatusSchema>;
