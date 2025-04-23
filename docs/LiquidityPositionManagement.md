# AIHarvest 2.0 Liquidity Position Management
# AIHarvest 2.0 流动性仓位管理

```mermaid
flowchart TD
    subgraph "Frontend / 前端"
        A[Load Liquidity Page] --> B[Connect Wallet]
        A[加载流动性页面] --> B[连接钱包]
        
        B --> C[Fetch User Token Balances]
        B --> C[获取用户代币余额]
        
        C --> D[Calculate All Possible Token Pairs]
        C --> D[计算所有可能的代币对]
        
        D --> E[Check LP Balance for Each Pair]
        D --> E[检查每个交易对的LP余额]
        
        E --> F[Display Positions with Non-Zero LP Balance]
        E --> F[显示LP余额不为零的仓位]
        
        F --> G[User Views Position Details]
        F --> G[用户查看仓位详情]
        
        G --> H{User Action?}
        G --> H{用户操作？}
        
        H -->|Add Liquidity| I[Select Token Pair]
        H -->|添加流动性| I[选择代币对]
        
        H -->|Remove Liquidity| J[Select Position]
        H -->|移除流动性| J[选择仓位]
        
        H -->|Verify Position| K[Position Verification]
        H -->|验证仓位| K[仓位验证]
        
        I --> L[Enter Token Amounts]
        I --> L[输入代币金额]
        
        L --> M[Approve Tokens]
        L --> M[授权代币]
        
        M --> N[Add Liquidity]
        M --> N[添加流动性]
        
        J --> O[Enter Amount to Remove]
        J --> O[输入要移除的金额]
        
        O --> P[Remove Liquidity]
        O --> P[移除流动性]
        
        K --> Q[Check Contract Interactions]
        K --> Q[检查合约交互]
        
        Q --> R[Display Verification Results]
        Q --> R[显示验证结果]
    end
    
    subgraph "Contract / 合约"
        AA[SimpleSwapRouter] --> BB[getPairAddress]
        AA[SimpleSwapRouter] --> BB[获取交易对地址]
        
        BB --> CC[balanceOf]
        BB --> CC[余额]
        
        CC --> DD[getReserves]
        CC --> DD[获取储备量]
        
        DD --> EE[Calculate Pool Share]
        DD --> EE[计算池份额]
        
        N --> FF[addLiquidity]
        N --> FF[添加流动性]
        
        P --> GG[removeLiquidity]
        P --> GG[移除流动性]
        
        FF --> HH[Update Reserves]
        FF --> HH[更新储备量]
        
        GG --> HH
        
        HH --> II[Emit Events]
        HH --> II[发出事件]
    end
```

## Liquidity Position Management Process
## 流动性仓位管理流程

AIHarvest 2.0 provides a comprehensive system for managing liquidity positions:

AIHarvest 2.0 提供了全面的流动性仓位管理系统：

### Viewing Positions / 查看仓位

1. When a user connects their wallet to the liquidity page, the system:
   当用户将钱包连接到流动性页面时，系统会：

   - Generate all possible token pairs from the available tokens
     从可用代币生成所有可能的代币对
   
   - Query the router contract for LP token balances for each pair
     查询每个交易对的路由器合约以获取LP代币余额
   
   - Display only positions with non-zero LP balance
     只显示LP余额不为零的仓位
   
   - Calculate pool share percentage for each position
     计算每个仓位的池份额百分比

2. For each position, users can see:
   对于每个仓位，用户可以看到：

   - The tokens in the pair with their symbols and logos
     交易对中的代币及其符号和标志
   
   - Amount of each token in the position
     仓位中每种代币的金额
   
   - Their share of the pool as a percentage
     作为百分比的池份额
   
   - The pair's contract address
     交易对的合约地址

### Adding Liquidity / 添加流动性

1. Users select two tokens and enter the amounts to provide
   用户选择两个代币并输入要提供的金额

2. The system calculates the optimal amounts based on the current pool ratio (if the pair exists)
   系统根据当前池比率计算最佳金额（如果交易对存在）

3. Users approve token spending for the router contract
   用户批准路由器合约的代币支出

4. Upon adding liquidity, users receive LP tokens representing their share of the pool
   添加流动性后，用户收到代表其池份额的LP代币

### Removing Liquidity / 移除流动性

1. Users select a position and choose to remove part or all of their liquidity
   用户选择一个仓位并选择移除部分或全部流动性

2. The system calculates the expected token amounts to receive
   系统计算预计收到的代币金额

3. A slippage tolerance is applied to protect against price movements
   应用滑点容忍度以防止价格波动

4. Upon removal, users receive the underlying tokens and their LP tokens are burned
   移除后，用户收到底层代币，其LP代币被销毁

### Position Verification / 仓位验证

The system provides a verification tool to validate liquidity positions:

系统提供验证工具来验证流动性仓位：

1. Checks if token addresses are valid contracts
   检查代币地址是否为有效合约

2. Verifies the pair address against the router's getPairAddress function
   根据路由器的getPairAddress函数验证交易对地址

3. Confirms LP token information (name, symbol, decimals)
   确认LP代币信息（名称、符号、小数位）

4. Validates the user's LP token balance
   验证用户的LP代币余额

This helps prevent interaction with fraudulent or compromised liquidity pools.

这有助于防止与欺诈或受损的流动性池交互。 