"use strict";
const pool = require('./../sql/dbPool');
module.exports.insertRow = insertRow;
module.exports.selectByToken = selectByToken;


/**
 * 向表t_sign中插入一条数据
 * @param {Object} model 插入的模型，必须参数:signToken,userNo,signIp,signTS
 * @return {Number} 插入后得到的insertId
 */
async function insertRow(model) {
    let conn = await pool.getConn();
    let cmd = 'INSERT INTO t_sign(sign_token,user_no,sign_ip,sign_ts) VALUES(?,?,?,?)';
    let params = [model.signToken, model.userNo, model.signIp, model.signTS];
    let ret = (await conn.query(cmd, params))[0].insertId;
    await conn.release();
    return ret;
}


/**
 * 根据signToken查询t_sign中的一条对应的登陆数据
 * @param {String} signToken 
 * @return {Object} 该登录数据，如果没有对应的signToken，则返回undefined
 */
async function selectByToken(signToken) {
    let conn = await pool.getConn();
    let cmd = `SELECT 
        sign_token as signToken,
        user_no as userNo,
        sign_ip as signIp,
        sign_ts as signTS 
        FROM t_sign WHERE sign_token=?`;
    let params = [signToken];
    let ret = (await conn.query(cmd,params))[0][0];
    await conn.release();
    return ret;
}