let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);

io.set('authorization', function(handshakeData, accept) {
    var query = handshakeData._query;
    console.log(query);
    //接受连接
    accept(null, true);
    return;
    // var cookies = cookie.parse(handshakeData.headers.cookie); //解析cookies
    // var connectSid = cookies['connect.sid'];
    // if (connectSid) { //判断有无session登陆
    //     var connected = cookieParser.signedCookie(connectSid, 'technode'); //验证session的secret
    //     if (connected) {
    //         sessionStore.get(connected, function(error, session) { //去session里面取当前用户的数据
    //             if (error) {
    //                 accept(error.message, false)
    //             } else {
    //                 handshakeData.headers.sessions = session; //把当前用户数据传给socket.io的handshakeData
    //                 if (session.user) {
    //                     accept(null, true) //进行下面的链接
    //                 } else {
    //                     accept('No login', false)
    //                 }
    //             }
    //         })
    //     } else {
    //         accept('No session', false) //没session
    //     }
    // }
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client.html');
})
app.get('/staff', function (req, res) {
    res.sendFile(__dirname + '/staff.html');
})

let usocket = {}, users = [], staffSocket = {}, onlineStaff = [];
let staff = [
    {
        id: 1,
        name: '客服1',
        sex: 1,
        status: 1,
        password: '123'
    },
    {
        id: 2,
        name: '客服2',
        sex: 2,
        status: 1,
        password: '1234'
    }
];
let stopEmit = false

/**
 * @author lx
 * @param staffArr 客服数组
 * @returns {*}
 */
function getFreeStaff(staffArr) {
    for (let i = 0, length = staffArr.length; i < length; i++) {
        if (staffArr[i].status === 1) {
            return staffArr[i];
            break;
        }
    }
    return null
}

/**
 * @author lx
 * @param staffArr 客服数组
 * @param staffInfo 客服登录数据
 * @returns {boolean}
 */
function checkStaff(staffArr, staffInfo) {
    for (let i = 0, length = staffArr.length; i < length; i++) {
        if (staffArr[i].id === staffInfo.id) {
            if (staffArr[i].password === staffInfo.password) {
                return true;
            }
            return false
        }
    }
}

/**
 * @author lx
 * @param socket 全局socket对象
 * @param userId 新连接的userId
 */
function newChat(socket, userId) {
    console.log('用户连接: ', userId);
    // 未连接
    if (!(userId in usocket)) {

        // 取消拦截
        stopEmit = false;

        // 记录用户信息、客服信息
        socket.userId = userId;
        users.push(userId);

        // 保存带有用户信息和客服信息的socket对象
        usocket[userId] = socket;
    }

    // 已连接
    else {
        // 拦截消息
        stopEmit = true;

        // 断开连接
        usocket[userId].disconnect(true);

        // 清空用户数据
        delete(usocket[userId]);
        users.splice(users.indexOf(userId), 1);

        // 新建连接
        newChat(socket, userId);
    }
}

/**
 * @author lx
 * @param socket 全局socket对象
 * @param staffInfo 新连接的staffInfo
 */
function newStaff(socket, staffInfo) {
    console.log('客服连接：', staffInfo);

    if (checkStaff(staff, staffInfo)) {
        // 未连接
        if (!(staffInfo.id in staffSocket)) {
            // 记录用户信息、客服信息
            socket.staffId = staffInfo.id;
            onlineStaff.push(staffInfo.id);

            // 保存带有用户信息和客服信息的socket对象
            staffSocket[staffInfo.id] = socket;
        }
        // 已连接
        else {

            // 断开连接
            staffSocket[staffInfo.id].disconnect(true);

            // 删除该客服数据
            delete(staffSocket[staffInfo.id]);
            onlineStaff.splice(staff.indexOf(staffInfo.id), 1);

            // 新建连接
            newStaff(socket, staffInfo);
        }
    } else {
        socket.emit('err', {
            code: 'account_bad_pwd',
            message: '密码错误'
        })
    }
}


io.on('connection', function (socket) {

    socket.on('new chat', userId => {
        newChat(socket, userId);
    })

    socket.on('new staff', staffInfo => {
        newStaff(socket, staffInfo)
    })

    // 接收消息
    socket.on('send private message', function (res) {
        if (stopEmit) return
        if (users.indexOf(res.userId) !== -1 && usocket[res.userId]) {
            // 返回消息
            usocket[res.userId].emit('receive private message', res);
        }
        if(onlineStaff.indexOf(res.staffId) !== -1 && staffSocket[res.staffId]){
            staffSocket[res.staffId].emit('receive private message', res)
        }
    })
})

http.listen(3000, function () {
    console.log('listening on port 3000');
})
