---
layout: post
title: Vue3.0报错：The component has been registered but not used vue/no-unused-components，关闭eslint
tags: Vue
---

### 背景

当创建项目时选择了 `eslint` ，那么当存在定义而未使用的组件，或存在定义而未使用的变量时，会报错。。

Note: 我用的是 `Vue3.0` 。

### 原因分析

即 `eslint` 默认规则导致了不必要的报错。

### 解决方法

* 修改规则

如果开启了 `eslint` ，新增 `Component` 时，报错:

> The "EchartsDemo" component has been registered but not used  vue/no-unused-components

解决方法：在 `package.json` 或 `.eslintrc.js` （如果存在此文件的话）的eslintConfig下添加：

```json
    "rules": {
      "vue/no-unused-components": "off", // 当存在定义而未使用的组件时，关闭报错
      "no-unused-vars":"off" // 当存在定义而未使用的变量时，关闭报错
    }
```

![2021-11-30-VueESLint.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-30-VueESLint.png)

Note：如果两个文件都修改了的话， `eslintrc.js` 文件的优先级更高。

### 如何关闭 `eslint` ？

* 方案一：不使用`eslint` ，当然，可以在创建项目时不选择 `eslint` ，可是一般遇到这种问题的，显然是引入了 `eslint` 。。

* 方案二：关闭 `eslint` ，在 `vue.config.js` 添加一行配置： `lintOnSave: false` 。

![2021-11-30-TurnOffESLint.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-30-TurnOffESLint.jpg)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
