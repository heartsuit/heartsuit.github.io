---
layout: post
title: 信创环境下RSA解密时的中文字符乱码问题
tags: RSA, Serurity
---

## 背景

我们系统对系统的用户名与密码进行了 `RSA` 加密传输，一开始出现的问题是：

* 在服务器上英文用户名正常登录；而使用包含中文的用户名时系统提示不存在用户；
* 在本地开发环境下不论用户名中是否包含中文字符，都可以正常登录；可一到了服务器环境下，包含中文的用户名登录时就出现用户不存在的问题。

![2022-09-12-RSADecryptError.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-09-12-RSADecryptError.jpg)

## 修改前的解密方法

```java
    public static String decrypt(String str, String privateKey) {
        try {
            //64位解码加密后的字符串
            byte[] inputByte = Base64.decodeBase64(str.getBytes("UTF-8"));
            //base64编码的私钥
            byte[] decoded = Base64.decodeBase64(privateKey);
            RSAPrivateKey priKey = (RSAPrivateKey) KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(decoded));
            //RSA解密
            Cipher cipher = Cipher.getInstance("RSA");
            cipher.init(Cipher.DECRYPT_MODE, priKey);
            String outStr = new String(cipher.doFinal(inputByte));
            return outStr;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
```

## 修改后的解密方法

```java
    public static String decrypt(String str, String privateKey) {
        try {
            //64位解码加密后的字符串
            byte[] inputByte = Base64.decodeBase64(str.getBytes(StandardCharsets.UTF_8));
            //base64编码的私钥
            byte[] decoded = Base64.decodeBase64(privateKey);
            RSAPrivateKey priKey = (RSAPrivateKey) KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(decoded));
            //RSA解密
            Cipher cipher = Cipher.getInstance("RSA");
            cipher.init(Cipher.DECRYPT_MODE, priKey);
            return new String(cipher.doFinal(inputByte), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
```

关键是解密返回前的这行代码： `String outStr = new String(cipher.doFinal(inputByte));return outStr;` 改为了 `return new String(cipher.doFinal(inputByte), StandardCharsets.UTF_8);` ；即在解密时的编码一定要指定字符集 `UTF-8` ，否则会导致在不同的服务器操作系统环境下解密编码的不确定性。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
