"use strict";
const pool = require('./../sql/dbPool');
const utils = require('./../utils/utils');
module.exports.insertRow = insertRow;


/**
 * 插入一条日志
 * @param {Object} model 必须参数:logTitle,logMsg,pcsName
 * @return {Number} 插入后得到的insertId
 */
async function insertRow(model) {
    if(!model.logTitle){
        console.log(model);
    }
    let cmd = 'INSERT INTO t_log(log_title,log_msg,pcs_name,err_status,start_val,end_val,ins_date) VALUES(?,?,?,?,?,?,?)';
    let errStatus = model.errStatus || 0;
    let startVal = model.startVal || 0;
    let endVal = model.endVal || 0;
    let params = [model.logTitle, model.logMsg, model.pcsName, errStatus, startVal, endVal, utils.nowDateTimeString()];
    let conn = await pool.getConn();
    let ret = (await conn.query(cmd, params))[0].insertId;
    await conn.release();
    return ret;
}