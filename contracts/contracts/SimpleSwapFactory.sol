// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleSwapFactory
 * @dev Simplified factory contract stub for use with SimpleSwapRouter
 * This is a placeholder that resolves the import error in SimpleSwapRouter.sol
 */
contract SimpleSwapFactory {
    // Factory does not need implementation since SimpleSwapRouter implements its own factory logic
    
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);
    
    constructor() {}
} 