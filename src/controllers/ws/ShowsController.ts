import { MongoClient } from "mongodb";
import generateRandomString from "../../util/randomString";
import e from "express";

export default class ShowsController {
    public async rentVideo(data: any, token: string | string[]) {
        async function generateID(collection: any): Promise<string> {
            let rentalID: string = "";

            while (true) {
                rentalID = generateRandomString(12)
                if (!(await collection.findOne({ userRentals: { $elemMatch: { rentalID: rentalID }} }))) {
                    return rentalID
                }
            }
        }

        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        
        const session = client.startSession()
        return await session.withTransaction(async () => {
            const collection = client.db("video-rental").collection("users")
            const userData = await collection.findOne({ "userTokens.token": token })
            if (userData) {
                if (userData.userBalance > data.rentPrice) {
                    await collection.updateOne({ "userTokens.token": token }, 
                    { $set: {
                        userBalance: userData.userBalance - data.rentPrice,
                    }, 
                    $push: {
                        userRentals: {
                            rentalID: await generateID(collection),
                            rentalShowID: data.showID,
                            rentalExpiring: new Date().setDate(new Date().getDate() + 7),
                            rentalStatus: "active"
                        }
                    }
                    })
                    return ({ message: "rented" })
                } else {
                    session.abortTransaction()
                    return ({ message: "no money" })
                }
            } else {
                session.abortTransaction()
                return ({ message: "no data" })
            } 
        }).catch((e) => {
            console.log(e);
            return ({ message: "error" })
        })
    }
}