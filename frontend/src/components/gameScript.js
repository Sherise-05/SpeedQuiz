import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Line from "../stripes.svg"; // Path to your SVG
import "../App.css";
import "../tailwind.css";
import { BACKEND_URL } from "../constants.js";

import { io } from "socket.io-client";

function GameScript() {
  // Fetch the game-code from the GET
  const location = useLocation();
  const [gameCode, setGameCode] = useState(null);
  const [username, setUsername] = useState(null);
  const [socket, setSocket] = useState(null);
  // Car position states, 0 is left, 1 is middle, 2 is right
  const [carPosition, setCarPosition] = useState(1);
  const [showPopup, setShowPopup] = useState(false);
  const [question, setQuestion] = useState({});
  const [upcomingLaneInfo, setUpcomingLaneInfo] = useState([
    "nothing",
    "nothing",
    "nothing",
  ]);
  const [feedback, setFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [carColour, setCarColour] = useState("bg-red-500");
  const [currentState, setCurrentState] = useState("Game Starting");
  const [timer, setTimer] = useState(4);
  const [lockMovement, setLockMovement] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get("roomID");
    const usrname = queryParams.get("username");
    setUsername(usrname);
    setGameCode(code);
    if (!socket) {
      let sock = io(BACKEND_URL, {
        query: {
          name: usrname,
          roomID: code,
          isHost: false,
        },
      });
      setSocket(sock);
    }
  }, [location, socket]);

  useEffect(() => {
    const handleClick = (event) => {
      if (showPopup || lockMovement) return; // Prevent movement when popup is shown or movement is locked
      const { clientX } = event;
      const screenWidth = window.innerWidth;

      setCarPosition((carPos) => {
        // accept either left/right keys or clicking
        let newCarPos = carPos;
        if (
          (event.key === "ArrowLeft" && carPos > 0) ||
          (clientX < screenWidth / 2 && carPos > 0)
        ) {
          newCarPos--; // Move left
        } else if (
          (event.key === "ArrowRight" && carPos < 2) ||
          (clientX >= screenWidth / 2 && carPos < 2)
        ) {
          newCarPos++; // Move right
        }
        console.log(newCarPos);
        if (socket) {
          socket.emit("message", {
            messageType: "changeLane",
            data: { lane: newCarPos },
          });
        }
        return newCarPos;
      });
    };
    document.addEventListener("keydown", handleClick);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("keydown", handleClick);
      document.removeEventListener("click", handleClick);
    };
  }, [socket, showPopup, lockMovement]);
  // wait for a redirect on the client side (happens if the code is invalid)
  useEffect(() => {
    if (socket) {
      socket.on("redirect", (url) => {
        console.log("Redirecting to:", url);
        window.location.href = url;
      });

      socket.on("message", (message) => {
        console.log("Received message:", message); // Debugging
        switch (message.messageType) {
          case "laneUpdate":
          case "inGameStatus": // Handle both message types
            if (message.data && message.data.upcomingLaneInfo) {
              console.log(
                "Updated upcomingLaneInfo:",
                message.data.upcomingLaneInfo,
              );
              setUpcomingLaneInfo([...message.data.upcomingLaneInfo]); // Forces state update
              setCurrentState("Choose lane");
              setTimer(9);
            }
            break;
          case "laneFinalization":
            console.log(JSON.stringify(message.data));
            if (message.data.hit == "question") {
              console.log(
                "You collided with a question: ",
                message.data.question,
              );
              setQuestion({
                question: message.data.question.question,
                answerOptions: message.data.question.answerOptions,
              });
              setShowPopup(true);
            } else {
              console.log("You collided with a: ", message.data.hit);
            }
            setCurrentState("!!!");
            setTimer(9);
            break;
          case "questionTimeEnd":
            setShowPopup(false);
            setUpcomingLaneInfo(["nothing", "nothing", "nothing"]);
            showFeedback(message.data.result);
            setCurrentState("New round");
            setTimer(9);
            break;
          case "endGame":
            console.log("Game ended");
            window.location.href = `/clientEnd?roomID=${gameCode}&host=false&username=${username}`;
            break;
          // Further cases go down here
          case "carColour":
            console.log("Changing car colour");
            setCarColour(message.data.colour);
          default:
            break;
        }
      });

      return () => {
        socket.off("redirect");
        socket.off("message");
      };
    }
  }, [socket]);

  const lanePositions = ["25%", "50%", "75%"];

  const showFeedback = (status) => {
    if (status == "correct") {
      setFeedbackMessage("Correct!");
      setFeedback(true);
    } else if (status == "incorrect") {
      setFeedbackMessage("Incorrect!");
      setFeedback(true);
    }
    setTimeout(() => setFeedback(false), 3000);
  };

  const emitAnswer = (answer) => {
    if (socket) {
      socket.emit("message", {
        messageType: "answerQuestion",
        data: { answerIndex: answer },
      });
    }
    setLockMovement(true);
    setTimeout(() => setLockMovement(false), 500);
  };

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  return (
    <div className="gameScript">
      <div className="bg-[#0080ff] flex flex-col min-h-screen">
        {/* Feedback to the user about their question answer */}
        {feedback && (
          <div
            className={`fixed top-0 left-1/2 transform -translate-x-1/2 ${feedbackMessage === "Correct!" ? "bg-green-500" : "bg-red-500"} text-white text-center my-10 py-4 z-50 rounded-lg text-2xl font-bold`}
          >
            {feedbackMessage}
          </div>
        )}
        <div className="flex items-center justify-center min-h-screen">
          {/* Below is the current implementation of lanes */}

          <div className="relative bg-gray-400 min-h-screen w-1/4 flex items-center justify-center overflow-hidden">
            <div
              className="absolute top-0 right-0 h-[400vh] w-[10px] animate-moveDown"
              style={{
                backgroundImage: `url(${Line})`,
                backgroundRepeat: "repeat",
              }}
            ></div>
            {/* Render square if obstacle is in lane 1 */}
            {upcomingLaneInfo[0] === "obstacle" && (
              <div
                className="absolute top-10 bg-red-600 border-4 border-black flex items-center justify-center rounded-lg shadow-lg text-5xl
                scale-75 sm:scale-100 md:scale-125 lg:scale-150"
              >
                ⬜⬜
              </div>
            )}
            {upcomingLaneInfo[0] === "question" && (
              <div
                className="absolute top-10 bg-yellow-400 flex items-center justify-center rounded-lg shadow-lg text-5xl font-bold
                scale-75 sm:scale-100 md:scale-125 lg:scale-150"
              >
                ❓❓
              </div>
            )}
          </div>

          <div className="relative bg-gray-400 min-h-screen w-1/4 flex items-center justify-center overflow-hidden">
            <div
              className="absolute top-0 left-0 h-[400vh] w-[10px] animate-moveDown"
              style={{
                backgroundImage: `url(${Line})`,
                backgroundRepeat: "repeat",
              }}
            ></div>
            <div
              className="absolute top-0 right-0 h-[400vh] w-[10px] animate-moveDown"
              style={{
                backgroundImage: `url(${Line})`,
                backgroundRepeat: "repeat",
              }}
            ></div>
            {/* Render square if obstacle is in lane 2 */}
            {upcomingLaneInfo[1] === "obstacle" && (
              <div
                className="absolute top-10 bg-red-600 border-4 border-black flex items-center justify-center rounded-lg shadow-lg text-5xl
                scale-75 sm:scale-100 md:scale-125 lg:scale-150"
              >
                ⬜⬜
              </div>
            )}
            {upcomingLaneInfo[1] === "question" && (
              <div
                className="absolute top-10 bg-yellow-400 flex items-center justify-center rounded-lg shadow-lg text-5xl font-bold
                scale-75 sm:scale-100 md:scale-125 lg:scale-150"
              >
                ❓❓
              </div>
            )}
          </div>
          <div className="relative bg-gray-400 min-h-screen w-1/4 flex items-center justify-center overflow-hidden">
            <div
              className="absolute top-0 left-0 h-[400vh] w-[10px] animate-moveDown"
              style={{
                backgroundImage: `url(${Line})`,
                backgroundRepeat: "repeat",
              }}
            ></div>
            {/* Render square if obstacle is in lane 3 */}
            {upcomingLaneInfo[2] === "obstacle" && (
              <div
                className="absolute top-10 bg-red-600 border-4 border-black flex items-center justify-center rounded-lg shadow-lg text-5xl
                scale-75 sm:scale-100 md:scale-125 lg:scale-150"
              >
                ⬜⬜
              </div>
            )}
            {upcomingLaneInfo[2] === "question" && (
              <div
                className="absolute top-10 bg-yellow-400 flex items-center justify-center rounded-lg shadow-lg text-5xl font-bold
                scale-75 sm:scale-100 md:scale-125 lg:scale-150"
              >
                ❓❓
              </div>
            )}
          </div>
        </div>
        {/* Car object */}
        <div
          className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 ${carColour} rounded-2xl w-20 h-32 flex items-center justify-center text-white font-bold`}
          style={{
            left: lanePositions[carPosition], // Position based on state
            transition: "left 0.5s ease-in-out",
          }}
        ></div>
        {/* Circular Timer */}
        <div className="fixed top-10 right-10">
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
              strokeDashoffset={(Math.PI * 2 * 45 * (9 - timer)) / 9}
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dashoffset 0.5s linear" }}
            />
            <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="40">
              {timer}
            </text>
          </svg>
          <h3 className="text-center font-bold"> {currentState} </h3>
        </div>
        {/* Popup */}
        {showPopup && (
          <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-10 rounded-lg shadow-lg w-11/12 h-5/6 max-w-2xl text-center flex flex-col justify-center sm:w-1/2 sm:h-2/3">
              {/* Question */}
              <h2 className="text-3xl font-bold mb-6 break-words">
                {question.question}
              </h2>

              {/* Answer Options */}
              <div className="grid grid-cols-2 gap-4 break-words">
                {question.answerOptions.map((answer, index) => (
                  <button
                    key={index}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-6 px-8 rounded-lg text-xl sm:py-4 sm:px-6 sm:text-lg"
                    onClick={() => {
                      console.log(`Selected: ${answer}`);
                      emitAnswer(index);
                      setShowPopup(false); // Closes the popup after selection
                      setUpcomingLaneInfo(["nothing", "nothing", "nothing"]);
                    }}
                  >
                    {answer}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameScript;
