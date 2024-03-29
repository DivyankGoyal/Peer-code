const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const Code = require("./models/Code");

require("./db/conn");

const app = express();
const port = process.env.PORT || 80;

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false }));

app.use("/api", require("./routes/code"));

if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client/build", "index.html"));
  });
}

const server = app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

const io = require("socket.io")(server);

io.on("connection", (socket) => {
  console.log("Connected to socket!");
  socket.on("joined", async ({ roomDbId }) => {
    console.log(roomDbId);
    socket.join(roomDbId);
  });
  socket.on("enteringCode", async ({ code, roomDbId }) => {``
    console.log(code);
    await Code.findOneAndUpdate(
      { _id: roomDbId },
      {
        $set: {
          code,
        },
      }
    );
    socket.to(roomDbId).emit("receivingCode", { recCode: code });
  });
  socket.on("enteringInp", ({ inp, roomDbId }) => {
    console.log(inp);
    socket.to(roomDbId).emit("receivingInp", { inp });
  });
  socket.on("sendOp", ({ op, roomDbId }) => {
    console.log("op ", op);
    socket.to(roomDbId).emit("receiveOp", { op });
  });
  socket.on("changeExtLangSn", async ({ lng, cd, ex, roomDbId }) => {
    await Code.findOneAndUpdate(
      { _id: roomDbId },
      {
        $set: {
          code: cd,
          language: lng,
          extension: ex,
        },
      }
    );
    io.to(roomDbId).emit("setExtLangSn", { lng, cd, ex });
  });
});