---
layout: post
title: 云原生之容器编排实践-SpringBoot应用Docker化
tags: CloudNative, Docker
---

## 背景

前面我们已经通过 `IDEA` 的 `Docker` 插件连接到了 `Docker` 服务。这里我们借助 `Dockerfile` 与 `Maven` 打包插件实现一键部署 `Spring Boot` 应用到远程 `Docker` 容器。

## 创建应用

* 创建一个SpringBoot的空项目

略。。

* 写一个简单的接口

```java
package com.heartsuit.cloudnative.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * @Author Heartsuit
 * @Date 2022-08-22
 */
@RestController
@Slf4j
public class HelloController {
    @Value("${server.port}")
    private String port;

    @GetMapping("/hi")
    public String hello() {
        return "Hi " + port;
    }

    @GetMapping("/hello")
    public String hello(@RequestParam String name) {
        log.info("Parameter: {}", name);
        return "Hello " + name + ", I am on port: " + port;
    }
}
```

* 编写Dockerfile

在项目根目录新增 `Dockerfile` 文件，写入以下内容。

```dockerfile
FROM openjdk:8-jdk-alpine
VOLUME /tmp
COPY target/*.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```

说明：
1. FROM：基于openjdk8
2. VOLUME：临时数据卷目录
3. COPY：拷贝target目录下的jar，命名为app.jar
4. ENTRYPOINT：配置启动命令

* 增加打包插件
编辑 `pom.xml` ，在插件部分添加以下内容。

```xml
            <plugin>
                <groupId>com.spotify</groupId>
                <artifactId>docker-maven-plugin</artifactId>
                <version>1.2.0</version>
                <executions>
                    <execution>
                        <id>build-image</id>
                        <phase>package</phase>
                        <goals>
                            <goal>build</goal>
                        </goals>
                    </execution>
                </executions>
                <configuration>
                    <dockerHost>http://k8s0:2375</dockerHost>
                    <imageName>heartsuit/${project.artifactId}</imageName>
                    <imageTags>
                        <imageTag>${project.version}</imageTag>
                    </imageTags>
                    <forceTags>true</forceTags>
                    <dockerDirectory>${project.basedir}</dockerDirectory>
                    <resources>
                        <resource>
                            <targetPath>/</targetPath>
                            <directory>${project.build.directory}</directory>
                            <include>${project.build.finalName}.jar</include>
                        </resource>
                    </resources>
                </configuration>
            </plugin>
```

Note：源码已上传 `GitHub` ：[https://github.com/heartsuit/cloud-native](https://github.com/heartsuit/cloud-native)

## 运行容器应用

一种方式是，直接在打开的 `Dockerfile` 中，点击运行，会将应用直接在容器中部署启动。

![2022-08-28-RunOnDocker.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-28-RunOnDocker.jpg)

## 一键部署应用到容器

执行 `mvn package` 命令，或者通过 `Maven` 插件的 `package` 命令完成一键打包与部署到容器的操作。

## 小总结

将 `Spring Boot` 应用 `Docker` 化有以下几个原因：

1. 便携性：`Docker`容器提供了一种轻量级、可移植的运行环境。通过将`Spring Boot`应用程序打包成`Docker`镜像，可以在不同的环境中轻松部署和运行，无需担心环境配置的差异性。

2. 一致性：`Docker`镜像包含了应用程序及其依赖的所有组件，包括操作系统、库和配置文件等。这确保了在不同的部署环境中，应用程序的运行环境始终保持一致，避免了由于环境差异导致的问题。

3. 可扩展性：使用`Docker`可以轻松地扩展`Spring Boot`应用程序。通过在`Docker`容器中运行多个实例，可以实现水平扩展，以满足高负载和大流量的需求。

4. 开发和测试效率：`Docker`容器提供了隔离的运行环境，使开发人员可以在本地开发和测试应用程序，而无需担心与其他应用程序的冲突。同时，`Docker`还支持持续集成和持续交付（CI/CD），可以自动化构建、测试和部署`Spring Boot`应用程序。

5. 资源利用率：`Docker`容器是轻量级的，可以在同一物理机上运行多个容器，充分利用服务器资源。这对于提高服务器的利用率和降低成本非常有益。

综上，将 `Spring Boot` 应用程序 `Docker` 化可以提供便携性、一致性、可扩展性、开发和测试效率以及资源利用率的优势。这使得 `Docker` 成为部署和运行 `Spring Boot` 应用程序的理想选择。 

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
