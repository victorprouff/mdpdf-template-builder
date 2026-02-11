const express = require('express');
const http = require('http');
const path = require('path');
const apiRoutes = require('./routes/api');
const websocket = require('./websocket');

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api', apiRoutes);

websocket.init(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`mdpdf-template-builder running at http://localhost:${PORT}`);
});
