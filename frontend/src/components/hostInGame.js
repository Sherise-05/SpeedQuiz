import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BACKEND_URL } from "../constants.js";
import { io } from "socket.io-client";
import PropTypes from "prop-types";
import "../App.css";
import "../tailwind.css";

const laneOffsets = {
  0: 59,
  1: 45,
  2: 33,
};

/**
 * Car creates a car dot that goes around the track at a certain position and on a certain lane.
 *
 * Input
 * @param {integer} lane the lane on which the car is "driving" and it starts from 0 and ends at 2.
 * @param {integer} position the position of the car on the track, this can be a value between 0 and 360.
 * @param {string} colour allows to set a colour to the car to be able to differentiate between different players.
 * @param {integer} locOffset allows to set the offset of the location of the car on the track.
 * @param {integer} questionsCount the number of questions that are going to be asked in the game.
 *
 * Output
 * Car
 */
function Car({
  lane = 2,
  position = 0,
  colour = "bg-blue-900",
  locOffset = 0,
  questionsCount = 10,
}) {
  const offset = laneOffsets[lane] - 2 + ((locOffset * 2) % 5);
  const radians = (position * 2 * Math.PI) / questionsCount; // Changed to 2 * Math.PI to ensure full circle
  const carX = 50 + offset * Math.cos(radians);
  const carY = 50 + offset * Math.sin(radians);
  const angle = (position * 360) / questionsCount + 90;

  const carStyle = {
    position: "absolute",
    width: "40px",
    height: "20px",
    borderRadius: "10%",
    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
    left: `${carX}%`,
    top: `${carY}%`,
  };

  return <div className={colour} style={carStyle}></div>;
}
{
  /* Car prop validation */
}
Car.propTypes = {
  lane: PropTypes.number,
  position: PropTypes.number,
  colour: PropTypes.string,
  locOffset: PropTypes.number,
  questionsCount: PropTypes.number,
};
Car.defaultProps = {
  lane: 2,
  position: 0,
  colour: "bg-blue-900",
  locOffset: 0,
  questionCount: 10,
};

/**
 * Creates a player with their name and car colour into the leader board.
 *
 * Input
 * @param {string} name, the name of the player, this is a required field.
 * @param {string} colour, the colour of the car that the player has, this field is also required. This should be a tailwind colour ie bg-green-500
 *
 * Output
 * A div element with the colour on the left in a circle and the player name on the right.
 */
function Players({ name, colour }) {
  const innerDiv = "w-5 h-5 " + colour + " rounded-full mr-2";
  return (
    <div className="flex items-center">
      <div className={innerDiv}></div>
      <a>{name}</a>
    </div>
  );
}
{
  /* Player prop validation */
}
Players.propTypes = {
  name: PropTypes.string.isRequired,
  colour: PropTypes.string.isRequired,
};

function HostInGame() {
  const location = useLocation();
  const [socket, setSocket] = useState(null);
  const [playerDetails, setPlayerDetails] = useState([]);
  const [code, setCode] = useState(null);
  const [playerLanes, setPlayerLanes] = useState({});
  const [questionCount, setQuestionCount] = useState(10);
  const [timer, setTimer] = useState(34);
  const [currentQuestion, setCurrentQuestion] = useState(1);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const user = queryParams.get("username");
    setCode(queryParams.get("roomID"));

    // Only create the socket connection if it hasn't been created already
    if (!socket) {
      const sock = io(BACKEND_URL, {
        query: {
          name: user,
          roomID: queryParams.get("roomID"),
          isHost: queryParams.get("host"),
        },
      });
      setSocket(sock);
    }

    // Cleanup the socket connection when the component unmounts
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [location, socket]);

  useEffect(() => {
    if (socket) {
      socket.on("message", (message) => {
        console.log(JSON.stringify(message));
        switch (message.messageType) {
          case "leaderboard":
            setQuestionCount(message.data.maxQuestions);
            setPlayerLanes((prevPlayerLanes) => {
              const updatedLanes = { ...prevPlayerLanes };
              const newPlayerDetails = message.data.leaderboard.map(
                (player, index) => {
                  if (updatedLanes[player.username] === undefined) {
                    // Set lane to 1 if no lane is currently set. This would only happen at the start of the game.
                    updatedLanes[player.username] = 1;
                  }
                  return {
                    id: index,
                    playerName: player.username,
                    colour: player.colour,
                    lane: updatedLanes[player.username],
                    position: message.data.groupCentre + player.positionDelta,
                  };
                },
              );
              setPlayerDetails(newPlayerDetails);
              return updatedLanes;
            });
            break;

          case "changeLane":
            console.log(
              "Changing",
              message.data.username,
              "'s lane to ",
              message.data.lane,
            );

            setPlayerLanes((prevPlayerLanes) => ({
              ...prevPlayerLanes,
              [message.data.username]: message.data.lane,
            }));

            setPlayerDetails((prevPlayerDetails) =>
              prevPlayerDetails.map((player) =>
                player.playerName === message.data.username
                  ? { ...player, lane: message.data.lane }
                  : player,
              ),
            );
            break;
          case "endGame":
            console.log("Game ended");
            window.location.href = `/endgame?roomID=${code}&host=true`;
            break;
          default:
            console.log(message.data);
            break;
        }
      });

      return () => {
        socket.off("message");
      };
    }
  }, [socket]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer === 0) {
          setCurrentQuestion((prevQuestion) => prevQuestion + 0.5);
          return 29;
        } else {
          return prevTimer - 1;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleEndGame = () => {
    socket.emit("message", {
      messageType: "endGame",
    });
  };

  const handleQuestionEnd = () => {
    socket.emit("message", {
      messageType: "endQuestion",
    });
  };
  return (
    <div className="hostGame">
      <div className="bg-green-700 flex min-h-screen">
        <div className="flex-1 flex items-center justify-center relative">
          {/* Creates 4 ovals which create three tracks */}
          <div className="w-[90%] h-[90%] rounded-full border-8 border-gray-800 flex items-center justify-center relative bg-gray-500">
            <div className="w-[80%] h-[80%] rounded-full border-8 border-gray-800 flex items-center justify-center relative bg-gray-500">
              <div className="w-[75%] h-[75%] rounded-full border-8 border-gray-800 absolute"></div>
              <div className="w-[50%] h-[50%] rounded-full border-8 border-gray-800 absolute bg-green-700"></div>
              {/* Car objects mapped according to the details that are sent from the backend */}
              {playerDetails.map((player) => (
                <Car
                  key={player.id}
                  lane={player.lane}
                  position={player.position}
                  colour={player.colour}
                  locOffset={player.id}
                  questionsCount={questionCount}
                />
              ))}
            </div>
          </div>
        </div>
        {/* Circular Timer */}
        <div className="fixed top-10 left-10">
          <svg width="100" height="100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="black"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="blue"
              strokeWidth="5"
              fill="none"
              strokeDasharray={Math.PI * 2 * 45}
              strokeDashoffset={(Math.PI * 2 * 45 * (29 - timer)) / 29}
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dashoffset 0.5s linear" }}
            />
            <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="40">
              {timer}
            </text>
          </svg>
          <h3 className="text-center font-bold">
            Round {currentQuestion} / {questionCount}
          </h3>
        </div>
        {/* On the right there is a leaderboard which will in the future be updated as players overtake one another */}
        <div className="w-1/7 bg-gray-900 text-white p-4 flex flex-col items-center">
          <h2 className="text-xl font-bold">Leader-board</h2>
          {/* Leaderboard is populated according to the data that is sent by the backend */}
          {playerDetails.map((player) => (
            <Players
              key={player.id}
              name={player.playerName}
              colour={player.colour}
            />
          ))}
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={handleEndGame}
          >
            End Game
          </button>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={handleQuestionEnd}
          >
            End Question
          </button>
        </div>
      </div>
    </div>
  );
}

export default HostInGame;
