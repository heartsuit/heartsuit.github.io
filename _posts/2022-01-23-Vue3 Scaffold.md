---
layout: post
title: 全栈开发之前端脚手架：Vue3.0快速集成ElementPlus，Axios, Echarts
tags: Vue
---

### 背景

搭建基于 `Vue3.0` 的极简前端脚手架，方便后续快速验证想法以及项目实施。

涉及到的技术及组件： `Vue3.0` , `ElementPlus` , `axios` , `vue-router` , `vuex` , `Echarts` 。

Note: 

1. 前提需要有 `Node.js` 环境，可使用 `nvm` 进行 `Node.js` 的多版本管理。
2. `npm install <package>`默认会在依赖安装完成后将其写入`package.json`，因此安装依赖的命令都未附加`save`参数。

```bash
$ node -v
v12.16.1
```

### 安装vue-cli并创建项目

```bash
npm install -g @vue/cli
vue --version
vue create hello-world
```

刚开始的 `package.json` 依赖是这样：

```json
  "dependencies": {
    "core-js": "^3.6.5",
    "vue": "^3.0.0"
  },
```

### 集成ElementPlus

* 安装依赖

```bash
npm install element-plus
```

此时， `package.json` 的依赖变为：

```json
  "dependencies": {
    "core-js": "^3.6.5",
    "element-plus": "^1.1.0-beta.7",
    "vue": "^3.0.0"
  },
```

* 配置，修改main.js中的内容：

```js
import {
    createApp
} from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// createApp(App).use(store).use(router).mount('#app')
const app = createApp(App);

// 集成ElementPlus
import ElementPlus from 'element-plus';
// import 'element-plus/dist/index.css' // 官方推荐
import 'element-plus/theme-chalk/index.css';

app.use(ElementPlus);
app.use(store).use(router).mount("#app");
```

* 使用element-ui

```vue
<template>
  <div>
    <el-row>
      <el-button>默认按钮</el-button>
      <el-button type="primary">主要按钮</el-button>
      <el-button type="success">成功按钮</el-button>
      <el-button type="info">信息按钮</el-button>
      <el-button type="warning">警告按钮</el-button>
      <el-button type="danger">危险按钮</el-button>
    </el-row>
  </div>
</template>

<script>
import { defineComponent } from "vue";
export default defineComponent({
  name: "ElementUIDemo",
  setup() {},
});
</script>
```

* 使用效果

![2022-01-23-ElementPlus.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-01-23-ElementPlus.jpg)

参考 `ElementPlus` 官方文档：[https://element-plus.gitee.io/#/zh-CN/component/quickstart](https://element-plus.gitee.io/#/zh-CN/component/quickstart)

### 集成Axios

* 安装依赖

```bash
npm install axios
```

此时， `package.json` 的依赖变为：

```json
  "dependencies": {
    "axios": "^0.21.1",
    "core-js": "^3.6.5",
    "element-plus": "^1.1.0-beta.7",
    "vue": "^3.0.0"
  },
```

* 按需引入
在需要使用axios的组件中引入 `import axios from "axios"; `

* 使用axios

```vue
<template>
  <div>{{ info }}</div>
</template>
<script>
import { defineComponent } from "vue";
import axios from "axios";
export default defineComponent({
  name: "AxiosDemo",
  setup() {},
  data() {
    return {
      info: null,
    };
  },
  mounted() {
    axios
      .get("https://api.coindesk.com/v1/bpi/currentprice.json")
      .then((response) => (this.info = response.data));
    this.callApi();
  },
  methods: {
    callApi: function () {
      axios.get("/api/book/list?userId=1").then(
        function (res) {
          if (res.status == 200) {
            console.log(res.data);
          } else {
            console.error(res);
          }
        },
        function (res) {
          console.error(res);
        }
      );
    },
  },
});
</script>
```

* 使用效果

![2022-01-23-Axios.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-01-23-Axios.jpg)

参考 `axios` 源码及文档地址：[https://github.com/axios/axios](https://github.com/axios/axios)

### 集成Echarts

* 安装依赖

```bash
npm install echarts
```

此时， `package.json` 的依赖变为：

```json
  "dependencies": {
    "axios": "^0.21.1",
    "core-js": "^3.6.5",
    "echarts": "^5.1.2",
    "element-plus": "^1.1.0-beta.7",
    "vue": "^3.0.0"
  },
```

* 使用Echarts

```vue
<template>
  <div id="chart" :style="{ width: '1000px', height: '550px' }"></div>
</template>

<script>
import * as echarts from "echarts";

export default {
  name: "EchartsDemo",
  setup() {},
  mounted() {
    this.getEchart();
  },
  methods: {
    getEchart() {
      let myChart = echarts.init(document.getElementById("chart"));
      myChart.setOption({
        title: {
          text: "ECharts 入门示例",
        },
        tooltip: {},
        legend: {
          data: ["销量"],
        },
        xAxis: {
          data: ["衬衫", "羊毛衫", "雪纺衫", "裤子", "高跟鞋", "袜子"],
        },
        yAxis: {},
        series: [
          {
            name: "销量",
            type: "bar",
            data: [5, 20, 36, 10, 10, 20],
          },
        ],
      });
      window.onresize = function () {
        console.log("Resized..");
        myChart.resize();
      };
    }
  }
};
</script>
```

* 使用效果

![2022-01-23-Echarts.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-01-23-Echarts.jpg)

参考Echarts官网：[https://echarts.apache.org/zh/index.html](https://echarts.apache.org/zh/index.html)

### 可能遇到的错误

* `eslint`默认规则导致不必要的报错

如果开启了 `eslint` ，新增 `Component` 时，报错: 

> The "EchartsDemo" component has been registered but not used  vue/no-unused-components

解决方法：在 `package.json` 或 `.eslintrc.js` 的eslintConfig下添加：

```json
    "rules": {
      "vue/no-unused-components": "off", // 当存在定义而未使用的组件时，关闭报错
      "no-unused-vars":"off" // 当存在定义而未使用的变量时，关闭报错
    }
```

* 开发环境跨域

方法一：在前端进行配置，新建 `vue.config.js` 文件，内容如下：

```js
module.exports = {
    devServer: {
        proxy: {
            '/api': {
                target: 'http://localhost:8000/',
                changeOrigin: true,
                ws: true,
                secure: true,
                pathRewrite: {
                    '^/api': ''
                }
            }
        }
    }
};
```

方法二：因为后端服务是我们自己开发的，所以可以在后端进行CORS配置

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**").
                        allowedOriginPatterns("*").
                        allowedMethods("*").
                        allowedHeaders("*").
                        allowCredentials(true).
                        exposedHeaders(HttpHeaders.SET_COOKIE).maxAge(3600L);
            }
        };
    }
}
```

### Reference

* [Vue3.0](https://v3.cn.vuejs.org/guide/introduction.html)
* [ElementPlus](https://element-plus.gitee.io/zh-CN/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
