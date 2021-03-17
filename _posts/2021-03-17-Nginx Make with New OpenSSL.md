---
layout: post
title: openssl版本升级后，Nginx用的还是旧版的openssl
tags: Nginx
---

### 背景

我只是想简单的配置下 `HTTP2` ，没想到竟掉到了坑里。。应该是版本较旧的原因，在重新编译 `Nginx` 时遇到不少问题，这里做个记录。

在上一篇[Nginx配置开启HTTP2支持](https://heartsuit.blog.csdn.net/article/details/114905554)中已经升级了 `OpenSSL` ，但是查看 `Nginx` 版本信息后，发现还是用的旧版 `OpenSSL` ，此时，需要重新编译 `Nginx` 。

![2021-03-16-OpenSSL.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-03-16-OpenSSL.png)

### 环境

[root@ecs-zfdevops-0001 nginx-1.10.2]$ cat /etc/redhat-release
CentOS release 6.10 (Final)

Nginx版本：1.10.2

### 重新编译Nginx

下面，我们就一步步进行**带电操作**，实现运行中的Nginx的重新编译与替换，这里有需要注意的点：

1. 如果之前使用的是源码编译安装的Nginx，则可以直接找到并进入到原来Nginx的源码目录进行操作；
2. 而我当初安装Nginx时，不是用的源码安装。。那么需要先下载对应版本的Nginx，然后进行编译操作。

下载对应版本的Nginx：为避免出现问题，这里下载Nginx时，选择与现有Nginx同样的版本：Nginx官方下载地址：http://nginx.org/en/download.html

``` bash
# 查看Nginx当前配置信息，记下结果，后续步骤需使用
[root@ecs-zfdevops-0001 ~]# nginx -V
nginx version: nginx/1.10.2
built by gcc 4.4.7 20120313 (Red Hat 4.4.7-17) (GCC) 
built with OpenSSL 1.0.1e-fips 11 Feb 2013
TLS SNI support enabled
configure arguments: --prefix=/usr/share/nginx --sbin-path=/usr/sbin/nginx --modules-path=/usr/lib64/nginx/modules --conf-path=/etc/nginx/nginx.conf --error-log-path=/var/log/nginx/error.log --http-log-path=/var/log/nginx/access.log --http-client-body-temp-path=/var/lib/nginx/tmp/client_body --http-proxy-temp-path=/var/lib/nginx/tmp/proxy --http-fastcgi-temp-path=/var/lib/nginx/tmp/fastcgi --http-uwsgi-temp-path=/var/lib/nginx/tmp/uwsgi --http-scgi-temp-path=/var/lib/nginx/tmp/scgi --pid-path=/var/run/nginx.pid --lock-path=/var/lock/subsys/nginx --user=nginx --group=nginx --with-file-aio --with-ipv6 --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_addition_module --with-http_xslt_module=dynamic --with-http_image_filter_module=dynamic --with-http_geoip_module=dynamic --with-http_sub_module --with-http_dav_module --with-http_flv_module --with-http_mp4_module --with-http_gunzip_module --with-http_gzip_static_module --with-http_random_index_module --with-http_secure_link_module --with-http_degradation_module --with-http_slice_module --with-http_stub_status_module --with-http_perl_module=dynamic --with-mail=dynamic --with-mail_ssl_module --with-pcre --with-pcre-jit --with-stream=dynamic --with-stream_ssl_module --with-debug --with-cc-opt='-O2 -g -pipe -Wall -Wp,-D_FORTIFY_SOURCE=2 -fexceptions -fstack-protector --param=ssp-buffer-size=4 -m64 -mtune=generic' --with-ld-opt=' -Wl,-E'

# 切换至计划下载的目录
[root@ecs-zfdevops-0001 ~]$ cd /opt

# 下载对应版本的Nginx
[root@ecs-zfdevops-0001 opt]$ wget http://nginx.org/download/nginx-1.10.2.tar.gz

# 解压
[root@ecs-zfdevops-0001 opt]$ tar -xvf nginx-1.10.2.tar.gz

# 进入解压目录
[root@ecs-zfdevops-0001 opt]$ cd nginx-1.10.2

# 指定新版的的OpenSSL解压目录（这里是--with-openssl=/root/openssl-1.0.2r），配置Nginx，这时需要附带第一步(nginx -V)的结果信息
[root@ecs-zfdevops-0001 nginx-1.10.2]$ ./configure --prefix=/usr/share/nginx --sbin-path=/usr/sbin/nginx --modules-path=/usr/lib64/nginx/modules --conf-path=/etc/nginx/nginx.conf --error-log-path=/var/log/nginx/error.log --http-log-path=/var/log/nginx/access.log --http-client-body-temp-path=/var/lib/nginx/tmp/client_body --http-proxy-temp-path=/var/lib/nginx/tmp/proxy --http-fastcgi-temp-path=/var/lib/nginx/tmp/fastcgi --http-uwsgi-temp-path=/var/lib/nginx/tmp/uwsgi --http-scgi-temp-path=/var/lib/nginx/tmp/scgi --pid-path=/var/run/nginx.pid --lock-path=/var/lock/subsys/nginx --user=nginx --group=nginx --with-file-aio --with-ipv6 --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_addition_module --with-http_xslt_module=dynamic --with-http_image_filter_module=dynamic --with-http_geoip_module=dynamic --with-http_sub_module --with-http_dav_module --with-http_flv_module --with-http_mp4_module --with-http_gunzip_module --with-http_gzip_static_module --with-http_random_index_module --with-http_secure_link_module --with-http_degradation_module --with-http_slice_module --with-http_stub_status_module --with-http_perl_module=dynamic --with-mail=dynamic --with-mail_ssl_module --with-pcre --with-pcre-jit --with-stream=dynamic --with-stream_ssl_module --with-debug --with-cc-opt='-O2 -g -pipe -Wall -Wp,-D_FORTIFY_SOURCE=2 -fexceptions -fstack-protector --param=ssp-buffer-size=4 -m64 -mtune=generic' --with-ld-opt=' -Wl,-E' --with-openssl=/root/openssl-1.0.2r

# 第一个报错：./configure: error: the HTTP rewrite module requires the PCRE library.
# 解决：
[root@ecs-zfdevops-0001 nginx-1.10.2]$ yum -y install pcre-devel

# 再次执行 ./configure --prefix=。。。那条指令
# 第二个报错：./configure: error: the HTTP gzip module requires the zlib library.
# 解决：
[root@ecs-zfdevops-0001 nginx-1.10.2]$ yum -y install zlib-devel

# 再次执行 ./configure --prefix=。。。那条指令
# 第三个报错：./configure: error: the HTTP XSLT module requires the libxml2/libxslt
# 解决：
[root@ecs-zfdevops-0001 nginx-1.10.2]$ yum -y install libxml2 libxml2-dev
[root@ecs-zfdevops-0001 nginx-1.10.2]$ yum -y install libxslt-devel

# 再次执行 ./configure --prefix=。。。那条指令
# 第四个报错：./configure: error: the HTTP image filter module requires the GD library.
# 解决：
[root@ecs-zfdevops-0001 nginx-1.10.2]$ yum -y install gd-devel

# 再次执行 ./configure --prefix=。。。那条指令
# 第五个报错：./configure: error: perl module ExtUtils::Embed is required
# 解决：
[root@ecs-zfdevops-0001 nginx-1.10.2]$ yum -y install perl-devel perl-ExtUtils-Embed

# 再次执行 ./configure --prefix=。。。那条指令
# 第六个报错：./configure: error: the GeoIP module requires the GeoIP library.
# 解决：
[root@ecs-zfdevops-0001 nginx-1.10.2]$ yum -y install GeoIP GeoIP-devel GeoIP-data

# 再次执行 ./configure --prefix=。。。那条指令，正常，无错误信息~

# 编译Nginx
[root@ecs-zfdevops-0001 nginx-1.10.2]$ make

# 找见之前Nginx的位置
[root@ecs-zfdevops-0001 nginx-1.10.2]$ which nginx
/usr/sbin/nginx

# 备份旧版的Nginx
[root@ecs-zfdevops-0001 nginx-1.10.2]$ cp /usr/sbin/nginx /usr/sbin/nginx.back

# 将新编译生成的objs目录（此处完整路径：/opt/nginx-1.10.2/objs）下的Nginx复制替换旧版Nginx
[root@ecs-zfdevops-0001 nginx-1.10.2]$ cp ./objs/nginx /usr/sbin/nginx
cp: 无法创建普通文件"/usr/sbin/nginx": 文本文件忙

# 上一步报错了，因为Nginx还在运行，那么先停止
[root@ecs-zfdevops-0001 nginx-1.10.2]$ nginx -s stop

# 再次复制替换
[root@ecs-zfdevops-0001 nginx-1.10.2]$ cp ./objs/nginx /usr/sbin/nginx

# 启动Nginx
[root@ecs-zfdevops-0001 nginx-1.10.2]$ nginx

# 检查Nginx使用的OpenSSL版本是否已经更新
[root@ecs-zfdevops-0001 nginx-1.10.2]$ nginx -V
nginx version: nginx/1.10.2
built by gcc 4.4.7 20120313 (Red Hat 4.4.7-23) (GCC) 
built with OpenSSL 1.0.2r  26 Feb 2019
TLS SNI support enabled
configure arguments: --prefix=/usr/share/nginx --sbin-path=/usr/sbin/nginx --modules-path=/usr/lib64/nginx/modules --conf-path=/etc/nginx/nginx.conf --error-log-path=/var/log/nginx/error.log --http-log-path=/var/log/nginx/access.log --http-client-body-temp-path=/var/lib/nginx/tmp/client_body --http-proxy-temp-path=/var/lib/nginx/tmp/proxy --http-fastcgi-temp-path=/var/lib/nginx/tmp/fastcgi --http-uwsgi-temp-path=/var/lib/nginx/tmp/uwsgi --http-scgi-temp-path=/var/lib/nginx/tmp/scgi --pid-path=/var/run/nginx.pid --lock-path=/var/lock/subsys/nginx --user=nginx --group=nginx --with-file-aio --with-ipv6 --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_addition_module --with-http_xslt_module=dynamic --with-http_image_filter_module=dynamic --with-http_geoip_module=dynamic --with-http_sub_module --with-http_dav_module --with-http_flv_module --with-http_mp4_module --with-http_gunzip_module --with-http_gzip_static_module --with-http_random_index_module --with-http_secure_link_module --with-http_degradation_module --with-http_slice_module --with-http_stub_status_module --with-http_perl_module=dynamic --with-mail=dynamic --with-mail_ssl_module --with-pcre --with-pcre-jit --with-stream=dynamic --with-stream_ssl_module --with-debug --with-cc-opt='-O2 -g -pipe -Wall -Wp,-D_FORTIFY_SOURCE=2 -fexceptions -fstack-protector --param=ssp-buffer-size=4 -m64 -mtune=generic' --with-ld-opt=' -Wl,-E' --with-openssl=/root/openssl-1.0.2r
```

![2021-03-17-UpdateOpenSSL.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-03-17-UpdateOpenSSL.png)

呼~~终于成功了，可以继续Nginx关于HTTP2的配置了。

Note：上述操作一定要谨慎小心，一不小心就错了，可能导致Nginx不可用，建议提前做好配置文件备份😊

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
