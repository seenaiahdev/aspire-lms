export interface TestCase {
  input: string;
  expectedOutput: string;
  description: string;
}

export interface ProblemConfig {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  examples: {
    input: string;
    output: string;
    explanation: string;
  }[];
  constraints: string[];
  testCases: TestCase[];
  languages: {
    [key: string]: {
      starterCode: string;
      solution: string;
      testRunner: string;
    };
  };
}

export const problemConfigs: { [key: string]: ProblemConfig } = {
  pp1: {
    id: 'pp1',
    title: 'Two Sum',
    difficulty: 'Easy',
    category: 'Arrays',
    description: `Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].',
      },
      {
        input: 'nums = [3,3], target = 6',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 6, we return [0, 1].',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    testCases: [
      { input: '[2,7,11,15]|9', expectedOutput: '[0,1]', description: 'Example 1' },
      { input: '[3,2,4]|6', expectedOutput: '[1,2]', description: 'Example 2' },
      { input: '[3,3]|6', expectedOutput: '[0,1]', description: 'Example 3' },
      { input: '[1,5,3,7,9]|12', expectedOutput: '[2,4]', description: 'Middle elements' },
      { input: '[-1,-2,-3,-4,-5]|-8', expectedOutput: '[2,4]', description: 'Negative numbers' },
    ],
    languages: {
      javascript: {
        starterCode: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
    // Write your solution here
    
}

// Test your code manually (optional)
// Uncomment below to test:
// console.log(twoSum([2,7,11,15], 9)); // Should output [0,1]

// Do not modify below this line
if (typeof module !== 'undefined' && module.exports) {
    module.exports = twoSum;
}`,
        solution: `function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = twoSum;
}`,
        testRunner: `const twoSum = require('./solution.js');

console.log('\\n🧪 Running Two Sum Test Cases...\\n');
console.log('='.repeat(50));

const testCases = [
    { input: [[2,7,11,15], 9], expected: [0,1], desc: 'Example 1: Basic case' },
    { input: [[3,2,4], 6], expected: [1,2], desc: 'Example 2: Middle elements' },
    { input: [[3,3], 6], expected: [0,1], desc: 'Example 3: Duplicate numbers' },
    { input: [[1,5,3,7,9], 12], expected: [2,4], desc: 'Test 4: Larger array' },
    { input: [[-1,-2,-3,-4,-5], -8], expected: [2,4], desc: 'Test 5: Negative numbers' },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
    const result = twoSum(...test.input);
    const resultStr = JSON.stringify(result);
    const expectedStr = JSON.stringify(test.expected);
    const isPassed = resultStr === expectedStr;
    
    if (isPassed) {
        console.log(\`✓ Test \${index + 1}: \${test.desc}\`);
        console.log(\`  Input: nums=\${JSON.stringify(test.input[0])}, target=\${test.input[1]}\`);
        console.log(\`  Output: \${resultStr} ✓\`);
        passed++;
    } else {
        console.log(\`✗ Test \${index + 1}: \${test.desc}\`);
        console.log(\`  Input: nums=\${JSON.stringify(test.input[0])}, target=\${test.input[1]}\`);
        console.log(\`  Expected: \${expectedStr}\`);
        console.log(\`  Got: \${resultStr}\`);
        failed++;
    }
    console.log('');
});

console.log('='.repeat(50));
console.log(\`\\n📊 Results: \${passed} passed, \${failed} failed\`);
console.log(\`💯 Score: \${Math.round((passed / testCases.length) * 100)}%\\n\`);

if (passed === testCases.length) {
    console.log('🎉 All tests passed! Great job!');
} else {
    console.log('❌ Some tests failed. Keep trying!');
}`,
      },
      python: {
        starterCode: `from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Write your solution here
        pass`,
        solution: `from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        num_map = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in num_map:
                return [num_map[complement], i]
            num_map[num] = i
        return []`,
        testRunner: `from solution import Solution

test_cases = [
    {"input": ([2,7,11,15], 9), "expected": [0,1], "desc": "Example 1"},
    {"input": ([3,2,4], 6), "expected": [1,2], "desc": "Example 2"},
    {"input": ([3,3], 6), "expected": [0,1], "desc": "Example 3"},
    {"input": ([1,5,3,7,9], 12), "expected": [2,4], "desc": "Middle elements"},
    {"input": ([-1,-2,-3,-4,-5], -8), "expected": [2,4], "desc": "Negative numbers"},
]

passed = 0
failed = 0

print("Running test cases...\\n")

solution = Solution()

for i, test in enumerate(test_cases, 1):
    result = solution.twoSum(*test["input"])
    is_passed = result == test["expected"]
    
    if is_passed:
        print(f"✓ Test {i}: {test['desc']} - PASSED")
        passed += 1
    else:
        print(f"✗ Test {i}: {test['desc']} - FAILED")
        print(f"  Expected: {test['expected']}")
        print(f"  Got: {result}")
        failed += 1

print("\\n" + "=" * 40)
print(f"Results: {passed} passed, {failed} failed")
print(f"Score: {round((passed / len(test_cases)) * 100)}%")`,
      },
      java: {
        starterCode: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        
    }
}`,
        solution: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}`,
        testRunner: `import java.util.Arrays;

public class TestRunner {
    public static void main(String[] args) {
        Solution solution = new Solution();
        
        int[][] numsTests = {
            {2,7,11,15},
            {3,2,4},
            {3,3},
            {1,5,3,7,9},
            {-1,-2,-3,-4,-5}
        };
        
        int[] targets = {9, 6, 6, 12, -8};
        int[][] expected = {
            {0,1},
            {1,2},
            {0,1},
            {2,4},
            {2,4}
        };
        
        String[] descriptions = {
            "Example 1",
            "Example 2",
            "Example 3",
            "Middle elements",
            "Negative numbers"
        };
        
        int passed = 0, failed = 0;
        
        System.out.println("Running test cases...\\n");
        
        for (int i = 0; i < numsTests.length; i++) {
            int[] result = solution.twoSum(numsTests[i], targets[i]);
            boolean isPassed = Arrays.equals(result, expected[i]);
            
            if (isPassed) {
                System.out.println("✓ Test " + (i+1) + ": " + descriptions[i] + " - PASSED");
                passed++;
            } else {
                System.out.println("✗ Test " + (i+1) + ": " + descriptions[i] + " - FAILED");
                System.out.println("  Expected: " + Arrays.toString(expected[i]));
                System.out.println("  Got: " + Arrays.toString(result));
                failed++;
            }
        }
        
        System.out.println("\\n========================================");
        System.out.println("Results: " + passed + " passed, " + failed + " failed");
        System.out.println("Score: " + Math.round((passed * 100.0) / numsTests.length) + "%");
    }
}`,
      },
      cpp: {
        starterCode: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here
        
    }
};`,
        solution: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> map;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (map.find(complement) != map.end()) {
                return {map[complement], i};
            }
            map[nums[i]] = i;
        }
        return {};
    }
};`,
        testRunner: `#include <iostream>
#include <vector>
#include "solution.cpp"

using namespace std;

int main() {
    Solution solution;
    
    vector<vector<int>> numsTests = {
        {2,7,11,15},
        {3,2,4},
        {3,3},
        {1,5,3,7,9},
        {-1,-2,-3,-4,-5}
    };
    
    vector<int> targets = {9, 6, 6, 12, -8};
    vector<vector<int>> expected = {
        {0,1},
        {1,2},
        {0,1},
        {2,4},
        {2,4}
    };
    
    vector<string> descriptions = {
        "Example 1",
        "Example 2",
        "Example 3",
        "Middle elements",
        "Negative numbers"
    };
    
    int passed = 0, failed = 0;
    
    cout << "Running test cases...\\n\\n";
    
    for (int i = 0; i < numsTests.size(); i++) {
        vector<int> result = solution.twoSum(numsTests[i], targets[i]);
        bool isPassed = (result == expected[i]);
        
        if (isPassed) {
            cout << "✓ Test " << (i+1) << ": " << descriptions[i] << " - PASSED\\n";
            passed++;
        } else {
            cout << "✗ Test " << (i+1) << ": " << descriptions[i] << " - FAILED\\n";
            cout << "  Expected: [";
            for (int j = 0; j < expected[i].size(); j++) {
                cout << expected[i][j];
                if (j < expected[i].size() - 1) cout << ",";
            }
            cout << "]\\n";
            failed++;
        }
    }
    
    cout << "\\n========================================\\n";
    cout << "Results: " << passed << " passed, " << failed << " failed\\n";
    cout << "Score: " << (int)((passed * 100.0) / numsTests.size()) << "%\\n";
    
    return 0;
}`,
      },
    },
  },
  pp2: {
    id: 'pp2',
    title: 'Hello World',
    difficulty: 'Easy',
    category: 'Basics',
    description: `Create a function that returns the string "Hello World".

This is a simple warm-up problem to get you familiar with the coding environment.`,
    examples: [
      {
        input: 'No input',
        output: '"Hello World"',
        explanation: 'The function should return the exact string "Hello World".',
      },
    ],
    constraints: [
      'Must return exactly "Hello World"',
      'Case sensitive',
    ],
    testCases: [
      { input: '', expectedOutput: 'Hello World', description: 'Basic test' },
    ],
    languages: {
      javascript: {
        starterCode: `/**
 * @return {string}
 */
function helloWorld() {
    // Write your solution here
    
}

// Test your code manually (optional)
// Uncomment below to test:
// console.log(helloWorld()); // Should output "Hello World"

// Do not modify below this line
if (typeof module !== 'undefined' && module.exports) {
    module.exports = helloWorld;
}`,
        solution: `function helloWorld() {
    return "Hello World";
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = helloWorld;
}`,
        testRunner: `const helloWorld = require('./solution.js');

console.log('\\n🧪 Running Hello World Test Cases...\\n');
console.log('='.repeat(50));

const testCases = [
    { expected: 'Hello World', desc: 'Basic test: Return "Hello World"' },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
    const result = helloWorld();
    const isPassed = result === test.expected;
    
    if (isPassed) {
        console.log(\`✓ Test \${index + 1}: \${test.desc}\`);
        console.log(\`  Expected: "\${test.expected}"\`);
        console.log(\`  Got: "\${result}" ✓\`);
        passed++;
    } else {
        console.log(\`✗ Test \${index + 1}: \${test.desc}\`);
        console.log(\`  Expected: "\${test.expected}"\`);
        console.log(\`  Got: "\${result}"\`);
        failed++;
    }
    console.log('');
});

console.log('='.repeat(50));
console.log(\`\\n📊 Results: \${passed} passed, \${failed} failed\`);
console.log(\`💯 Score: \${Math.round((passed / testCases.length) * 100)}%\\n\`);

if (passed === testCases.length) {
    console.log('🎉 Perfect! You got it right!');
}`,
      },
      python: {
        starterCode: `class Solution:
    def helloWorld(self) -> str:
        # Write your solution here
        pass`,
        solution: `class Solution:
    def helloWorld(self) -> str:
        return "Hello World"`,
        testRunner: `from solution import Solution

test_cases = [
    {"expected": "Hello World", "desc": "Basic test"},
]

passed = 0
failed = 0

print("Running test cases...\\n")

solution = Solution()

for i, test in enumerate(test_cases, 1):
    result = solution.helloWorld()
    is_passed = result == test["expected"]
    
    if is_passed:
        print(f"✓ Test {i}: {test['desc']} - PASSED")
        passed += 1
    else:
        print(f"✗ Test {i}: {test['desc']} - FAILED")
        print(f"  Expected: \\"{test['expected']}\\"")
        print(f"  Got: \\"{result}\\"")
        failed += 1

print("\\n" + "=" * 40)
print(f"Results: {passed} passed, {failed} failed")
print(f"Score: {round((passed / len(test_cases)) * 100)}%")`,
      },
      java: {
        starterCode: `class Solution {
    public String helloWorld() {
        // Write your solution here
        
    }
}`,
        solution: `class Solution {
    public String helloWorld() {
        return "Hello World";
    }
}`,
        testRunner: `public class TestRunner {
    public static void main(String[] args) {
        Solution solution = new Solution();
        
        String expected = "Hello World";
        String description = "Basic test";
        
        int passed = 0, failed = 0;
        
        System.out.println("Running test cases...\\n");
        
        String result = solution.helloWorld();
        boolean isPassed = result.equals(expected);
        
        if (isPassed) {
            System.out.println("✓ Test 1: " + description + " - PASSED");
            passed++;
        } else {
            System.out.println("✗ Test 1: " + description + " - FAILED");
            System.out.println("  Expected: \\"" + expected + "\\"");
            System.out.println("  Got: \\"" + result + "\\"");
            failed++;
        }
        
        System.out.println("\\n========================================");
        System.out.println("Results: " + passed + " passed, " + failed + " failed");
        System.out.println("Score: 100%");
    }
}`,
      },
      cpp: {
        starterCode: `#include <string>
using namespace std;

class Solution {
public:
    string helloWorld() {
        // Write your solution here
        
    }
};`,
        solution: `#include <string>
using namespace std;

class Solution {
public:
    string helloWorld() {
        return "Hello World";
    }
};`,
        testRunner: `#include <iostream>
#include <string>
#include "solution.cpp"

using namespace std;

int main() {
    Solution solution;
    
    string expected = "Hello World";
    string description = "Basic test";
    
    int passed = 0, failed = 0;
    
    cout << "Running test cases...\\n\\n";
    
    string result = solution.helloWorld();
    bool isPassed = (result == expected);
    
    if (isPassed) {
        cout << "✓ Test 1: " << description << " - PASSED\\n";
        passed++;
    } else {
        cout << "✗ Test 1: " << description << " - FAILED\\n";
        cout << "  Expected: \\"" << expected << "\\"\\n";
        cout << "  Got: \\"" << result << "\\"\\n";
        failed++;
    }
    
    cout << "\\n========================================\\n";
    cout << "Results: " << passed << " passed, " << failed << " failed\\n";
    cout << "Score: 100%\\n";
    
    return 0;
}`,
      },
    },
  },
};
