---
layout: post
title: 使用bcryptjs对密码加密时，其校验原理是怎样的？
tags: Node.js
---
### Question
刚开始接触这种加密方式，而又对加密原理不了解时，很容易产生这种疑问：

> 对一个密码，[bcryptjs](https://www.npmjs.com/package/bcryptjs)每次生成的hash都不一样，那么它是如何进行校验的？

### Basic verification
1. 虽然对同一个密码，每次生成的hash不一样，但是hash中包含了salt（hash产生过程：先随机生成salt，salt跟password进行hash）；
2. 在下次校验时，从hash中取出salt，salt跟password进行hash；得到的结果跟保存在DB中的hash进行比对，compareSync中已经实现了这一过程：bcrypt.compareSync(password, hashFromDB);

### Let Code tell you
``` javascript
const bcrypt = require('bcryptjs');

const password = "123";

// Step1: Generate Hash
// salt is different everytime, and so is hash
let salt = bcrypt.genSaltSync(10);// 10 is by default
console.log(salt);//$2a$10$TnJ1bdJ3JIzGZC/jVS.v3e
let hash = bcrypt.hashSync(password, salt); // salt is inclued in generated hash 
console.log(hash);//$2a$10$TnJ1bdJ3JIzGZC/jVS.v3eXlr3ns0hDxeRtlia0CPQfLJVaRCWJVS

// Step2: Verify Password
// when verify the password, get the salt from hash, and hashed again with password
let saltFromHash = hash.substr(0, 29);
console.log(saltFromHash);//$2a$10$TnJ1bdJ3JIzGZC/jVS.v3e
let newHash = bcrypt.hashSync(password, saltFromHash);
console.log(newHash);//$2a$10$TnJ1bdJ3JIzGZC/jVS.v3eXlr3ns0hDxeRtlia0CPQfLJVaRCWJVS
console.log(hash === newHash); //true

// back end compare
console.log(bcrypt.compareSync(password, hash)); //true
```

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***