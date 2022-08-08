---
layout: post
title: 信创环境下密码强度规则：设置密码长度为6至20位，包含大、小写字母、数字、特殊字符组合
tags: 国产化, Nginx
---

## 背景

以前我们的密码规则比较简单，就是简单的字母+数字即可。现在要部署到某个安全性要求较高的环境下，就要求我们提升密码强度，新的规则要求：

> 设置密码长度为6至20位，包含大、小写字母、数字、特殊字符_!@#$%^&组合

显然，字符串处理利器：正则表达式是我们的答案。

## 正则表达式可视化

直接上结果。

```
^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[_!@#$%^&])[^ ]{6,20}$
```

在可视化工具里看下这个正则表达式的效果。

* [https://jex.im/regulex/#!flags=&re=%5E(a%7Cb)*%3F%24](https://jex.im/regulex/#!flags=&re=%5E(a%7Cb)*%3F%24)

![2022-08-07-Password.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-07-Password.png)

Note: 注意数字那里的转义斜杠。

## Java代码实现

直接上代码。

```java
    /**
     * 判断密码规则是否满足要求
     *
     * @param password
     * @return
     */
    public static boolean satisfyPasswordRule(String password) {
        // 密码验证规则
        String regEx = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[_!@#$%^&])[^ ]{6,20}$";
        // 编译正则表达式
        Pattern pattern = Pattern.compile(regEx);
        // 忽略大小写的写法
        Matcher matcher = pattern.matcher(password);
        // 字符串是否与正则表达式相匹配
        return matcher.matches();
    }
```

记得引入 `Java` 默认的正则表达式相关包：

```java
import java.util.regex.Matcher;
import java.util.regex.Pattern;
```

## 正则表达式匹配校验

写好了正则表达式后，如何快速验证我们的语句是否可以正确匹配目标字符串呢？

* [https://c.runoob.com/front-end/854/](https://c.runoob.com/front-end/854/)

![2022-08-07-RegExMatch1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-07-RegExMatch1.jpg)

* [https://tool.oschina.net/regex/](https://tool.oschina.net/regex/)

![2022-08-07-RegExMatch2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-07-RegExMatch2.jpg)

* [https://regexr.com/](https://regexr.com/)
  
这个网站，更适合用于匹配大段文字中的目标字符串。

![2022-08-07-RegExMatch3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-07-RegExMatch3.jpg)

## 常用的正则表达式

以下正则表达式来自于：[https://c.runoob.com/front-end/854/](https://c.runoob.com/front-end/854/)。

```
Email地址：^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$
域名：[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?
InternetURL：[a-zA-z]+://[^\s]* 或 ^http://([\w-]+\.)+[\w-]+(/[\w-./?%&=]*)?$
手机号码：^(13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9])\d{8}$
电话号码("XXX-XXXXXXX"、"XXXX-XXXXXXXX"、"XXX-XXXXXXX"、"XXX-XXXXXXXX"、"XXXXXXX"和"XXXXXXXX)：^(\(\d{3,4}-)|\d{3.4}-)?\d{7,8}$
国内电话号码(0511-4405222、021-87888822)：\d{3}-\d{8}|\d{4}-\d{7}
电话号码正则表达式（支持手机号码，3-4位区号，7-8位直播号码，1－4位分机号）: ((\d{11})|^((\d{7,8})|(\d{4}|\d{3})-(\d{7,8})|(\d{4}|\d{3})-(\d{7,8})-(\d{4}|\d{3}|\d{2}|\d{1})|(\d{7,8})-(\d{4}|\d{3}|\d{2}|\d{1}))$)
身份证号(15位、18位数字)，最后一位是校验位，可能为数字或字符X：(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)
帐号是否合法(字母开头，允许5-16字节，允许字母数字下划线)：^[a-zA-Z][a-zA-Z0-9_]{4,15}$
密码(以字母开头，长度在6~18之间，只能包含字母、数字和下划线)：^[a-zA-Z]\w{5,17}$
强密码(必须包含大小写字母和数字的组合，不能使用特殊字符，长度在 8-10 之间)：^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9]{8,10}$
强密码(必须包含大小写字母和数字的组合，可以使用特殊字符，长度在8-10之间)：^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,10}$
日期格式：^\d{4}-\d{1,2}-\d{1,2}
一年的12个月(01～09和1～12)：^(0?[1-9]|1[0-2])$
一个月的31天(01～09和1～31)：^((0?[1-9])|((1|2)[0-9])|30|31)$
xml文件：^([a-zA-Z]+-?)+[a-zA-Z0-9]+\\.[x|X][m|M][l|L]$
中文字符的正则表达式：[\u4e00-\u9fa5]
双字节字符：[^\x00-\xff] (包括汉字在内，可以用来计算字符串的长度(一个双字节字符长度计2，ASCII字符计1))
空白行的正则表达式：\n\s*\r (可以用来删除空白行)
HTML标记的正则表达式：<(\S*?)[^>]*>.*?|<.*? /> ( 首尾空白字符的正则表达式：^\s*|\s*$或(^\s*)|(\s*$) (可以用来删除行首行尾的空白字符(包括空格、制表符、换页符等等)，非常有用的表达式)
腾讯QQ号：[1-9][0-9]{4,} (腾讯QQ号从10000开始)
中国邮政编码：[1-9]\d{5}(?!\d) (中国邮政编码为6位数字)
IPv4地址：((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})(\.((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})){3}
```

## 常用的在线工具网站

记录并分享下我常用的一些在线工具网站。

* [https://tool.lu/](https://tool.lu/)

![2022-08-07-ToolSite1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-07-ToolSite1.jpg)

* [https://c.runoob.com/](https://c.runoob.com/)

![2022-08-07-ToolSite2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-07-ToolSite2.jpg)

* [http://cxy521.com/](http://cxy521.com/)

![2022-08-07-ToolSite3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-07-ToolSite3.jpg)

* [https://tools.fun/](https://tools.fun/)

![2022-08-07-ToolSite4.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-07-ToolSite4.jpg)

## 小总结

这篇文章的本意除了记录强密码规则的正则表达式之外，更关键的是对常用的工具网站做个整理和记录。

## Reference

* [https://qa.1r1g.com/sf/ask/751054321/](https://qa.1r1g.com/sf/ask/751054321/)
* [https://blog.csdn.net/weixin_45884459/article/details/109677861](https://blog.csdn.net/weixin_45884459/article/details/109677861)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
