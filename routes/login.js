const express = require('express');
const utils = require('./../src/utils/utils');
const groupDal = require('./../src/dal/groupDal');
const userDal = require('./../src/dal/userDal');
const signDal = require('./../src/dal/signDal');
const logDal = require('./../src/dal/logDal');
const router = express.Router();

//注册页面
router.use('/regist', (req, res) => {
    res.end('很抱歉，暂不支持注册，请返回<a href="/login/index">登录</a>界面。')
})

//获取token的api
//首先获取对应的groupNo，如果没有直接返回group_notfound
//然后获取对应的user，比对username和password
//无论登录失败，都写入日志
router.post('/getToken', async (req, res) => {
    let groupName = req.body.group;
    let groupNo = await groupDal.selectGroupIdByGroupName(groupName);
    let logModel = { logTitle: '登录', logMsg: 'login_success', pcsName: '/login/getToken', errStatus: 0 };

    //组名不存在的情况
    if (groupNo === -1) {
        logModel.logMsg = 'group_notfound';
        logModel.errStatus = '-999';
        logDal.insertRow(logModel);
        return res.end(JSON.stringify({ loginResult: 'group_notfound' }));
    }

    let uname = req.body.username;
    let pass = req.body.password;
    let userInfo = await userDal.selectRow(uname, groupNo);

    //组名下没有对应用户名的情况
    if (userInfo === undefined) {
        logModel.logMsg = 'username_notfound';
        logModel.errStatus = '-997';
        logDal.insertRow(logModel);
        return res.end(JSON.stringify({ loginResult: 'username_notfound' }));
    }

    //密码错误的情况
    if (userInfo.password !== utils.sha1(pass)) {
        logModel.logMsg = 'password_wrong';
        logModel.errStatus = '-996';
        logDal.insertRow(logModel);
        return res.end(JSON.stringify({ loginResult: 'password_wrong' }));
    }

    //到此处验证成功
    let signTS = new Date().getTime();
    let signToken = utils.sha1(`${signTS}`);
    await signDal.insertRow({
        signToken: signToken,
        userNo: userInfo.userId,
        signIp: req.ip,
        signTS: signTS
    })
    logModel.logMsg += ':' + signToken;
    logDal.insertRow(logModel);


    //检查是否rememberMe，如果是，则保存cookie
    //否则让其关闭浏览器时清楚
    if (req.body.rememberMe == 'true') {
        let cookieOption = { maxAge: 60 * 60 * 24 * 15 };
        res.cookie('rememberMe', true, cookieOption);
        res.cookie('group', groupName, cookieOption);
        res.cookie('username', uname, cookieOption);
        res.cookie('password', pass, cookieOption);
    }
    else {
        let cookieOption = { maxAge: -1 };
        res.cookie('rememberMe', undefined, cookieOption);
        res.cookie('group', '', cookieOption);
        res.cookie('username', '', cookieOption);
        res.cookie('password', '', cookieOption);
    }

    //将token写入cookie，返回数据
    res.cookie('signToken', signToken);
    return res.end(JSON.stringify({
        loginResult: 'login_success',
        token: signToken
    }));
})


//没有特殊操作，进入登陆界面
router.use((req, res) => {
    res.render('login')
})

module.exports = router;