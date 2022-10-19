const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 8100 })
    // 多聊天室功能
    // 记录房间id  roomid   指定对应的roomid进行广播
    // 否则就广播到大厅   default  id
    // 存放roomid  1.ws对象上  2.借助redis mongodb这样的数据库进行持久化
    // redit -》 set -》 group[roomid]-> 对应的会话id
    // mongodb -》 用户历史加入的房间 -》 用户历史发消息-》 收藏   等用户相关需要持久化的数据
let group = {}
let timeInterval = 5000
    // 提高服务的稳定性
    // 监测客户端的连接  定时器 超过指定时间 主动断开客户端的连接
wss.on('connection', function(ws) {
    console.log('a new client is connected!');

    ws.isAlive = true
    ws.on('message', function(msg) {
        let msgObj = JSON.parse(msg.toString())
        if (msgObj.event == 'heartbeat' && msgObj.message == 'pong') {
            ws.isAlive = true
            return
        }
        if (msgObj.name) {
            ws.name = msgObj.name
        }

        // 当前客户端绑定到消息上要去的房间
        if (typeof ws.roomid == 'undefined' && msgObj.roomid) {
            // 给对应的客户端绑定roomid
            ws.roomid = msgObj.roomid
                //计算房间人数 已经存在的房间人数+1
            if (!!group[ws.roomid]) {
                group[ws.roomid]++
                    console.log('1', group);
            } else {
                group[ws.roomid] = 1
                console.log('2', group);
            }


        }


        // 广播到其他的客户端
        wss.clients.forEach(function each(client) {
            // msgObj.num = wss.clients.size
            console.log('group', group);
            msgObj.num = group[ws.roomid]
                // msgObj.rooms = group[ws.roomid]
                // 广播给非自己的其他客户端 client !== ws &&   发送给同一个roomid 下的用户
            if (client.readyState === WebSocket.OPEN && client.roomid == ws.roomid) {
                // console.log(msg.toString());
                console.log(msgObj);
                client.send(JSON.stringify(msgObj));
            }
        });
    })
    ws.on('close', () => {
        console.log('one client is closed:' + ws);
        group[ws.roomid]--
            wss.clients.forEach((client) => {
                if (client != ws && ws.roomid == client.roomid && client.readyState === WebSocket.OPEN && client.roomid == ws.roomid) {
                    client.send(JSON.stringify({
                        name: ws.name,
                        event: 'logout',
                        // num: wss.clients.size
                        num: group[ws.roomid]
                    }))
                }
            })
    })
});

const interval = setInterval(() => {
    // 遍历所有的客户端,发送一个ping消息
    // 监测是否有返回 如果没有返回或者超时之后 主动断开与客户端的连接
    wss.clients.forEach((ws) => {
        if (ws.isAlive == false) {
            return ws.terminate()
        }
        ws.isAlive = false
        ws.send(JSON.stringify({
            event: 'heartbeat',
            message: 'ping'
        }))
    })
}, timeInterval)