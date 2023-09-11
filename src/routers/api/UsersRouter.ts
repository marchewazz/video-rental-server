import { Router } from "express"

import UsersController from "../../controllers/api/UsersController";

const UsersRouter: Router = Router();

const usersController: UsersController = new UsersController();

UsersRouter.post("/register", usersController.registerUser)
UsersRouter.post("/login", usersController.loginUser)

export default UsersRouter;