const fs = require('fs');
const path = require('path');
module.exports.readdirAsync = readdirAsync;
module.exports.lstatAsync = lstatAsync;
module.exports.existsAsync = existsAsync;
module.exports.mkdirAsync = mkdirAsync;
module.exports.copyAsync = copyAsync;




/**
 * fs.readdir的async版本
 * @param {dirName} 要读取的路径名
 * @return {Promise<Array<String>>} 该路径下所有文件及文件夹名称的集合
 */
async function readdirAsync(dirName) {
    return new Promise((resolve, reject) => {
        fs.readdir(dirName, (err, fileNameList) => {
            if (err) reject(err);
            else resolve(fileNameList);
        })
    });
}



/**
 * fs.lstat的async版本
 * @param {String} fileName 文件名，含路径
 * @return {Promise<FileStats>}
 */
async function lstatAsync(fileName) {
    return new Promise((resolve, reject) => {
        fs.lstat(fileName, (err, stats) => {
            if (err) reject(err);
            else resolve(stats);
        })
    });
}



/**
 * fs.exists的async版本
 * @param {String} fileName  文件名，含路径
 * @return {Promise<Boolean>}
 */
async function existsAsync(fileName) {
    return new Promise((resolve, reject) => {
        fs.exists(fileName, (exists) => {
            resolve(exists);
        })
    });
}



/**
 * 创建指定路径
 * @param {String} dirName 要创建的路径名
 * @return {Promise<void>}
 */
async function mkdirAsync(dirName) {
    let backDirName = path.dirname(dirName);
    let exists = await existsAsync(backDirName);
    if (!exists) {
        await mkdirAsync(backDirName);
    }
    return new Promise((resolve, reject) => {
        fs.mkdir(dirName, (err) => {
            if (err) reject(err);
            else resolve();
        })
    });
}



/**
 * 将文件或文件夹从指定路径复制到目标路径
 * @param {String} src 源文件或文件夹的路径
 * @param {String} dst 目标文件路径或文件夹路径
 * @param {Number} mode 权限模式，默认为0777
 * @return {Promise<void>}
 */
async function copyAsync(src, dst, mode = 0777) {
    let stat = await lstatAsync(src);
    if (stat.isFile()) {
        let rs = fs.createReadStream(src, { flags: 'r', mode: mode })
        let ws = fs.createWriteStream(dst, { flags: 'w', mode: mode });
        return new Promise((resolve, reject) => {
            rs.pipe(ws);
            ws.on('error', (err) => reject(err))
            rs.on('error', (err) => reject(err));
            ws.on('close', () => resolve());
        });
    }

    let fileNameList = await readdirAsync(src);
    let len = fileNameList.length;
    let i = 0;
    if (!(await existsAsync(dst))) {
        await mkdirAsync(dst)
    }

    while (i < len) {
        let fileName = fileNameList[i];
        let srcFullName = path.join(src, '/', fileName);
        let dstFullName = path.join(dst, '/', fileName);
        await copyAsync(srcFullName, dstFullName);
        i++;
    }
}