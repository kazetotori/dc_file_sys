const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const fsExt = require('./../src/node-extend/fs');
const groupDal = require('./../src/dal/groupDal');
const userDal = require('./../src/dal/userDal');
const signDal = require('./../src/dal/signDal');
const logDal = require('./../src/dal/logDal');
const utils = require('./../src/utils/utils');
const config = require('./../config.json');
const router = express.Router();
module.exports = router;


router.use(tokenConfirm)
router.use('/index', Index);
router.use('/group/getAllUsers', getAllUsers);
router.use('/group/deleteUsers', deleteUsers);
router.use('/group/saveUsers', saveUsers);
router.use('/group', adminConfirm, Group);
router.use('/getDir', setReqRootDir, getDir);
router.use('/downFiles', setReqRootDir, downFiles);
router.use('/downSingleFile', setReqRootDir, downSingleFile);


/**
 * 验证登录token，并将获取的用户信息写入req
 */
async function tokenConfirm(req, res, next) {
    let signToken = req.cookies.signToken;
    let logModel = { logTitle: 'Token验证', logMsg: 'sign_success', pcsName: '/main', errStatus: 0 };

    //如果cookie中不存在signToken
    if (!signToken) {
        logModel.logMsg = 'token_unexists';
        logModel.errStatus = '-899';
        logDal.insertRow(logModel);
        return res.end(JSON.stringify({ tokenResult: 'token_unexists' }));
    }

    let signInfo = await signDal.selectByToken(signToken);

    //如果ip验证失败
    if (signInfo.signIp !== req.ip) {
        logModel.logMsg = 'token_ipFailed';
        logModel.errStatus = '-898';
        logDal.insertRow(logModel);
        return res.end(JSON.stringify({ tokenResult: 'token_ipFailed' }));
    }

    let userInfo = await userDal.selectRowByUserId(signInfo.userNo);
    userInfo.isAdmin = userInfo.perLV === 9999;

    //如果用户在操作时被删除
    if (!userInfo) {
        logModel.logMsg = 'token_userUnexists';
        logModel.errStatus = '-897';
        return res.end(JSON.stringify({ tokenResult: 'token_userUnexists' }));
    }

    //验证成功，将userInfo传递下去
    logDal.insertRow(logModel);
    req.userInfo = userInfo;
    next();
}

/**
 * 获取/index页
 */
async function Index(req, res) {
    let modules = [{ name: '文件', href: '#', active: 'active' }]
    if (req.userInfo.isAdmin) {
        modules.push({ name: '用户', href: '/main/group' });
        modules.push({ name: '权限', href: '/main/permission' });
        modules.push({ name: '映射', href: '/main/reflect' });
    }
    res.render('main', { modules: modules });
}

/**
 * 验证该用户是否管理员
 */
async function adminConfirm(req, res, next) {
    if (!req.userInfo.isAdmin) {
        res.set({ 'content-type': 'text/plain' });
        return res.end('此用户非对应组管理员，无法使用此功能');
    }
    next();
}

/**
 * 获取/group页
 */
async function Group(req, res) {
    res.render('group', {
        modules: [
            { name: '文件', href: '/main/index' },
            { name: '用户', href: '#', active: 'active' },
            { name: '权限', href: '/main/permission' },
            { name: '映射', href: '/main/reflect' }
        ]
    })
}

/**
 * 或缺该组下的所有用户
 */
async function getAllUsers(req, res) {
    let logModel = { logTitle: '获取组下用户列表', logMsg: 'getAllUsers_success', pcsName: '/main/group/getAllUsers', errStatus: 0 };
    try {
        let userList = await userDal.selectGroup(req.userInfo.groupNo);
        userList.forEach((userInfo) => userInfo.password = 'hello world')
        res.end(JSON.stringify({
            result: 'getAllUsers_success',
            userList: userList
        }))
        logDal.insertRow(logModel);
    }
    catch (e) {
        logModel.logMsg = 'getAllUsers_failed';
        logModel.errStatus = -1;
        res.end(JSON.stringify({ result: e.message }));
        logDal.insertRow(logModel);
    }

}

/**
 * 删除指定用户
 */
async function deleteUsers(req, res) {
    let logModel = { logTitle: '删除用户', logMsg: 'deleteUsers_success', pcsName: '/main/group/deleteUsers', errStatus: 0 };
    let toDeleteUsers = req.body.toDeleteUsers.split(',');
    try {
        let deleted = await userDal.deleteUsers(toDeleteUsers);
        res.end(JSON.stringify({
            result: 'deleteUsers_success',
            deletedUserList: toDeleteUsers
        }));
        logDal.insertRow(logModel);
    }
    catch (e) {
        res.end(JSON.stringify({
            result: 'deleteUsers_failed',
            errMsg: e.message
        }))
        logDal.logMsg = 'deleteUsers_failed:' + e.message;
        logDal.errStatus = -1;
        logDal.insertRow(logDal);
    }
}

/**
 * 保存用户
 */
async function saveUsers(req, res) {
    let successSaved = [];
    let failedSaved = [];
    let unameReg = /[\d]{4,6}/;
    let passReg = /[a-zA-Z0-9]{4,12}/;

    if (Array.isArray(req.body.toInsert)) {
        for (let i = 0; i < req.body.toInsert.length; i++) {
            let model = Object.assign({}, req.body.toInsert[i]);
            let userId;
            let logModel = { logTitle: '新增用户', logMsg: 'insertUser_success', pcsName: '/main/group/saveUsers', errStatus: 0 };

            model.password = utils.sha1(model.password);
            model.groupNo = req.userInfo.groupNo;
            try {
                if (!unameReg.test(model.username)) throw new Error('错误的用户名格式，不符合4-6位的数字');
                if (!passReg.test(model.password)) throw new Error('错误的密码格式，不符合4-12位的字母和数字的组合');
                if (isNaN(model.perLV)) throw new Error('权限等级不为数字');
                userId = await userDal.insertRow(model);
                successSaved.push({ userId: userId, lineNo: model.lineNo });
            }
            catch (e) {
                logModel.logMsg = 'insertUser_failed';
                logModel.errStatus = '-1';
                failedSaved.push({ lineNo: model.lineNo, errMsg: e.message });
            }
            await logDal.insertRow(logModel);
        }
    }

    if (Array.isArray(req.body.toUpdate)) {
        for (let i = 0; i < req.body.toUpdate.length; i++) {
            let model = Object.assign({}, req.body.toUpdate[i]);
            let userId;
            let logModel = { logTitle: '修改用户', logMsg: 'updateUser_success', pcsName: '/main/group/saveUsers', errStatus: 0 };

            model.password = utils.sha1(model.password);
            model.groupNo = req.userInfo.groupNo;

            try {
                if (!passReg.test(model.password)) throw new Error('错误的密码格式，不符合4-12位的字母和数字的组合');
                if (isNaN(model.perLV)) throw new Error('权限等级不为数字');
                userId = await userDal.updateUser(model);
                successSaved.push({ userId: userId, lineNo: model.lineNo });
            }
            catch (e) {
                logModel.logMsg = 'insertUser_failed';
                logModel.errStatus = '-1';
                failedSaved.push({ lineNo: model.lineNo, errMsg: e.message });
            }
            await logDal.insertRow(logModel);
        }
    }

    res.end(JSON.stringify({
        savedUsers: successSaved,
        failedSaved: failedSaved
    }))
}

/**
 * 获取当前进入该路由的用户的根目录，并设置到req.userInfo上
 */
async function setReqRootDir(req, res, next) {
    let groupName = await groupDal.selectGroupNameByGroupId(req.userInfo.groupNo);
    let rootDir = path.join(config.rootDir, '/', groupName);
    req.userInfo.rootDir = rootDir;
    next();
}

/**
 * 获取文件目录下所有文件，并返回给浏览器端口
 */
async function getDir(req, res) {
    let logModel = { logTitle: '获取文件列表', logMsg: 'getFileList_success', pcsName: '/main/getDir', errStatus: 0 };
    try {
        let dir = req.body.dir;
        let realDir = path.join(req.userInfo.rootDir, '/', dir);
        if (!(await fsExt.existsAsync(realDir))) {
            await fsExt.mkdirAsync(realDir);
        }

        let fileNameList = await fsExt.readdirAsync(realDir);
        let fileList = [];
        let dirList = [];
        for (let i = 0; i < fileNameList.length; i++) {
            let fileName = fileNameList[i];
            let fileInfo = { fileName: fileName };
            let extName = path.extname(fileName);
            let stat = await fsExt.lstatAsync(path.join(realDir, '/', fileName));
            let isDir = stat.isDirectory();
            let fileType = isDir ? 'dir' : config.fileExtTypeEnum[extName];
            if (!fileType) { fileType = 'unknow'; }
            fileInfo.fileIcoSrc = config.fileTypeIcoEnum[fileType];
            fileInfo.isDir = isDir;
            (isDir ? dirList : fileList)['push'](fileInfo);
        }

        fileList.unshift(...dirList);

        res.end(JSON.stringify({
            result: 'getFileList_success',
            fileList: fileList
        }));
        logDal.insertRow(logModel);
    } catch (e) {
        logModel.errStatus = '-1';
        logModel.logMsg = 'getFileList_failed';
        logDal.insertRow;
    }
}

/**
 * 下载文件的路由，多个下载给浏览器返回zip文件
 */
async function downFiles(req, res) {
    res.set({ 'content-type': 'appliction/octet-stream' });
    let ziper = archiver('zip', { level: 9 });
    let fileLinks = JSON.parse(req.body.fileLinks);
    res.set({ 'content-disposition': `attachment;filename*=UTF-8''${encodeURI('打包下载.zip')}` });

    ziper.pipe(res);
    for (let i = 0; i < fileLinks.length; i++) {
        let fileName = path.join(req.userInfo.rootDir, fileLinks[i]);
        let baseName = path.basename(fileName);
        let stat = await fsExt.lstatAsync(fileName);
        if (stat.isDirectory()) {
            ziper.directory(fileName, { name: baseName });
            continue;
        }
        ziper.append(fs.createReadStream(fileName, { flags: 'r', mode: 0777 }), { name: baseName });
    }
    ziper.finalize();
}

/**
 * 浏览器下载单个文件
 */
async function downSingleFile(req, res) {
    res.set({ 'content-type': 'appliction/octet-stream' });
    let realFileName = path.join(req.userInfo.rootDir, '/', decodeURI(req.url));
    express.static(path.dirname(realFileName))(req, res);
}