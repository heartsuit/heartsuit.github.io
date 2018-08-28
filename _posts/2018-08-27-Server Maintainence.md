---
layout: post
title: 服务器运维相关问题
tags: Server
---

### TypeError: Cannot assign to read only property 'exports' of object '#<Object>'

    module.exports = {
    ^
    TypeError: Cannot assign to read only property 'exports' of object '#<Object>'

    需要引入插件 babel-plugin-transform-es2015-modules-commonjs
    然后在 .babelrc中配置 { "plugins": ["transform-es2015-modules-commonjs"] }


### Mysql ERROR 1040 (HY000): Too many connections

    修改my.cnf配置文件添加并需要重启：
    [mysqld] 
    wait_timeout = 600
    interactive_timeout = 600
    即：10分钟内该连接没有请求就断开


### MySQL批量插入主键重复

    insert into 改为 insert ignore into


### SVN服务器迁移 svnadmin: E000002: Can't open file '/opt/svn/fireweb/format': No such file or directory

    1. 导出：
    svnadmin dump F:/workspace/Shanfeng/fireweb >fireweb
    2. 创建新目录：
    svnadmin create ./opt/svn/fireweb
    3. 导入：
    svnadmin load /opt/svn/fireweb </opt/fireweb
    4. 重新定位svn地址到新地址


---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***