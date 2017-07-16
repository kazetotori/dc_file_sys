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
    var $, bootstrap, FastClick, Cookie, toastr, editable;
    var ajaxTimeout = 10000;
    var savedUserTRs = [];
    var updateUserTRs = [];
    var newUserTRs = [];
    var trsCount = 0;
    var statusEnum = { saved: '已保存', update: '已修改', newUser: '新用户' };


    //引入页面上所需的js文件
    requireAsync('jquery', 'fastclick').then(function (modules) {
        $ = modules[0];
        FastClick = modules[1];
        return requireAsync('bootstrap', 'jsCookie', 'toastr');
    }).then(function (modules) {
        bootstrap = modules[0];
        Cookie = modules[1];
        toastr = modules[2];
        return requireAsync('editable');
    }).then(function (modules) {
        editable = modules[0];
    }).then(function () {
        $(main);
    })


    /**
     * 页面js脚本入口
     */
    function main() {
        //添加fastclick
        FastClick.attach(document.body);

        //添加onresize事件，使body的高度虽浏览器高度变化，并执行一次
        (window.onresize = function () { $(document.body).height($(window).height()) })();

        //将该组下用户添加至页面
        refreshUsers();

        //添加全选按钮的单击事件
        $('#checkAllUsers').click(function () {
            var that = this;
            $('.user-checkbox').each(function (i, v) {
                this.checked = that.checked;
            })
        })

        //对页面上的按键进行事件注册
        $('#addUser').click(newUser);
        $('#deleteUser').click(deleteUsers);
        $('#saveUser').click(saveUsers);
    }





    //=====================================================functions====================================================

    /**
     * 新增array的remove函数，即从数组中删除对应元素
     * @param {any} ele 要删除的元素
     * @param {string} flag 标识: i、删除第一个匹配的元素 g、删除所有匹配的元素
     * @return {number} 删除的元素数量
     */
    Object.defineProperty(Array.prototype, 'remove', {
        value: function (ele, flag) {
            flag = 'ig'.indexOf(flag) === -1 ? 'i' : 'g';
            var idx = this.indexOf(ele);

            if (idx === -1) return 0;
            if (flag === 'i') {
                this.splice(idx, 1);
                return 1;
            }

            var count = 0;
            while (idx !== -1) {
                this.splice(idx, 1);
                count++;
                idx = this.indexOf(ele);
            }

            return count;
        },
        enumerable: false
    })


    /**
     * 新增array.looseIndexOf函数，即indexOf的不严谨比较
     * @param {any} ele 要查找的元素
     * @return {number} 查找元素的索引
     */
    Object.defineProperty(Array.prototype, 'looseIndexOf', {
        value: function (ele) {
            for (var i = 0; i < this.length; i++) {
                if (ele == this[i])
                    return i;
            }
            return -1;
        },
        enumerable: false
    })


    /**
     * 新增object.formatString函数，即将对象通过固定格式表现
     * @param {Object} fmt 格式，键名->表现名
     * @param {Array} hiddenKeyArr 不显示的键的列表
     * @param {String} separator 将各个键值组合起来的连接符，默认为","
     * @return {String} 用于表现该对象的字符串
     */
    Object.defineProperty(Object.prototype, 'formatString', {
        value: function (fmt, hiddenKeyArr, separator) {
            var retArr = [];
            separator = separator || ',';
            for (var k in this) {
                if (hiddenKeyArr.indexOf(k) !== -1)
                    continue;
                var keyName = fmt[k];
                var val = this[k];
                retArr.push(keyName + ':' + val);
            }
            return retArr.join(separator);
        },
        enumerable: false
    })


    /**
     * 清空所有用户
     * 1、清空后台缓存数据
     * 2、重置计数器
     * 3、清空页面上的数据
     */
    function clearUserTR() {
        savedUserTRs = [];
        updateUserTRs = [];
        newUserTRs = [];
        trsCount = 0;
        $('#tblUsers>tbody').html('');
    }



    /**
     * 根据提供的userInfo向表格中添加一行数据
     * 1、创建tr对象
     * 2、将userId写入tr对象
     * 3、根据userInfo.status进行页面调整
     * 4、将tr对象添加至页面
     * @param {Object} userInfo 
     */
    function addUserTR(userInfo) {
        var trHTML = ('<tr>'
            + '<td class="user-line-no">{lineNo}</td>'
            + '<td><input class="user-checkbox" type="checkbox"></td>'
            + '<td><input class="user-input user-username" value="{username}"></td>'
            + '<td><input class="user-input user-password" type="password" value="{password}"></td>'
            + '<td><input class="user-input user-perLV" value="{perLV}"></td>'
            + '<td class="user-status">{status}</td>'
            + '</tr>')
            .replace(/{lineNo}/g, ++trsCount)
            .replace(/{username}/g, userInfo.username)
            .replace(/{password}/g, userInfo.password)
            .replace(/{status}/g, statusEnum[userInfo.status])
            .replace(/{perLV}/g, userInfo.perLV);
        var $tr = $(trHTML);
        var tr = $tr[0];
        tr.status = userInfo.status;
        tr.userId = userInfo.userId || '';

        switch (userInfo.status) {
            case 'saved':
                savedUserTRs.push(tr); break;
            case 'update':
                updateUserTRs.push(tr); break;
            default:
                newUserTRs.push(tr);
        }
        $tr.find('.user-username').attr('readonly', userInfo.status !== 'newUser');

        if (userInfo.status !== 'saved') {
            $tr.addClass('user-unsave');
            $tr.find('.user-status')
        }
        else {
            $tr.find('.user-input').change(function () {
                //如果改变的是密码，则将密码赋给当前组件，否则将perLV赋值给当前组件
                if ($(this).hasClass('user-password')) {
                    this.password = this.value;
                }
                else {
                    this.perLV = this.value;
                }
                savedUserTRs.remove(this);
                updateUserTRs.push(this);
                $tr.addClass('user-unsave');
                tr.status = 'update';
                $tr.find('.user-status').html(statusEnum[tr.status]);
            })
        }
        $('#tblUsers>tbody').append($tr);
    }



    /**
     * 新建一行用户数据
     */
    function newUser() {
        var userInfo = { username: '', password: '', status: 'newUser', perLV: 0 };
        addUserTR(userInfo);
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
     * 刷新页面上的用户列表
     */
    function refreshUsers() {
        getAllUsers().then(function (userList) {
            userList.forEach(function (userInfo) {
                userInfo.status = 'saved';
                addUserTR(userInfo);
            })
        })
    }



    /**
     * 将页面上所有tr中未保存的数据进行保存，提示已保存数量，并提示失败原因
     * 1、遍历所有新用户tr组件，将数据添加至toInsertUsers
     */
    function saveUsers() {
        var toInsertUsers = [];
        var toUpdateUsers = [];
        var unameReg = /[\d]{4,6}/;
        var passReg = /[a-zA-Z0-9]{4,12}/
        var i;

        for (i = 0; i < newUserTRs.length; i++) {
            var newUserTR = newUserTRs[i];
            var uname = $(newUserTR).find('.user-username').val();
            var pass = $(newUserTR).find('.user-password').val();
            var perLV = $(newUserTR).find('.user-perLV').val();
            var lineNo = $(newUserTR).find('.user-line-no').html();
            if (!unameReg.test(uname)) {
                return toastr.error('行号为 ' + lineNo + ' 的用户名格式错误，请使用4-6位的数字作为用户名', '保存失败');
            }
            if (!passReg.test(pass)) {
                return toastr.error('行号为 ' + lineNo + ' 的密码格式错误，请使用4-12位的数字和字母的组合作为密码', '保存失败');
            }
            if (isNaN(perLV)) {
                return toastr.error('行号为' + lineNo + '权限等级不是数字', '保存失败');
            }
            toInsertUsers.push({
                username: uname,
                password: pass,
                perLV: perLV,
                lineNo: lineNo
            })
        }

        for (i = 0; i < updateUserTRs.length; i++) {
            var upUserTR = updateUserTRs[i];
            var uname = $(upUserTR).find('.user-username').val();
            var pass = $(upUserTR).find('.user-password').val();
            var perLV = $(upUserTR).find('.user-perLV').val();
            var lineNo = $(upUserTR).find('.user-line-no').html();
            if (!unameReg.test(uname)) {
                //TODO: 关闭遮罩层
                return toastr.error('行号为 ' + lineNo + ' 的用户名格式错误，请使用4-6位的数字作为用户名', '保存失败');
            }
            if (!passReg.test(pass)) {
                //TODO: 关闭遮罩层
                return toastr.error('行号为 ' + lineNo + ' 的密码格式错误，请使用4-12位的数字和字母的组合作为密码', '保存失败');
            }
            if (isNaN(perLV)) {
                return toastr.error('行号为 ' + lineNo + ' 的权限等级不是数字', '保存失败');
            }
            toUpdateUsers.push({
                username: uname,
                password: pass,
                perLV: perLV,
                lineNo: lineNo
            })
        }
        console.log(toUpdateUsers);
        return $.ajax({
            url: '/main/group/saveUsers',
            type: 'POST',
            dataType: 'json',
            timeout: ajaxTimeout,
            data: { toInsert: toInsertUsers, toUpdate: toUpdateUsers },
            error: function (status, xhr) {
                toastr.error('失败，详情请使用f12打开工具查看错误提示', '保存用户');
                console.error('保存用户失败', xhr, status);
            },
            success: function (ret, status) {
                var successStr = '';
                var errorStr = '';
                for (var i = 0; i < ret.savedUsers.length; i++) {
                    var user = ret.savedUsers[i];
                    var $tr = $('#tblUsers>tbody>tr').eq(user.lineNo - 1);
                    successStr += user.formatString({ lineNo: '行号', username: '用户名' }) + '\r\n';
                    $tr.removeClass('user-unsave');
                    $tr.find('.user-status').html('已保存');
                }
                for (var i = 0; i < ret.failedUsers.length; i++) {
                    errorStr += ret.failedUsers[i].formatString({ lineNo: '行号', username: '用户名', errMsg: '错误信息' }) + '\r\n';
                }
                toastr.success('此次保存成功的数据一共' + ret.savedUsers.length + '条。分别为\r\n' + successStr, '保存成功');
                toastr.error('此次保存失败的数据一共' + ret.failedUsers.length + '条，请按下f12进入工具查看', '保存失败');
                console.error('保存失败', errorStr);
            }
        })
    }



    /**
     * 删除所有选中的用户
     * 1、删除所有未保存的新用户
     * 2、删除所有存在于数据库中的用户
     * 3、重置页面上的tr的行号，并重新计算trsCount
     */
    function deleteUsers() {
        for (var i = 0; i < newUserTRs.length; i++) {
            ; +function (tr) {
                var checked = $(tr).find('.user-checkbox')[0].checked;
                if (!checked)
                    return false;
                $(tr).remove();
                newUserTRs.remove(tr);
                i--;
            }(newUserTRs[i])
        }

        function delFilter(tr) {
            if (!($(tr).find('.user-checkbox')[0].checked))
                return;
            toDeleteTRs.push(tr);
            toDeleteUsers.push(tr.userId);
        }

        var toDeleteUsers = [];
        var toDeleteTRs = [];
        savedUserTRs.forEach(delFilter);
        updateUserTRs.forEach(delFilter);
        $.ajax({
            url: '/main/group/deleteUsers',
            data: { toDeleteUsers: toDeleteUsers.join(',') },
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

                for (var i = 0; i < savedUserTRs.length; i++) {
                    var tr = savedUserTRs[i];
                    if (ret.deletedUserList.looseIndexOf(tr.userId) === -1)
                        continue;
                    $(tr).remove();
                    savedUserTRs.remove(tr);
                    i--;
                }
                for (var i = 0; i < updateUserTRs.length; i++) {
                    var tr = updateUserTRs[i];
                    if (ret.deletedUserList.looseIndexOf(tr.userId) === -1)
                        continue;
                    $(tr).remove();
                    savedUserTRs.remove(tr);
                    i--;
                }

                toastr.success('此次删除的用户的id号依次为:' + ret.deletedUserList.join(','), '删除用户');
                reCount();
            }
        })

        //重置计数
        reCount();
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
})