---
layout: post
title: LeetCode[136] Single Number 位运算异或，HashMap（Java）
tags: Algorithm
---
## LeetCode[136] Single Number 位运算异或，HashMap（Java）
### Problem：

> Given an array of integers, every element appears twice except for one. Find that single one.
### Thought1：
	The standard key to solve this problem is bit manipulation. As XOR will return 1 only when two bits are different, so if two numbers are the same, XOR will return 0. Thus the last remaining number will be the single one.

### Java Solution1
``` java
public class SingleNumber {
	// method 1:Bit manipulation: XOR
	public int singleNumber(int[] nums) {
		int result = nums[0];
		for (int i = 1; i < nums.length; i++) {
			result = result ^ nums[i];
		}
		return result;
	}
```
### Thought2：
	Since the hint tags show that one of the ways to solve this problem is to utilize the HashTable(HasnMap in Java), so I have also tried this one.
	
### Java Solution2
``` java
	// method 2: HashMap
	public int singleNumberHashMap(int[] nums) {	
		Map<Integer, Integer> map = new HashMap<Integer, Integer>();

		for (int i = 0; i < nums.length; i++) {
			if (map.containsKey(nums[i])) {
				map.remove(nums[i]);
			} else {
				map.put(nums[i], i);				
			}
		}		
		// System.out.println(map.entrySet());		
		for(Map.Entry<Integer, Integer> m : map.entrySet()){
			return m.getKey();
		}
		return 0;
	}
```
### Online Judge: <a href="https://leetcode.com/problems/single-number/" target="blank"> Single Number


---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
