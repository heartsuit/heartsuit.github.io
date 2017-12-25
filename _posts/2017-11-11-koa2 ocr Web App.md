---
layout: post
title: 基于tesseract-orc的koa2 OCR Web小应用
tags: Node.js
---
### 基本功能

> 上传本地图片识别，下载网络图片识别，前端显示图片与OCR结果。

### 使用的技术

- Front: Vue@2.4.0, Bootstrap@3.3.7, toastr@2.1.3, nunjucks@3.0.1; 
- Server: Node@8.3.0, koa@2.4.1, koa-router, koa-multer, koa-static；
- 上传本地图片识别：vue-resource, koa-multer；
- 下载网络图片识别：superagent；
- ocr: node-tesseract，调用本地tesseract-ocr程序；

Note：**node-tesseract需要计算机安装tesseract-ocr@3.02，当前的tesseract-ocr未安装其他语言包，仅支持对英文、数字的识别。**

### 前端展示

- 本地上传识别

![2017-11-11-UploadOCR](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2017-11-11-UploadOCR.gif)

- 网络图片识别

![2017-11-11-DownloadOCR](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2017-11-11-DownloadOCR.gif)

### 启动方式

`node app` or `npm start`

### Source Code: [Github](https://github.com/heartsuit/koa2-ocr-on-docker)

### Live Demo: [Aliyun](http://101.132.130.218:8881/)

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***