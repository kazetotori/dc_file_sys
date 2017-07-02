"use strict";
const pool = require('./../sql/dbPool');
const utils = require('./../utils/utils');
module.exports.insertRow = insertRow;
module.exports.selectGroupIdByGroupName = selectGroupIdByGroupName;
module.exports.selectGroupNameByGroupId = selectGroupNameByGroupId;

/**
 * 向表t_group中插入一条数据
 * @param {Object} groupName 组名
 * @return {Number} 插入后得到的insertId
 */
async function insertRow(groupName) {
    let cmd = ' INSERT INTO t_group(group_name) VALUES(?)';
    let params = [groupName];
    let conn = await pool.getConn();

    try {
        let execRst = (await conn.query(cmd, params))[0];
        return execRst.insertId;
    }
    catch (e) {
        console.log(e.message);
        throw utils.newErrorByCode("-992");
    }
    finally {
        conn.release();
    }
}


/**
 * 根据组名查询groupId
 * @param {String} groupName 组名
 * @return {Number} 组编号，如果没有则为-1
 */
async function selectGroupIdByGroupName(groupName) {
    let cmd = 'SELECT group_id FROM t_group WHERE group_name=?';
    let params = [groupName];
    let conn = await pool.getConn();
    let queryRst = (await conn.query(cmd, params))[0];
    await conn.release();
    return queryRst.length <= 0 ? -1 : queryRst[0]['group_id'];
}



/**
 * 根据ID查询组名
 * @param {String} groupName 组ID
 * @return {Number} 组名，如果没有则为null
 */
async function selectGroupNameByGroupId(groupId) {
    let cmd = 'SELECT group_name FROM t_group WHERE group_id=?';
    let params = [groupId];
    let conn = await pool.getConn();
    let queryRst = (await conn.query(cmd, params))[0];
    await conn.release();
    return queryRst.length <= 0 ? null : queryRst[0]['group_name'];
}