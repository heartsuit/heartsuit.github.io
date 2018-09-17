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

    启动svn服务：
    svnserve -d -r /opt/svn
    停止svn服务：
    killall svnserve

### spring 开发环境与生产环境配置

1.开发、生产配置文件

将已有的`resources.properties`拆分为`resources-dev.properties`与`resources-prod.properties`，分别存放开发与生产环境下的DB连接、MQ连接；

2.在spring配置文件中设置profile，引入对应的beans

``` xml
<!-- 开发环境配置文件 -->
<beans profile="dev">
    <context:property-placeholder location="classpath:conf/resources-dev.properties"/>
</beans>

<!-- 生产环境配置文件 -->
<beans profile="prod">
    <context:property-placeholder location="classpath:conf/resources-prod.properties"/>
</beans>
```

Note: ***必须放在配置文件xml的最下面（包括import），否则xml报错，无法启动。***

3.激活profile

Method1. web.xml配置

``` xml
<!-- 激活指定的profile -->
<context-param> 
    <param-name>spring.profiles.active</param-name> 
    <param-value>dev</param-value> 
</context-param>
```

Method2. 修改 Tomcat 启动脚本 `catalina.bat`

``` bash
set JAVA_OPTS="-Dspring.profiles.active=prod"
```


---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***