import express from "express";
import http from "http";
import { Server } from "socket.io";
import { getDB } from "./database.js";
import Room from "./room.js";
//
const app = express();
const corsOptions = {
    origin: true, // change here when used properly
    // origin: "http://localhost:3000",
    credentials: true,
    methods: "GET, HEAD, PUT, PATCH, POST, DELETE",
    headers: "Content-Type,cache-control,user-agent,Origin, X-Requested-With, Accept",
};
const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });
const FRONTEND_URL = "http://localhost:3000";
// Changed port to 3001. 3000 is taken up by react.
const port = 3001;
const db = getDB();
app.use(express.urlencoded({ extended: true }));
const rooms = {};
// Outputs when someone tries to create a lobby.
app.get("/create_lobby", (req, res) => {
    // Create a new room
    const room = new Room();
    rooms[room.roomID] = room;
    room.destroy = () => { delete rooms[room.roomID]; };
    // assumes the game loop route is the route for everyone
    res.redirect(`${FRONTEND_URL}/hostlobby?roomID=${room.roomID}&host=true`);
});
// Outputs when someone joins a lobby, and redirects that someone to the lobby.
app.post("/join", (req, res) => {
    // If there is a gamecode from the POST, redirect the user and set host to false
    if (req.body.gameCode && rooms[req.body.gameCode] !== undefined) {
        console.log("Received POST data, redirecting user to lobby :", req.body);
        res.redirect(`${FRONTEND_URL}/lobby?roomID=${req.body.gameCode}&host=false&username=${req.body.username}`);
    }
    else {
        console.log("Client redirected from /join due to room not being specified or room not existing");
        res.redirect(`${FRONTEND_URL}/?error=wrongCode`);
    }
});
// base page
app.get("/", (req, res) => {
    console.log("request sent to root");
    res.send(`<p>You are accessing the backend, frontend at <a href="${FRONTEND_URL}">${FRONTEND_URL}</a></p>`);
});
app.get("/testing", async (req, res) => {
    console.log("request sent to testing route");
    res.send(`<p>Amount of questions in the DB: ${db.prepare("SELECT COUNT(*) as res FROM questions").get().res}</p>`);
});
// on connection
io.on("connection", (socket) => {
    // Required parameters: roomID: string
    // optional parameters: isHost: boolean
    // if user is not a host, it also needs to send a name
    const queryParams = socket.handshake.query;
    console.log("a user named " + queryParams.name + " connected");
    // Ensure roomID is set
    if (queryParams.roomID == undefined || Array.isArray(queryParams.roomID)) {
        console.error("Socket tried to connect but roomID was not set");
        // Before disconnecting redirects the user back to the main page
        socket.emit("redirect", `${FRONTEND_URL}/`);
        // Wait a bit before disconnecting
        setTimeout(() => socket.disconnect(), 1000);
        return;
    }
    if (((queryParams.isHost == undefined || queryParams.isHost == "false") &&
        queryParams.name == undefined) ||
        Array.isArray(queryParams.name)) {
        console.error("Non-host Socket tried to connect without setting a name");
        // Before disconnecting redirects the user back to the main page
        socket.emit("redirect", `${FRONTEND_URL}/`);
        // Wait a bit before disconnecting
        setTimeout(() => socket.disconnect(), 1000);
        return;
    }
    // check to see if the room exists
    if (rooms[queryParams.roomID] == undefined) {
        console.error(`Room ID: ${queryParams.roomID} Does not exist`);
        // Before disconnecting redirects the user back to the main page
        socket.emit("redirect", `${FRONTEND_URL}/`);
        // Wait a bit before disconnecting
        setTimeout(() => socket.disconnect(), 1000);
        return;
    }
    // get socket into room, and if player then assign their name to the room instance
    socket.join(queryParams.roomID);
    if (queryParams.isHost == undefined || queryParams.isHost == "false")
        rooms[queryParams.roomID].newPlayer(queryParams.name, socket);
    else
        rooms[queryParams.roomID].setHostSocket(socket);
    socket.on("message", (msg) => {
        console.log(`Message: ${JSON.stringify(msg)}`);
        if (queryParams.isHost == undefined || queryParams.isHost == "false")
            rooms[queryParams.roomID].respondToUserMessage(queryParams.name, msg, socket);
        else
            rooms[queryParams.roomID].respondToHostMessage(msg, io);
    });
});
server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
