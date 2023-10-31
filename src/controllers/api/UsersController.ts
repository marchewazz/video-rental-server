import { Collection, MongoClient, ObjectId } from "mongodb";
import RegisterFormData from "../../models/RegisterFormData.model";
import generateRandomString from "../../util/randomString";
import bcrypt from "bcrypt";
import LoginFormData from "../../models/LoginFormData.model";
import Rental from "../../models/Rental.model";
import List from "../../models/List.model";

export default class UsersController {

    async registerUser(req: Request, res: any): Promise<Response> {

        async function generateUserID(collection: any): Promise<string> {
            let userID: string = "";

            while (true) {
                userID = generateRandomString(24)
                if (!(await collection.findOne({ userID: userID }))) {
                    return userID
                }
            }
        }

        async function generateListID(collection: any): Promise<string> {
            let listID: string = "";

            while (true) {
                listID = generateRandomString(24)
                if (!(await collection.findOne({ "userLists.listID": listID }))) {
                    return listID
                }
            }
        }

        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        try {
            const userData: RegisterFormData = (req.body as unknown as RegisterFormData);
            
            const collection: Collection = (await client.connect()).db("video-rental").collection("users")

            if ((await collection.findOne({ userNick: userData.userNick }))) {
                return res.send({ message: "nickTaken"})
            }
            if ((await collection.findOne({ userEmail: userData.userEmail }))) {
                return res.send({ message: "emailTaken"})
            }
            
            await collection.insertOne({
                userID: await generateUserID(collection),
                userEmail: userData.userEmail,
                userNick: userData.userNick,
                userPassword: await bcrypt.hash(userData.userPassword, 10),
                userBalance: 0.00,
                userCreateDate: new Date(),
                userLists: [
                    {
                        listID: await(generateListID(collection)),
                        listName: "default-favorites",
                        listShows: []
                    }
                ],
                userFriends: [],
                userInvitations: [],
                userRentals: [],
                userTokens: []
            }) 
            
            return res.send({ message: "registeredSuccess"})
        } catch(e) {
            console.log(e);
            return res.send({ message: "errorMessage"})
        } finally {
            client.close()
        }
    }

    async loginUser(req: Request, res: any): Promise<Response>  {
        async function generateToken(collection: any): Promise<string> {
            let token: string = "";

            while (true) {
                token = generateRandomString(24)
                if (!(await collection.findOne({ userTokens: { $elemMatch: { token: token }} }))) {
                    return token
                }
            }
        }

        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        try {
            const userData: LoginFormData = (req.body as unknown as LoginFormData);
            let dbUserData;

            const collection = (await client.connect()).db("video-rental").collection("users")

            if (userData.userNick.includes("@")){
                if (!(await collection.findOne({ userEmail: userData.userNick }))) {
                    return res.send({ message: "emailNotExists"})
                } else {
                    dbUserData = await collection.findOne({ userEmail: userData.userNick })
                }
                
            } else {
                if (!(await collection.findOne({ userNick: userData.userNick }))) {
                    return res.send({ message: "nickNotExists"})
                } else {
                    dbUserData = await collection.findOne({ userNick: userData.userNick })
                }
            }
            if (dbUserData) {
                if (await bcrypt.compare(userData.userPassword, dbUserData.userPassword)) {
                    const token: string = await generateToken(collection);
                    
                    await collection.updateOne({ userID: dbUserData.userID }, 
                        { $push: { "userTokens": { token: token, tokenExpiringDate: new Date().setDate(new Date().getDate() + 30)}}}
                    )
                    return res.send({ message: "logged", token: token})
                } else {
                    return res.send({ message: "wrongPassword"})
                }
            } else {
                return res.send({ message: "errorMessage"}) 
            }
        } catch(e) {
            console.log(e);
            return res.send({ message: "errorMessage"})
        } finally {
            client.close()
        } 
    }

    async getUserDataByToken(token: string | string[]): Promise<any> {
        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        try {
            const collection = (await client.connect()).db("video-rental").collection("users")

            const userData = await collection.findOne({ "userTokens.token": token })
            if (userData) {
                await collection.updateOne({ "userTokens.token": token }, { 
                    "$set": { "userTokens.$.tokenExpiringDate": new Date().setDate(new Date().getDate() + 30) }
                })
                return { message: "userData", userData: userData }
            } else {
                return { message: "invalidToken" }
            }
        } catch(e) {
            return { message: "error" }
        } finally {
            client.close()
        }
    }

    async getUserDataByID(req: Request, res: any): Promise<any> {
        
        const userID: any = (req.body as any).userID;

        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        try {
            const collection = (await client.connect()).db("video-rental").collection("users")
            
            const userData = await collection.findOne({ "userID": userID }, {
                projection: {
                    _id: 0,
                    userBalance: 0,
                    userEmail: 0,
                    userPassword: 0,
                    userTokens: 0
                }
                
            })
            if (userData) {
                return res.send({ message: "userData", userData: userData })
            } else {
                return res.send({ message: "invalidUserID" })
            }
        } catch(e) {
            return res.send({ message: "error" })
        } finally {
            client.close()
        }
    }

    async searchForUsers(req: Request, res: any): Promise<any> {
        
        const searchPhrase: any = (req.body as any).searchPhrase;

        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        try {
            const collection = (await client.connect()).db("video-rental").collection("users")
            
            const users = await collection.find({ "userNick": { '$regex' : `^${searchPhrase}`, '$options' : 'i' } }, {
                projection: {
                    _id: 0,
                    userBalance: 0,
                    userEmail: 0,
                    userPassword: 0,
                    userTokens: 0,
                    userLists: 0,
                    userInvitations: 0,
                    userRentals: 0,
                    userCreateDate: 0,
                    userFriends: 0
                }
            }).toArray()            

            return res.send({ "users": users })
        } catch(e) {
            return res.send({ message: "error" })
        } finally {
            client.close()
        }
    }

    public async addMoney(data: any, token: string | string[]) {
        
        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        
        try {
            const collection = (await client.connect()).db("video-rental").collection("users")

            await collection.updateOne({ "userTokens.token": token }, {
                $inc: {
                    "userBalance": Number(data.money)
                }
            },)

            return ({ message: "moneyAdded"})
        } catch(e) {
            console.log(e);
            return ({ message: "errorMessage"})
        } finally {
            client.close()
        } 
    }

    public async getFriendComparasion(data: any, token: string | string[]) {
        
        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        
        try {
            const collection = (await client.connect()).db("video-rental").collection("users")

            const userData = await collection.findOne({ "userTokens.token": token }, { projection: {"userRentals": 1, "userLists": 1 }})
            const friendData = await collection.findOne({ "userID": data.friendID }, { projection: {"userRentals": 1, "userLists": 1 }})

            if (userData && friendData) {
                function getBothRentedIt(): string[] {
                    let ids: string[] = []
                    if (userData && friendData) {
                        for (const rental of userData.userRentals) {
                            if (friendData.userRentals.some((friendRental: Rental) => rental.rentalShowID === friendRental.rentalShowID) && !ids.includes(rental.rentalShowID)) ids.push(rental.rentalShowID)
                        }
                    }
                    
                    return ids;
                }      

                function getBothLikeIt(): string[] {
                    let ids: string[] = []
                    if (userData && friendData) {
                        const userFavorites = userData.userLists.filter((list: List) => list.listName === "default-favorites")[0].listShows;
                        const friendFavorites = friendData.userLists.filter((list: List) => list.listName === "default-favorites")[0].listShows;
             
                        for (const userLike of userFavorites) {
                            if (friendFavorites.some((friendLike: { showID: string }) => friendLike.showID === userLike.showID) && !ids.includes(userLike.showID)) ids.push(userLike.showID)
                        }
                    }
                    
                    return ids;
                }                 

                function friendRentedIt(): string[] {
                    let ids: string[] = []
                    if (userData && friendData) {
                        for (const rental of friendData.userRentals) {
                            if (!userData.userRentals.some((userRental: Rental) => rental.rentalShowID === userRental.rentalShowID) && !ids.includes(rental.rentalShowID)) ids.push(rental.rentalShowID)
                        }
                    }
                    
                    return ids;
                }   

                function friendLikeIt(): string[] {
                    let ids: string[] = []
                    if (userData && friendData) {
                        const userFavorites = userData.userLists.filter((list: List) => list.listName === "default-favorites")[0].listShows;
                        const friendFavorites = friendData.userLists.filter((list: List) => list.listName === "default-favorites")[0].listShows;
                        
                        for (const friendLike of friendFavorites) {
                            if (!userFavorites.some((userLike: { showID: string }) => friendLike.showID === userLike.showID) && !ids.includes(friendLike.showID)) ids.push(friendLike.showID)
                        }
                    }
                    
                    return ids;
                } 

                return ({ message: "comparasion", bothRentedIt: getBothRentedIt(), bothLikeIt: getBothLikeIt(), friendLikeIt: friendLikeIt(), friendRentedIt: friendRentedIt()})
            } else {
                return ({ message: "errorMessage"})
            }
        } catch(e) {
            console.log(e);
            return ({ message: "errorMessage"})
        } finally {
            client.close()
        } 
    }
    
    public async editNick(data: any, token: string | string[]) {
        
        const client: MongoClient = new MongoClient(process.env.MONGODB_URI || "")
        
        try {
            const collection = (await client.connect()).db("video-rental").collection("users")

            const userData = await collection.findOne({ "userTokens.token": token })

            if (userData) {
                const possibleNickTaken = await collection.findOne({ "userNick": data.newNick})

                if (possibleNickTaken) {
                    return ({ message: "nickTaken" })
                } else {
                    await collection.updateOne({ "userTokens.token": token }, { $set: { "userNick": data.newNick }})
                    return ({ message: "profileEdited"})
                }
            }
            return ({ message: "errorMessage"})
        } catch(e) {
            console.log(e);
            return ({ message: "errorMessage"})
        } finally {
            client.close()
        } 
    }
}