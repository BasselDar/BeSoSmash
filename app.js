require('dotenv').config(); // MUST BE LINE 1
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const { initDB } = require('./models/db');
const gameRoutes = require('./routes/gameRoutes');
const socketController = require('./controllers/socketController');

const app = express();
app.use(helmet({
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https://*"],
            connectSrc: ["'self'", "ws:", "wss:", "https://*"],
            workerSrc: ["'self'"]
        },
    }
}));
app.disable('x-powered-by');
// Rate limit moved below static files to prevent 429 on image loads
const server = http.createServer(app);
const io = new Server(server);

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Apply rate limiter ONLY to dynamic routes and API calls (not static assets)
app.use(rateLimit({ windowMs: 60000, max: 150 }));

// Routes
app.use('/', gameRoutes);

// 404 Handler - MUST BE AFTER ALL OTHER ROUTES
app.use((req, res) => {
    res.status(404).render('404', { activePage: null });
});

// 500 Global Error Handler for Production
app.use((err, req, res, next) => {
    const errorMsg = `[${new Date().toISOString()}] ${err.stack}\n`;
    console.error(errorMsg);
    fs.appendFile(path.join(__dirname, 'error.log'), errorMsg, (fsErr) => {
        if (fsErr) console.error('Failed to write to error.log', fsErr);
    });
    res.status(500).send('<h1>500 Internal Server Error</h1><p>Something broke violently. The incident has been logged.</p>');
});

// Socket Logic
socketController(io);

// Start Server safely after DB connects
const PORT = process.env.PORT || 3000;
initDB().then(() => {
    server.listen(PORT, () => {
        console.log(` BeSoSmash running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("FATAL: Failed to initialize database securely:", err);
    process.exit(1);
});