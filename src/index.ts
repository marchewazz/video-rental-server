import express, { Express, Request, Response } from 'express';
import cors from "cors"
import dotenv from 'dotenv';
import ApiRouter from './routers/api/ApiRouter';

dotenv.config();

const server: Express = express();
const port = process.env.PORT;

server.use(cors())
server.use(express.json());

server.use("/api", ApiRouter)

server.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});