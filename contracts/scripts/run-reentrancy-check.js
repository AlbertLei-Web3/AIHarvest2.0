const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function main() {
  console.log('开始运行重入检查测试... 🧪');
  console.log('Starting reentrancy check tests... 🧪\n');

  try {
    // Run the tests
    const { stdout, stderr } = await execPromise('npx hardhat test ./test/reentrancy-test.js');
    
    if (stderr) {
      console.error('测试过程中出现错误 / Error during test execution:');
      console.error(stderr);
      return;
    }
    
    console.log(stdout);
    
    // Parse the results
    if (stdout.includes('addLiquidity reentrancy vulnerable: false') && 
        stdout.includes('removeLiquidity reentrancy vulnerable: false') && 
        stdout.includes('swap reentrancy vulnerable: false')) {
      
      console.log('\n✅ 全部测试通过！所有函数都受到保护，没有重入漏洞。');
      console.log('✅ All tests passed! All functions are protected against reentrancy vulnerabilities.\n');
    } else {
      console.log('\n⚠️ 警告：可能存在重入漏洞，请检查测试结果了解详情。');
      console.log('⚠️ Warning: Potential reentrancy vulnerabilities detected. Check test results for details.\n');
    }
    
  } catch (error) {
    console.error('运行测试脚本时发生错误 / Error running the test script:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });