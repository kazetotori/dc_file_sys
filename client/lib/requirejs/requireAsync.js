//此文件定义一个使require返回一个Promise，并且每次都会保存上一次的返回结果
define(function () {
    'use strict';
    return function () {
        var slice = Array.prototype.slice;
        var modules = slice.call(arguments, 0);
        return new Promise(function (resolve, reject) {
            require(
                modules,
                function () {
                    resolve(slice.call(arguments, 0));
                },
                function (err) {
                    reject(err);
                })
        })
    }
});