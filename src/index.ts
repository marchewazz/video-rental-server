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
import { MongoClient } from 'mongodb';

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
      const response = Object.assign(await ss.rentVideo(data, connection.handshake.query.token || ""), { eventID : data.eventID })
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
      connection.emit("emitPopUpNotification", response)
    })
    connection.on("cancelRent", async (data) => {
      const response = Object.assign(await ss.cancelRent(data, connection.handshake.query.token || ""), { eventID : data.eventID })
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
      connection.emit("emitPopUpNotification", response)
    })

    connection.on("addToFavorites", async (data) => {
      const response = Object.assign(await ls.addToFavorites(data, connection.handshake.query.token || ""), { eventID : data.eventID })
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
      connection.emit("emitPopUpNotification", response)
    })

    connection.on("removeFromFavorites", async (data) => {
      const response = Object.assign(await ls.removeFromFavorites(data, connection.handshake.query.token || ""), { eventID : data.eventID })
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
      connection.emit("emitPopUpNotification", response)
    })

    connection.on("addMoney", async (data) => {
      const response = Object.assign(await us.addMoney(data, connection.handshake.query.token || ""), { eventID: data.eventID })
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
      connection.emit("emitPopUpNotification", response)
    })

    connection.on("sendInvitation",async (data) => {
      const response = await is.saveInvitations(data, connection.handshake.query.token || "")

      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
      connection.emit("emitPopUpNotification", { message: response.message, eventID: data.eventID })

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
      const response = Object.assign(await is.acceptInvitation(data, connection.handshake.query.token || ""), { eventID: data.eventID })
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
      connection.emit("emitPopUpNotification", response)

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
      const response = Object.assign(await is.rejectInvitation(data, connection.handshake.query.token || ""), { eventID: data.eventID })
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
      connection.emit("emitPopUpNotification", response)

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
      const response = Object.assign(await is.cancelInvitation(data, connection.handshake.query.token || ""), { eventID: data.eventID })
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
      connection.emit("emitPopUpNotification", response)

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
    
    connection.on("deleteFriend",async (data) => {
      const response = Object.assign(await is.deleteFriend(data, connection.handshake.query.token || ""), { eventID: data.eventID })
      connection.emit("getUserDataByToken", await us.getUserDataByToken(connection.handshake.query.token || ""))
      connection.emit("emitPopUpNotification", response)

      if (response.message === "friendDeleted") {
        clients.forEach(async (client: Socket) => {
          if ("friendID" in response) {
            if (client.handshake.query.userID === response.friendID) {
              client.emit("getUserDataByToken", await us.getUserDataByToken(client.handshake.query.token || ""))
            }
          }
        })
      }
    })
    connection.on("getComparasions", async (data) => {
      connection.emit("getComparasions", await us.getFriendComparasion(data, connection.handshake.query.token || ""))
    })
    connection.on('disconnect', function() {
      clients = clients.filter((client: Socket) => client.id != connection.id)
    });
  });

  setInterval(async () => {
    console.log(`db functions`);
    
    const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
    
      try {
        const collection = (await client.connect()).db("video-rental").collection("users")

        await collection.updateMany({ },
          {
          $pull: {
            "userTokens": {
              "tokenExpiringDate": {
                "$lt": new Date().getTime()
              }
            }
          } as any
        }, {
          multi: true
        } as any)

        await collection.updateMany({ }, 
          {
            $set: {
                "userRentals.$[xxx].rentalStatus": "expired",
                "userRentals.$[xxx].rentalExpiredDate": new Date()
            }, 
            $unset: {
                "userRentals.$[xxx].rentalExpiring": 1
            },
            } as any, 
          {
            arrayFilters: [
              { "xxx.rentalExpiring": {
                "$lt": new Date().getTime()
              }, 
              "xxx.rentalStatus": "active"
              }
          ]} as any)

      } catch(e) {
        console.log(e);
      } finally {
        client.close()
      } 
  }, 60000)

  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});