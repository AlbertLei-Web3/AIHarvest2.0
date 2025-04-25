/**
 * Main contracts utilities entry point
 * This file is maintained for backward compatibility
 * New code should import directly from the contracts/ folder
 */

// Display a warning in development mode
if (process.env.NODE_ENV === 'development') {
  console.warn(
    '[Deprecated] You are importing from utils/contracts.ts. ' +
    'This file is maintained for backward compatibility only. ' +
    'Please import from utils/contracts/ directory instead.'
  );
}

// Re-export everything from the contracts directory
export * from './contracts/'; 