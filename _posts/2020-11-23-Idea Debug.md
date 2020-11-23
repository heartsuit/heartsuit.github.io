---
layout: post
title: IntelliJ IDEA调试时点击停止按钮，程序并没有立即停止
tags: IDE
---

### Background

调试一段循环更新数据库的程序时，在更新语句处设置了一个断点，明明在更新了一条数据后停止了Debug，但是数据库里的数据却更新了2条。。

`IntelliJ IDEA`版本信息：

    IntelliJ IDEA 2019.3.3 (Ultimate Edition)
    Build #IU-193.6494.35, built on February 11, 2020
    Licensed to XX
    Subscription is active until August 17, 2021
    For educational use only.
    Runtime version: 11.0.5+10-b520.38 amd64
    VM: OpenJDK 64-Bit Server VM by JetBrains s.r.o
    Windows 7 6.1
    GC: ParNew, ConcurrentMarkSweep
    Memory: 984M
    Cores: 4
    Registry: debugger.watches.in.variables=false, compiler.automake.allow.when.app.running=true
    Non-Bundled Plugins: Lombook Plugin, org.intellij.scala


### Analysis

经过分析，得出结论：在点击停止按钮时，程序并没有立即终止。以上问题可抽象为下面的“Hello World”。

一个简单的`Hello World`，在打印World这一行设置断点，调试启动，到了断点处，此时控制台已打印出`Hello `，这时，直接点击停止，然而，并没有按预期地进行停止？!。赫然打印出了`Hello World`

```java
    public static void main(String[] args) {
        System.out.print("Hello ");
        System.out.println("World");
    }
```

![2020-11-23-IdeaDebugBreakPoint.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-11-23-IdeaDebugBreakPoint.png)

![2020-11-23-IdeaStop.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-11-23-IdeaStop.gif)

![2020-11-23-IdeaNoStop.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-11-23-IdeaNoStop.png)

### Solution

解决方案：在Frames窗口，点击`Force Return`

![2020-11-23-IdeaForceReturn.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-11-23-IdeaForceReturn.png)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***