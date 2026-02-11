import type { IAdmin } from './index.js';

declare global {
  namespace Express {
    interface Request {
      admin?: IAdmin;
    }
  }
}
