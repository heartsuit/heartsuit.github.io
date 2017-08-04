---
layout: post
title: Node读写json
tags: Node.js
---
### Node读写json
- 使用require读取JSON；
- 使用fs.writeFile异步写入JSON；
  - `JSON.stringify(jsonObj, null, 2);`后面两个参数仅为了目标文件内容格式相对美观一些；
- 使用fs.readFileSync同步读取JSON；

### JSON 文件内容
``` json
{ "books": [  
  {"name":"秒速五厘米","author":"新海诚","nationality":"日","date":"2017-1-13"},  
  {"name":"一句顶一万句","author":"刘震云","nationality":"中","date":"2017-3-21"},  
  {"name":"人类简史","author":"尤瓦尔·赫拉利","nationality":"以","date":"2017-5-17"},  
  {"name":"Node.js in Action","author":"Mike Cantelon, Marc Harter","nationality":"美","date":"2017-5-31"},  
  {"name":"茶花女","author":"亚历山大·小仲马","nationality":"法","date":"2017-7-8"}
  ]
}
```

### Node 读取、写入
``` javascript
const fs = require('fs');

let jsonFile = './books.json';

// read from json, method1: use require
let jsonObj = require(jsonFile);
console.log(jsonObj);

// add a new one
let book = { "name": "无人生还", "author": "阿加莎·克里斯蒂", "nationality": "英", "date": "2017-7-23" };
jsonObj.books.push(book);

// write to json: use fs.writeFile
fs.writeFile(jsonFile, JSON.stringify(jsonObj, null, 2), (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("JSON saved to " + jsonFile);

    // read from json, method2: use fs.readFileSync
    let jsonObj = JSON.parse(fs.readFileSync(jsonFile));
    console.log(jsonObj);
  }
});
```

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***