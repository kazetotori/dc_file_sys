require.config({
    baseUrl: './../',
    paths: {
        jquery: './lib/jquery/jquery.min',
        bootstrap: './lib/bootstrap/js/bootstrap.min',
        requireAsync: './lib/requirejs/requireAsync',
        fastclick: './lib/fastclick/fastclick',
        jsCookie: '/lib/js-cookie/js-cookie',
        toastr: '/lib/toastr/toastr.min',
        editable: '/lib/bootstrap3-editable/js/bootstrap-editable.min'
    }
});


require(['requireAsync'], function (requireAsync) {
    "use strict";
    //页面全局变量
    var $, bootstrap, FastClick, Cookie, toastr;
    var ajaxTimeout = 10000;
    var savedUserTRs = [];
    var updateUserTRs = [];
    var newUserTRs = [];
    var trsCount = 0;
    var statusEnum = { saved: '已保存', update: '已修改', newUser: '新用户' };
    var unameReg = /[\d]{4,6}/;
    var passReg = /[a-zA-Z0-9]{4,12}/;
    var adminTR;


    //引入页面上所需的js文件
    requireAsync('jquery', 'fastclick').then(function (modules) {
        $ = modules[0];
        FastClick = modules[1];
        return requireAsync('bootstrap', 'jsCookie', 'toastr');
    }).then(function (modules) {
        bootstrap = modules[0];
        Cookie = modules[1];
        toastr = modules[2];
    }).then(function () {
        $(main);
    })


    /**
     * 页面js脚本入口
     */
    function main() {
        //添加fastclick
        FastClick.attach(document.body);

        //改写toastr的四个函数，使其在吐司通知的同时能打印到控制台中
        for (var k in toastr) {
            ; +function (key) {
                var toastrFn = toastr[key];
                toastr[key] = function (text, title) {
                    switch (key) {
                        case 'success': case 'info': console.log(title, text); break;
                        case 'warning': console.warn(title, text); break;
                        case 'error': console.error(title, text); break;
                    }
                    toastrFn.apply(toastr, Array.prototype.slice.call(arguments, 0));
                }
            }(k);
        }

        //添加onresize事件，使body的高度虽浏览器高度变化，并执行一次
        (window.onresize = function () { $(document.body).height($(window).height()) })();

        //将该组下用户添加至页面
        refreshUserTRs();

        //添加全选按钮的单击事件
        $('#checkAllUsers').click(function () {
            var that = this;
            $('.user-checkbox').each(function (i, v) {
                this.checked = that.checked;
            })
            $(adminTR).find('.user-checkbox')[0].checked = false;
        });

        //对页面上的按键进行事件注册
        $('#addUser').click(newUser);
        $('#deleteUser').click(deleteUsers);
        $('#saveUser').click(saveUsers);
        $('#refreshUser').click(refreshUserTRs);
    }





    //=====================================================functions====================================================

    /**
     * 从数组或字符串中删除对应元素
     * @param {Array|string} arr 数组或字符串
     * @param {any|string} ele 需要删除的元素
     * @param {string} flag i、删除第一个匹配的元素 g、删除所有匹配的元素
     * @return {number} 删除的数量
     */
    function remove(arr, ele, flag) {
        var idx = arr.indexOf(ele);
        flag = 'ig'.indexOf(flag) === -1 ? 'i' : 'g';

        if (idx === -1)
            return 0;
        if (flag === 'i') {
            arr.splice(idx, 1);
            return 1;
        }

        var count = 0;
        while (idx !== -1) {
            arr.splice(idx, 1);
            count++;
            idx = arr.indexOf(ele);
        }

        return count;
    }



    /**
     * 宽松的indexOf函数
     * @param {Array|string} arr 数组或字符串
     * @param {any|string} ele 需要匹配的元素
     * @return {number} 索引，如果没有找到则返回-1
     */
    function looseIndexOf(arr, ele) {
        for (var i = 0; i < arr.length; i++) {
            if (ele == arr[i])
                return i;
        }
        return -1;
    }



    /**
     * 将一个对象格式化为string，并将对应键名修改成对应的表示的键名
     * @param {Object} obj 需要格式化的对象
     * @param {Object} format 键名的表示格式
     * @param {Array} hiddenKeys 需要隐藏的键
     * @param {string} separator 各个键值的分隔符
     */
    function formatObj(obj, format, hiddenKeys, separator) {
        var retArr = [];
        hiddenKeys = hiddenKeys || [];
        separator = separator || ',';
        for (var k in obj) {
            if (hiddenKeys.indexOf(k) !== -1)
                continue;
            var keyName = format[k] || k;
            var value = obj[k];
            retArr.push(keyName + ':' + value);
        }
        return retArr.join(separator);
    }



    /**
     * 清空所有user的tr控件     
     * 1、清空后台缓存数据
     * 2、重置计数器
     * 3、清空页面上的数据
     */
    function clearUserTRs() {
        savedUserTRs = [];
        updateUserTRs = [];
        newUserTRs = [];
        trsCount = 0;
        $('#tblUsers>tbody').html('');
    }



    /**
     * 向页面添加一个user的tr控件
     * @param {Object} userInfo 用户信息
     * @return {HTMLTableRowElement} 返回该用户对应的行的控件
     */
    function addUserTR(userInfo) {
        var trHTML = ('<tr>'
            + '<td class="user-line-no">' + (++trsCount) + '</td>'
            + '<td><input class="user-checkbox" type="checkbox"></td>'
            + '<td><input class="user-input user-username" value="' + userInfo.username + '"></td>'
            + '<td><input class="user-input user-password" type="password" value="' + userInfo.password + '"></td>'
            + '<td><input class="user-input user-perLV" value="' + userInfo.perLV + '"></td>'
            + '<td class="user-status">' + statusEnum[userInfo.status] + '</td>'
            + '</tr>');
        var $tr = $(trHTML);
        var tr = $tr[0];
        tr.userId = userInfo.userId || '';

        switch (userInfo.status) {
            case 'saved':
                savedUserTRs.push(tr)
                $tr.find('.user-username').attr('readonly', true);
                break;
            case 'update':
                updateUserTRs.push(tr);
                $tr.addClass('user-unsave');
                break;
            default:
                newUserTRs.push(tr);
                $tr.addClass('user-unsave');
                break;
        }

        if (userInfo.perLV === 9999) {
            $tr.find('.user-perLV').attr('readonly', true);
            $tr.find('.user-checkbox').attr('disabled', true)[0];
            adminTR = tr;
        }

        $tr.find('.user-input').change(function () {
            //如果是已经保存的状态
            if (savedUserTRs.indexOf(tr) !== -1) {
                $tr.addClass('user-unsave');
                remove(savedUserTRs, tr);
                updateUserTRs.push(tr);
                $tr.find('.user-status').html(statusEnum['update']);
            }
        })

        $('#tblUsers>tbody').append($tr);
        return tr;
    }



    /**
     * 获取所有用户数据
     * @return {Promise<Array<Object>>} 用户列表
     */
    function getAllUsers() {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: '/main/group/getAllUsers',
                type: 'POST',
                dataType: 'json',
                timeout: ajaxTimeout,
                error: function (status, xhr) { reject(status) },
                success: function (ret, status) {
                    if (ret.result !== 'getAllUsers_success')
                        return reject(ret.result);
                    resolve(ret.userList);
                }
            })
        });
    }


    /**
     * 重新从服务器上获取用户列表，并刷新当前用户界面
     */
    function refreshUserTRs() {
        clearUserTRs();
        getAllUsers().then(function (userList) {
            userList.forEach(function (userInfo) {
                userInfo.status = 'saved';
                addUserTR(userInfo);
            })
        })
    }



    /**
     * 新建一行用户数据
     */
    function newUser() {
        var userInfo = { username: '', password: '', status: 'newUser', perLV: 0 };
        addUserTR(userInfo);
    }



    /**
     * 删除选中用户
     */
    function deleteUsers() {
        var $userTRs = $('#tblUsers>tbody>tr');
        var toDeleteUserArr = [];
        var toDeleteTrArr = [];
        var unsavedUser = 0;

        for (var i = 0; i < $userTRs.length; i++) {
            var tr = $userTRs[i];
            var $tr = $(tr);
            if (!$tr.find('.user-checkbox')[0].checked)
                continue;
            //如果是新建还未保存
            if (newUserTRs.indexOf(tr) !== -1) {
                $tr.remove();
                remove(newUserTRs, tr);
                unsavedUser++;
                //i--; //这里不需要i--
                continue;
            }

            toDeleteTrArr.push(tr);
            toDeleteUserArr.push(tr.userId);
        }
        if (!(unsavedUser || toDeleteUserArr.length)) {
            return toastr.info('本次没有选中任何需要删除的数据', '删除用户');
        }

        toastr.success('本次共删除' + unsavedUser + '条未保存的数据', '删除用户');
        console.log(toDeleteTrArr);
        if (toDeleteTrArr.length === 0) return;

        $.ajax({
            url: '/main/group/deleteUsers',
            data: { toDeleteUsers: toDeleteUserArr.join(',') },
            dataType: 'json',
            timeout: ajaxTimeout,
            type: 'POST',
            error: function (status, xhr) {
                toastr.error('失败，详情请使用f12打开工具查看日志', '删除用户');
                console.error('删除失败', xhr, status);
            },
            success: function (ret, status) {
                if (ret.result !== 'deleteUsers_success') {
                    console.error('删除失败', ret.errMsg);
                    return toastr.error('失败，详情请使用f12打开工具查看日志', '删除用户');
                }

                for (var i = 0; i < toDeleteTrArr.length; i++) {
                    var tr = toDeleteTrArr[i];
                    if (looseIndexOf(ret.deletedUserList, tr.userId) === -1)
                        continue;
                    $(tr).remove();
                    remove(savedUserTRs, tr);
                    remove(updateUserTRs, tr);
                }

                toastr.success('此次删除的已保存用户的id号依次为:' + ret.deletedUserList.join(','), '删除用户');
                reCount();
            }
        })
    }



    /**
     * 重置计数
     */
    function reCount() {
        trsCount = 0;
        $('#tblUsers>tbody>tr').each(function (i, tr) {
            $(tr).find('.user-line-no').html(++trsCount);
        })
    }



    /**
     * 保存用户
     */
    function saveUsers() {
        var toInsert = [];
        var toUpdate = [];
        var $unsaveTRs = $('.user-unsave');

        if (!$unsaveTRs.length) return toastr.info('没有任何需要保存的数据', '保存用户');

        //遍历所有未保存的
        for (var i = 0; i < $unsaveTRs.length; i++) {
            var tr = $unsaveTRs[i];
            var uname = $(tr).find('.user-username').val();
            var pass = $(tr).find('.user-password').val();
            var perLV = $(tr).find('.user-perLV').val();
            var lineNo = $(tr).find('.user-line-no').html();
            if (!unameReg.test(uname)) return toastr.error('第' + lineNo + '行中用户名格式不正确，请使用4-6位的数字作为用户名', '保存用户');
            if (!passReg.test(pass)) return toastr.error('第' + lineNo + '行中密码格式不正确，请使用4-12位的数字与字母组合作为密码', '保存用户');
            if (isNaN(perLV)) return toastr.error('第' + lineNo + '行中权限等级不是数字', '保存用户');

            var userInfo = {
                username: uname,
                password: pass,
                perLV: perLV,
                userId: tr.userId,
                lineNo: lineNo
            };
            (userInfo.userId === '' ? toInsert : toUpdate)['push'](userInfo);
        }

        $.ajax({
            url: '/main/group/saveUsers',
            type: 'POST',
            dataType: 'json',
            timeout: ajaxTimeout,
            data: { toInsert: toInsert, toUpdate: toUpdate },
            error: function (xhr, status) {
                if (status == 'timeout') return toastr.error('响应超时，请检查网络环境', '保存用户');
                if (status == 'parsererror') return toastr.error('数据格式错误，请将此消息上报bug', '保存用户');
                toastr.error('错误信息：' + status, '保存用户');
                console.error(xhr);
            },
            success: function (ret, status) {
                console.log(ret.savedUsers);
                for (var i = 0; i < ret.savedUsers.length; i++) {
                    var userInfo = ret.savedUsers[i];
                    var tr = $('#tblUsers>tbody>tr')[Number(userInfo.lineNo) - 1];
                    var $tr = $(tr);
                    tr.userId = userInfo.userId;
                    $tr.removeClass('user-unsave');
                    $tr.find('.user-password').val('hello world');
                    $tr.find('.user-status').html(statusEnum['saved']);
                    savedUserTRs.push(tr);
                    remove(newUserTRs, tr);
                    remove(updateUserTRs, tr);
                }
                toastr.success('本次一共保存了' + ret.savedUsers.length + '条数据', '保存用户')

                if (ret.failedSaved.length) {
                    toastr.error('本次有' + ret.failedSaved.length + '条数据保存失败，详情见f12控制台', '保存用户');
                    console.error(ret.failedSaved);
                }
            }
        })
    }
})