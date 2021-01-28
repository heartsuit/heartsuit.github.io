---
layout: post
title: JSON转Markdown：我把阅读数据从MongoDB中导出转换为.md了
tags: Node.js
---

### 背景

前几年（2015~2018）都是手动直接将笔记（不含图书详情：封面、ISBN、出版信息等）发布，看到大家最近都在做自我复盘，今天突然有个想法：把阅读笔记做成 `Markdown` 格式的，这时就需要进行简单的数据处理，即： `JSON` 数据转换为 `Markdown` 。

打开浏览器，在Github直接发现大神们已经造好的轮子：[json2md](https://github.com/IonicaBizau/json2md)。文档一看就明白了，而且最关键的是还可以自行扩展，厉害了！！

![2021-01-28-Json2md.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-01-28-Json2md.png)

### 输入数据源：json文件

![2021-01-28-Web.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-01-28-Web.png)

我平时的读书笔记专门记录在一个小Web网站上，每读完一本书，相关的图书信息、笔记都会录入到 `MongoDB`（数据来源：豆瓣图书爬虫😃），当然，图书的封面目前还是豆瓣的外链。所以先从 `MongoDB` 中导出数据，导出的原始数据长这样：

![2021-01-28-Input.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-01-28-Input.png)

### 转换

> 把大象放进冰箱需要几步？

这个转换例子很简单，但是还是分几个步骤，我们看下过程：

1. 读入input.json，根据需要，选择属性，转为json2md可以接收的格式，生成中间临时文件：temp.json；
2. 读入临时的temp.json文件，通过json2md转换为markdown文本，并输出为output.md。

* book. js

``` js
const fs = require('fs');
const jsonFile = './file/input.json';
const jsonObj = JSON.parse(fs.readFileSync(jsonFile));
const util = require("./utils/util");

// console.log(jsonObj.length);

// 选取属性进行组装
let temp = [];
for (let book of jsonObj) {
    temp.push({
        "seperate": ''
    });

    let image = {
        img: {
            "alt": book.image,
            "source": book.image
        }
    };
    let title = {
        "h3": (book.title + ((book.subtitle.length != 0) ? (":" + book.subtitle) : book.subtitle))
    };
    let note = {
        "ul": book.note
    };

    temp.push(title);

    if (book.image) {
        temp.push(image);
    }
    temp.push({
        "p": "作者：" + book.author.map(x => {
            return `${x.name}[${x.nationality}]` ;
        }).toString()
    });
    if (book.isbn13) {
        temp.push({
            "p": "ISBN：" + book.isbn13
        });
    }
    if (book.publisher) {
        temp.push({
            "p": "出版社：" + book.publisher
        });
    }
    if (book.pubdate) {
        temp.push({
            "p": "出版日期：" + util.formatDate(new Date(book.pubdate))
        });
    }
    if (book.tags.length > 0) {
        temp.push({
            "p": "图书标签："
        });
        temp.push({
            "backquote": book.tags
        });
    }

    if (book.douban) {
        temp.push({
            "p": "豆瓣地址："
        });
        temp.push({
            "link": {
                "title": book.douban,
                "source": book.douban
            }
        });
    }

    temp.push({
        "p": "阅读日期：" + util.formatDate(new Date(book.read))
    });

    if (book.note.length > 0) {
        temp.push({
            "p": "读书笔记"
        });
        temp.push(note);
    }
}

// console.log(temp);

// 生成中间文件
util.writeToFile('./file/temp.json', JSON.stringify(temp));
```

* note. js

``` js
const fs = require('fs');
const jsonFile = './file/temp.json';
const jsonObj = JSON.parse(fs.readFileSync(jsonFile));
const json2md = require("json2md");
const util = require("./utils/util");

// 自定义转换：反引号
json2md.converters.backquote = function(input, json2md) {
    // return " `" + input + "` ";
    if (input instanceof Array) {
        return input.map(x => `\` ${x}\``);
    } else {
        return `\` ${input}\``;
    }
}

// 自定义转换：超链接
json2md.converters.link = function(input, json2md) {
    return `[${input.title}](${input.source})` ;
}

// 自定义转换：分割线
json2md.converters.seperate = function(input, json2md) {
    return `---` ;
}

// 执行转换
let result = json2md(jsonObj);

// console.log(result);

// 输出结果
util.writeToFile('./file/output.md', result);
```

这里需要注意的是，在 `note.js` 中有三个自定义的转换器： `backquote` , `link` , `seperate` ，分别表示：反引号，超链接，分割线，依赖包里本身未实现，但是支持自定义，这便是 `json2md` 的强大之处。

![2021-01-28-Support.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-01-28-Support.png)

### 输出文件：md文件

![2021-01-28-Output.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-01-28-Output.png)


### 发布博客

这样，以后拿来 `JSON` 数据，便可快速转换为 `Markdown` 文件，简单、直接、有效；最后，可直接将生成的 `.md` 文件在博客发表：

![2021-01-28-DemoBlog.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-01-28-DemoBlog.png)

### 历史书单

- [2018年度——阅读书单&笔记](https://heartsuit.github.io/2018/12/31/Reading-Notes-2018.html)
- [2017年度——阅读书单&笔记](https://heartsuit.github.io/2017/12/31/Reading-Notes-2017.html)
- [2016年度——阅读书单&笔记](https://heartsuit.github.io/2017/05/31/Reading-Notes-2016.html)
- [2015年度——阅读书单&笔记](https://heartsuit.github.io/2017/05/31/Reading-Notes-2015.html)
- [2013、2014年度——阅读书单&笔记](https://heartsuit.github.io/2017/05/31/Reading-Notes-2014.html)

### Source Code

* [Github](https://github.com/heartsuit/json2markdown-demo)

### Reference

* [https://github.com/IonicaBizau/json2md](https://github.com/IonicaBizau/json2md)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
