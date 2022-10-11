const app = require('express')()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

app.get('/', (req, res) => {
        // res.send('hello world')
        res.sendFile(__dirname + '/index.html')
    })
    // 监听连接
io.on('connection', (socket) => {
    console.log('a socket is connected');
    // 获取客户端的消息
    socket.on('chat msg', function(msg) {
        console.log('msg from client: ' + msg);
        // 发送消息给客户端
        socket.send('server says: ' + msg)
    })
})
http.listen(3100, () => {
    console.log('server is running on 3100');
})