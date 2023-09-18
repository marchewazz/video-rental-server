import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

import cors from "cors"
import dotenv from 'dotenv';

import ApiRouter from './routers/api/ApiRouter';
import UsersController from './controllers/api/UsersController';
import ShowsController from './controllers/ws/ShowsController';
import ListsController from './controllers/ws/ListsController';
import InvitationsController from './controllers/ws/InvitationsController';

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
  const is: InvitationsController = new InvitationsController()

  webSocketServer.on('connection', function(connection) {

    us.getUserDataByToken(connection.handshake.query.token || "").then((data: any) => {
      if (data.message === "userData") {
        connection.handshake.query.userID = data.userData.userID
        clients.push(connection)
      }
    });

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

    connection.on("sendInvitation",async (data) => {
      const response = await is.saveInvitations(data, connection.handshake.query.token || "")
      
      connection.emit("emitPopUpNotification", { message: response.message })
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
      if (response.message === "invitationSent") {
        clients.forEach(async (client: Socket) => {
          if ("receiverID" in response) {
            if (client.handshake.query.userID === response.receiverID) {
              response.message = "invitationReceived"
              client.emit("emitPopUpNotification", response)
              client.emit("getUserDataByToken", await us.getUserDataByToken(client.handshake.query.token || ""))
            }
          }
        })
      }
    })

    connection.on("acceptInvitation",async (data) => {
      const response = await is.acceptInvitation(data, connection.handshake.query.token || "")
      connection.emit("emitPopUpNotification", response)
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))

      if (response.message === "invitationAccepted") {
        clients.forEach(async (client: Socket) => {
          if ("senderID" in response) {
            if (client.handshake.query.userID === response.senderID) {
              client.emit("getUserDataByToken", await us.getUserDataByToken(client.handshake.query.token || ""))
            }
          }
        })
      }
    })

    connection.on("rejectInvitation",async (data) => {
      const response = await is.rejectInvitation(data, connection.handshake.query.token || "")
      connection.emit("emitPopUpNotification", response)
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))

      if (response.message === "invitationRejected") {
        clients.forEach(async (client: Socket) => {
          if ("senderID" in response) {
            if (client.handshake.query.userID === response.senderID) {
              client.emit("getUserDataByToken", await us.getUserDataByToken(client.handshake.query.token || ""))
            }
          }
        })
      }
    })

    connection.on("cancelInvitation",async (data) => {
      const response = await is.cancelInvitation(data, connection.handshake.query.token || "")
      connection.emit("emitPopUpNotification", response)
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))

      if (response.message === "invitationCancelled") {
        clients.forEach(async (client: Socket) => {
          if ("receiverID" in response) {
            if (client.handshake.query.userID === response.receiverID) {
              client.emit("getUserDataByToken", await us.getUserDataByToken(client.handshake.query.token || ""))
            }
          }
        })
      }
    })

    connection.on('disconnect', function() {
      clients = clients.filter((client: Socket) => client.id != connection.id)
    });
  });
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});