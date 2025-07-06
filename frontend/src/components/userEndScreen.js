import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "../App.css";
import "../tailwind.css";
import { BACKEND_URL } from "../constants.js";

import { io } from "socket.io-client";

function EndGameScreen() {
  const location = useLocation();
  const [rank, setRank] = useState(0);
  const [score, setScore] = useState(0);
  const [name, setName] = useState("");
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
          isHost: false,
        },
      });
      setName(user);
      setSocket(sock);
    }
  }, [location, socket]);

  useEffect(() => {
    if (socket) {
      socket.on("message", (message) => {
        console.log(JSON.stringify(message));
        if (message.messageType === "endgameRatings") {
          setName(message.data.name);
          setRank(message.data.leaderboardPosition);
          setScore(message.data.score);
        }
      });
      return () => {
        socket.off("message");
      };
    }
  }, [socket]);

  const handleOrdinal = (rank) => {
    if (rank % 10 === 1 && rank % 100 !== 11) {
      return `${rank}st`;
    } else if (rank % 10 === 2 && rank % 100 !== 12) {
      return `${rank}nd`;
    } else if (rank % 10 === 3 && rank % 100 !== 13) {
      return `${rank}rd`;
    } else {
      return `${rank}th`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-orange-400 to-blue-600 p-6">
      {/* Rank Display */}
      <div className="bg-yellow-500 text-black font-bold text-4xl sm:text-5xl md:text-6xl px-8 py-4 rounded-lg shadow-lg mb-6 text-center">
        You are{" "}
        <span className="text-black">
          {handleOrdinal(rank)}
        </span>{" "}
        Place!
      </div>

      {/* Information Card */}
      <div className="w-full md:w-3/4 lg:w-2/3 flex flex-col gap-6">
        <div className="bg-blue-800 text-white p-6 rounded-lg shadow-lg text-center">
          <h2 className="text-xl font-semibold">Congratulations {name}!</h2>
          <p className="mt-2 text-lg">
            Great job finishing the game! You scored a total of {score} points!
            Keep pushing for even better scores.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            className="bg-yellow-500 text-black font-semibold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-400 transition"
            onClick={() => (window.location.href = "/")}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}

export default EndGameScreen;
