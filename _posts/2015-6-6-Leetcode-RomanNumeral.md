---
layout: post
title: Leetcode[12-13] Roman to Integer & Integer to Roman(Java)
tags: Java
---

##Roman to Integer
- Problem:

> Given a roman numeral, convert it to an integer.
Input is guaranteed to be within the range from 1 to 3999.

- Java Solution：

<pre>
// Note that the way of defining a constructor
public class Solution {
    Map<Character, Integer> map = new HashMap<Character, Integer>();
	public Solution(){
		map.put('I', 1);
		map.put('V', 5);
		map.put('X', 10);
		map.put('L', 50);
		map.put('C', 100);
		map.put('D', 500);
		map.put('M', 1000);
	}
    public int romanToInt(String s) {
        int sum = 0;
		int val1, val2;
		for (int i = 0; i < s.length(); i++) {
			val1 = map.get(s.charAt(i));
			if (i < s.length()-1) {
				val2 = map.get(s.charAt(i+1));
				if (val1 >= val2) {
					sum += val1;
				} else {
					sum += (val2 - val1);
					i += 1;
				}
			} else {
				sum += val1;
			}			
		}
		return sum;
    }
}
</pre>

## Integer to Roman

- Problem:
>Given an integer, convert it to a roman numeral.
Input is guaranteed to be within the range from 1 to 3999.

- Java Solution：

<pre>
// The key is to find the rules of formation of a roman number.
public class Solution {
    public String intToRoman(int num) {
        int[] values = {1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1};
        String[] numerals = {"M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"};
        StringBuilder result = new StringBuilder();

        for (int i = 0; i < values.length; i++) {
            while (num >= values[i]) {
                num -= values[i];
                result.append(numerals[i]);
            }
        }  
        return result.toString();
    }
}
</pre>

Reference:<http://blog.csdn.net/beiyeqingteng/article/details/8547565>
