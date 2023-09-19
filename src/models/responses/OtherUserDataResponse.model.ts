import UserData from "../UserData.model";

export default interface OtherUserDataResponse {
    message: string,
    userData?: OtherUserDataResponse
}