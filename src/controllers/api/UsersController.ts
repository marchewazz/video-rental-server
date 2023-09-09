import { Collection, MongoClient } from "mongodb";
import RegisterFormData from "../../models/RegisterFormData.model";
import generateRandomString from "../../util/randomString";
import bcrypt from "bcrypt";
import RegisterUserData from "../../models/RegisterUserData.model";

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
                userRentals: []
            }) 
            
            return res.send({ message: "registeredSuccess"})
        } catch(e) {
            console.log(e);
            return res.send({ message: "errorMessage"})
        } finally {
            client.close()
        }
    }
    loginUser() {
        console.log(`login`);   
    }
}