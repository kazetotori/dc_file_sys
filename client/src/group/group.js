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
    var savedUsers = [];
    var updateUserTRs = [];
    var newUserTRs = [];

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
    }
})