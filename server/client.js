const WebSocket = require('ws')
const wss = new WebSocket('ws://127.0.0.1:8100')

wss.on('open', () => {
    try {
        wss.send('hello from client')
        wss.on('message', (msg) => {
            console.log(msg.toString());
        })
    } catch (error) {
        console.log(error);
    }
})