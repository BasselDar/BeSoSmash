require('dotenv').config(); // MUST BE LINE 1
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const gameRoutes = require('./routes/gameRoutes');
const socketController = require('./controllers/socketController');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Routes
app.use('/', gameRoutes);

// 404 Handler - MUST BE AFTER ALL OTHER ROUTES
app.use((req, res) => {
    res.status(404).render('404', { activePage: null });
});

// Socket Logic
socketController(io);

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(` BeSoSmash running on http://localhost:${PORT}`);
});