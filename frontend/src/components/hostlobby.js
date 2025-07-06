import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import "../App.css";
import "../tailwind.css";
import { io } from "socket.io-client";
import { BACKEND_URL, FRONTEND_URL } from "../constants.js";
import { QRCodeCanvas } from "qrcode.react";

const HostLobby = () => {
  const [playerDetails, setPlayerDetails] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState(null);
  const [socket, setSocket] = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get("roomID");
    setGameCode(code);
    if (code) {
      let sock = io(BACKEND_URL, {
        query: {
          name: "",
          roomID: code,
          isHost: queryParams.get("host"),
        },
      });
      setSocket(sock);
    }
  }, [location]);

  useEffect(() => {
    if (!socket) return;
    socket.on("message", (msg) => {
      if (msg.messageType === "userLeft") {
        setPlayerDetails((prevDetails) =>
          prevDetails.filter((player) => player.name !== msg.data.username),
        );
      } else if (msg.messageType === "userJoined") {
        setPlayerDetails((prevDetails) => [
          ...prevDetails,
          { name: msg.data.username, userCount: msg.data.userCount },
        ]);
      } else if (msg.messageType === "gameStart") {
        console.log("Game starting...");
        setCountdown(5);
      }
    });
    return () => {
      socket.off("message");
    };
  }, [socket]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    console.log(`Countdown: ${countdown}`);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(timer);
          console.log("Redirecting to game...");
          navigate(`/host?roomID=${gameCode}&host=True`);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, navigate, gameCode]);

  const startGameButton = () => {
    if (socket) {
      socket.emit("message", { messageType: "gameStart" });
    }
  };

  return (
    <div className="hostLobby min-h-screen flex items-center justify-center bg-[#0080ff] text-white">
      <div className="bg-gray-900 p-12 rounded-lg shadow-lg text-center w-[1000px] flex">
        <div className="w-1/2 pr-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            {countdown !== null ? `Game starts in: ${countdown}` : "Host Lobby"}
          </h2>
          <div className="bg-orange-400 text-gray-900 font-bold text-5xl rounded-lg p-4 mb-6">
            {gameCode}
          </div>
          <p className="text-md text-gray-300 mb-6">
            You can join by visiting {FRONTEND_URL}, or by scanning the QR code
            below and entering the code
          </p>
          <div className="flex justify-center items-center">
            <QRCodeCanvas
              value={`${FRONTEND_URL}?roomID=${gameCode}`}
              className="mb-6"
              size={256} // Increased size for larger QR code
            />
          </div>
        </div>
        <div className="w-1/2 pl-16">
          <h3 className="text-2xl font-semibold mb-3">Player List:</h3>
          <ul className="mt-3 bg-gray-800 p-6 rounded-lg w-full">
            {playerDetails.map((player, index) => (
              <li
                key={index}
                className="p-5 text-white border-b border-gray-600 last:border-none bg-gray-700 rounded-lg text-center text-xl font-semibold mb-3"
              >
                {player.name}
              </li>
            ))}
          </ul>
          <button
            onClick={startGameButton}
            className="mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

HostLobby.propTypes = {
  initialPlayers: PropTypes.array,
};

HostLobby.displayName = "HostLobby";

export default HostLobby;
