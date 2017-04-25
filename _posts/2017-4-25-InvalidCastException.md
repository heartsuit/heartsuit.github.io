---
layout: post
title:  An unhandled exception of type "System.InvalidCastException" occurred
tags:  C#
---
## An unhandled exception of type "System.InvalidCastException" occurred in System.Windows.Form.dll 

- Problem: 在使用Webbrowser时，异步操作完成后，获取Document时报错:

  An unhandled exception of type "System.InvalidCastException" occurred in System.Windows.Form.dll   
  Additional information:指定的转换无效。

- Description: 
![webbrowser](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/webbrowser.png)

- Analysis: 
这个问题很是莫名其妙，看错误信息让人摸不着头脑；在网上查后才发现是跨线程操作。如何解决？
  
  1. 直接将操作写在当前代码块，而不封装为方法，当有多处需要调用此类操作时，较为繁琐，每次都需重写一遍；
  2. 或者将操作封装为方法进行调用，此时需要将方法置于原线程执行，可通过委托实现，见Solution。

- Solution：主要是因为跨线程操作导致的问题。

``` csharp
// 需要在创建控件的线程中执行
...
BeginInvoke(new MethodInvoker(delegate ()
{
    ClearAll(this.webBrowser1.Document);
}));
...
```

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
