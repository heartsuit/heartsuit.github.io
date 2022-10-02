---
layout: post
title: 解决VueCropper导致的后端接收文件后缀名为blob的问题
tags: Vue
---

## 背景

最近为了响应系统对安全方面的要求，我们做的整改之一是对文件上传部分，除了在前端页面上限制用户可以选择的文件类型，还在后端接口中新增了对文件后缀名（这里主要是图片）的限制，核心代码如下。

```java
    // 支持常用文件类型
    private List<String> supportedFileTypes = Arrays.asList("bmp", "gif", "jpg", "jpeg", "png");

    if(!supportedFileTypes.contains(extension)){
        throw new ServiceException("无效的文件格式");
    }
```

![2022-10-02-UploadAvatar.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-10-02-UploadAvatar.jpg)

可是通过前端上传文件后，后端持续报错：无效的文件格式，见鬼。。


## 问题排查

这让我一度怀疑后端获取文件后缀名的代码有问题。针对获取后缀名的代码单独做了测试后，确认了不是这段代码的的问题。

```java
// 后端获取文件后缀名的代码
String extension = Objects.requireNonNull(file.getOriginalFilename()).substring(file.getOriginalFilename().lastIndexOf(".") + 1);
```

那么问题应该是出现在前端了，也就是说，前端传过来的文件名称有问题，而且在观察前端请求时证明了这一猜想。

![2022-10-02-Blob.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-10-02-Blob.jpg)

Note: 前端使用`vue-cropper`插件进行图片切割头像，将切割后的头像转为blob文件上传。所以需要在前端进行调整了。

## 解决方案

在上传图片时，给`formData`的`append`方法第三个参数设置为文件的名称即可。

`formData`的`append`可以接受三个参数，通过第三个参数我们可以手动设置`fileName`参数：

> `formData`.append("file", file, this.fileName);

具体的调整见如下代码，预上传图片时获取到文件名称赋值给全局变量`this.fileName = file.name;`，在真正发送请求时，设置到`formData`的`append`方法第三个参数。

![2022-10-02-CodeDiff.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-10-02-CodeDiff.jpg)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
