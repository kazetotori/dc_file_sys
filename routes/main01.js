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


//进入main的路由，首先要进行token验证
router.use(async (req, res, next) => {
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
})


//index，文件导航，返回主页
router.use('/index', (req, res) => {
    let modules = [{ name: '文件', href: '#', active: 'active' }]
    if (req.userInfo.isAdmin) {
        modules.push({ name: '用户', href: '/main/group' });
        modules.push({ name: '权限', href: '/main/permission' });
        modules.push({ name: '映射', href: '/main/reflect' });
    }
    res.render('main', { modules: modules });
});


router.use('/group||reflect||permission', (req, res, next) => {
    if (!req.userInfo.isAdmin) {
        res.set({ 'content-type': 'text/plain' });
        return res.end('此用户非对应组管理员，无法使用此功能');
    }
    next();
})
router.use('/group', (req, res) => {
    res.render('group', {
        modules: [
            { name: '文件', href: '/main/index' },
            { name: '用户', href: '#', active: 'active' },
            { name: '权限', href: '/main/permission' },
            { name: '映射', href: '/main/reflect' }
        ]
    })
})



//以下路由需要依赖该路由: getDir,downFiles,downSingleFile
//该路由用于获取该组的根目录
router.use('/getDir||downFiles||downSingleFile', async (req, res, next) => {
    let groupName = await groupDal.selectGroupNameByGroupId(req.userInfo.groupNo);
    let rootDir = path.join(config.rootDir, '/', groupName);
    req.userInfo.rootDir = rootDir;
    next();
})


//进入下载文件的路由，设置http请求头文件类型为octet-stream
router.use('/downFiles||downSingleFile', (req, res, next) => {
    res.set({ 'content-type': 'appliction/octet-stream' });
    next();
})


//获取文件夹下所有文件的路由
//1、获取组名
//2、如果该组名没有对应文件夹，则建立
//3、对应该组，获取该用户的权限等级，返回小于等于该等级的文件夹
router.use('/getDir', async (req, res) => {
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
})


//下载文件的路由，多文件返回一个压缩包
router.use('/downFiles', async (req, res, next) => {
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
})


//下载单个文件的路由
router.use('/downSingleFile', async (req, res) => {
    let realFileName = path.join(req.userInfo.rootDir, '/', decodeURI(req.url));
    express.static(path.dirname(realFileName))(req, res);
})




