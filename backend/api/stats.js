const express = require('express');
const router = express.Router();
const { request, gql } = require('graphql-request');

// Get platform statistics
router.get('/', async (req, res) => {
  try {
    // TODO: Implement GraphQL query to get platform stats
    const endpoint = process.env.SUBGRAPH_ENDPOINT || 'http://localhost:8000/subgraphs/name/aiharvest';
    
    const query = gql`
      {
        tokens(first: 10) {
          id
          symbol
          name
          totalSupply
          volume
        }
        pairs(first: 10, orderBy: volumeUSD, orderDirection: desc) {
          id
          token0 {
            symbol
          }
          token1 {
            symbol
          }
          volumeUSD
          reserve0
          reserve1
        }
      }
    `;
    
    // Mock data for now
    const stats = {
      totalValueLocked: '$1,000,000',
      totalTransactions: 5000,
      totalUsers: 1200,
      dailyVolume: '$150,000',
      topPairs: [
        { name: 'ETH-AIH', volume: '$50,000', tvl: '$200,000' },
        { name: 'USDC-AIH', volume: '$30,000', tvl: '$150,000' },
        { name: 'ETH-USDC', volume: '$20,000', tvl: '$100,000' }
      ]
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pair data
router.get('/pairs/:pairId', async (req, res) => {
  try {
    const { pairId } = req.params;
    
    // TODO: Implement GraphQL query to get pair data
    
    // Mock data for now
    const pairData = {
      id: pairId,
      token0: { symbol: 'ETH', name: 'Ethereum' },
      token1: { symbol: 'AIH', name: 'AIHarvest Token' },
      reserve0: '100',
      reserve1: '10000',
      volumeUSD: '$50,000',
      txCount: 1200
    };
    
    res.json(pairData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get farm stats
router.get('/farms', async (req, res) => {
  try {
    // TODO: Implement GraphQL query to get farm stats
    
    // Mock data for now
    const farms = [
      {
        id: '1',
        pair: { token0: { symbol: 'ETH' }, token1: { symbol: 'AIH' } },
        stakedAmount: '500000',
        rewardRate: '1000',
        apr: '120%'
      },
      {
        id: '2',
        pair: { token0: { symbol: 'USDC' }, token1: { symbol: 'AIH' } },
        stakedAmount: '300000',
        rewardRate: '800',
        apr: '100%'
      }
    ];
    
    res.json(farms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 