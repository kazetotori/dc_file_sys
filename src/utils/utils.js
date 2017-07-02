"use strict";
const path = require('path');
const crypto = require('crypto');
const errCodeEnum = require('./../../config.json').errorCode;
module.exports.sha1 = sha1;
module.exports.sha1FromStream = sha1FromStream;
module.exports.newErrorByCode = newErrorByCode;
module.exports.nowDateTimeString = nowDateTimeString;


function sha1(str) {
    let sh = crypto.createHash('sha1');
    sh.update(str);
    return sh.digest('hex');
}

async function sha1FromStream(stream) {
    return new Promise((resolve, reject) => {
        let sh = crypto.createHash('sha1');
        stream.on('data', (data) => sh.update(data));
        stream.on('end', () => resolve(sh.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
}

/**
 * 根据errCode创建对应的error对象
 * @param {String} errCode 
 */
function newErrorByCode(errCode) {
    let err = new Error(errCodeEnum[errCode]);
    err.status = errCode;
    return err;
}


/**
 * 获取当前日期时间的字符串
 */
function nowDateTimeString() {
    let dt = new Date();
    return `${dt.getFullYear()}/${dt.getMonth()}/${dt.getDate()} ${dt.getHours()}:${dt.getMinutes()}:${dt.getSeconds()}`;
}

/**
 * 获取根目录名称，该名称将不含有'/'，仅支持正斜杠路径
 * /a/b/c             根目录为a
 * a/b/c              根目录为a
 * /                  根目录为空字符串
 * ''(空字符串)        根目录为空字符串
 * @param {String} dir 路径名
 */
function getRootDirName(dir) {
  if (dir.length === 1) { return dir === '/' ? '' : dir; }

  let idx = dir.indexOf('/');
  if (idx === -1) { return dir; }

  if (idx === 0) { dir = dir.slice(1) }
  idx = dir.indexOf('/');
  if (idx === -1) { return dir; }

  idx = dir.indexOf('/');
  return dir.slice(0, idx);
}