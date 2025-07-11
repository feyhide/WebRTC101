import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { roomHandler } from "./room/index.js";

const app = express();
const PORT = 3000;

app.use(cors);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User is connected");

  roomHandler(socket);

  socket.on("disconnect", () => {
    console.log("User is disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server in running on ${PORT}`);
});
