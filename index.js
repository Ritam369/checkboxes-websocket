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
    const stream = createReadStream(HTML_PATH); //Instead of loading the entire HTML file into memory as a string, it streams it in chunks directly into the response — more memory efficient
    stream.on("error", () => {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Failed to load index.html");
    });
    stream.pipe(res);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});
const io = new Server(app);

io.on("connection", (socket) => {
  console.log(`a user connected on ${socket.id}`);

  getState().then((checkedIndices) =>
    socket.emit("PersistedState", checkedIndices),
  );

  socket.on("Update", async (payload) => {
    const index = Number(payload?.index);
    const checkedFlag = Boolean(payload?.checkedFlag);

    if (!Number.isInteger(index) || index < 0 || index >= CHECKBOX_COUNT)
      return;
    if ((await hasState(index)) === checkedFlag) return;

    await setState(index, checkedFlag);
    io.emit("Update", { index, checkedFlag });
  });

  socket.on("disconnect", () => console.log("user disconnected"));
});


const start = async () => {
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => console.log(`Server is running on port ${port}`));
};

start();
