import Friend from "./Friend.model";
import Intivation from "./Invitation.model";
import List from "./List.model";
import Rental from "./Rental.model";
import Token from "./Token.model";

export default interface UserData {
    userID: string;
    userNick: string;
    userEmail: string;
    userPassword: string;
    userBalance: number;
    userLists: List[];
    userRentals: Rental[];
    userInvitations: Intivation[];
    userFriends: Friend[],
    userTokens: Token[]
}