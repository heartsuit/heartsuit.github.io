---
layout: post
title:  Express 4.x, socket.io, formidable文件的上传（进度条）、下载
tags:  Node.js
---
## Express 4.x, socket.io, formidable文件的上传（进度条）、下载

### What I Learned
接触Node.js也有十来天了，算是学点新东西。`The best way to learn something new is to use it.` 学习新知识最好的方式莫过于去使用它(do something)，在自然语言、编程语言的习得过程中尤为如此。

1. Express 4.x：
    - 静态文件引用；
    - 路由；
    - get，set自定义属性；
2. [socket.io](https://socket.io/docs/#)：
    - 基本事件触发、响应；服务器、客户端之间的实时通信；
    - 这个功能不要太强大。。还需继续挖掘；
3. 模板引擎[EJS](http://www.embeddedjs.com/)（Embedded JavaScript），较简单，跟Jekyll的Liquid语法有一拼；
4. 文件上传模块[formidable](https://github.com/felixge/node-formidable)：
    - 文件上传；
    - 计算md5；
5. path模块：path.join(); path.extname();
6. 原生JavaScript的知识点巩固：
    - DOM操作；
    - Map操作；
    - Date转换；
    - 对象封装；
    - 正则表达式；

### Features
- 最后长这样子：
![fileUpload](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/upload.png)
- 作为应用Express 4.x与socket.io的小例子，实现文件的上传、下载；
  > 关键是如何通过socket.io实现前后端的实时通信：在routes中使用socket触发文件上传进度事件。
- 前端上传进度条：显示上传进度，用div宽度模拟，比较简陋；
- 点击文件名可下载：相对上传，下载简单多了，通过response的download方法实现；
- 文件去重：在上传过程中通过formidable提供的`form.hash='md5'`计算文件唯一标识，保证上传后的文件不重复；
- 客户端校验：用户输入后，简单的文件名合法性校验；

### Let's code
- Server Side : app.js

``` javascript
var express = require('express');
var path = require('path');

var app = express();
var port = 8888;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// include static files
app.use(express.static(path.join(__dirname, 'public')));

// upload destination setup
app.set('files', path.join(__dirname, '/public/files'));

var index = require('./routes/index');

// router
app.get('/upload', index.list);
app.post('/upload', index.submit(app.get('files')));
app.get('/file/:id/download', index.download(app.get('files')));

var server = app.listen(port);
console.log("Listening on port: " + port);

var io = require('socket.io')(server);
app.set('socketio', io); // store a reference to the io object, can be passed to routes
```
---

- Router - Form and File List: index.js

``` javascript
var formidable = require('formidable');
var fs = require('fs');
var path = require('path');

var fileUploaded = new Map(); // store uploaded files

exports.list = function (req, res) {
  res.render('index', {
    title: "File upload",
    fileUploaded: fileUploaded
  });
};
```
- Router - Submit and Upload: index.js

``` javascript
exports.submit = function (dir) {
  return function (req, res, next) {
    var form = new formidable.IncomingForm();

    // high level formidable API
    form.uploadDir = dir; // set destination
    form.hash = 'md5'; // use hash algorithm, we can get hash value by 'file.hash'
    form.parse(req, function (err, fields, files) {
      // console.log(fields);
      // console.log(files);
      files.file.lastModifiedDate = files.file.lastModifiedDate.toLocaleString();
      var f = {
        newName: fields.name.length == 0
          ? files.file.name
          : fields.name + path.extname(files.file.name),
        file: files.file
      };
      if (fileUploaded.has(files.file.hash)) {
        form.emit('aborted'); // doesn't work!?
        console.log('aborted');
      } else {
        fileUploaded.set(files.file.hash, f); // add to map
      }

      fs.rename(files.file.path, path.join(form.uploadDir, files.file.name), function (err) {
        if (err) {
          console.log(err);
        }
        res.redirect('/upload');
        console.log('Finished.');
      });
    });

    var io = req.app.get('socketio'); // get reference to socket.io

    // listening progress event and send data to client
    form.on('progress', function (bytesReceived, bytesExpected) {
      var percent = Math.floor(bytesReceived / bytesExpected * 100);
      console.log(percent);

      var progress = {
        name: 'progress',
        percent: percent
      };

      // emit event : progress
      io.emit('progress', progress); //notify all client, no session here
    });
  }
};
```

- Router - Download ：index.js

``` javascript
exports.download = function (dir) {
  return function (req, res, next) {
    var id = req.params.id;
    var file = fileUploaded.get(id);
    var targetPath = path.join(dir, file.file.name);

    // second parameter can be used to specify file name
    res.download(targetPath, file.newName);
  };
};
```
---

- Layout(only part of the file): index.ejs

``` html
<table>
<caption>Uploaded Files</caption>
<thead>
<tr>
	<th>Name</th>
	<th>Size</th>
	<th>Type</th>
	<th>DateTime</th>
	<!--<th>Details</th>-->
</tr>
</thead>
<tbody>
<% fileUploaded.forEach(function(item, key, mapObj) { %>
<tr>
	<td><a href='/file/<%=key%>/download'><%=item.newName%></a></td>
	<td><%=item.file.size%></td>
	<td><%=item.file.type%></td>
	<td><%=item.file.lastModifiedDate%></td>
	<!--lastModifiedDate, mtime???-->
	<!--<td><%=JSON.stringify(item.file)%></td>-->
</tr>
<%})%>
</tbody>
</table>
```
- Client Validation(only part of the file): client.js

``` javascript
// client validation
function validateInput() {
	var uploadButton = document.forms[0].upload;
	uploadButton.onclick = function () {
		var file = document.forms[0].file.value;
		if (file.length == 0) {
			document.getElementById('uploadProgress').innerText = 'No file selectd!';
			return false;
		}
		var name = document.forms[0].name.value;
		if (name.length != 0) {
			var invalidChars = name.match(/[^a-zA-Z0-9_()\u4e00-\u9fa5]+/g); // match invalid file name
			if (invalidChars.length != 0) {
				document.getElementById('uploadProgress').innerText = 'Invalid file name!';
				return false;
			}
		}
	}
}

// communication between client and server using socket.io
function getUploadProgressFromServer() {
	var socket = io.connect("http://localhost:8888");
	var uploadProgress = document.getElementById("uploadProgress");
	var bar = document.getElementById('bar');

	socket.on("progress", function (data) {
		if ("progress" === data.name) {
			uploadProgress.innerText = data.percent + '%';
			bar.style.width = data.percent / 100 * document.body.offsetWidth + 'px';
		} else {
			console.log("There is nothing.", data);
		}
	});
}
```

### Notes:
1. 为简单起见，后端触发上传进度事件时，通过broadcast方式通知所有客户端，所以当多个客户端（可用两个不同的浏览器模拟）在传文件时，会在所有的窗口内显示进度，更好的实现方式应该是使用socket.io的Session；
2. 前端上传进度条、已上传文件列表的实现、样式等均比较粗糙，未使用bootstrap美化，不过作为Demo型程序，已经足够；
3. 目前该程序上传的文件放在服务器指定目录下，但记录仅保存在内存中，未涉及DB；如果有兴趣，可做些扩展，将上传记录持久化至DB中，比如常用的MongoDB，MySQL，SQLite甚至SQLServer，node社区提供了各种好用的[module](https://expressjs.com/en/guide/database-integration.html)；
4. 理论上应该可以传输各种格式的文件；另外，该示例中并未限制上传文件的大小，如有需要可查阅formidable的相关文档；其实node中用于文件上传的module非常多，比较成熟、常用的有multer，formidable，multiparty等，感兴趣的话都可以用一用；

### Problems：
1. 对重复文件上传操作：虽然能保证服务器端仅保留一份，但由于这里计算md5的方式只能等文件流获取完毕才能计算（推测），所以依然会进行上传操作，这在文件较大时……简直了！是否可先计算文件md5（采用crypto模块），对比已上传文件的md5，如果不存在，再进行上传？
2. formidable的file对象，传至客户端页面（index.ejs中，已注掉），直接输出为：
    ``` json
    {"size":102056,
    "path":"D:\\...\\uploadProgress\\public\\files\\upload_0dcfbb98abc3b2c7356f87f218df715b",
    "name":"debug.log",
    "type":"application/octet-stream",
    "mtime":"2017-04-26 20:58:08",
    "hash":"40f2f78bff67c9e6164aa790f9627d83"}
    ```
    - 很明显，其中包含mtime（最终修改时间）；然而，当通过`file.mtime`获取该属性时，竟然是`undefined`，但是可通过`file.lastModifiedDate`来获取此属性，也是醉了，这到底是什么原因？？

    **上述问题，如您知道原因，还请不吝赐教，非常感谢！**

### Source Code: [Github](https://github.com/heartsuit/Upload-File-with-Progress)

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***