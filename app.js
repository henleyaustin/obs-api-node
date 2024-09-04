const express = require('express');
const obsRouter = require('./routes/obsRouter');
var cors = require('cors');

const app = express();
const PORT = 8080;

app.use(express.static('public'));

app.use(cors());

app.use(express.json());

// Use the OBS routes
app.use('/obs', obsRouter);

app.listen(PORT, async () => {
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
