import { MongoClient } from "mongodb";
import generateRandomString from "../../util/randomString";

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
                    return ({ message: "noMoney" })
                }
            } else {
                session.abortTransaction()
                return ({ message: "errorMessage" })
            } 
        }).catch((e) => {
            console.log(e);
            return ({ message: "errorMessage" })
        })
    }
    
    public async cancelRent(data: any, token: string | string[]) {
        
        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        
        try {
            const collection = (await client.connect()).db("video-rental").collection("users")

            await collection.updateOne({ "userTokens.token": token, "userRentals.rentalID": data.rentalID }, {
                $set: {
                    "userRentals.$[xxx].rentalStatus": "cancelled",
                    "userRentals.$[xxx].rentalCancelledDate": new Date().getTime()
                }, 
                $unset: {
                    "userRentals.$[xxx].rentalExpiring": 1
                }
            }, {
                arrayFilters: [
                    { "xxx.rentalID": data.rentalID }
                ]
            })

            return ({ message: "rentalCancelled"})
        } catch(e) {
            console.log(e);
            return ({ message: "errorMessage"})
        } finally {
            client.close()
        } 
    }

    public async addToFavorites(data: any, token: string | string[]) {
        
        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        
        try {
            const collection = (await client.connect()).db("video-rental").collection("users")

            await collection.updateOne({ "userTokens.token": token }, {
                $push: {
                    "userLists.$[xxx].media": {
                        showID: data.showID
                    }
                }
            }, {
                arrayFilters: [
                    { "xxx.name": "default-favorites" }
                ]
            })

            return ({ message: "addedToFavorites"})
        } catch(e) {
            console.log(e);
            return ({ message: "errorMessage"})
        } finally {
            client.close()
        } 
    }

    public async removeFromFavorites(data: any, token: string | string[]) {
        
        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        
        try {
            const collection = (await client.connect()).db("video-rental").collection("users")

            await collection.updateOne({ "userTokens.token": token }, {
                $pull: {
                    "userLists.$[xxx].media": {
                        showID: data.showID
                    }
                }
            }, {
                arrayFilters: [
                    { "xxx.name": "default-favorites" }
                ]
            })

            return ({ message: "removedFromFavorites"})
        } catch(e) {
            console.log(e);
            return ({ message: "errorMessage"})
        } finally {
            client.close()
        } 
    }
}