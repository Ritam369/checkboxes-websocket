import "dotenv/config";
import http from "node:http";
import path from "node:path";
import { createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { getState, setState, hasState } from "./db/checkboxRepository.js";
import * as socket from 'socket.io';

const CHECKBOX_COUNT = 10_000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HTML_PATH = path.join(__dirname, "index.html");

const app = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    const stream = createReadStream(HTML_PATH); //Instead of loading the entire HTML file into memory, it streams it in chunks directly into the response — more memory efficient
    stream.on("error", () => {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Failed to load index.html");
    });
    stream.pipe(res);//takes those chunks and instantly pushes them down the wire to the user's browser via the response
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});
const io = new Server(app);

io.on("connection", (socket) => {
  console.log(`a user connected on ${socket.id}`);

  getState().then((checkedIndices) =>
    //After getting array of all the indices that are currently checked, server emit "PersistedState" event to the client side
    socket.emit("PersistedState", checkedIndices),
  );

  socket.on("Update", async (payload) => {
    //server side receives the "Update" event and on this event
    //it checks whether the index is between 0-10000
    //then there will be a checking with the checkedFlag,
    //if the state already exists in the DB then ignore
    const index = Number(payload?.index);
    const checkedFlag = Boolean(payload?.checkedFlag);

    if (!Number.isInteger(index) || index < 0 || index >= CHECKBOX_COUNT)
      return;
    if ((await hasState(index)) === checkedFlag) return;
    //hasState() checks that whether the particular index has any state or not
    //and returns respective value

    await setState(index, checkedFlag);
    io.emit("Update", { index, checkedFlag }); //server broadcasts the update to other users
  });

  socket.on("disconnect", () => console.log("user disconnected"));
});


const start = async () => {
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => console.log(`Server is running on port ${port}`));
};

start();
