import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import cors from "cors"
import dotenv from 'dotenv';

import ApiRouter from './routers/api/ApiRouter';
import UsersController from './controllers/api/UsersController';
import ShowsController from './controllers/ws/ShowsController';

dotenv.config();

const app: Express = express();
const server = createServer(app)
const webSocketServer = new Server(server, {
  cors: {
    origin: "*",
    credentials: true
  }
})

const port = process.env.PORT;

app.use(cors())
app.use(express.json());

app.use("/api", ApiRouter)

server.listen(port, () => {

  const us: UsersController = new UsersController()
  const ss: ShowsController = new ShowsController()

  webSocketServer.on('connection', function(connection) {
    connection.on("getUserDataByToken", async (data) => {
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
    })
    connection.on("rentShow", async (data) => {
      connection.emit("rentShow", await ss.rentVideo(data, connection.handshake.query.token || ""))
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
    })
    connection.on('disconnect', function() {
      console.log(`disconnect`);
    });
    console.log(`Recieved a new connection.`);
  });
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});