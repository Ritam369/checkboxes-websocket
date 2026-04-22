import "dotenv/config"
import {readFile, writeFile} from "node:fs/promises"
import http from "node:http"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {Server} from "socket.io"

const CHECKBOX_COUNT = 10_000
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const HTML_PATH = path.join(__dirname, "index.html")
const STATE_PATH = path.join(__dirname, ".checkbox-state.json")

let checkboxState = new Array(CHECKBOX_COUNT).fill(false)
let writeTimer

const createDefaultStateBlob = () => ({
  checkboxes: new Array(CHECKBOX_COUNT).fill(false),
})

const app = http.createServer(async (req, res) => {
  if (req.url === "/") {
    try {
      const html = await readFile(HTML_PATH, "utf8")
      res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"})
      res.end(html)
      return
    } catch (error) {
      res.writeHead(500, {"Content-Type": "text/plain; charset=utf-8"})
      res.end("Failed to load index.html")
      return
    }
  }

  res.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"})
  res.end("Not found")
})
const io = new Server(app)

const schedulePersistState = () => {
  if (writeTimer) {
    clearTimeout(writeTimer)
  }

  writeTimer = setTimeout(async () => {
    await writeFile(STATE_PATH, JSON.stringify({checkboxes: checkboxState}), "utf8")
  }, 200)
}

const loadPersistedState = async () => {
  try {
    const file = await readFile(STATE_PATH, "utf8")
    const parsedState = JSON.parse(file)

    const storedCheckboxes = Array.isArray(parsedState)
      ? parsedState
      : Array.isArray(parsedState?.checkboxes)
        ? parsedState.checkboxes
        : createDefaultStateBlob().checkboxes

    checkboxState = new Array(CHECKBOX_COUNT).fill(false)

    for (let i = 0; i < CHECKBOX_COUNT; i += 1) {
      checkboxState[i] = Boolean(storedCheckboxes[i])
    }
  } catch {
    checkboxState = new Array(CHECKBOX_COUNT).fill(false)
  }
}

io.on("connection", (socket) => {
  console.log(`a user connected on ${socket.id}`)

  socket.emit("PersistedState", checkboxState)

  socket.on("Update", (payload) => {
    const index = Number(payload?.index)
    const checkedFlag = Boolean(payload?.checkedFlag)

    if (!Number.isInteger(index) || index < 0 || index >= CHECKBOX_COUNT) {
      return
    }

    const currentValue = checkboxState[index]
    if (currentValue === checkedFlag) {
      return
    }

    checkboxState[index] = checkedFlag
    schedulePersistState()
    io.emit("Update", {index, checkedFlag})
  })
})

const start = async () => {
  await loadPersistedState()

  const port = Number(process.env.PORT) || 4000

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
  })
}

start()