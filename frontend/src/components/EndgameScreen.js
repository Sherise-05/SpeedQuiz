import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BACKEND_URL, FRONTEND_URL } from "../constants.js";
import { io } from "socket.io-client";
import "../App.css";
import "../tailwind.css";

const EndgameScreen = () => {
  const location = useLocation();
  const [leaderboard, setLeaderboard] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get("roomID");
    const user = queryParams.get("username");

    // Create the socket connection
    if (!socket) {
      const sock = io(BACKEND_URL, {
        query: {
          name: user,
          roomID: code,
          isHost: queryParams.get("host"),
        },
      });
      setSocket(sock);
    }
  }, [location, socket]);

  useEffect(() => {
    if (socket) {
      socket.emit("message", { messageType: "displayLeaderboard" });

      socket.on("message", (message) => {
        console.log(JSON.stringify(message));
        if (message.messageType === "leaderboard") {
          setLeaderboard(message.data);
        }
      });

      return () => {
        socket.off("message");
      };
    }
  }, [socket]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
      <h1 className="text-4xl font-bold mb-4">Results</h1>

      {/* Leaderboard */}
      <div className="w-full max-w-2xl bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-semibold mb-3">Leaderboard</h2>
        <ol className="list-decimal pl-6">
          {leaderboard.leaderboard?.map((player, index) => (
            <li key={index} className="text-lg py-1">
              {player.username} - ({player.correctCount}/
              {leaderboard.maxQuestions} correct)
            </li>
          ))}
        </ol>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center w-full max-w-lg h-96 space-x-4 mt-28">
        {leaderboard.leaderboard?.length >= 3 && (
          <>
            <div className="bg-gray-700 text-center p-4 w-1/3 h-40 flex items-center justify-center text-xl font-bold">
              {leaderboard.leaderboard[1]?.username || "2nd"}
            </div>
            <div className="bg-gray-700 text-center p-4 w-1/3 h-52 flex items-center justify-center text-xl font-bold">
              {leaderboard.leaderboard[0]?.username || "1st"}
            </div>
            <div className="bg-gray-700 text-center p-4 w-1/3 h-36 flex items-center justify-center text-xl font-bold">
              {leaderboard.leaderboard[2]?.username || "3rd"}
            </div>
          </>
        )}
      </div>

      {/* Button to start a new game */}
      <button
        onClick={() => (window.location.href = `${BACKEND_URL}/create_lobby`)}
        className="mt-8 bg-blue-800 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Start a new game
      </button>
    </div>
  );
};

export default EndgameScreen;
