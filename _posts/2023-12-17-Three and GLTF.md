---
layout: post
title: Vue3使用Three.js导入gltf模型并解决模型为黑色的问题
tags: Vue3, Three.js
---

## 背景

如今各类数字孪生场景对三维可视化的需求持续旺盛，因为它们可以用来创建数字化的双胞胎，即现实世界的物体或系统的数字化副本。这种技术在工业、建筑、医疗保健和物联网等领域有着广泛的应用，可以帮助人们更好地理解和管理现实世界的事物。

`Three.js` 可以让我们在网页上创建交互式的 `3D` 图形和动画。它是一个强大的 `JavaScript` 库，可以帮助我们轻松地在浏览器中实现复杂的 `3D` 效果，而无需深入了解底层的 `WebGL` 技术。如果你需要在网页上展示 `3D` 内容或者构建交互式的3D体验， `Three.js` 是一个非常有用的工具。今天通过 `Vue3.0` 集成 `Three.js` 来实现对 `gltf` 模型的加载、渲染与操控。

## 下载模型

如果没有专门的三维建模工程师，可以到[https://sketchfab.com](https://sketchfab.com)注册一个账号，上面有不少可以免费下载的模型，我这里下载 `gltf` 格式。

![2023-12-17-ModelSite.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-17-ModelSite.jpg)

## 查看模型

这个 `gltf` 格式的文件可以使用 `Win10` 自带的 `3D查看器` 打开。

![2023-12-17-Win103D.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-17-Win103D.jpg)

## 环境准备

Note: 

1. 前提需要有 `Node.js` 环境，可使用 `nvm` 进行 `Node.js` 的多版本管理。
2. `npm install <package>`默认会在依赖安装完成后将其写入`package.json`，因此安装依赖的命令都未附加`save`参数。

```bash
$ node -v
v16.18.0
```

## 安装vue-cli并创建项目

```bash
npm install -g @vue/cli
vue --version
vue create three-gltf
```

刚开始的 `package.json` 依赖是这样：

```json
  "dependencies": {
    "core-js": "^3.8.3",
    "vue": "^3.2.13"
  },
```

## 集成Three.js

* 安装依赖

```bash
npm install three
```

此时， `package.json` 的依赖变为：

```json
  "dependencies": {
    "core-js": "^3.8.3",
    "three": "^0.159.0",
    "vue": "^3.2.13"
  },
```

与 `HelloWorld.vue` 并列，创建一个 `ThreeDemo.vue` ，后续的三维场景渲染就在这个文件中实现，以下是完整代码。

```vue
<template>
  <div ref="threeModel" class="threed"></div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const threeModel = ref(null);
let scene, camera, renderer;

onMounted(() => {
  // 相机配置
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    100
  );
  camera.position.set(3, 3, 3);
  camera.lookAt(0, 0, 0);

  // 渲染配置
  renderer = new THREE.WebGLRenderer({
    antialias: true, // 抗锯齿
    alpha: true, // 用于设置透明度
  });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // 设置背景颜色
  renderer.setClearColor(0x000000, 0);

  // 场景初始化
  scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x666666)); // 环境光

  //添加模型
const loader = new GLTFLoader();
loader.load(
    "/static/model/scene.gltf",
    (gltf) => {
        // 解决模型为黑色的问题
        gltf.scene.traverse(function(child) {
            if (child.isMesh) {
                child.material.emissive = child.material.color;
                child.material.emissiveMap = child.material.map;
            }
        });
        scene.add(gltf.scene);
    },
    function(xhr) {
        // 控制台查看加载进度xhr
        console.log(Math.floor((xhr.loaded / xhr.total) * 100));
    }
);

  // 添加模型到页面
  threeModel.value.appendChild(renderer.domElement);

  //添加控制器
  let controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", () => {
    renderer.render(scene, camera);
  });
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.threed {
  widows: 100%;
  height: 100%;
}
</style>
```

为了让 `Vue` 项目展示我们的三维模型页面，这里简单粗暴地将 `HelloWorld.vue` 替换了。

![2023-12-17-DisplayModel.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-17-DisplayModel.jpg)

## 可能遇到问题

### 如何设置模型为透明背景？

有些场景下，比如我们要做数据大屏可视化，大屏本身已经有背景图片了，不希望 `Three.js` 的背景色遮挡，这时就可以将 `Three.js` 的背景设置为透明，设置背景透明前要先将 `alpha` 设置为 `true` ；通过 `renderer.setClearColor(0x000000, 0)` 第二个参数来设置透明度0是完全透明，1是不透明，可以按需调整0-1之间的数，eg: 0.8。

```js
  // 相机配置
  camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      100
  );

  // 渲染配置
  renderer = new THREE.WebGLRenderer({
      antialias: true, // 抗锯齿
      alpha: true, // 用于设置透明度
  });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // 设置背景颜色，透明
  renderer.setClearColor(0x000000, 0);
```

### Three.js导入gltf的模型黑乎乎的，怎么破？

![2023-12-17-BlackModel.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-17-BlackModel.jpg)

直接上解决办法：将模型的材质里的 `emssive` 设置为 `material.color` ，如果材质里有纹理，再把 `emissiveMap` 设置为 `material.map` 。

```js
//添加模型
const loader = new GLTFLoader();
loader.load(
    "/static/model/scene.gltf",
    (gltf) => {
        // 解决模型为黑色的问题
        gltf.scene.traverse(function(child) {
            if (child.isMesh) {
                child.material.emissive = child.material.color;
                child.material.emissiveMap = child.material.map;
            }
        });
        scene.add(gltf.scene);
    },
    function(xhr) {
        // 控制台查看加载进度xhr
        console.log(Math.floor((xhr.loaded / xhr.total) * 100));
    }
);
```

* 使用效果

![2023-12-17-Demo.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-17-Demo.gif)

## 小总结

通过 `Vue3.0` 集成 `Three.js` ，可以在网页上展示 `3D` 内容或构建交互式的 `3D` 体验。在集成过程中，需要安装 `Three.js` 依赖并创建 `ThreeDemo.vue` 文件，然后通过 `GLTFLoader` 加载模型并解决模型为黑色的问题。同时，可以设置 `Three.js` 的背景为透明以适应不同场景需求。

## Reference

* [https://sketchfab.com](https://sketchfab.com)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
