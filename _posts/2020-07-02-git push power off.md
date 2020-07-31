---
layout: post
title: 当你在执行git push的时候断电。。
tags: git
---

### push断电

一顿操作猛如虎，git push断电了。。

> 据佛经具体记载，一弹指为二十瞬，一瞬为二十念，一念为二十息，一息为六十刹那，一刹那为九百生灭。

在来电之前的这一段时间，脑补了计算机在断电的`一刹那`可能的一些操作，主要有以下几点：

- 保护现场；
- 网络断开，无法上传；
- 磁盘读取失败，无法上传；
- 上传了一部分，失败了，这是最讨厌的。。

实际上是怎样的呢？

来电后，到远程仓库一看，发现竟然push成功啦~~
也就是说在停电时的那个push操作已经成功完成，远程仓库已更新，然而，本地仓库却坏了。。


### 本地仓库broken

使用git log查看记录，发现报错：

```bash
$ git log
fatal: your current branch appears to be broken
```

**而且所有的文件状态都变成了新创建，显示未加入版本控制。。**

### 解决方法

1. 查看当前HEAD记录

![2020-07-02-Git-00.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-07-02-Git-00.png)

里面全是0，正常情况下应该是一个`commit hash`。

2. 查看HEAD日志
到`.git\logs\refs\heads`目录下查看对应分支的日志文件

![2020-07-02-Git-head.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-07-02-Git-head.png)

最下方为最新的commit记录。

3. 恢复当前HEAD记录

复制HEAD日志的最新`commit hash`到当前HEAD记录文件，即从`.git\logs\refs\heads`对应的分支文件中复制最新`commit hash`到`.git\refs\heads\`对应的分支文件中

**Note: 这里是使用`95e6e609580daa06748c660e68053108198fc3c1`覆盖那一堆0。**

保存之后，可以发现git的本地仓库随即恢复正常。

### 如何复现

要复现这个问题，小哥完全不必要真的在`git push`时去断开电源；
注意下之前的恢复操作，可以发现，直接把`.git\refs\heads\`下对应分支文件内容改了或者置空，就能够看到所有的文件都成了new的，表示需要加入版本控制。。
不信你试试😎

### Reference

[https://stackoverflow.com/questions/33012869/broken-branch-in-git-fatal-your-current-branch-appears-to-be-broken](https://stackoverflow.com/questions/33012869/broken-branch-in-git-fatal-your-current-branch-appears-to-be-broken)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***