---
layout: post
title: LeetCode[240] Search a 2D Matrix II（动画演示）
tags: Algorithm
---
## LeetCode[240] Search a 2D Matrix II（动画演示）
###Problem:

> Write an efficient algorithm that searches for a value in an m x n matrix.

This matrix has the following properties:

- **Integers in each row are sorted in ascending from left to right.**
- **Integers in each column are sorted in ascending from top to bottom.**

###Example:
Consider the following matrix:
>[
  [1,   4,  7, 11, 15],
  [2,   5,  8, 12, 19],
  [3,   6,  9, 16, 22],
  [10, 13, 14, 17, 24],
  [18, 21, 23, 26, 30]
]

- **Given target = 5, return true.**

- **Given target = 20, return false.**

-------------------
###Thought1:
- 遍历整个矩阵，复杂度：`O(m*n)`；这个大家都可以想到，不过并不是那么地efficient。。

###Thought2:
1. 一涉及到**查找**，而且**有序**，最容易使人联想到“二分查找”，可是这里是个矩阵……
2. 这时，需要充分利用题中给的两个条件：
	- 每一行**从左到右**数值*递增*
	- 每一列**从上到下**数值*递增*
3. 我们知道，在二分查找中，每次操作时，中间数都会将数组分为两部分（每个部分仍为数组），因此，我们需要在矩阵中，找到一个点，将矩阵也分为两部分，且两个部分均为矩阵；
4. 结合第2点，便可以确定采用**matrix[m][0]**或**matrix[0][n]**作为”中间点“（这里需要仔细观察分析，发现规律），每次排除一行或者一列，不断缩小范围，复杂度： `O(m+n)`；
5. 但是通常情况下，并不是很容易就想到用副对角线的两个顶点（取其一即可）作为分割点，当时想把这道题让女朋友做一下，为了给她一点提示，便想通过一种直观的方式来展现，这里采用简单动画效果，顺便用C#练下手（*WinForm*），o(*￣▽￣*)o。

-------------------

### Presentation:
- 主界面及其功能概述：
![主界面及其功能](http://img.blog.csdn.net/20160820103837563)
- Given target = 5, return true.
	- 从左下角开始搜索：
![从matrix[m][0]开始搜索](http://img.blog.csdn.net/20160820103913188)
	- 从右上角开始搜索：
![从matrix[0][n]开始搜索](http://img.blog.csdn.net/20160820104106484)
- Given target = 20, return false.
![查找矩阵中不存在的数](http://img.blog.csdn.net/20160820104209297)
- 修改数据，并重新查找：
![修改数据，并重新查找](http://img.blog.csdn.net/20160820104244564)

###总结
- OK，展示完毕。
- 代码就不放了，毕竟，视觉刺激的效果是最强烈的，通过以上的简单动画，我们应该都可以直接说出答案了。

###Online Judge: <a href="https://leetcode.com/problems/search-a-2d-matrix-ii/" target="blank"> Search a 2D Matrix II

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***