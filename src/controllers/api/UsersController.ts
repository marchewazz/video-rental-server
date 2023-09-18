import { Collection, MongoClient, ObjectId } from "mongodb";
import RegisterFormData from "../../models/RegisterFormData.model";
import generateRandomString from "../../util/randomString";
import bcrypt from "bcrypt";
import LoginFormData from "../../models/LoginFormData.model";
import RegisterUserData from "../../models/RegisterUserData.model";

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
            
            const collection = (await client.connect()).db("video-rental").collection("users")

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
            
            const userData = await collection.findOne({ "userID": userID })
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
}