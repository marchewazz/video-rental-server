import UserData from "../UserData.model";

export default interface UserDataResponse {
    message: string,
    userData?: UserData
}