require.config({
    baseUrl: './../',
    paths: {
        requireAsync: './lib/requirejs/requireAsync',
        jquery: './lib/jquery/jquery.min',
        bootstrap: './lib/bootstrap/js/bootstrap.min',
        fastclick: './lib/fastclick/fastclick',
        toastr: '/lib/toastr/toastr.min'
    }
});

require(['requireAsync'], function (requireAsync) {
    "use strict";
    var $, bootstrap, FastClick, toastr;
    var fileList = [];
    var dirs = [];
    var currentGetFileXHR;
    var isIOS = !!navigator.userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
    var dbTick = isIOS ? 800 : 200;

    //引入页面上所需的js文件
    //jquery
    //bootstrap
    //fastclick
    //toastr
    requireAsync('jquery', 'fastclick').then(function (modules) {
        $ = modules[0];
        FastClick = modules[1];
        return requireAsync('bootstrap', 'toastr');
    }).then(function (modules) {
        bootstrap = modules[0];
        toastr = modules[1];
    }).then(function () {
        $(main);
    });

    //页面js脚本入口
    function main() {
        //添加fastclick
        FastClick.attach(document.body);

        //添加onresize事件，使body的高度虽浏览器高度变化，并执行一次
        (window.onresize = function () { $(document.body).height($(window).height()) })();

        //将页面上的文件导航至根目录
        dirRoot();

        //绑定dir-back和dir-root
        $('.dir-back').click(dirBack);
        $('.dir-root').click(dirRoot);

        //绑定btn-downFile的单击事件
        $('#btnDownFile').click(function () {
            var currentDirName = getCurrentFullDir();
            var selectedFileLinks = [];
            for (let i = 0; i < fileList.length; i++) {
                var fileInfo = fileList[i];
                if (fileInfo.selected) {
                    selectedFileLinks.push(getCurrentFullDir() + '/' + fileInfo.fileName);
                }
            }
            downFiles(selectedFileLinks);
        })
    }



    /**
     * 清空界面上的文件dom元素
     */
    function clearFileAll() {
        $('.file-all').html('');
        fileList = [];
    }

    /**
     * 创建一个fileOne组件并返回
     * 1、创建一个fileOne组件
     * 2、如果fileInfo.isDir为true，即该fileInfo实际上为文件夹，则双击事件绑定至跳转至该文件夹中的函数上，如果是文件，则下载该文件
     * 3、将fileInfo.selected设为false，并将fileOne组件的click事件绑定至修改样式以及修改fileInfo的selected属性上
     * @param {Object} fileInfo 文件详情
     */
    function createFileOne(fileInfo) {
        var html = '<a class="file-one"><img class="file-ico" src="{fileIcoSrc}" alt="{fileName}"><span class="file-name">{fileName}</span></a>'
            .replace(/{fileIcoSrc}/g, fileInfo.fileIcoSrc)
            .replace(/{fileName}/g, fileInfo.fileName);
        var $fileOne = $(html);
        var dbClickFn;
        fileInfo.selected = false;
        fileInfo.$fileOne = $fileOne;
        $fileOne.fileInfo = fileInfo;

        dbClickFn = fileInfo.isDir ?
            function () { dirNext(fileInfo.fileName); } :
            function () { downFiles([getCurrentFullDir() + '/' + fileInfo.fileName]); };

        $fileOne.click(function () {
            //*这一部分是用来解决手机双击事件的
            if (!fileInfo.selected) {
                $fileOne.clickTime = new Date().getTime();
            } else {
                var ms = ((new Date().getTime() - $fileOne.clickTime));
                if (ms <= dbTick)
                    dbClickFn();
            }
            fileInfo.selected = !fileInfo.selected;
            $(this)[fileInfo.selected ? 'addClass' : 'removeClass']('file-selected');
            return false;
        });

        //*这一部分是用来解决hover在手机上的错乱的
        $fileOne.mouseenter(function () {
            $(this).addClass('file-selected');
        })
        $fileOne.mouseleave(function () {
            if (!fileInfo.selected)
                $(this).removeClass('file-selected');
        })

        fileList.push(fileInfo);
        return $fileOne;
    }

    /**
     * 返回当前路径的全称
     */
    function getCurrentFullDir() {
        return '/' + dirs.join('/');
    }

    /**
    * 通过ajax获取文件列表，返回一个Promise对象
    * @param {String} dirName 需要获取的路径名称
    * @return {Promise<Array<Object>>} 获得的json对象列表，以promise的形式返回
    */
    function getFileList(dirName) {
        if (currentGetFileXHR) {
            currentGetFileXHR.abort();
        }
        return new Promise(function (resolve, reject) {
            currentGetFileXHR = $.ajax({
                url: '/main/getDir',
                type: 'POST',
                dataType: 'json',
                data: { dir: dirName },
                timeout: 10000,
                error: function (xhr, status) {
                    reject(status);
                },
                success: function (ret, status) {
                    if (ret.result !== 'getFileList_success')
                        return reject(ret.result);
                    resolve(ret.fileList);
                }
            })
        })
    }

    /**
     * 下载文件，创建form传递要下载的文件并提交
     * @param {Array<String>} links 下载的链接集合
     */
    function downFiles(links) {
        if (links.length === 0) {
            return toastr.info('未选择任何文件', '提示');
        }
        var $form = $('<form></form>')

        if (links.length === 1) {
            //仅下载一个文件
            $form.attr({ action: '/main/downSingleFile/' + links[0], method: 'GET' });
        }
        else {

            //多个文件
            var $input = $('<input name="fileLinks">');
            $form.attr({ action: '/main/downFiles', method: 'POST' });
            $input.val(JSON.stringify(links));
            $form.append($input);
        }

        $form.addClass('hidden');
        $(document.body).append($form);
        $form.submit();
    }

    /**
     * 对getFileList的一般处理
     * 调用getFileList获取路径中的文件，并使用appendFile添加至界面，如果没有获取到数据，则使用toastr提示
     * 
     * @param {String} dirName 请求的路径名
     */
    function processGetFileList(dirName) {
        clearFileAll();
        getFileList(dirName).then(function (fileList) {
            var maxHeight = 0;
            var $fileAll = $('.file-all');
            fileList.forEach(function (fileInfo) {
                var $fileOne = createFileOne(fileInfo);
                $fileAll.append($fileOne);
            });
            fileList.forEach(function (fileInfo) {
                var $fileOne = fileInfo.$fileOne;
                var $height = $fileOne.height();
                maxHeight = maxHeight > $height ? maxHeight : $height;
            })
            $('.file-one').height(maxHeight);
        }, function (status) {
            if (status === 'abort') {
                return console.info('对目录"' + dirName + '"的访问已经取消', '取消访问');
            }
            var errMsgName = "读取文件目录失败";
            var errMsgEnum = {
                timeout: '读取文件目录超时，请检查网络',
                error: '服务器错误，请重试',
                parsererror: '服务器返回的数据格式有误，请重试并联系服务端',
                getFileList_dirUnexists: '访问的路径不存在，或已被删除'
            }
            toastr.error(errMsgEnum[status], errMsgName);
        })
    }

    /**
     * 页面上点击"返回上一级"，返回上一级路径
     * 1、判断当前是否为根目录，如果是，直接返回，否则继续执行
     * 2、清除当前所有文件图标
     * 3、splice掉dirs最后一个元素
     * 4、页面上把去掉最后一个目录名，将当前最后一个目录的样式设为dir-current
     * 5、调用processGetFileList对getFileList进行处理
     */
    function dirBack() {
        var len = dirs.length;
        if (len === 0) return;
        if (len === 1) return dirRoot();
        dirs.splice(len - 1, 1);
        $('.dir-all>.dir-one:last').remove();
        $('.dir-all>.dir-one:last').addClass('dir-current');
        processGetFileList(getCurrentFullDir());
    }

    /**
     * 页面上双击文件夹导航进入下一级文件路径
     * 1、将路径名添加进dirs
     * 2、在页面的dir-all中添加dir-one组件
     * 3、移除原本的dir-current样式，将dir-current添加到创建的dir-one组件上
     * 4、dir-one的click事件注册导航函数
     * 5、调用processGetFileList对GetFileList进行处理
     * @param {String} nextDirName 下一级菜单的名称
     */
    function dirNext(nextDirName) {
        var idx = dirs.length;
        var $dirOne = $('<a class="dir-one" href="#"><i class="dir-name-arrow glyphicon glyphicon-chevron-right"></i><span class="dir-name">{nextDirName}</span></a>'.replace(/{nextDirName}/g, nextDirName));
        if (idx == 0) {
            $('.dir-back').removeClass('dir-back-noback');
        }

        $dirOne[0].idx = idx;
        $('.dir-all').append($dirOne);
        $('.dir-current').removeClass('dir-current');
        $dirOne.addClass('dir-current');
        $dirOne.click(function () {
            dirDirect(this.idx);
        })
        dirs.push(nextDirName);
        processGetFileList(getCurrentFullDir());
    }

    /**
     * 将页面的文件内容导向dir索引指向的路径
     * 1、移除dirs中idx后的元素，检测是否为最后一个元素，如果是，则不执行
     * 2、移除页面上idx索引后的dir-one组件
     * 3、调用processGetFileList对GetFileList进行处理
     * @param {int} idx 路径纵深索引
     */
    function dirDirect(idx) {
        var len = dirs.length;
        if (idx == len - 1) return;

        var $dirOnes = $('.dir-one');
        dirs.splice(idx + 1, len - idx);
        for (var i = idx + 1; i < len; i++) {
            $dirOnes[i].remove();
        }
        $('.dir-one:last').addClass('dir-current');
        processGetFileList(getCurrentFullDir());
    }

    /**
     * 将页面文件内容导航至根目录
     * 1、清空dirs
     * 2、情况dir-one组件
     * 3、向dir-root添加dir-current样式
     * 4、调用processGetFileList对GetFileList进行处理
     */
    function dirRoot() {
        dirs.splice(0, dirs.length);
        $('.dir-one').remove();
        $('.dir-back').addClass('dir-back-noback');
        $('.dir-root').addClass('dir-current');
        processGetFileList('/');
    }
})