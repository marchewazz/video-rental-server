import { Router } from "express"

import UsersController from "../../controllers/api/UsersController";

const UsersRouter: Router = Router();

const usersController: UsersController = new UsersController();

UsersRouter.post("/register", usersController.registerUser)
UsersRouter.post("/login", usersController.loginUser)
UsersRouter.get("/generate", usersController.generateUser)
UsersRouter.post("/userDataByID", usersController.getUserDataByID)
UsersRouter.post("/search", usersController.searchForUsers)

export default UsersRouter;