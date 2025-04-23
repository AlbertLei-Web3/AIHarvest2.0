# AIHarvest 2.0 Pair Creation Mechanism
# AIHarvest 2.0 交易对创建机制

```mermaid
flowchart TD
    A[User requests to add liquidity] --> B{Check if pair exists}
    A[用户请求添加流动性] --> B{检查交易对是否存在}
    
    B -->|Yes| E[Use existing pair]
    B -->|是| E[使用现有交易对]
    
    B -->|No| C[Create new pair]
    B -->|否| C[创建新交易对]
    
    C --> D1[Sort token addresses]
    C --> D1[排序代币地址]
    
    D1 --> D2[Generate pair address using keccak256]
    D1 --> D2[使用keccak256生成交易对地址]
    
    D2 --> D3[Initialize pair data]
    D2 --> D3[初始化交易对数据]
    
    D3 --> D4[Register in mapping]
    D3 --> D4[在映射中注册]
    
    D4 --> D5[Add to allPairs array]
    D4 --> D5[添加到allPairs数组]
    
    D5 --> D6[Emit PairCreated event]
    D5 --> D6[发出PairCreated事件]
    
    D6 --> E
    
    E --> F[Add liquidity to pair]
    E --> F[向交易对添加流动性]
    
    F --> G[Transfer tokens from user]
    F --> G[从用户转移代币]
    
    G --> H[Update reserves]
    G --> H[更新储备量]
    
    H --> I[Mint LP tokens]
    H --> I[铸造LP代币]
    
    subgraph "Pair Address Generation / 交易对地址生成"
        J[Input: token0, token1] --> K["keccak256(
            0xff +
            router_address +
            keccak256(token0 + token1) +
            init_code_hash
        )"]
        J[输入: token0, token1] --> K["keccak256(
            0xff +
            路由器地址 +
            keccak256(token0 + token1) +
            初始代码哈希
        )"]
        
        K --> L[Convert to address]
        K --> L[转换为地址]
    end
```

## The Deterministic Pair Creation Process
## 确定性交易对创建过程

The SimpleSwapRouter contract creates liquidity pairs through a deterministic process:

SimpleSwapRouter合约通过确定性过程创建流动性交易对：

1. When a user adds liquidity with two tokens that don't have an existing pair
   当用户添加两个没有现有交易对的代币的流动性时

2. The contract sorts the token addresses (smaller address becomes token0)
   合约对代币地址进行排序（较小的地址成为token0）

3. It generates a deterministic address using the CREATE2 pattern:
   它使用CREATE2模式生成确定性地址：
   ```
   address = keccak256(0xff + router_address + salt + init_code_hash)
   ```
   Where salt is keccak256(token0 + token1)
   其中salt是keccak256(token0 + token1)

4. The new pair is initialized in the contract's storage
   新的交易对在合约的存储中初始化

5. The pair is registered in mappings for easy lookup
   交易对在映射中注册以便于查找

6. A PairCreated event is emitted with the pair details
   发出包含交易对详细信息的PairCreated事件

This approach ensures that pair addresses are consistent and can be pre-computed off-chain.

这种方法确保交易对地址是一致的，并且可以在链下预先计算。 