---
layout: post
title: Win7下搭建Jekyll
tags: Jekyll
---
## Win7下搭建Jekyll

- 看到好多做的超赞的Blog，自己也想通过Jekyll折腾一下，搞出一个自己的小型blog。然而这个过程可谓举步维艰，各种错误乱冒，这里将摸索后（也参考了不少资料）的正确的安装方法记录下来。

## 安装步骤
- 安装Ruby
- 安装DevKit
- 安装Jekyll
- 安装Pygments
	

### 安装Ruby
- Ruby [下载地址](http://rubyinstaller.org/downloads/);
- 安装，勾选"Add Ruby executables to your PATH";
- 完成后,cd到ruby的安装目录（我这里是/g/ruby22），打开命令行工具检测Ruby是否安装成功`ruby -v`;

	输出ruby 2.2.2p95 (2015-04-13 revision 50295) [x64-mingw32]表明成功安装；这时，默认gem也会被安装，可以输入`gem -v`，进行测试，若输出版本号，表明成功。

此时若直接执行`gem install jekyll`安装jekyll，一般情况下（未翻墙时）会出现

	ERROR:  While executing gem ... (Gem::RemoteFetcher::FetchError)
	    Errno::ECONNRESET: An existing connection was forcibly closed by the remote
	host. - SSL_connect (https://api.rubygems.org/quick/Marshal.4.8/jekyll-2.5.3.ge
	spec.rz)
这主要是由于国内访问时受到限制，解决办法是采用ruby在国内的镜像,[Reference:](http://ruby.taobao.org/)

	server@SERVER-PC /g/ruby22
	$ gem sources --remove https://rubygems.org/
	https://rubygems.org/ removed from sources

	server@SERVER-PC /g/ruby22
	$ gem sources -a http://ruby.taobao.org/
	http://ruby.taobao.org/ added to sources

	Or(http://ruby.taobao.org/，已失效)
    $ gem sources -a http://rubygems.org/
    https://rubygems.org is recommended for security over http://rubygems.org/

    Do you want to add this insecure source? [yn]  y
    http://rubygems.org/ added to sources

	Test:
    $ gem sources -l
    *** CURRENT SOURCES ***

    http://rubygems.org/

	server@SERVER-PC /g/ruby22
	$ gem install jekyll
	Fetching: fast-stemmer-1.0.2.gem (100%)
	ERROR:  Error installing jekyll:
	        The 'fast-stemmer' native gem requires installed build tools.
	Please update your PATH to include build tools or download the DevKit
	from 'http://rubyinstaller.org/downloads' and follow the instructions
	at 'http://github.com/oneclick/rubyinstaller/wiki/Development-Kit'
遗憾的是，又报错了，提示是缺少build tools，下面安装DevKit。

### 安装DevKit
- DevKit [下载地址](http://rubyinstaller.org/downloads/);
- 解压，eg：G:\DevKit
- cd 到DevKit，输入`ruby dk.rb init`, 然后到DevKit下生成的config.yml 内添加一行`- G:/ruby22`,保存；
- 输入`ruby dk.rb install`
	[INFO] Updating convenience notice gem override for 'G:/Ruby22'
	[INFO] Installing 'G:/Ruby22/lib/ruby/site_ruby/devkit.rb'

### 安装jekyll
在命令行输入`gem install jekyll`,输出如下（仅为部分结果）

	Temporarily enhancing PATH to include DevKit...
	Building native extensions.  This could take a while...
	Successfully installed fast-stemmer-1.0.2
	Fetching: classifier-reborn-2.0.3.gem (100%)
	Successfully installed classifier-reborn-2.0.3
	……
	31 gems installed

### 运行jekyll new blog报错：
      Dependency Error: Yikes! It looks like you don't have bundler or one of its de
    pendencies installed. In order to use Jekyll as currently configured, you'll nee
    d to install this gem. The full error message from Ruby is: 'cannot load such fi
    le -- bundler' If you run into trouble, you can find helpful resources at https:
    //jekyllrb.com/help/!

    运行以下命令，安装bundler
    $ gem install bundler

至此，jekyll已经成功安装，如果不要求代码高亮的话（要实现代码高亮，需要进行下一步Python以及pygments的安装），就可以直接创建一个blog了。依次输入以下语句：
	jekyll new blog
	cd blog
	jekyll serve 			
可以到浏览器中，输入localhost:4000（或者127.0.0.1:4000）查看效果，对于生成的各个文件可以参考[Jekyll 说明文档](http://jekyllrb.com/docs/quickstart/)。自己对文件修改保存后，可以实时在本机4000端口看到效果，调试完成后，可以上传托管到Github上（这个网上资料很多），这样，就拥有了自己的mini blog。

*Note:* 当Jekyll版本不对应时，键入命令：bundle exec jekyll serve

### 运行bundle exec jekyll serve报错：
	Liquid Exception: SSL_connect returned=1 errno=0 state=SSLv3 read server certi
	ficate B: certificate verify failed in /_layouts/post.html

	Solution: http://stackoverflow.com/questions/37717131/jekyll-gives-an-regenerating-error-when-i-try-saving-codes-again


### 安装Pygments
我实现代码高亮用的是Google Code Prettify，所以并没有装pygments。
可以参考[http://havee.me/internet/2013-08/support-pygments-in-jekyll.html](http://havee.me/internet/2013-08/support-pygments-in-jekyll.html)进行安装。

以上是安装jekyll出现的一系列问题以及解决方法，出错了先看错误的提示，想办法找出原因。我的blog 地址：[Heartsuit's blog](http://heartsuit.github.io/), ~~fork自 [Peiwen Lu](https://github.com/P233/3-Jekyll)，自己做了一些小改动，感谢原作者！~~现在新的站点主题为jekyll-theme-midnight，基本样式没做修改，稍加了部分功能。

### References：
- [http://blog.csdn.net/kong5090041/article/details/38408211](http://blog.csdn.net/kong5090041/article/details/38408211)
- [http://doc.okbase.net/itmyhome/archive/119189.html](http://doc.okbase.net/itmyhome/archive/119189.html)
- [http://playingfingers.com/2016/03/26/build-a-blog/#jekyll-1](http://playingfingers.com/2016/03/26/build-a-blog/#jekyll-1)