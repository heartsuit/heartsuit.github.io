---
layout: post
title: VMWare开启虚拟机报错：此主机支持Intel VT-x, 但Intel VT-x处于禁用状态
tags: Server
---

### 背景

换了台主机，想节省点时间，把之前的虚拟机文件直接拿过来，放到 `VMWare` 启动，然而，在开启虚拟机时报错了：此主机支持Intel VT-x，但Intel VT-x处于禁用状态。

![2021-3-27-VMWareError.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-3-27-VMWareError.png)

* 电脑基本信息

``` 
我的电脑	X64 兼容 台式电脑
操作系统	Windows 7 旗舰版 64位 SP1
主显卡	独立显卡(对游戏和电影支持较好)
IE浏览器	版本号  11.0
```

* 基本硬件展示

``` 
处理器	英特尔 Core i5-9400F @ 2.90GHz 六核
主板	华硕 EX-B365M-V
内存	16 GB ( 晶芯 DDR4 2666MHz )
主硬盘	台电 128GB A850 ( 128 GB / 固态硬盘 )
主显卡	Nvidia GeForce GTX 1050 Ti ( 4 GB / Nvidia )
显示器	惠科 HKC24A6 H240 ( 23.6 英寸  )
网卡	瑞昱 RTL8168/8111/8112 Gigabit Ethernet Controller / 华硕
声卡	瑞昱 ALC887 @ 英特尔 High Definition Audio 控制器
```

![2021-3-27-SystemInfo.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-3-27-SystemInfo.png)

### 解决

根据硬件配置不同，具体的配置项稍微有差别（进入 `BIOS` 的快捷键也不一样，我这里是 `Delete` 或者 `F2` ），在 `Advanced` 项下有个 `CPU` 相关的配置，选择进入，找到 `Intel Visiualization Technology` ，将其配置为 `Enabled` 。

![2021-3-27-VTEnabled.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-3-27-VTEnabled.jpg)

然后，在 `Exit` 下选择 `Save Changes & Reset` 保存，继续启动即可。

![2021-3-27-SaveAndReset.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-3-27-SaveAndReset.jpg)

再次启动虚拟机，成功！😊

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
