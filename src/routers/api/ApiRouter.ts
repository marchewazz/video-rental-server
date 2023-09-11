import { Router } from "express"
import UsersRouter from "./UsersRouter";

const ApiRouter: Router = Router();

ApiRouter.use("/users", UsersRouter);

export default ApiRouter;