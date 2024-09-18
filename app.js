const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const { OBSWebSocket } = require('obs-websocket-js');

const {
    connectObs,
    checkConnection,
    fetchInputs,
    setInputVolume
} = require('./obsSocketHandlers');

const obs = new OBSWebSocket();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
const PORT = 8080;

app.use(express.static('public'));
app.use(cors());
app.options('*', cors());
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
    res.json({ status: 'API is healthy!' });
});

// Connect to OBS
app.post('/obs/', async (req, res) => {
    const { webSocketUrl, webSocketPass } = req.body;

    const isConnected = await connectObs(webSocketUrl, webSocketPass);
    if (isConnected) {
        return res.json({ message: 'Successfully connected to OBS' });
    } else {
        return res.status(500).json({ error: 'Failed to connect to OBS' });
    }
});

// Check OBS connection status
app.get('/obs/status', async (req, res) => {
    const isConnected = await checkConnection();
    res.json({ isConnected });
});

// Handle WebSocket events
io.on('connection', socket => {
    console.log('Client connected:', socket.id);

    // Listen for input fetch requests
    socket.on('requestInputs', () => {
        fetchInputs(socket);
    });

    // Listen for input volume changes
    socket.on('setVolume', data => {
        setInputVolume(socket, data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(PORT, async () => {
    console.log(`API is running on http://localhost:${PORT}`);

    try {
        // Dynamically import the ES module
        const { tunnelmole } = await import('tunnelmole');

        // Generate a random subdomain by not specifying the domain option
        const url = await tunnelmole({
            port: PORT
        });

        console.log(`Public URL: ${url}`);
        console.log(
            'Share this URL with your frontend or anyone who needs to access the API.'
        );

        // Optionally, you can serve the URL to the user through a specific endpoint or save it to a file.
    } catch (error) {
        console.error('Failed to create Tunnelmole URL:', error);
    }
});

module.exports = app;
