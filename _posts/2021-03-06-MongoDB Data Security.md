---
layout: post
title: 我的MongoDB数据被黑客删库了，还勒索要支付比特币赎回
tags: MongoBD
---

### 背景

每当看到新闻说谁谁家服务又被黑客攻击了，谁家的数据又泄露了，基本上有一瞬间在脑海里会感受到“嗯，安全挺重要的”。讲真， `MongoDB` 数据泄露也已经是老生常谈了，然而，当这种事发生在自己身上的时候，这时的感觉还是很微妙的（岁月静好，突然！你的数据就没了(╥╯^╰╥)看似风平浪静，实则波诡云谲，暗流涌动），切身体会，心痛呀，对世上是否存在感同身受表示怀疑。。

事情是这样的：前两天在一台云服务器上安装了 `MongoDB` ，为了方便测试，开放了默认的 `27017` 端口，并配置了可通过远程主机连接，也没有对任何库设置任何的认证授权。然后，事情便发生了，有人将数据库删除，并且创建了一个名为 `RREAD_ME_TO_RECOVER_YOUR_DATA` 的新数据库，里面有个叫 `README` 的 `Collection` 。

### 勒索

看下黑客的手段：

> All your data is a backed up. You must pay 0.015 BTC to 1TvCTpihDcmEjs9weTeKyruYYEY6n5xCB 48 hours for recover it. After 48 hours expiration we will leaked and exposed all your data. In case of refusal to pay, we will contact the General Data Protection Regulation, GDPR and notify them that you store user data in an open form and is not safe. Under the rules of the law, you face a heavy fine or arrest and your base dump will be dropped from our server! You can buy bitcoin here, does not take much time to buy https://localbitcoins.com with this guide https://localbitcoins.com/guides/how-to-buy-bitcoins After paying write to me in the mail with your DB IP: allmydataback@cock.li and you will receive a link to download your database dump.

向指定账户支付比特币赎回数据，嗯，基本就是这样了，现在看来前面的操作就是在互联网上裸奔哪，不过，好在这次只是测试数据（就一个数据库，一张表，三五条数据），无所谓了；可如果是公司商业数据库这样被搞，那损失就大了，细思极恐。。

截止发文时：2021-3-6 16:43:04，比特币实时行情：

![2021-03-06-Bitcoin](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-03-06-Bitcoin)

### 分析

其实，这次的数据丢失/泄露，并不是说 `MongoDB` 本身有什么问题，而是安全意识淡薄（同样，Redis, ElasticSearch若以默认的配置暴露在互联网上，也面临同样的问题），没有任何防御措施，所以，这里黑客根本都不需要进行多复杂的攻击，直接扫描IP:27017端口，进行连接、查询、删库即可。

以下是事后查询 `MongoDB` 日志得到的部分访问信息：

``` json
{"t":{"$date":"2021-03-02T08:24:19.868+08:00"},"s":"I",  "c":"NETWORK",  "id":22943,   "ctx":"listener","msg":"Connection accepted","attr":{"remote":"51.75.144.43:46064","connectionId":2480072,"connectionCount":9}}
{"t":{"$date":"2021-03-02T08:24:20.044+08:00"},"s":"I",  "c":"NETWORK",  "id":51800,   "ctx":"conn2480072","msg":"client metadata","attr":{"remote":"51.75.144.43:46064","client":"conn2480072","doc":{"driver":{"name":"PyMongo","version":"3.11.2"},"os":{"type":"Linux","name":"Linux","architecture":"x86_64","version":"5.4.0-66-generic"},"platform":"CPython 3.8.5.final.0"}}}
{"t":{"$date":"2021-03-02T08:24:20.557+08:00"},"s":"I",  "c":"NETWORK",  "id":22943,   "ctx":"listener","msg":"Connection accepted","attr":{"remote":"51.75.144.43:46778","connectionId":2480073,"connectionCount":10}}
{"t":{"$date":"2021-03-02T08:24:20.699+08:00"},"s":"I",  "c":"NETWORK",  "id":22943,   "ctx":"listener","msg":"Connection accepted","attr":{"remote":"51.75.144.43:46938","connectionId":2480074,"connectionCount":11}}
{"t":{"$date":"2021-03-02T08:24:20.732+08:00"},"s":"I",  "c":"NETWORK",  "id":51800,   "ctx":"conn2480073","msg":"client metadata","attr":{"remote":"51.75.144.43:46778","client":"conn2480073","doc":{"driver":{"name":"PyMongo","version":"3.11.2"},"os":{"type":"Linux","name":"Linux","architecture":"x86_64","version":"5.4.0-66-generic"},"platform":"CPython 3.8.5.final.0"}}}
{"t":{"$date":"2021-03-02T08:24:20.877+08:00"},"s":"I",  "c":"NETWORK",  "id":51800,   "ctx":"conn2480074","msg":"client metadata","attr":{"remote":"51.75.144.43:46938","client":"conn2480074","doc":{"driver":{"name":"PyMongo","version":"3.11.2"},"os":{"type":"Linux","name":"Linux","architecture":"x86_64","version":"5.4.0-66-generic"},"platform":"CPython 3.8.5.final.0"}}}
{"t":{"$date":"2021-03-02T08:24:21.420+08:00"},"s":"I",  "c":"COMMAND",  "id":20337,   "ctx":"conn2480073","msg":"dropDatabase - starting","attr":{"db":"RREAD_ME_TO_RECOVER_YOUR_DATA"}}
{"t":{"$date":"2021-03-02T08:24:21.420+08:00"},"s":"I",  "c":"COMMAND",  "id":20338,   "ctx":"conn2480073","msg":"dropDatabase - dropping collection","attr":{"db":"RREAD_ME_TO_RECOVER_YOUR_DATA","namespace":"RREAD_ME_TO_RECOVER_YOUR_DATA.RREADME"}}
{"t":{"$date":"2021-03-02T08:24:21.423+08:00"},"s":"I",  "c":"COMMAND",  "id":20336,   "ctx":"conn2480073","msg":"dropDatabase","attr":{"db":"RREAD_ME_TO_RECOVER_YOUR_DATA","numCollectionsDropped":1}}
{"t":{"$date":"2021-03-02T08:24:21.768+08:00"},"s":"I",  "c":"COMMAND",  "id":20337,   "ctx":"conn2480073","msg":"dropDatabase - starting","attr":{"db":"config"}}
{"t":{"$date":"2021-03-02T08:24:21.768+08:00"},"s":"I",  "c":"COMMAND",  "id":20338,   "ctx":"conn2480073","msg":"dropDatabase - dropping collection","attr":{"db":"config","namespace":"config.system.sessions"}}
{"t":{"$date":"2021-03-02T08:24:21.789+08:00"},"s":"I",  "c":"COMMAND",  "id":20336,   "ctx":"conn2480073","msg":"dropDatabase","attr":{"db":"config","numCollectionsDropped":1}}
{"t":{"$date":"2021-03-02T08:24:22.132+08:00"},"s":"I",  "c":"STORAGE",  "id":20320,   "ctx":"conn2480073","msg":"createCollection","attr":{"namespace":"RREAD_ME_TO_RECOVER_YOUR_DATA.RREADME","uuidDisposition":"generated","uuid":{"uuid":{"$uuid":"1f0b87f8-ba8f-476b-94cc-8d80796b64bc"}},"options":{}}}
{"t":{"$date":"2021-03-02T08:24:22.147+08:00"},"s":"I",  "c":"INDEX",    "id":20345,   "ctx":"conn2480073","msg":"Index build: done building","attr":{"buildUUID":null,"namespace":"RREAD_ME_TO_RECOVER_YOUR_DATA.RREADME","index":"_id_","commitTimestamp":{"$timestamp":{"t":0,"i":0}}}}
{"t":{"$date":"2021-03-02T08:24:22.487+08:00"},"s":"I",  "c":"NETWORK",  "id":22944,   "ctx":"conn2480073","msg":"Connection ended","attr":{"remote":"51.75.144.43:46778","connectionId":2480073,"connectionCount":10}}
{"t":{"$date":"2021-03-02T08:24:22.886+08:00"},"s":"I",  "c":"NETWORK",  "id":22944,   "ctx":"conn2480074","msg":"Connection ended","attr":{"remote":"51.75.144.43:46938","connectionId":2480074,"connectionCount":9}}
{"t":{"$date":"2021-03-02T08:24:22.886+08:00"},"s":"I",  "c":"-",        "id":20883,   "ctx":"conn2480072","msg":"Interrupted operation as its client disconnected","attr":{"opId":42096260}}
{"t":{"$date":"2021-03-02T08:24:22.886+08:00"},"s":"I",  "c":"NETWORK",  "id":22944,   "ctx":"conn2480072","msg":"Connection ended","attr":{"remote":"51.75.144.43:46064","connectionId":2480072,"connectionCount":8}}
```

可见，利用 `Python` 脚本进行自动化扫描；从连接建立到断开，耗时3秒；IP：51.75.144.43，来源：法国上法兰西鲁贝。

![2021-03-06-IP.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-03-06-IP.png)

### 措施

虽说安全防护“道高一尺，魔高一丈”，安全意识一定要有，防患于未然，不要等到数据安全事故发生在自己身上才喊疼，有时候，这责任承担不起。关于 `MongoDB` 基本的防护可考虑以下措施：

1. 屏蔽端口（生产环境下建议，屏蔽端口+权限控制：仅限内网访问+访问鉴权）；
2. 更换端口；
3. 白名单访问；
4. 开启认证鉴权；
5. 最次，数据库备份还是要有的o(╯□╰)o

关于 `MongoDB` 数据备份、开启认证、权限控制可参考[这篇文章](https://heartsuit.blog.csdn.net/article/details/83415756)。

### Reference

[Ubuntu下安装使用MongoDB](https://heartsuit.blog.csdn.net/article/details/83415756)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
