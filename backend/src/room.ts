// Where people connects too

import { Server, Socket } from "socket.io";
import { getDB } from "./database.js";
import { randomInt } from "node:crypto";

type Player = {
  lane: number;
  correctCount: number;
  incorrectCount: number;
  skipCount: number;
  socket: Socket;
  // Questions asked already?
  questionAsked: Question | undefined;
  selectedAnswer: number | undefined;
  previouslyAsked: number[];
  colour: string
};

type Question = {
  question: string;
  answerOptions: string[]; // max 4
  correct: number;
};

type ReceivingHostMessage = {
  messageType: "gameStart" | "endGame" | "displayLeaderboard" | "endQuestion"; // add when implemented
  data: unknown;
};

type ReceivingUserMessage = {
  messageType: "changeLane" | "answerQuestion"; // add when implemented
  data: unknown;
};

type ToBroadcast = {
  messageType: "gameStart";
  data: unknown;
};

type ToHost = {
  messageType: "userJoined" | "userLeft" | "leaderboard" | "changeLane";
  data: unknown;
};

type ToAny = {
  messageType: "badMessage";
  data: unknown;
};

type ToUser = {
  messageType: "inGameStatus" | "laneFinalization" | "questionTimeEnd" | "endGame" | "endgameRatings" | "carColour";
  data: unknown;
};

type laneObject = "nothing" | "question" | "obstacle";

const tailwindColors = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-gray-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-lime-500",
];

const db = await getDB();

export default class Room {
  roomID: string;
  players: Map<string, Player> = new Map();
  roundCounter: number = 0;
  maxRoundCount: number = 10; // total amount of questions to be asked
  laneCount: number = 3;
  hostSocket: Socket | undefined;
  laneObjects!: laneObject[][]; // generated in refreshLaneObjects call in constructor

  state:
    | "lobby"
    | "inGame - update"
    | "inGame - lane choosing"
    | "inGame - questioning"
    | "inGame - feedback"
    | "endgame";

  destroy: () => void = () => {}; 

  questionInDBCount: number;

  constructor() {
    this.roomID = Math.floor(Math.random() * (10000 - 1000) + 1000).toString();
    console.log(`New room created with ID: ${this.roomID}`);
    this.state = "lobby";
    this.refreshLaneObjects();
    console.log(`Lane objects: ${JSON.stringify(this.laneObjects)}`)
    this.questionInDBCount = (db.prepare("SELECT COUNT(*) as res FROM questions").get() as {res: number}).res 
  }

  newPlayer(name: string, socket: Socket) {
    if (this.players.has(name)) {
      console.log(`Player ${name} has reconnected to room ${this.roomID}`);
      // disconnect old socket
      this.players.get(name)!.socket.disconnect();
      // save new socket
      this.players.get(name)!.socket = socket;
	  return;
    }
    console.log(`New player added to room ID: ${this.roomID}`);
    // incorrectCount should be the amount of questions asked already, to ensure position delta is correct
    const assignedColours = Array.from(this.players.values()).map(
      (p) => p.colour,
    );
    const availableColours = tailwindColors.filter(
      (color) => !assignedColours.includes(color),
    );
    const colour =
      availableColours.length > 0
        ? availableColours[0]
        : tailwindColors[this.players.size % tailwindColors.length];
    this.players.set(name, {
      lane: 0,
      correctCount: 0,
      incorrectCount: this.roundCounter,
      skipCount: 0,
      socket,
      questionAsked: undefined,
      selectedAnswer: undefined,
      previouslyAsked: [],
      colour
    });
    this.hostSocket?.emit("message", {
      messageType: "userJoined",
      data: { username: name, userCount: this.players.size },
    } as ToHost);

    if (this.state !== "lobby") {
      socket.emit("message", {
        messageType: "gameStart",
      } as ToBroadcast);
    }
  }

  setHostSocket(hostSocket: Socket) {
    console.log(`new host socket set for room ${this.roomID}`);
    this.hostSocket = hostSocket;
  }

  getPositionDelta(player: Player): number {
    // done in one place incase logic is changed
    return player.correctCount - player.incorrectCount;
  }

  makeLeaderboard(): {username: string, correctCount: number, positionDelta: number, colour: string}[] {
    console.log(`making leaderboard room: ${this.roomID}`)
    return Array.from(this.players.entries()).map(([username, player]) => ({
        username,
        correctCount: player.correctCount,
        positionDelta: this.getPositionDelta(player),
        colour: player.colour
    })).sort((a, b) => b.correctCount - a.correctCount);
}

refreshLaneObjects() {
    console.log(`refreshing game objects room: ${this.roomID}`)
    this.laneObjects = new Array(this.maxRoundCount * 2 + 1).fill(null).map(() => { // x2+1 due to delta offset potentially going higher
        const arr = Array(this.laneCount).fill(null).map(() => this.generateLaneObject())
        if (arr.every(a => a == "obstacle")) arr[randomInt(0, 2)] = "nothing" as "obstacle"
        return arr
      }
    );
}

generateLaneObject(): laneObject {
    const random = Math.random();
    if (random < 0.4) return "question"; // 40% chance of question
    if (random < 0.6) return "obstacle"; // 20% chance of obstacle
    return "nothing"; // 40% chance of nothing
}


  respondToUserMessage(
    username: string,
    msg: ReceivingUserMessage,
    socket: Socket,
  ) {
    // get player
    const player = this.players.get(username);
    if (player == undefined) {
      socket.emit("message", {
        messageType: "badMessage",
        data: `Player ${username} does not exist`,
      } as ToAny);
      return;
    }
    // parse user message

    switch (msg.messageType) {
      case "changeLane":
        // todo make it so that players can only change lanes during lane choosing phase
        console.log(`changing lane to ${(msg.data as { lane: number }).lane}`)
        player.lane = (msg.data as { lane: number }).lane!;

        // inform host over lane change
        // changeLane { username: string, lane: int }  
        this.hostSocket!.emit("message", {
          messageType: "changeLane",
          data: {username, lane: player.lane},
        } as ToHost)

        break;
      case "answerQuestion":
        player.selectedAnswer = (
          msg.data as { answerIndex: number }
        ).answerIndex;
        break;
      default:
        console.error(`Cannot recognize user message type: ${msg}\n `);
        this.hostSocket?.emit("message", {
          messageType: "badMessage",
          data: "Invalid message type",
        } as ToAny);
        return;
        break;
    }
  }

  respondToHostMessage(msg: ReceivingHostMessage, io: Server) {
    // emit message to everyone in the room
    console.log(`Message from host: ${JSON.stringify(msg)}`);

    switch (msg.messageType) {
      case "gameStart":
        this.startGame(io);
        break;
      case "endGame":
        this.state = "endgame";
        this.enterEndgame();
        break;
      case "displayLeaderboard":
        setTimeout(() => this.terminateAndDisplayLeaderboard(), 2000);
        break;
      case "endQuestion":
        if (this.state !== "inGame - questioning") {
          console.error("room is not in a question");
          this.hostSocket?.emit("message", {
            messageType: "badMessage",
            data: `Question ended when no question happening`,
          } as ToAny);
          return;
        }
        console.log(`Ending question phase for room ${this.roomID} due to message`)
        this.endQuestioningPhase();
        break;
      default:
        console.error(
          `Cannot recognize host message type: ${JSON.stringify(msg)}\n `,
        );
        this.hostSocket?.emit("message", {
          messageType: "badMessage",
          data: `Invalid message type ${msg.messageType}`,
        } as ToAny);
        return;
        break;
    }
  }

  startGame(io: Server) {
    console.log(`start game for room ${this.roomID}`) 
    // broadcast game start
    io.to(this.roomID!).emit("message", {
      messageType: "gameStart",
    } as ToBroadcast);
    // The host has a 5 second countdown, this 10 second delay ensures the updatePhase is sent at the correct time and not too early.
    setTimeout(
      () => {
        this.enterUpdatePhase();
      },
      1000 * 10,
    );
  }

  enterUpdatePhase() {
    if (this.state == "endgame") return; // game already ended
    console.log(`enter update phase room: ${this.roomID}`)
    this.state = "inGame - update";

    // Update host and users
    const leaderboard = this.makeLeaderboard();

    // increment round counter so group centre is correct on host update
    this.roundCounter += 1;
    this.hostSocket?.emit("message", {
      messageType: "leaderboard",
      data: {
        leaderboard,
        groupCentre: this.roundCounter,
        maxQuestions: this.maxRoundCount,
      },
    } as ToHost);

    // update players
    this.players.forEach((player, name) => {
      const delta = this.getPositionDelta(player);
      const upcomingLaneInfo: laneObject[] =
        this.laneObjects[this.roundCounter + delta];
      console.log(`Player ${name} given status ${JSON.stringify({
        messageType: "inGameStatus",
        data: {
          lane: player.lane,
          correctCount: player.correctCount,
          incorrectCount: player.incorrectCount,
          skipCount: player.skipCount,
          upcomingLaneInfo,
        },
      })}`)
      player.socket.emit("message", {
        messageType: "inGameStatus",
        data: {
          lane: player.lane,
          correctCount: player.correctCount,
          incorrectCount: player.incorrectCount,
          skipCount: player.skipCount,
          upcomingLaneInfo,
        },
      } as ToUser);

      // Send the user their colour
      console.log(
        "Sending a car colour update message to the user",
        name,
        "car colour:",
        player.colour,
      );

      player.socket.emit("message", {
        messageType: "carColour",
        data: { colour: player.colour },
      } as ToUser);


    });

    // move the state into the lane choose phase
    this.state = "inGame - lane choosing";
    console.log(`timeout before ending lane choosing room: ${this.roomID}`)

    setTimeout(
      () => {
        this.endLaneChoosing();
      },
      1000 * 10 * 1,
    ); // 1 minute delay
  }

  generateQuestion(
    player: Player,
    collidedWith: laneObject,
  ): Question | undefined {
    if (collidedWith != "question") return undefined;

    // choose question index 
    let chosen: number | undefined;
    while (chosen == undefined || player.previouslyAsked.includes(chosen)) {
      chosen = randomInt(1, this.questionInDBCount)
    }

    const queriedQuestion = db.prepare("SELECT question, answer1, answer2, answer3, answer4, correct_answer FROM questions WHERE question_id = ?;")
      .get(chosen) as {question: string, answer1: string, answer2: string, answer3: string | null, answer4: string | null, correct_answer: number};

    return {
      question: queriedQuestion.question,
      answerOptions: [queriedQuestion.answer1, queriedQuestion.answer2, queriedQuestion.answer3, queriedQuestion.answer4].filter((a) => a != null),
      correct: queriedQuestion.correct_answer - 1,
    }; 
  }

  endLaneChoosing() {
    if (this.state == "endgame") return; // game already ended
    console.log(`end lane choosing room: ${this.roomID}`)
    // send lane finalization messages to users
    this.players.forEach((player, name) => {
      const delta = this.getPositionDelta(player);
      const upcomingLaneObj: laneObject = this.laneObjects[this.roundCounter + delta][player.lane];
      console.log(`player ${name} is looking up ${this.roundCounter} + ${delta}: ${player.lane}`)
      console.log(`Player ${name} hit obstacle: ${upcomingLaneObj}`);

      if (upcomingLaneObj == "obstacle") {
        player.incorrectCount += 1; // when a player hits an obstacle, delay them once
      }

      const question = this.generateQuestion(player, upcomingLaneObj);
      player.questionAsked = question;
      player.selectedAnswer = undefined; // clearing if answered from before

      // if the question exists (hit a question), send to the user everything but the answers
      const toUserQuestion =
        question != undefined
          ? {
              question: question?.question,
              answerOptions: question?.answerOptions,
            }
          : undefined;
      console.log(`Player ${name} question body: ${JSON.stringify({
        messageType: "laneFinalization",
        data: { hit: upcomingLaneObj, question: toUserQuestion },
      })}`)

      player.socket.emit("message", {
        messageType: "laneFinalization",
        data: { hit: upcomingLaneObj, question: toUserQuestion },
      } as ToUser);
    });

    this.state = "inGame - questioning";

    console.log(`questioning all sent, now in wait before end questioning room: ${this.roomID}`)
    setTimeout(
      () => {
        this.endQuestioningPhase();
      },
      1000 * 10 * 1,
    ); // 1 minute delay
  }

  endQuestioningPhase() {
    if (this.state == "endgame") return; // game already ended

    if (this.state !== "inGame - questioning") return; // question has already ended

    // this is the feedback phase
    this.state = "inGame - feedback";
    console.log(`end questioning phase room: ${this.roomID}`)

    this.players.forEach((player, name) => {
      let result: "correct" | "incorrect" | "timeOut" | "noResult";
      if (player.questionAsked == undefined) {
        // did not choose a question
        player.skipCount += 1;
        result = "noResult";
      } else {
        // player was meant to answer question

        // see if player did answer question
        if (player.selectedAnswer == undefined) {
          result = "timeOut";
          player.incorrectCount += 1;
        } else {
          if (player.selectedAnswer == player.questionAsked.correct) {
            //correct
            result = "correct";
            player.correctCount += 1;
          } else {
            result = "incorrect";
            player.incorrectCount += 1;
          }
        }
      }

      console.log(`Player ${name} question message: ${JSON.stringify({
        messageType: "questionTimeEnd",
        data: {
          result,
          answerIndex: player.questionAsked?.correct,
          score: player.correctCount,
        },
      })}`)

      player.socket.emit("message", {
        messageType: "questionTimeEnd",
        data: {
          result,
          answerIndex: player.questionAsked?.correct,
          score: player.correctCount,
        },
      } as ToUser);
    });
    this.hostSocket?.emit("message", {
      messageType: "leaderboard",
      data: {
        leaderboard: this.makeLeaderboard(),
        groupCentre: this.roundCounter,
        maxQuestions: this.maxRoundCount,
      },
    } as ToHost);

    if (this.roundCounter == this.maxRoundCount) {
      // end game
      this.state = "endgame";
      console.log(`ending the game due to room counter at the end room: ${this.roomID}`)
      setTimeout(
        () => {
          this.enterEndgame();
        },
        1000 * 10 * 1,
      ); // 1 minute delay
      return;
    } else {
      console.log(`going back around to enter update phase room: ${this.roomID}`)
      setTimeout(
        () => {
          this.enterUpdatePhase();
        },
        1000 * 10 * 1,
      ); // 1 minute delay
      return;
    }
  }

  enterEndgame() {
    console.log(`entering endgame room: ${this.roomID}`)
    this.hostSocket?.to(this.roomID).emit("message", {
        messageType: "endGame",
        data: undefined,
      } as ToUser)
      this.hostSocket?.emit("message", {
        messageType: "endGame",
        data: undefined,
      } as ToUser)
      // not much can be done at this time, waiting for host to request leaderboard
  }

  terminateAndDisplayLeaderboard() {
    if (this.state != "endgame") {
      console.error("Leaderboard trying to be displayed without game in endstate, returning")
      return
    }

    const leaderboard = this.makeLeaderboard()


    console.log(`room: ${this.roomID} leaderboard: ${JSON.stringify({
      messageType: "leaderboard",
      data: {
        leaderboard,
        groupCentre: this.roundCounter,
        maxQuestions: this.maxRoundCount,
      },
    })}`)
    this.hostSocket?.emit("message", {
      messageType: "leaderboard",
      data: {
        leaderboard,
        groupCentre: this.roundCounter,
        maxQuestions: this.maxRoundCount,
      },
    } as ToHost);

    // update players
    this.players.forEach((player, name) => {
      const posIndex = leaderboard.findIndex((ply) => ply.username == name)
      console.log(`Player ${name} endgame rating: ${JSON.stringify({
        messageType: "endgameRatings",
        data: {
          name: name, 
          score: leaderboard[posIndex].correctCount, 
          leaderboardPosition: posIndex + 1
        },
      })}`)
      player.socket.emit("message", {
        messageType: "endgameRatings",
        data: {
          name: name, 
          score: leaderboard[posIndex].correctCount, 
          leaderboardPosition: posIndex + 1
        },
      } as ToUser);
    })

    // pause to give time for stuff to be broadcast
    console.log(`disconnecting users room: ${this.roomID}`)
    setTimeout(
      () => {
        // terminate connections
        this.players.forEach((player) => {
          player.socket.disconnect(true) // disconnects all connections of them 
        })
        this.hostSocket?.disconnect(true)

        // destroy room
        this.destroy()
      },
      1000 * 10,
    ); // 30s delay
    return;
  }
}
