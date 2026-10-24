import type { Request, Response } from 'express';
import type { VolunteerListQuery } from '../schemas/volunteer.schema';
import * as volunteerService from '../services/volunteer.service';

export async function list(req: Request, res: Response) {
  res.json(await volunteerService.listVolunteers(req.query as VolunteerListQuery));
}

export async function setStatus(req: Request, res: Response) {
  res.json(await volunteerService.setVolunteerStatus(Number(req.params.id), req.body));
}

export async function promote(req: Request, res: Response) {
  res.json(await volunteerService.promoteVolunteer(Number(req.params.id)));
}
