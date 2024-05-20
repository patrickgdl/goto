import express, { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

export const healthCheckRouter: Router = (() => {
  const router = express.Router();

  router.get('/', (_req: Request, res: Response) => {
    return res.status(StatusCodes.OK).send('Service is healthy');
  });

  return router;
})();
