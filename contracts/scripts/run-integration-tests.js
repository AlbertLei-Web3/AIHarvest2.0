const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 记录测试开始时间
const startTime = new Date();
console.log(`开始运行集成测试 [${startTime.toLocaleTimeString()}]`);
console.log('Testing started [${startTime.toLocaleTimeString()}]');

// 确保测试输出目录存在
const testOutputDir = path.join(__dirname, '../test-results');
if (!fs.existsSync(testOutputDir)) {
  fs.mkdirSync(testOutputDir);
}

// 测试输出文件路径
const outputFile = path.join(testOutputDir, `integration-test-${startTime.toISOString().replace(/:/g, '-')}.log`);

try {
  // 使用npx hardhat test运行测试，并将输出重定向到文件
  console.log('运行集成测试...');
  console.log('Running integration tests...');
  
  const testCommand = 'npx hardhat test test/IntegrationTest.js --network hardhat';
  
  // 执行测试并同时输出到控制台和文件
  const output = execSync(testCommand, { encoding: 'utf8' });
  
  // 将输出写入日志文件
  fs.writeFileSync(outputFile, output);
  
  console.log('集成测试完成，详细日志保存到:', outputFile);
  console.log('Integration tests completed, detailed logs saved to:', outputFile);
} catch (error) {
  // 如果测试失败，记录错误
  console.error('集成测试失败:', error.message);
  console.error('Integration tests failed:', error.message);
  
  // 将错误输出写入日志文件
  fs.writeFileSync(outputFile, `测试失败:\n${error.message}\n${error.stdout || ''}`);
  
  process.exit(1);
}

// 记录测试结束时间
const endTime = new Date();
const duration = (endTime - startTime) / 1000;
console.log(`测试完成 [${endTime.toLocaleTimeString()}], 总用时: ${duration.toFixed(2)}秒`);
console.log(`Testing completed [${endTime.toLocaleTimeString()}], total duration: ${duration.toFixed(2)} seconds`); 