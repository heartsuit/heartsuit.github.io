---
layout: post
title: 在Windows上的git-bash下安装wget
tags: Server
---

### Problem

> bash: wget: command not found

`Windows`中的`git-bash`相当于一个简易版的`Linux Shell`，提供了日常操作命令的支持，但是缺少一些相对高阶的命令，比如远程下载文件命令：`wget`。

### Solution
下载wget对应的安装包，放到bash的执行目录即可。

![2020-02-20-Wget-Url.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-02-20-Wget-Url.png)

1. 下载wget二进制安装包，地址：`https://eternallybored.org/misc/wget/`，根据操作系统选择。
2. 解压安装包，将`wget.exe`置于`X:\Program Files\Git\mingw64\bin\`目录下

### Test

![2020-02-20-Wget-Test.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-02-20-Wget-Test.jpg)

其实，如果有其他命令提示`bash: xxx: command not found`,可以采用相同的方式解决。

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**

