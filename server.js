const express = require("express");
const _ = require("lodash");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);

app.set("views", "./views");
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(
  express.urlencoded({
    extended: true,
  })
);
const rooms = {};
app.get("/", (req, res) => {
  res.render("index", { rooms: rooms });
});

app.get("/:room", (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.redirect("/");
  }
  res.render("room", { roomName: req.params.room });
});

app.post("/room", (req, res) => {
  if (rooms[req.body.room] != null) {
    return res.redirect("/");
  }
  rooms[req.body.room] = {
    users: {},
  };
  res.redirect(req.body.room);
  // send message new room was create
  io.emit("room-created", req.body.room);
});

server.listen(3000);

io.on("connection", (socket) => {
  socket.on("new-user", (room, name) => {
    socket.join(room);
    rooms[room].users[socket.id] = name;
    socket.to(room).broadcast.emit("user-connected", name);
  });
  socket.on("send-chat-message", (room, message) => {
    const myRoom = _.get(rooms, `${room}`);
    const users = _.get(myRoom, "users");
    const userName = _.get(users, `${socket.id}`);
    socket.to(room).broadcast.emit("chat-message", {
      message: message,
      name: userName,
    });
  });
  socket.on("disconnect", () => {
    getUserRooms(socket).forEach((room) => {
      const myRoom = _.get(rooms, `${room}`);
      const users = _.get(myRoom, "users");
      const userName = _.get(users, `${socket.id}`);

      socket.broadcast.emit("user-disconnected", userName);
      delete userName;
    });
  });
});

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) {
      names.push(name);
    }
    return names;
  }, []);
}
