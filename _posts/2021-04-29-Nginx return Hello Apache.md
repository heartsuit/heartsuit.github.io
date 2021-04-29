---
layout: post
title: Nginx反向代理网站，不带www访问域名，竟然返回了Hello Apache!
tags: Nginx, Ubuntu
---

### 背景

启动 `Web` 服务，配置好 `Nginx` 后，刷新配置，通过域名 `abc.com` 访问（没有写 `www` ），竟然返回了 `Hello Apache!` 。。

* 系统版本

``` bash
root@iZuf69c5h89bkzv0aqfm8lZ:~# cat /proc/version
Linux version 4.4.0-62-generic (buildd@lcy01-30) (gcc version 5.4.0 20160609 (Ubuntu 5.4.0-6ubuntu1~16.04.4) ) #83-Ubuntu SMP Wed Jan 18 14:10:15 UTC 2017
```

* Nginx 配置

``` conf
server {
        listen 80;
        server_name www.abc.com;
        location / {
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header Host $http_host;
                proxy_pass http://127.0.0.1:8888;
        }
}
```

### 分析问题

以前也没有用过 `Apache` ，只是知道曾经的 `httpd` 作为 `HTTP` 服务器风靡一时，

``` bash
# 第一反应，难道有个Apache在运行？
root@iZuf69c5h89bkzv0aqfm8lZ:~# apache -v
-bash: apache: command not found

# 检查了下Nginx的默认页面，没毛病
root@iZuf69c5h89bkzv0aqfm8lZ:~# cat /usr/share/nginx/html/index.html
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>

# 继续查找httpd或者apache，到这里仍一无所获
root@iZuf69c5h89bkzv0aqfm8lZ:~# which httpd
root@iZuf69c5h89bkzv0aqfm8lZ:~# whereis httpd
httpd:

# 继续查找httpd或者apache，此时发现有个与apache相关的已安装的软件包，哦~ 原来是apache2
root@iZuf69c5h89bkzv0aqfm8lZ:~# dpkg -l | grep httpd
root@iZuf69c5h89bkzv0aqfm8lZ:~# dpkg -l | grep apache
ii  apache2                            2.4.18-2ubuntu3.5                   amd64        Apache HTTP Server
ii  apache2-bin                        2.4.18-2ubuntu3.5                   amd64        Apache HTTP Server (modules and other binary files)
ii  apache2-data                       2.4.18-2ubuntu3.5                   all          Apache HTTP Server (common files)
ii  apache2-utils                      2.4.18-2ubuntu3.5                   amd64        Apache HTTP Server (utility programs for web servers)

# 随手在网上查了下，原来httpd改名为apache2了
root@iZuf69c5h89bkzv0aqfm8lZ:~# which apache2
/usr/sbin/apache2

# 查看apache2版本信息，这台主机也比较久远了，应该是随着Ubuntu系统安装的
root@iZuf69c5h89bkzv0aqfm8lZ:~# apache2 -v
Server version: Apache/2.4.18 (Ubuntu)
Server built:   2017-09-18T15:09:02

# 而且，apache2还是开机自启的
root@iZuf69c5h89bkzv0aqfm8lZ:~# systemctl is-enabled apache2
apache2.service is not a native service, redirecting to systemd-sysv-install
Executing /lib/systemd/systemd-sysv-install is-enabled apache2
enabled

# 经过了解，apache2有个管理工具apachectl，找下它的位置
root@iZuf69c5h89bkzv0aqfm8lZ:~# which apachectl
/usr/sbin/apachectl

# 查看这个文件的内容，可找到关于HTTPD的启动文件路径的一行配置
root@iZuf69c5h89bkzv0aqfm8lZ:~# less /usr/sbin/apachectl
# the path to your httpd binary, including options if necessary
HTTPD=${APACHE_HTTPD:-/usr/sbin/apache2}

# 那么，返回的‘Hello Apache!’到底是从哪里来的？在目录/var/www/html下有个index.html
root@iZuf69c5h89bkzv0aqfm8lZ:~# cat /var/www/html/index.html 
Hello Apache!
```

### 解决方法

可在 `Nginx` 中的 `server_name` 处同时配置多个域名：

``` conf
server {
        listen 80;
        server_name www.abc.com abc.com;
        location / {
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header Host $http_host;
                proxy_pass http://127.0.0.1:8888;
        }
}
```

刷新，记得重新加载 `Nginx` 的配置：

``` bash
root@iZuf69c5h89bkzv0aqfm8lZ:~# nginx -s reload
```

### 一些扩展

这里以顶级域名 `abc.com` 为例说明A记录中@, www, *等几种域名解析的区别：

| 解析         | 说明       | 访问 |
| ------------ | ------ | --------------------- |
| abc.com      | 顶级域名 |                       | 
| www.abc.com  | 二级域名解析，www是一种特殊的二级域名   | www.abc.com   |
| @.abc.com    | 主域名解析，不带主机名的解析 | abc.com                  |
| *.abc.com    | 泛域名解析，可解析所有的二级域名| ok.abc.com, 1.abc.com等|

Notes: 注意浏览器缓存，最好清除浏览器缓存，或者用一个新的浏览器进行测试，否则，浏览器会自动跳转。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
