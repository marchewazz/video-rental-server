import { MongoClient } from "mongodb";
import generateRandomString from "../../util/randomString";

export default class InvitationsController {
    public async saveInvitations(data: any, token: string | string[]) {
        
        async function generateInvitationID(collection: any): Promise<string> {
            let invitationID: string = "";

            while (true) {
                invitationID = generateRandomString(24)
                if (!(await collection.findOne({ "userInvitations.invitationID": invitationID }))) {
                    return invitationID
                }
            }
        }

        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        
        const session = client.startSession()

        return await session.withTransaction(async () => {
            const collection = (await client.connect()).db("video-rental").collection("users")

            const userData = await collection.findOne({ "userTokens.token": token })
            const receiverUserData = await collection.findOne({ "userID": data.receiverID })
   
            if (userData && receiverUserData) {
                const invitationData = {
                    invitationID: await generateInvitationID(collection),
                    invitationDate: new Date(),
                    senderID: userData.userID,
                    receiverID: receiverUserData.userID,
                }

                await collection.updateOne({ "userTokens.token": token } , {
                   $push: {
                    "userInvitations": invitationData
                   }
                })

                await collection.updateOne({ "userID": receiverUserData.userID } , {
                   $push: {
                    "userInvitations": invitationData
                   }
                })

                session.commitTransaction()
                return ({ message: "invitationSent", senderNick: userData.userNick, senderID: userData.userID, receiverID: receiverUserData.userID, invitationID: invitationData.invitationID })
            } else {
                session.abortTransaction()
                return ({ message: "errorMessage" })
            } 
        }).catch((e) => {
            console.log(e);
            return ({ message: "errorMessage" })
        })
    }

    public async acceptInvitation(data: any, token: string | string[]) {

        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        
        const session = client.startSession()

        return await session.withTransaction(async () => {
            const collection = (await client.connect()).db("video-rental").collection("users")

            const userData = await collection.findOne({ "userTokens.token": token })
   
            if (userData) {
                await collection.updateOne({ "userTokens.token": token } , {
                   $pull: {
                    "userInvitations": {
                        "invitationID": data.invitationData.invitationID
                    }
                   },
                   $push: {
                    "userFriends": {
                        friendsSinceDate: new Date(),
                        friendID: data.invitationData.senderID
                    }
                   }
                })

                await collection.updateOne({ "userID": data.invitationData.senderID } , {
                   $pull: {
                    "userInvitations":  {
                        "invitationID": data.invitationData.invitationID
                    }
                   },
                   $push: {
                    "userFriends": {
                        friendsSinceDate: new Date(),
                        friendID: userData.userID
                    }
                   }
                })

                session.commitTransaction()
                return ({ message: "invitationAccepted", senderID: data.invitationData.senderID })
            } else {
                session.abortTransaction()
                return ({ message: "errorMessage" })
            } 
        }).catch((e) => {
            console.log(e);
            return ({ message: "errorMessage" })
        })
    }

    public async rejectInvitation(data: any, token: string | string[]) {

        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        
        const session = client.startSession()

        return await session.withTransaction(async () => {
            const collection = (await client.connect()).db("video-rental").collection("users")

            const userData = await collection.findOne({ "userTokens.token": token })
   
            if (userData) {
                await collection.updateOne({ "userTokens.token": token } , {
                   $pull: {
                    "userInvitations": {
                        "invitationID": data.invitationData.invitationID
                    }
                   },
                })

                await collection.updateOne({ "userID": data.invitationData.senderID } , {
                   $pull: {
                    "userInvitations":  {
                        "invitationID": data.invitationData.invitationID
                    }
                   },
                })

                session.commitTransaction()
                return ({ message: "invitationRejected", senderID: data.invitationData.senderID })
            } else {
                session.abortTransaction()
                return ({ message: "errorMessage" })
            } 
        }).catch((e) => {
            console.log(e);
            return ({ message: "errorMessage" })
        })
    }

    public async cancelInvitation(data: any, token: string | string[]) {

        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        
        const session = client.startSession()

        return await session.withTransaction(async () => {
            const collection = (await client.connect()).db("video-rental").collection("users")

            const userData = await collection.findOne({ "userTokens.token": token })
   
            if (userData) {
                await collection.updateOne({ "userTokens.token": token } , {
                   $pull: {
                    "userInvitations": {
                        "invitationID": data.invitationData.invitationID
                    }
                   },
                })

                await collection.updateOne({ "userID": data.invitationData.receiverID } , {
                   $pull: {
                    "userInvitations":  {
                        "invitationID": data.invitationData.invitationID
                    }
                   },
                })

                session.commitTransaction()
                return ({ message: "invitationCancelled", receiverID: data.invitationData.receiverID })
            } else {
                session.abortTransaction()
                return ({ message: "errorMessage" })
            } 
        }).catch((e) => {
            console.log(e);
            return ({ message: "errorMessage" })
        })
    }

    public async deleteFriend(data: any, token: string | string[]) {

        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        
        const session = client.startSession()

        return await session.withTransaction(async () => {
            const collection = (await client.connect()).db("video-rental").collection("users")

            const userData = await collection.findOne({ "userTokens.token": token })
   
            if (userData) {
                await collection.updateOne({ "userTokens.token": token } , {
                   $pull: {
                    "userFriends": {
                        "friendID": data.friendID
                    }
                   },
                })

                await collection.updateOne({ "userID": data.friendID } , {
                   $pull: {
                    "userFriends":  {
                        "friendID": userData.userID
                    }
                   },
                })

                session.commitTransaction()
                return ({ message: "friendDeleted", friendID: data.friendID })
            } else {
                session.abortTransaction()
                return ({ message: "errorMessage" })
            } 
        }).catch((e) => {
            console.log(e);
            return ({ message: "errorMessage" })
        })
    }
}