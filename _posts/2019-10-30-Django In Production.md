---
layout: post
title: 开发环境方式启动Django，一段时间后应用没响应了。。
tags: Django
---

### Problem

上次在线上部署了 `Django` 项目，原本以为通过 `python manage.py runserver 0.0.0.0:8000` 启动项目就完成了Django的部署，那可真是太天真了。。

这个项目作为独立的服务，单独部署在另外一台服务器上，过了一段时间，测试反映这个项目访问不到内容，到线上查看服务正常启动，但是就是没有响应，然后就重启了。。经过两三次这样的过程，才意识到部署可能有问题😢😢

### Solution

其实将开发环境的启动方式应用到了生产环境，先解决问题。

* 安装配置 `uwsgi` 

Django的文档这样介绍 `uwsgi` ：

    uWSGI is a fast, self-healing and developer/sysadmin-friendly application container server coded in pure C.

`pip install uwsgi` 

`uwsgi --version` 

* 在项目根目录创建 `uwsgi.ini` 

`vi uwsgi.ini` 

``` ini
[uwsgi]
chdir=/opt/hua #项目目录
http=0.0.0.0:8000
wsgi-file=/opt/hua/hua/wsgi.py #uwsgi路径
processes=4
threads=2
master=true
vacum=true
pidfile=/opt/hua/uwsgi.pid #进程id文件路径，自动生成，可用于控制项目启停
daemonize=/opt/hua/uwsgi.log #日志文件路径
module=hua.wsgi
```

Notes：

1. 上述方式配置以http启动，如果以https方式启动项目，需要配置： `https=0.0.0.0:8000, /opt/cert/certfile.crt, /opt/cert/keyfile.key` ；
2. 当然，https访问项目，还需要 `django-sslserver` ；

* 控制项目启停

进入uwsgi.ini所在目录

``` bash
uwsgi --ini uwsgi.ini # 启动
uwsgi --stop uwsgi.pid # 停止
uwsgi --reload uwsgi.pid # 重启
killall -8 uwsgi # 强制停止
```

### Analysis

**那么问题来了，在生产环境可以使用 `python manage.py runserver 0.0.0.0:8000` 来启动项目吗？**

答案：可以用来测试，但不建议，即使以`nohup `的方式启动。

### References

* [https://uwsgi-docs.readthedocs.io/en/latest/](https://uwsgi-docs.readthedocs.io/en/latest/)
* [https://wsgi.readthedocs.io/en/latest/what.html](https://wsgi.readthedocs.io/en/latest/what.html)
* [https://docs.djangoproject.com/en/2.2/howto/deployment/](https://docs.djangoproject.com/en/2.2/howto/deployment/)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**

