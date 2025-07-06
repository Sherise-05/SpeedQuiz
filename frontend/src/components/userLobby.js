import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../constants.js";
import { io } from "socket.io-client";

function UserLobby() {
  const location = useLocation();
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState(null);
  const [username, setUsername] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [isHost, setIsHost] = useState(false);

  // Use useRef to store socket to avoid re-renders
  const socketRef = useRef(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get("roomID");
    const user = queryParams.get("username");
    const host = queryParams.get("host") === "true";
    setUsername(user);
    setGameCode(code);
    setIsHost(host);

    // If socket doesn't exist, create a new one
    if (!socketRef.current) {
      const sock = io(BACKEND_URL, {
        query: {
          name: user,
          roomID: code,
          isHost: host,
        },
      });

      socketRef.current = sock;

      sock.on("redirect", (url) => {
        console.log("Redirecting to:", url);
        window.location.href = url;
      });

      sock.on("message", (message) => {
        if (message.messageType === "gameStart") {
          console.log("Game starting...");
          setCountdown(5);
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [location]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    console.log(`Countdown: ${countdown}`);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(timer);
          console.log("Redirecting to game...");
          if (isHost) {
            navigate(`/host?roomID=${gameCode}&host=True`);
          } else {
            navigate(`/gameloop?roomID=${gameCode}&username=${username}`);
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, navigate, gameCode, username, isHost]);

  const startGame = () => {
    if (socketRef.current) {
      socketRef.current.emit("message", { messageType: "gameStart" });
    }
  };

  return (
    <div className="userLobby">
      <div className="bg-[#0080ff] flex flex-col min-h-screen h-screen">
        <h3 className="text-slate-200 px-2 py-2 p-1 m-2 text-center text-base font-bold sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl">
          {countdown !== null
            ? `Game starting in ${countdown}...`
            : "Welcome to the lobby! Wait for the host to start the game"}
        </h3>
        <div className="flex items-center justify-center">
          <h2 className="bg-orange-400 rounded-3xl p-3 w-1/3 text-center font-bold text-slate-200 text-sm sm:text-lg md:text-xl lg:text-2xl xl:text3xl">
            Lobby code: {gameCode || "No game code"}
          </h2>
        </div>

        <div className="flex items-center justify-center h-full">
          <div className="w-1/2 bg-slate-500 rounded-2xl h-2/3 m-20 p-20 text-center">
            <p className="text-white mb-2">➡️ Move between lanes using arrow keys or by clicking.</p>
            <p className="text-white mb-2">❓ Answer questions correctly to gain a speed boost and pass opponents.</p>
            <p className="text-white mb-2">⬜ Dodge obstacles—hitting them will slow you down.</p>
            <p className="text-white mb-4">🏆 Stay sharp and be the first to cross the finish line!</p>

            <p className="text-white">
              The username of this user is <span className="font-bold">{username}</span>
            </p>
            {isHost && (
              <button
                className="bg-green-500 text-white font-bold py-2 px-4 rounded mt-4"
                onClick={startGame}
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserLobby;
