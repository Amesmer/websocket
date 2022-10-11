const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 8100 })

wss.on('connection', function(ws) {
    console.log('a new client is connected!');
    ws.on('message', function(msg) {
        let msgObj = JSON.parse(msg.toString())
        if (msgObj.name) {
            ws.name = msgObj.name
        }
        // 广播到其他的客户端
        wss.clients.forEach(function each(client) {
            msgObj.num = wss.clients.size
                // 广播给非自己的其他客户端 client !== ws && 
            if (client.readyState === WebSocket.OPEN) {
                // console.log(msg.toString());
                console.log(msgObj);
                client.send(JSON.stringify(msgObj));
            }
        });
    })
    ws.on('close', () => {
        console.log('one client is closed:' + ws);
        wss.clients.forEach((client) => {
            if (client != ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    name: ws.name,
                    event: 'logout',
                    num: wss.clients.size
                }))
            }
        })
    })
});