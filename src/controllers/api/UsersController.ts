import { Collection, MongoClient, ObjectId } from "mongodb";
import RegisterFormData from "../../models/RegisterFormData.model";
import generateRandomString from "../../util/randomString";
import bcrypt from "bcrypt";
import LoginFormData from "../../models/LoginFormData.model";

export default class UsersController {

    async registerUser(req: Request, res: any): Promise<Response> {

        async function generateID(collection: any): Promise<string> {
            let userID: string = "";

            while (true) {
                userID = generateRandomString(24)
                if (!(await collection.findOne({ userID: userID }))) {
                    return userID
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
                userID: await generateID(collection),
                userEmail: userData.userEmail,
                userNick: userData.userNick,
                userPassword: await bcrypt.hash(userData.userPassword, 10),
                userAmount: 0.00,
                userLists: [
                    {
                        name: "default-favorites",
                        media: []
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
}