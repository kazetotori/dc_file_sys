const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('node-archiver');
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
    userInfo.isAdmin = Boolean(userInfo.isAdmin[0]);

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