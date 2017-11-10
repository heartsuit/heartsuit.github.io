---
layout: post
title: vue-resource上传文件（POST multipart/form-data到koa-multer）
tags: Node.js
---
### Client Side

- 通过form的action提交数据到服务端

![2017-11-10-CommonSubmit](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2017-11-10-CommonSubmit.gif)

koa-multer[官方示例](https://www.npmjs.com/package/koa-multer)给的是结合koa-route的服务端Demo，客户端如何将数据传输过去没做明确说明。
可通过传统的form，action，提交表单（关键：`enctype="multipart/form-data"`）即可。

``` html
<!DOCTYPE html>
<html>

<head>
	<meta charset='utf-8'>
	<title><%= title %></title>
	<script src="https://cdn.bootcss.com/vue/2.3.4/vue.js"></script>
	<script src="https://cdn.bootcss.com/vue-resource/1.3.3/vue-resource.js"></script>
</head>

<body>
	<div id="vm">
		<!-- common submit by form's action, no js at all -->
		<form action="/upload" method="post" enctype="multipart/form-data">
			<input type="file" name="picture">
			<button type="submit">上传图片</button>
		</form>
	</div>
</body>

<script>
	// vue starts here
</script>

</html>
```

- 通过vue-resource异步提交至服务端

![2017-11-10-VuePostMulter](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2017-11-10-VuePostMulter.gif)

通过form直接POST的方式会跳转到新页面；如果打算对提交后服务器的返回数据进行处理，可采用异步提交的方式，当不想使用jQuery等的ajax时，vue-resource或者axios可以达到这一目的。

``` html
<!-- with vue.js, listen on change event, 
  prevent default submit behavior,
  then set FormData and Content-Type in folowing script			
-->
<form @submit.prevent="upload" method="post" enctype="multipart/form-data">
  <input type="file" name="picture" v-on:change="onChange($event)">
  <button type="submit">上传图片</button>
</form>

<div>上传信息(vue&vue-resource)：
  <p v-text="result"></p>
</div>
```

``` javascript
// vue
var vm = new Vue({
  el: "#vm",
  data: {
    picture: {},
    result: '',
  },

  methods: {
    onChange: function (event) {
      this.picture = event.target.files[0]; // get input file object
      console.log(this.picture);
    },

    upload: function () {
      var that = this;
      var formData = new FormData();
      formData.append('picture', this.picture);
      // specify Content-Type, with formData as well
      this.$http.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(function (res) {
        res.json().then(function (result) {
          that.result = result.info;
          console.log(that.result);
        });
      }, function (res) {
        console.log(res.body);
      });
    }
  }
});

```

### Server Side

- upload.js

``` javascript
const router = require('koa-router')();
const multer = require('koa-multer');

// config local storage
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    var fileFormat = (file.originalname).split(".");
    cb(null, Date.now() + "." + fileFormat[fileFormat.length - 1]);
  }
})
var upload = multer({ storage: storage });

// note: upload.single('picture'), the parameter here is the name of input(form data)
router.post('/upload', upload.single('picture'), async (ctx, next) => {
  try {
    ctx.body = {
      status: true,
      info: JSON.stringify(ctx.req.file)
    }
  } catch (err) {
    ctx.body = {
      status: false,
      info: err.message,
    }
  }
})

// index
router.get('/', async (ctx, next) => {
  await ctx.render('index', { title: 'vue-resource 2 koa-multer' });
})

// export router for app's use()
module.exports = router; 
```
- package.json

``` json
  "dependencies": {
    "koa": "^2.4.1",
    "koa-bodyparser": "^4.2.0",
    "koa-ejs": "^4.1.0",
    "koa-multer": "^1.0.2",
    "koa-router": "^7.2.1"
  }
```

Note：koa-multer可以用来上传任意文件，这里仅以图片上传为例进行测试。

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***