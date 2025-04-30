// scripts/check-compilation.js
// 检查合约编译状态的脚本
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 主函数
async function main() {
  console.log('开始检查合约编译状态...');
  console.log('=================================');

  // 合约源文件目录
  const contractsDir = path.join(__dirname, '../contracts');
  // 编译产物目录
  const artifactsDir = path.join(__dirname, '../artifacts/contracts');

  // 1. 检查artifacts目录是否存在
  if (!fs.existsSync(artifactsDir)) {
    console.log('❌ artifacts目录不存在，合约可能尚未编译');
    console.log('请运行: npx hardhat compile');
    return;
  }

  // 2. 获取所有合约源文件
  const contractFiles = getAllContractFiles(contractsDir);
  console.log(`找到${contractFiles.length}个合约源文件`);

  // 3. 检查每个合约是否有对应的编译结果
  let allCompiled = true;
  let compiledCount = 0;
  
  for (const contractFile of contractFiles) {
    const relativePath = path.relative(contractsDir, contractFile);
    const contractName = path.basename(contractFile, path.extname(contractFile));
    
    // 构建预期的编译产物路径
    const expectedArtifactPath = path.join(
      artifactsDir,
      relativePath.replace(/\.sol$/, '.sol'),
      `${contractName}.json`
    );
    
    if (fs.existsSync(expectedArtifactPath)) {
      console.log(`✅ ${relativePath} - 已编译`);
      compiledCount++;
      
      // 检查编译产物是否有错误
      const artifact = JSON.parse(fs.readFileSync(expectedArtifactPath, 'utf8'));
      if (artifact.errors && artifact.errors.length > 0) {
        console.log(`   ⚠️ 警告: ${contractName} 编译有错误或警告`);
        allCompiled = false;
      }
    } else {
      console.log(`❌ ${relativePath} - 未编译`);
      allCompiled = false;
    }
  }

  // 4. 显示编译状态概览
  console.log('\n=================================');
  console.log(`合约编译状态: ${compiledCount}/${contractFiles.length} 已编译`);
  
  if (allCompiled) {
    console.log('✅ 所有合约已正确编译');
  } else {
    console.log('❌ 有些合约未编译或编译有错误');
    console.log('请运行: npx hardhat compile');
  }
  
  // 5. 尝试检查编译警告和错误
  try {
    console.log('\n编译日志 (如果有):');
    execSync('npx hardhat compile --show-stack-traces', { stdio: 'inherit' });
  } catch (error) {
    console.error('无法运行编译检查:', error.message);
  }
}

// 辅助函数：递归获取目录中的所有.sol文件
function getAllContractFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      getAllContractFiles(filePath, fileList);
    } else if (file.endsWith('.sol')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// 运行主函数
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 