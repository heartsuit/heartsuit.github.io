---
layout: post
title: 实际生产中使用Oracle的小问题及解决方法记录：ORA-00911，ORA-12514，ORA-28547
tags: Tools
---

## 背景

在上次安装并初步测试 `Oracle` 后[Oracle 11g安装使用、备份恢复并与SpringBoot集成](https://blog.csdn.net/u013810234/article/details/127935283?spm=1001.2014.3001.5501)，在实际生产中使用 `Oracle` 时又遇到几个小问题： `ORA-00911` ， `ORA-12514` ， `ORA-28547` 。下面分别列出这几个问题的解决方法。

Note：实际的生产环境主要是 `Windows` 操作系统，包括 `Windows Server 2003` 以及 `Win7` 。

## ORA-00911: invalid character

配置环境变量即可，新增以下键值对。

```
键：NLS_LANG
值：SIMPLIFIED CHINESE_CHINA.ZHS16GBK
```

## ORA-12514: TNS:listener does not currently know of service requested in connect descriptor

修改数据库的安装目录 `E:\app\Administrator\product\11.2.0\dbhome_1\NETWORK\ADMIN` 下的 `listener.ora` 文件

将

```
    (SID_NAME = CLRExtProc)
```

改为：

```
  	 (GLOBAL_DBNAME = orcl)
  	 (SID_NAME = orcl)
```

Note：记得重启监听服务。

![2022-12-18-RestartOracleListenerService.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-12-18-RestartOracleListenerService.jpg)

## ORA-28547：connection to server failed, probable Oracle Net admin error

同样是修改数据库的安装目录 `E:\app\Administrator\product\11.2.0\dbhome_1\NETWORK\ADMIN` 下的 `listener.ora` 文件
将 `listener.ora` 的这一行注释掉：

```
#(PROGRAM = extproc)
```

Note：记得重启监听服务。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
