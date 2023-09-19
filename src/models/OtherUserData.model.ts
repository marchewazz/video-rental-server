import Friend from "./Friend.model";
import List from "./List.model";
import Rental from "./Rental.model";

export default interface OtherUserData {
    userID: string;
    userNick: string;
    userLists: List[];
    userRentals: Rental[];
    userFriends: Friend[],
}