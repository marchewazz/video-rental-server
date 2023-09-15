import { MongoClient } from "mongodb";

export default class ListsController {
    public async addToFavorites(data: any, token: string | string[]) {
        
        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        
        try {
            const collection = (await client.connect()).db("video-rental").collection("users")

            await collection.updateOne({ "userTokens.token": token }, {
                $push: {
                    "userLists.$[xxx].listShows": {
                        showID: data.showID
                    }
                }
            }, {
                arrayFilters: [
                    { "xxx.listName": "default-favorites" }
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
                    "userLists.$[xxx].listShows": {
                        showID: data.showID
                    }
                }
            }, {
                arrayFilters: [
                    { "xxx.listName": "default-favorites" }
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