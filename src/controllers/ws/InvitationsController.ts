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
}