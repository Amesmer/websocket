const WebSocket = require('ws')
const jwt = require('jsonwebtoken')

const redis = require('./src/common/RedisConfig')
const { get } = require('./src/common/RedisConfig')

const prefix = 'room-'
async function init() {
    const keys = await redis.getkeys(prefix)
    console.log('keys', keys);
    if (keys.length > 0) {
        keys.forEach(async(key) => {
            await redis.del(key)
        })
    }
}
init()
    // 提高服务的稳定行
    // 检测客户端的连接
    // 用户暂存消息的逻辑
    // 客户端发送 roomid  uid
    // 存取 roomid   成员数   |    uid  消息

// 测试用token
const token = jwt.sign({
    data: 'foobar'
}, 'secret', { expiresIn: '1d' });
console.log('token', token);

const wss = new WebSocket.Server({ port: 8100 })
    // 多聊天室功能
    // 记录房间id  roomid   指定对应的roomid进行广播
    // 否则就广播到大厅   default  id
    // 存放roomid  1.ws对象上  2.借助redis mongodb这样的数据库进行持久化
    // redit -》 set -》 group[roomid]-> 对应的会话id
    // mongodb -》 用户历史加入的房间 -》 用户历史发消息-》 收藏   等用户相关需要持久化的数据

let timeInterval = 3000
    // 提高服务的稳定性
    // 监测客户端的连接  定时器 超过指定时间 主动断开客户端的连接
wss.on('connection', async function(ws) {
    console.log('a new client is connected!');

    ws.isAlive = true
    ws.on('message', async function(msg) {
        let msgObj = JSON.parse(msg.toString())
            // 鉴权token
        if (msgObj.event == 'auth') {
            // 拿到token 校验时效性
            console.log('msg auth is: ' + msgObj.message)
                // 拿到token,并且去校验时效性
            jwt.verify(msgObj.message, 'secret', (err, decode) => {
                if (err) {
                    // websocket返回前台一个消息
                    console.log('auth error')
                    return

                } else {
                    // 鉴权通过的逻辑
                    // 这里可以拿到decode，即payload里面的内容
                    ws.isAuth = true
                    return

                }
            })

        }
        // 拦截非鉴权请求
        if (!ws.isAuth) {
            // 去给客户端发送重新鉴权的消息
            ws.send(JSON.stringify({
                event: 'noauth',
                message: 'please auth again, your token is expired!'
            }))
            return
        }
        // 心跳检测
        if (msgObj.event == 'heartbeat' && msgObj.message == 'pong') {
            ws.isAlive = true
            return
        }
        // 登陆名
        if (msgObj.name) {
            ws.name = msgObj.name
        }
        if (msgObj.uid) {
            ws.uid = msgObj.uid
        }

        // 当前客户端绑定到消息上要去的房间
        if (typeof ws.roomid == 'undefined' && msgObj.roomid) {
            // 给对应的客户端绑定roomid
            ws.roomid = msgObj.roomid
                // redis 设置房间号
            let result = await redis.existKey(prefix + msgObj.roomid)
            console.log('result', result);
            //计算房间人数 已经存在的房间人数+1
            if (result == 0) {
                // 初始化数据
                redis.set(prefix + msgObj.roomid, JSON.stringify([ws.uid]))

            } else {
                //计数
                // redis.increase(prefix + msgObj.roomid)

                // string-> json  房间里添加用户
                let arrstr = await redis.get(prefix + msgObj.roomid)
                let arr = JSON.parse(arrstr)
                if (arr.indexOf(ws.uid) == -1) {
                    arr.push(ws.uid)
                    redis.set(prefix + msgObj.roomid, JSON.stringify(arr))
                }
            }
        }



        let arrStr = ''
        let arr = []
        if (!!ws.roomid) {
            // 广播到其他的客户端
            arrStr = await redis.get(prefix + ws.roomid)
            console.log('arrStr', arrStr);
        }
        arr = arrStr.split(',')
            // 总人数
        msgObj.total = arr.length
            // 在线人数
        msgObj.num = wss.clients.size
        wss.clients.forEach(async function each(client) {

            // 广播给非自己的其他客户端 client !== ws &&   发送给同一个roomid 下的用户
            if (client.readyState === WebSocket.OPEN && client.roomid == ws.roomid) {
                client.send(JSON.stringify(msgObj));
                // 删除已经发送消息的对应对象
                // 删除已经发送了消息的对应的对象
                if (!!ws.roomid) {
                    // 除自己外的其他连接
                    if (arr.indexOf(client.uid) !== -1) {
                        arr.splice(arr.indexOf(client.uid), 1)
                    }
                    // 是否存在自己uid下的消息
                    let result = await redis.existKey(ws.uid)
                    if (result != 0) {
                        // 获取该客户端uid下记录的聊天数据
                        let tempArr = await redis.get(ws.uid)
                        let tmpObj = JSON.parse(tempArr)
                        if (tmpObj.length > 0) {
                            // 遍历数组是否是同一个roomid 否则保存数据
                            tmpObj.forEach((item) => {
                                if (item.roomid == client.roomid && ws.uid === client.uid) {

                                    client.send(JSON.stringify(item.msg))
                                    tmpObj.splice(tmpObj.indexOf(item), 1)
                                }
                            })
                            redis.set(ws.uid, JSON.stringify(tmpObj))
                        }
                    }
                }

            }
            // 判断 是否有客户端没有连接  
            // 没有连接的客户端数据  进行分发缓存处理

        });

        // 说明有客户段断开了连接 并且其他客户端发送了消息
        if (arr.length > 0 && msgObj.event == 'message') {
            const result = await redis.existKey(ws.uid)
            if (result != 0) {
                let udata = await redis.get(ws.uid)
                let uobj = JSON.parse(udata)
                uobj.push({
                    roomid: ws.roomid,
                    msg: msgObj
                })
                redis.set(ws.uid, JSON.stringify(uobj))
            } else {
                // 说明先前这个用户没有数据缓存
                redis.set(ws.uid, JSON.stringify([{
                    roomid: ws.roomid,
                    msg: msgObj
                }]))
            }
        }
    })
    ws.on('close', () => {
        console.log('one client is closed:' + ws);

        // redis.decrease(prefix + ws.roomid)
        wss.clients.forEach(async(client) => {
            if (client != ws && ws.roomid == client.roomid && client.readyState === WebSocket.OPEN && client.roomid == ws.roomid) {
                let arr1 = await redis.get(prefix + ws.roomid)
                let total = 0
                if (!!arr1) {
                    arr1.split(',').length

                }
                client.send(JSON.stringify({
                    name: ws.name,
                    event: 'logout',
                    num: wss.clients.size,
                    total: total
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
            console.log('client is disconnented');
            redis.decrease(prefix + ws.roomid)
            return ws.terminate()
        }
        ws.isAlive = false
        ws.send(JSON.stringify({
            event: 'heartbeat',
            message: 'ping'
        }))
    })
}, timeInterval)