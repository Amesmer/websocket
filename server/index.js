const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 8100 })
wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
        console.log(msg.toString());
    })
    ws.send('msg from sever')
})
console.log('running 127.0.0.1:8100');