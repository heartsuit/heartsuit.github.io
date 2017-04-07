---
layout: post
title: Leetcode 运行输出与本地结果不一样的解决方法（用例子说明）
tags: Algorithm
---
## Leetcode 运行输出与本地结果不一样的解决方法（用例子说明）
### Problem：

>Write an algorithm to determine if a number is "happy".
>A happy number is a number defined by the following process: Starting with any positive integer, replace the number by the sum of the squares of its digits, and repeat the process until the number equals 1 (where it will stay), or it loops endlessly in a cycle which does not include 1. Those numbers for which this process ends in 1 are happy numbers.

>Example: 19 is a happy number
    12 + 92 = 82
    82 + 22 = 68
    62 + 82 = 100
    12 + 02 + 02 = 1


----------


### Thought：
	The idea is just simple, the hints of HashMap and Recursion will help you a lot.

### Java Solution（ Wrong Answer）
``` java
public class Solution {
    private static Map<Integer, Integer> map = new HashMap<Integer, Integer>();
    public boolean isHappy(int n) {
		if (n == 1) {
			return true;
		} else if (map.containsKey(n)) {
			return false;
		} else {
			map.put(n, map.size());			
		}

		String str = n + "";
		char[] c = str.toCharArray();
		int temp = 0;		
		for (int i = 0; i < c.length; i++) {
			temp += Integer.parseInt(c[i]+"") * Integer.parseInt(c[i]+"");
		}
		// recursion
		return isHappy(temp);
    }
}
```
### **Exception**
	But the problem is that the answer of LeetCode is different from that of local IDE, which means when I iuput 10 in my local IDE, the output is true. Details is in the picture below:
![OJ Result](http://img.blog.csdn.net/20150529105342120)

The **solution** is : *try to declare the class variables as class instance variables instead of class staic variables; That's because the judger runs all test cases in one go.*

>Reference:https://leetcode.com/discuss/5800/different-answer-between-local-idle-and-leetcode?show=5800#q5800

### Java Solution（ Accepted）

``` java
public class Solution{
	// Don't declare the variable as a static one, or it will occur error when OJ;
	private Map<Integer, Integer> map = new HashMap<Integer, Integer>();
	
	public boolean isHappy(int n) {
		// print just for testing
		// System.out.println(n);

		if (n == 1) {
			return true;
		} else if (map.containsKey(n)) {
			return false;
		} else {
			map.put(n, map.size());			
		}

		String str = n + "";
		char[] c = str.toCharArray();
		int temp = 0;		
		for (int i = 0; i < c.length; i++) {
			temp += Integer.parseInt(c[i]+"") * Integer.parseInt(c[i]+"");
		}
		// recursion
		return isHappy(temp);
	}
}
```

### Online Judge: <a href="https://leetcode.com/problems/happy-number/" target="blank"> Happy Number

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***


