import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth';
import type { TaskListQuery } from '../schemas/task.schema';
import * as taskService from '../services/task.service';

/** המזהה מהכתובת (כבר עבר ולידציה והומר למספר) */
function taskId(req: Request): number {
  return Number(req.params.id);
}

export async function list(req: Request, res: Response) {
  res.json(await taskService.listTasks(req.query as unknown as TaskListQuery, currentUser(req)));
}

export async function getOne(req: Request, res: Response) {
  res.json(await taskService.getTask(taskId(req), currentUser(req)));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await taskService.createTask(req.body, currentUser(req)));
}

export async function update(req: Request, res: Response) {
  res.json(await taskService.updateTask(taskId(req), req.body, currentUser(req)));
}

export async function complete(req: Request, res: Response) {
  res.json(await taskService.completeTask(taskId(req), currentUser(req)));
}

export async function join(req: Request, res: Response) {
  res.json(await taskService.joinTask(taskId(req), currentUser(req)));
}

export async function cancel(req: Request, res: Response) {
  res.json(await taskService.cancelSignup(taskId(req), currentUser(req)));
}

export async function reportDone(req: Request, res: Response) {
  res.json(await taskService.reportDone(taskId(req), currentUser(req)));
}
