---
layout: post
title: MATLAB中给图像加高斯噪声时imnoise的方差参数问题
tags: MATLAB
---
### 加噪声函数imnoise()的方差参数

- Problem：
如何在图像中添加标准偏差为10的高斯噪声？

最直接的方式就是使用MATLAB提供的函数imnoise(), 根据帮助文档中的调用格式 `J = imnoise(I, 'gaussian', M, V) `(M 为均值，V为方差)，想当然的将语句写为`J = imnoise(I, 'gaussian', 0, 10^2)`，但是运行后发现完全不是预期的效果，因为加噪后的图像基本是一片白色，源图像几乎完全被淹没在噪声中。

在经过仔细阅读文档后发现，其实MATLAB的说明文档已经写得很清楚，现摘出如下：
		
	J = imnoise(I,type,parameters) Depending on type, you can specify additional parameters to imnoise. All numerical parameters are normalized— they correspond to operations with images with intensities ranging from 0 to 1.

其中最关键的就是 **normalized**，即归一化，方差值在0~1之间。这时才想起来，关于gaussian参数的说明：

	J = imnoise(I,'gaussian',M,V) adds Gaussian white noise of mean m and variance v to the image I. The default is zero mean noise with 0.01 variance.

即默认的M，V值分别为0， 0.01（注意此处的方差形式）。

所以最终的结论就是 **需要对方差归一化处理** ，比如此处要对一幅256*256的图像加入标准偏差为10的高斯噪声，那么相应的语句应为：
``` matlab
J = imnoise(I, 'gaussian', 0, 10^2/255^2)
```

- 总结：
在MATLAB中，使用一个不熟悉的函数时，最好先仔细阅读帮助文档。若使用过程中出现了问题，第一反应还是回到doc或者help中查看说明，如果仍然解决不了，再到Internet上Search。MATLAB的help是一个非常强大的系统，查看这些说明也是一种培养学习能力的方式。

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***

