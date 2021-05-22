---
layout: post
title: Ansible纸上谈兵02：常用模块
tags: Ansible, Server
---

### 背景

这里以 `ad-hoc` 命令的方式介绍下 `Ansible` 经常用到的模块。 `Ansible` 已经具备丰富的模块生态，我们可以借助 `Ansible` 的模块完成日常在 `Linux` 操作系统上的运维工作。

一般常用的模块有：

* 执行命令

command(默认)  shell

Note： `command` , `shell` 本质上执行的都是基础命令（区别在于 `command` 模块不支持管道命令）

* 管理安装包

yum

* 管理文件

file copy get_url

* 管理服务

service

* 管理用户

group user

* 管理定时任务

cron

### 主机清单

主机清单配置与上一篇[Ansible纸上谈兵01：认识一下Ansible](https://heartsuit.blog.csdn.net/article/details/116903916)文章中的一致，并对其进行分组（1个控制端，3个web服务，1个数据库服务，1个缓存服务）。

```bash
# Ansible默认的配置文件位于/etc/ansible/hosts
[root@ecs-kunpeng-0001 ~]# vim /etc/ansible/hosts
# 配置以下内容
[controller]
192.168.0.6
[web]
192.168.0.53
192.168.0.39
192.168.0.46
[db]
192.168.0.235
[cache]
192.168.0.166
```

### ad-hoc

* `ad-hoc` 命令语法格式：

    ansible [一般为主机清单] -m [模块] -a [模块选项]

所谓的 `ad-hoc` ，是指每次执行一条命令，类似于 `Shell` 命令行的交互式脚本。

* 查看模块使用文档语法格式：

    ansible-doc [模块]

不用看其他书籍，关键是学会查看文档（可直接定位到Example查看示例），eg: ansible-doc yum

### 执行命令

```bash
# 指定一个组，执行命令
[root@ecs-kunpeng-0001 ~]# ansible cache -m ping 
192.168.0.166 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}

# 指定多个组(db组、cache组)，执行命令
[root@ecs-kunpeng-0001 ~]# ansible db:cache -m ping 
192.168.0.166 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
192.168.0.235 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}

# command模块执行管道操作时报语法错误
[root@ecs-kunpeng-0001 ~]# ansible cache -m command -a "ps aux|grep redis"
192.168.0.166 | FAILED | rc=1 >>
error: unsupported option (BSD syntax)

Usage:
 ps [options]

 Try 'ps --help <simple|list|output|threads|misc|all>'
  or 'ps --help <s|l|o|t|m|a>'
 for additional help text.

For more details see ps(1).non-zero return code

# shell模块可以执行管道操作
[root@ecs-kunpeng-0001 ~]# ansible cache -m shell -a "ps aux|grep redis"
192.168.0.166 | CHANGED | rc=0 >>
systemd+   75292  0.1  0.0 136256  6080 ?        Ssl  4月16 100:18 redis-server *:6379
root     1292536  0.0  0.0 214464  1728 pts/0    S+   21:59   0:00 /bin/sh -c ps aux|grep redis
root     1292538  0.0  0.0 214080  1536 pts/0    S+   21:59   0:00 grep redis
root     1848214  0.0  0.1 1298368 7488 ?        Ssl  5月20   1:11 ./bin/redis-server *:6380
```

Note: 

* 如果不指定模块，则默认采用`command`模块；
* 基础的`Linux`命令，都可以通过`command`与`shell`模块执行，区别在于`command`模块不支持管道命令。

### 管理安装包

```bash
# 安装当前最新的Apache软件
[root@ecs-kunpeng-0001 ~]# ansible cache -m yum -a "name=httpd state=latest"
192.168.0.166 | SUCCESS => {
    "ansible_facts": {
        "pkg_mgr": "dnf"
    },
    "changed": false,
    "msg": "Nothing to do",
    "rc": 0,
    "results": []
}

# 通过公网URL安装rpm软件
[root@ecs-kunpeng-0001 ~]# ansible cache -m yum -a "name=https://mirrors.huaweicloud.com/openeuler/openEuler-20.03-LTS/everything/aarch64/Packages/httpd-2.4.34-15.oe1.aarch64.rpm state=latest"

# 通过本地包安装rpm软件
[root@ecs-kunpeng-0001 ~]# ansible cache -m yum -a "name=/tmp/package.rpm state=present"  

# 卸载删除httpd软件
[root@ecs-kunpeng-0001 ~]# ansible cache -m yum -a "name=httpd state=absent"
```

### 管理文件

file copy get_url

* file：创建文件、目录，授权模块

```bash
# 创建文件，并设定属主、属组、权限
[root@ecs-kunpeng-0001 ~]# ansible cache -m file -a "path=/var/www/html/index.html state=touch owner=apache group=apache mode=644"
192.168.0.166 | CHANGED => {
    "changed": true,
    "dest": "/var/www/html/index.html",
    "gid": 48,
    "group": "apache",
    "mode": "0644",
    "owner": "apache",
    "size": 0,
    "state": "file",
    "uid": 48
}

# 创建目录，并设定属主、属组、权限
[root@ecs-kunpeng-0001 ~]# ansible cache -m file -a "path=/var/www/html/dir state=directory owner=apache group=apache mode=755"
192.168.0.166 | CHANGED => {
    "changed": true,
    "gid": 48,
    "group": "apache",
    "mode": "0755",
    "owner": "apache",
    "path": "/var/www/html/dir",
    "size": 4096,
    "state": "directory",
    "uid": 48
}

# 通过shell模块验证下是否创建了文件与目录
[root@ecs-kunpeng-0001 ~]# ansible cache -m shell -a "ls -l /var/www/html"
192.168.0.166 | CHANGED | rc=0 >>
总用量 4
drwxr-xr-x 2 apache apache 4096  5月 21 22:20 dir
-rw-r--r-- 1 apache apache    0  5月 21 22:17 index.html
```

* copy：文件传输模块

```bash
# 将本地的file.txt文件推送到远端服务
[root@ecs-kunpeng-0001 ~]# ansible cache -m copy -a "src=./file.txt dest=/var/www/html/file.txt owner=root group=root mode=644"
192.168.0.166 | CHANGED => {
    "changed": true,
    "checksum": "d4d55684a3d4d6a3c31c36f788f01f30d0d22d02",
    "dest": "/var/www/html/file.txt",
    "gid": 0,
    "group": "root",
    "md5sum": "1ae9367e28d7d3173e93a92d09e76708",
    "mode": "0644",
    "owner": "root",
    "size": 25,
    "src": "/root/.ansible/tmp/ansible-tmp-1621607368.0554242-3109318-111286480082069/source",
    "state": "file",
    "uid": 0
}

# 往远程的主机文件中写入内容
[root@ecs-kunpeng-0001 ~]# ansible cache -m copy -a "content=writesomething.. dest=/var/www/html/file.txt"
192.168.0.166 | CHANGED => {
    "changed": true,
    "checksum": "dd3c25def1f5204fd618a0a3346b68feac393c1e",
    "dest": "/var/www/html/file.txt",
    "gid": 0,
    "group": "root",
    "md5sum": "b30d3b6c1a4327a291e271d7e502247e",
    "mode": "0644",
    "owner": "root",
    "size": 16,
    "src": "/root/.ansible/tmp/ansible-tmp-1621607386.0447457-3110984-150399809437238/source",
    "state": "file",
    "uid": 0
}

# 通过shell模块验证下是否创建了文件与目录
[root@ecs-kunpeng-0001 ~]# ansible cache -m shell -a "cat /var/www/html/file.txt"
192.168.0.166 | CHANGED | rc=0 >>
writesomething..
```

* get_url：下载文件模块

```bash
# 下载互联网的软件至本地，url支持http, https, ftp，这里以之前中招的挖矿病毒脚本为例测试下载
[root@ecs-kunpeng-0001 ~]# ansible cache -m get_url -a "url=http://45.9.148.37/cf67356a3333e6999999999/init.sh dest=/var/www/html/"
192.168.0.166 | CHANGED => {
    "changed": true,
    "checksum_dest": null,
    "checksum_src": "1bf6b644228a468e6f90643d7a5efdd447dd169d",
    "dest": "/var/www/html/init.sh",
    "elapsed": 0,
    "gid": 0,
    "group": "root",
    "md5sum": "179fd51fe6b061e8b54b0f3ca2e8bd26",
    "mode": "0600",
    "msg": "OK (37907 bytes)",
    "owner": "root",
    "size": 37907,
    "src": "/root/.ansible/tmp/ansible-tmp-1621607722.632395-3141898-83452532208350/tmpbt07hddb",
    "state": "file",
    "status_code": 200,
    "uid": 0,
    "url": "http://45.9.148.37/cf67356a3333e6999999999/init.sh"
}

# 验证是否下载成功init.sh
[root@ecs-kunpeng-0001 ~]# ansible cache -m shell -a "ls -l /var/www/html"
192.168.0.166 | CHANGED | rc=0 >>
总用量 48
drwxr-xr-x 2 apache apache  4096  5月 21 22:20 dir
-rw-r--r-- 1 root   root      16  5月 21 22:29 file.txt
-rw-r--r-- 1 apache apache     0  5月 21 22:17 index.html
-rw------- 1 root   root   37907  5月 21 22:35 init.sh

# 使用默认命令模块删除文件时，有个警告，并建议使用file模块来操作文件的删除。
[root@ecs-kunpeng-0001 ~]# ansible cache -a "rm /var/www/html/init.sh"
[WARNING]: Consider using the file module with state=absent rather than running 'rm'.  If you
need to use command because file is insufficient you can add 'warn: false' to this command
task or set 'command_warnings=False' in ansible.cfg to get rid of this message.
192.168.0.166 | CHANGED | rc=0 >>

# 使用file模块删除文件
[root@ecs-kunpeng-0001 ~]# ansible cache -m file -a "path=/var/www/html/file.txt state=absent"
192.168.0.166 | CHANGED => {
    "changed": true,
    "path": "/var/www/html/file.txt",
    "state": "absent"
}

# 验证是否已经删除了init.sh以及file.txt
[root@ecs-kunpeng-0001 ~]# ansible cache -m shell -a "ls -l /var/www/html"
192.168.0.166 | CHANGED | rc=0 >>
总用量 4
drwxr-xr-x 2 apache apache 4096  5月 21 22:20 dir
-rw-r--r-- 1 apache apache    0  5月 21 22:17 index.html
```

### 管理服务

```bash
# 启动httpd服务
[root@ecs-kunpeng-0001 ~]# ansible cache -m service -a "name=httpd state=started"
192.168.0.166 | CHANGED => {
    "changed": true,
    "name": "httpd",
    "state": "started",
    "status": {
        "ActiveEnterTimestampMonotonic": "0",
        "ActiveExitTimestampMonotonic": "0",
        ...

# 停止httpd服务
[root@ecs-kunpeng-0001 ~]# ansible cache -m service -a "name=httpd state=stopped"

# 重启httpd服务
[root@ecs-kunpeng-0001 ~]# ansible cache -m service -a "name=httpd state=restarted"

# 启动httpd服务，并加入开机自启
[root@ecs-kunpeng-0001 ~]# ansible cache -m service -a "name=httpd state=started enabled=yes"
```

### 管理用户

* group: 分组模块

```bash
# 创建grpone基本组，指定uid为1234
[root@ecs-kunpeng-0001 ~]# ansible cache -m group -a "name=grpone gid=1234 state=present"
192.168.0.166 | CHANGED => {
    "changed": true,
    "gid": 1234,
    "name": "grpone",
    "state": "present",
    "system": false
}

# 创建grptwo系统组，指定uid为5678
[root@ecs-kunpeng-0001 ~]# ansible cache -m group -a "name=grptwo gid=5678 system=yes state=present"
192.168.0.166 | CHANGED => {
    "changed": true,
    "gid": 5678,
    "name": "grptwo",
    "state": "present",
    "system": true
}

# 删除grpone基本组
[root@ecs-kunpeng-0001 ~]# ansible cache -m group -a "name=grpone state=absent"
192.168.0.166 | CHANGED => {
    "changed": true,
    "name": "grpone",
    "state": "absent"
}
```

* user: 用户模块

```bash
# 创建heartsuit用户，组是docker
[root@ecs-kunpeng-0001 ~]# ansible cache -m user -a "name=heartsuit group=docker"
192.168.0.166 | CHANGED => {
    "changed": true,
    "comment": "",
    "create_home": true,
    "group": 989,
    "home": "/home/heartsuit",
    "name": "heartsuit",
    "shell": "/bin/bash",
    "state": "present",
    "system": false,
    "uid": 1000
}

# 删除用户
[root@ecs-kunpeng-0001 ~]# ansible cache -m user -a "name=heartsuit state=absent"
192.168.0.166 | CHANGED => {
    "changed": true,
    "force": false,
    "name": "heartsuit",
    "remove": false,
    "state": "absent"
}
```

### 管理定时任务

```bash
# 添加定时任务：每隔2分钟执行一次date >> /var/www/html/date.txt
[root@ecs-kunpeng-0001 ~]# ansible cache -m cron -a "name=job-datetime minute=*/2 job='date >> /var/www/html/date.txt'"
192.168.0.166 | CHANGED => {
    "changed": true,
    "envs": [],
    "jobs": [
        "job-datetime"
    ]
}

# 验证是否生成了定时任务
[root@ecs-kunpeng-0001 ~]# ansible cache -m shell -a "crontab -l"
192.168.0.166 | CHANGED | rc=0 >>
#Ansible: job-datetime
*/2 * * * * date >> /var/www/html/date.txt

# 验证定时任务是否执行
[root@ecs-kunpeng-0001 ~]# ansible cache -m shell -a "cat /var/www/html/date.txt"
192.168.0.166 | CHANGED | rc=0 >>
Fri May 21 22:42:01 CST 2021
Fri May 21 22:44:01 CST 2021
Fri May 21 22:46:01 CST 2021

# 关闭定时任务
[root@ecs-kunpeng-0001 ~]# ansible cache -m cron -a "name=job-datetime minute=*/2 job='date >> /var/www/html/date.txt' disabled=yes"
192.168.0.166 | CHANGED => {
    "changed": true,
    "envs": [],
    "jobs": [
        "job-datetime"
    ]
}

# 验证是否关闭定时任务，这里的结果是把定时任务配置注释了
[root@ecs-kunpeng-0001 ~]# ansible cache -m shell -a "crontab -l"192.168.0.166 | CHANGED | rc=0 >>
#Ansible: job-datetime
#*/2 * * * * date >> /var/www/html/date.txt
```

借助 `Ansible` 这些常用模块，执行基本的命令，可以实现对服务集群的简单管理；如果需要执行稍微复杂的运维任务，则可以通过 `Playbook` 来完成。

### Reference

* [https://docs.ansible.com/ansible/latest/index.html](https://docs.ansible.com/ansible/latest/index.html)

* [https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html](https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html)

* [华为官方镜像rpm](https://mirrors.huaweicloud.com/openeuler/openEuler-20.03-LTS/everything/aarch64/Packages/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
