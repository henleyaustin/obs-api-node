const express = require('express');
const { OBSWebSocket } = require('obs-websocket-js');

const obs = new OBSWebSocket();
const router = express.Router();

const DEFAULT_LINK = 'ws://localhost:4455';
const DEFAULT_PASS = 'BiaYZkAlOZbNHbM1';

// Connect to OBS WebSocket server
async function connectObs (link = DEFAULT_LINK, pass = DEFAULT_PASS) {
    try {
        await obs.connect(link, pass);
        console.log('Connected to OBS WebSocket');
        return true;
    } catch (err) {
        console.error('Failed to connect:', err);
        return false;
    }
}

// Connect to OBS
router.post('/', async (req, res) => {
    const { webSocketUrl, webSocketPass } = req.body;

    const isConnected = await connectObs(webSocketUrl, webSocketPass);
    if (isConnected) {
        return res.json({ message: 'Successfully connected to OBS' });
    } else {
        return res.status(500).json({ error: 'Failed to connect to OBS' });
    }
});

// Check OBS connection status
router.get('/status', (req, res) => {
    const isConnected = obs._identified; // Use internal property to check connection
    res.json({ isConnected });
});

// Get Active Inputs with Volume
router.get('/allinputs', async (req, res) => {
    try {
        const inputsResponse = await obs.call('GetInputList');
        const inputs = inputsResponse.inputs;

        const inputsWithSetVolumePromises = inputs.map(async input => {
            try {
                const volumeResponse = await obs.call('GetInputVolume', {
                    inputUuid: input.inputUuid
                });

                return {
                    ...input,
                    inputVolumeMul: volumeResponse.inputVolumeMul,
                    inputVolumeDb: volumeResponse.inputVolumeDb
                };
            } catch (error) {
                console.warn(
                    `Could not get volume for input "${input.inputName}". Skipping...`
                );
                return null;
            }
        });

        const inputsWithSetVolume = (
            await Promise.all(inputsWithSetVolumePromises)
        ).filter(input => input !== null);

        res.json(inputsWithSetVolume);
    } catch (error) {
        console.error('Error retrieving inputs with set volume:', error);
        res.status(500).json({
            error: 'Failed to retrieve inputs with set volume'
        });
    }
});

// Change Volume of Input
router.post('/input', async (req, res) => {
    const { Uuid, volumeMul } = req.body;

    if (!Uuid || volumeMul === undefined) {
        return res
            .status(400)
            .json({ error: 'Input UUID and volume are required' });
    }

    try {
        const response = await obs.call('SetInputVolume', {
            inputUuid: Uuid,
            inputVolumeMul: volumeMul
        });

        res.json({ message: 'Volume set successfully', response });
    } catch (error) {
        console.error('Error setting input volume:', error);
        res.status(500).json({
            error: 'Failed to set input volume: ' + error.message
        });
    }
});

// Get Volume of Input
router.get('/input/:uuid', async (req, res) => {
    const { uuid } = req.params;

    try {
        const response = await obs.call('GetInputVolume', { inputUuid: uuid });

        res.json({ uuid, volume: response.inputVolumeMul });
    } catch (error) {
        console.error(`Error getting input volume for ${uuid}:`, error);
        res.status(500).json({
            error: 'Failed to get input volume: ' + error.message
        });
    }
});

module.exports = router;
