import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

import cors from "cors"
import dotenv from 'dotenv';

import ApiRouter from './routers/api/ApiRouter';
import UsersController from './controllers/api/UsersController';
import ShowsController from './controllers/ws/ShowsController';
import ListsController from './controllers/ws/ListsController';

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

  let clients: Socket[] = [];

  const us: UsersController = new UsersController()
  const ss: ShowsController = new ShowsController()
  const ls: ListsController = new ListsController()

  webSocketServer.on('connection', function(connection) {
    connection.on("getUserDataByToken", async (data) => {
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
    })
    connection.on("rentShow", async (data) => {
      connection.emit("emitPopUpNotification", await ss.rentVideo(data, connection.handshake.query.token || ""))
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
    })
    connection.on("cancelRent", async (data) => {
      connection.emit("emitPopUpNotification", await ss.cancelRent(data, connection.handshake.query.token || ""))
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
    })

    connection.on("addToFavorites", async (data) => {
      connection.emit("emitPopUpNotification", await ls.addToFavorites(data, connection.handshake.query.token || ""))
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
    })

    connection.on("removeFromFavorites", async (data) => {
      connection.emit("emitPopUpNotification", await ls.removeFromFavorites(data, connection.handshake.query.token || ""))
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
    })

    connection.on("addMoney", async (data) => {
      connection.emit("emitPopUpNotification", await us.addMoney(data, connection.handshake.query.token || ""))
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
    })
    connection.on('disconnect', function() {
      clients = clients.filter((client: Socket) => client.id != connection.id)
    });
    clients.push(connection)
    console.log(clients.length);
  });
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});