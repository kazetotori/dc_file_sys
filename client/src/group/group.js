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
    }





    //=====================================================functions====================================================

    /**
     * 新增array的remove函数，即从数组中删除对应元素
     * @param {any} ele 要删除的元素
     * @param {string} flag 标识: i、删除第一个匹配的元素 g、删除所有匹配的元素
     * @return {number} 删除的元素数量
     */
    Array.prototype.remove = function (ele, flag) {
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
    }



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
            + '<td><input class="user-input" type="password" value="{password}"></td>'
            + '<td><input class="user-input" value="{perLV}"></td>'
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
     */
    function saveUsers() {
        var toSaveUsers = [];
        
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

        //TODO 2、

        trsCount = 0;
        $('#tblUsers>tbody>tr').each(function (i, tr) {
            $(tr).find('.user-line-no').html(++trsCount);
        })
    }
})