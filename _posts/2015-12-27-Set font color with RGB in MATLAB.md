---
layout: post
title: MATLAB如何采用0~1的RGB值设置字体颜色？
tags: MATLAB
---
## MATLAB如何采用0~1的RGB值设置字体颜色？
### Problem：

>在MATLAB中，如何采用0~1的RGB值设置字体颜色？

**目前做一个GUI，遇到动态改变字体颜色的这点需求，而且变为自己想要的颜色**

这样会带来两个小问题：

- 不能采用预设颜色值的方式实现；
- 不用MATLAB提供的可采用字母设置的8种颜色值，通过MATLAB自带的选色器或者专门的取色器确定了自己想要显示的颜色后，但是此时的RGB值时0~255间，无法直接在代码中设置。


### Solution：
>选择自己欲显示的颜色，得到0~255间的RGB值，进行归一化即可：[R, G, B]/256


### eg：

``` C
	set(handles.text1, 'foregroundColor', [187 25 34]/256);
```

### Theory：
>0~1与0~255只是表示方式不同，在计算机内部是等价的。
0~255间只能取整数，共有256级色彩；
0~1间只能取某些特定值（比如：RGB中的某个值取0.32或者0.36，显示出来的颜色可能是一样的），同样256级色彩。


### Reference: <a href="http://www.ilovematlab.cn/thread-201428-1-1.html" target="blank"> MATLAB中文论坛

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***



