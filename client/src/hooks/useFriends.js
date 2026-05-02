import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export function useFriends(userId, currentUser) {
  const [friendRequests, setFriendRequests] = useState([]);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const fetchFriendsData = async () => {
      setLoading(true);
      try {
        // Check if friends
        if (userId && userId !== currentUser.uid) {
          const friendQuery = query(
            collection(db, "friends"),
            where("users", "array-contains", currentUser.uid)
          );
          const friendSnapshot = await getDocs(friendQuery);
          const isFriend = friendSnapshot.docs.some(doc => doc.data().users.includes(userId));
          setIsFriend(isFriend);

          // Check if request sent
          const requestQuery = query(
            collection(db, "friendRequests"),
            where("from", "==", currentUser.uid),
            where("to", "==", userId),
            where("status", "==", "pending")
          );
          const requestSnapshot = await getDocs(requestQuery);
          setFriendRequestSent(!requestSnapshot.empty);
        }

        // Fetch incoming requests if viewing own profile
        if (!userId) {
          const requestsQuery = query(
            collection(db, "friendRequests"),
            where("to", "==", currentUser.uid),
            where("status", "==", "pending")
          );
          const requestsSnapshot = await getDocs(requestsQuery);
          const requests = [];
          for (const docSnap of requestsSnapshot.docs) {
            const requestData = docSnap.data();
            const fromUserDoc = await getDoc(doc(db, "users", requestData.from));
            const fromUser = fromUserDoc.exists() ? fromUserDoc.data() : { displayName: "Unknown" };
            requests.push({ id: docSnap.id, ...requestData, fromUser });
          }
          setFriendRequests(requests);
        }
      } catch (error) {
        console.error("Error fetching friends data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriendsData();
  }, [userId, currentUser]);

  const sendFriendRequest = async () => {
    if (!userId || userId === currentUser.uid || friendRequestSent) return;
    try {
      await addDoc(collection(db, "friendRequests"), {
        from: currentUser.uid,
        to: userId,
        status: "pending",
        createdAt: new Date()
      });
      setFriendRequestSent(true);
    } catch (error) {
      console.error("Error sending friend request", error);
    }
  };

  const acceptFriendRequest = async (requestId, fromId) => {
    try {
      await updateDoc(doc(db, "friendRequests", requestId), { status: "accepted" });
      await addDoc(collection(db, "friends"), {
        users: [currentUser.uid, fromId],
        createdAt: new Date()
      });
      setFriendRequests(friendRequests.filter(req => req.id !== requestId));
      if (userId === fromId) setIsFriend(true);
    } catch (error) {
      console.error("Error accepting friend request", error);
    }
  };

  const declineFriendRequest = async (requestId) => {
    try {
      await updateDoc(doc(db, "friendRequests", requestId), { status: "declined" });
      setFriendRequests(friendRequests.filter(req => req.id !== requestId));
    } catch (error) {
      console.error("Error declining friend request", error);
    }
  };

  return {
    friendRequests,
    isFriend,
    friendRequestSent,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest
  };
}