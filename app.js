const express = require('express');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();

//配置程序运行环境
app.set('views', './client/pages');
app.set('view engine', 'ejs');

//配置路由
app.use(favicon('./app.ico'));
app.use('/src', express.static('./client/src'));
app.use('/lib', express.static('./client/lib'));
app.use('/img', express.static('./client/img'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/login', require('./routes/login'));
app.use('/main', require('./routes/main'));

//所有路由未能找到指定指令，返回404
app.use(require('./routes/404'));

//开启服务
app.listen(3000, () => {
    console.log('File_System listening at port 3000');
});