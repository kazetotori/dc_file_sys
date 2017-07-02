"use strict";
const pool = require('./../sql/dbPool');
const utils = require('./../utils/utils');
const groupDal = requiure('./groupDal');
module.exports.insertRow = insertRow;
module.exports.deleteRow = deleteRow;
module.exports.selectByGroupNo = selectByGroupNo;
module.exports.selectByPcToken = selectByPcToken;



/**
 * 向表t_dir_reflect中插入一条数据
 * @param {Object} model dirReflect表模型，必须参数: groupNo,pcDir,pcToken,dirName,onlineDir
 * @return {Number} 插入后得到的insertId
 */
async function insertRow(model) {
    let conn = await pool.getConn();
    let cmd = 'INSERT INTO t_dir_reflect(group_no,pc_dir,pc_token,dir_name,online_dir) VALUES(?,?,?,?,?)';
    let params = [model.groupNo, model.pcDir, model.pcToken, model.dirName, model.onlineDir];
    let execRst = (await conn.query(cmd, params))[0];
    return execRst.insertId;
}


/**
 * 删除一条t_dir_reflect表中的数据
 * @param {Number} rId
 * @return {Number} 影响行数
 */
async function deleteRow(rId) {
    let conn = await pool.getConn();
    let cmd = 'DELETE FROM t_dir_reflect WHERE r_id=?';
    let params = [rId];
    let ret = (await conn.query(cmd.params))[0].affectRows;
    await conn.release();
    return ret;
}


/**
 * 根据groupNo查询t_dir_reflect中所有该组名下的映射
 * @param {String} groupNo
 * @return {Array<Object>} 
 */
async function selectByGroupNo(groupNo) {
    let conn = await pool.getConn();
    let cmd = `SELECT 
        r_id AS rId,
        group_no AS groupNo,
        pc_dir AS pcDir,
        pc_token AS pcToken,
        dir_name AS dirName
        online_dir AS onlineDir
        FROM t_dir_reflect WHERE group_no=?`;
    let params = [groupNo];
    let ret = (await conn.query(cmd, params))[0];
    await conn.release();
    return ret;
}


/**
 * 根据pcToken查询t_dir_reflect中所有该电脑的映射
 * @param {String} pcToken
 * @return {Array<Object>} 
 */
async function selectByPcToken(pcToken) {
    let conn = await pool.getConn();
    let cmd = `SELECT 
        r_id AS rId,
        group_no AS groupNo,
        pc_dir AS pcDir,
        pc_token AS pcToken,
        dir_name AS dirName
        online_dir AS onlineDir
        FROM t_dir_reflect WHERE pc_token=?`;
    let params = [pcToken];
    let ret = (await conn.query(cmd, params))[0];
    await conn.release();
    return ret;
}