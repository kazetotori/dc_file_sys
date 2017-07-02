require.config({
    baseUrl: './../',
    paths: {
        jquery: './lib/jquery/jquery.min',
        bootstrap: './lib/bootstrap/js/bootstrap.min',
        requireAsync: './lib/requirejs/requireAsync',
        fastclick: './lib/fastclick/fastclick',
        jsCookie: '/lib/js-cookie/js-cookie',
        toastr: '/lib/toastr/toastr.min'
    }
});


require(['requireAsync'], function (requireAsync) {
    "use strict";
    var $, bootstrap, FastClick, Cookie, toastr;

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
    });

    /**
     * 页面js脚本入口
     */
    function main() {
        var getElementById = document.getElementById.bind(document);
        var iptGroup = getElementById('group');
        var iptUname = getElementById('username');
        var iptPass = getElementById('password');
        var cboxRememberMe = getElementById('rememberMe');
        var btnLogin = getElementById('btnLogin');
        var controls = [iptUname, iptPass, cboxRememberMe, btnLogin];

        //添加fastclick，提高移动端click事件响应速度
        FastClick.attach(document.body);

        //覆盖原生document.getElementById函数，禁止页面上的元素被选取
        document.getElementById = function (id) {
            var ele = getElementById(id);
            return controls.indexOf(ele) === -1 ? ele : null;
        };

        //绑定window.onresize函数，使body的高度为浏览器高度，并触发一次使之初始化
        ; +function () {
            function onresize() {
                $(document.body).height($(window).height());
            }
            addEventListener('resize', onresize);
            onresize();
        }();

        //从cookie中读取用户名和密码，如果cookie中rememberMe为true，则自动读取对应的用户名和密码，并填入input标签
        ; +function () {
            var rememberMe = Cookie.get('rememberMe');
            if (rememberMe == 'false' || !rememberMe)
                return $(cboxRememberMe).attr('checked', false);
            $(iptGroup).val(Cookie.get('group'));
            $(iptUname).val(Cookie.get('username'));
            $(iptPass).val(Cookie.get('password'));
            $(cboxRememberMe).attr('checked', 'checked');
        }();

        //绑定btnLogin登录操作
        //1、将登录按钮设置为不可用
        //2、向后台发起ajax请求，传入参数 组名、用户名、密码、是否记住密码
        //3、后台验证成功后根据是否记住密码设置cookie，并向前端反回一个登录用token号
        //4、如果登录失败，前端提示，并将登录按钮状态重置
        //5、如果登录成功，将token写入隐藏域提交，跳转至主页面
        $(btnLogin).click(function () {
            function onLoginFailed(errMsg) {
                console.error('登录失败,' + errMsg);
                toastr.error(errMsg, '登录失败');
                $(btnLogin).button('reset');
            }

            $(btnLogin).button('loading');
            $.ajax({
                url: '/login/getToken',
                type: 'POST',
                data: {
                    group: iptGroup.value,
                    username: iptUname.value,
                    password: iptPass.value,
                    rememberMe: cboxRememberMe.checked
                },
                cache: false,
                timeout: 10000,
                dataType: 'json',
                error: function (xhr, status) {
                    if (status == 'timeout')
                        return onLoginFailed('登录超时，请检查网络状况');
                    if (status == 'parsererror')
                        return onLoginFailed('服务器返回数据格式错误，请重试');
                    else
                        return onLoginFailed('服务器内部错误，请重试');
                },
                success: function (ret, status) {
                    if (ret.loginResult == 'login_success')
                        return document.forms['login'].submit();
                    if (ret.loginResult == 'group_notfound')
                        return onLoginFailed('组名不存在');
                    if (ret.loginResult == 'username_notfound')
                        return onLoginFailed('用户名不存在');
                    if (ret.loginResult == 'password_wrong')
                        return onLoginFailed('密码错误');
                    else
                        return onLoginFailed('未知错误，错误状态为:' + ret.loginResult);
                }
            })
        })
    }
})