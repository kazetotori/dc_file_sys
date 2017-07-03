"use strict";
const pool = require('./../sql/dbPool');
const groupDal = require('./groupDal');
const utils = require('./../utils/utils');
module.exports.insertRow = insertRow;
module.exports.selectRow = selectRow;
module.exports.selectRowByUserId = selectRowByUserId;
module.exports.selectGroup = selectGroup;
module.exports.selectGroupCount = selectGroupCount;
module.exports.deleteByUserId = deleteByUserId;
module.exports.updatePass = updatePass;



/**
 * 向表t_user中添加一条数据
 * @param {Object} model 插入user的模型，参数必选:username,password,groupName
 * @return {Number} 插入后得到的insertId
 */
async function insertRow(model) {
    let conn = await pool.getConn();
    let cmd = 'INSERT INTO t_user(username,password,group_no,is_admin) VALUES(?,?,?,?)';
    let params = [model.username, model.password, model.groupNo, !!model.isAdmin ? 1 : 0];
    let execRst = await conn.query(cmd, params);
    await conn.commit();
    await conn.release();
    return execRst[0].insertId;
}


/**
 * 删除一条t_user表中的数据
 * @param {Number} userId
 * @return {Number} 影响行数
 */
async function deleteByUserId(userId) {
    let conn = await pool.getConn();
    let cmd = 'DELETE FROM t_user WHERE user_id=?';
    let params = [userId];
    let execRst = await conn.query(cmd, params);
    await conn.release();
    return execRst[0].affectRows;
}


/**
 * 根据username和groupNo获得单条数据
 * @param {String} username 用户名
 * @param {String} groupNo 组名
 * @return {Object} 单条模型数据，如果没有获取到则返回undefined
 */
async function selectRow(username, groupNo) {
    let conn = await pool.getConn();
    let cmd = `SELECT 
        user_id AS userId,
        username,
        password,
        group_no AS groupNo,
        is_admin AS isAdmin
        FROM t_user WHERE username=? AND group_no=?`;
    let params = [username, groupNo];
    let ret = (await conn.query(cmd, params))[0][0];
    await conn.release();
    return ret;
}


/**
 * 根据userId获得单条数据
 * @param {String} username 用户名
 * @param {String} groupNo 组名
 * @return {Object} 单条模型数据，如果没有获取到则返回undefined
 */
async function selectRowByUserId(userId) {
    let conn = await pool.getConn();
    let cmd = `SELECT 
        user_id AS userId,
        username,
        password,
        group_no AS groupNo,
        is_admin AS isAdmin 
        FROM t_user WHERE user_id=?`;
    let params = [userId];
    let ret = (await conn.query(cmd, params))[0][0]
    await conn.release();
    return ret;
}


/**
 * 根据groupNo获得组名下所有user数据
 * @param {String} groupNo 组编号
 * @return {Array<Object>} 所有被查询出来的结果
 */
async function selectGroup(groupNo) {
    let conn = await pool.getConn();
    let cmd = `SELECT 
        user_id AS userId,
        username,
        password,
        group_no AS groupNo,
        is_admin AS isAdmin 
        FROM t_user WHERE group_no=?`;
    let params = [groupNo];
    let ret = (await conn.query(cmd, params))[0];
    await conn.release();
    return ret;
}


/**
 * 查询出某组下有多少用户
 * @param {String} groupNo 组编号
 * @return {Number} 
 */
async function selectGroupCount(groupNo) {
    let conn = await pool.getConn();
    let cmd = 'SELECT COUNT(user_id) FROM t_user WHERE group_no=?';
    let params = [groupNo];
    let ret = (await conn.query(cmd, params))[0]['COUNT(user_id)'];
    await conn.release();
    return ret;
}


/**
 * 修改用户密码
 * @param {Object} model 必要参数: userId   可选参数
 */
async function updateUser(model) {
    let conn = await pool.getConn();
    let cmd = 'UPDATE TABLE t_user SET {fields} WHERE user_id=?';
    let fields = [];
    let params = [];
    if (model.password) {
        fields.push(' password=? ');
        params.push(model.password);
    }
    if (model.perLV === 0 || model.perLV) {
        fields.push(' per_lv=? ');
        params.push(model.perLV);
    }

    if (params.length === 0) {
        return;
    }
    else {
        cmd = cmd.replace('{fields}', fields.join(' , '));
        params.push(model.userId);
    }

    let ret = (await conn.query(cmd, params))[0].affectRows;
    await conn.release();
    return ret;
}