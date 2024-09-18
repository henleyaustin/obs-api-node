const { OBSWebSocket } = require('obs-websocket-js');

const obs = new OBSWebSocket();

// Function to connect to OBS WebSocket
async function connectObs (webSocketUrl, webSocketPass) {
    try {
        await obs.connect(webSocketUrl, webSocketPass);
        console.log('Connected to OBS WebSocket');
        return true;
    } catch (err) {
        console.error('Failed to connect:', err);
        return false;
    }
}

async function checkConnection () {
    const isConnected = obs._identified; // Use internal property to check connection
    return isConnected;
}

// Function to handle fetching inputs and their volumes
async function fetchInputs (socket) {
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
                    inputVolumeMul: volumeResponse.inputVolumeMul * 100, // Normalize to 0 < 100
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

        // Emit inputs data back to the client
        console.log('emitting current inputs');
        socket.emit('currentInputs', inputsWithSetVolume);
    } catch (error) {
        console.error('Error retrieving inputs with set volume:', error);
        socket.emit('error', {
            message: 'Failed to retrieve inputs with set volume'
        });
    }
}

// Function to set input volume
async function setInputVolume (socket, { uuid, volume }) {
    try {
        const normalizedVolume = volume / 100;
        await obs.call('SetInputVolume', {
            inputUuid: uuid,
            inputVolumeMul: normalizedVolume
        });
        socket.emit('volumeUpdated', { uuid, volume });
    } catch (error) {
        console.error(`Failed to update volume for ${uuid}:`, error);
        socket.emit('error', {
            message: `Failed to update volume for ${uuid}`
        });
    }
}

module.exports = {
    connectObs,
    checkConnection,
    fetchInputs,
    setInputVolume
};
