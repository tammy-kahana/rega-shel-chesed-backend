// מוסיף ל-Request של Express את השדה user - המשתמש המחובר, שנקבע לפי ה-Token.
import type { PublicUser } from '../services/user.mapper';

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export {};
