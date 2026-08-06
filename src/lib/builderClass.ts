/**
 * Algorithmic Builder Class Generator for Hacker House Goa 2026
 * Computes a deterministic "Builder Class" designation based on string inputs.
 */

const BUILDER_CLASSES = [
  "L1 Systems Engineer",
  "ZK Cryptographer",
  "Frontend Alchemist",
  "Autonomous Agent Architect",
  "DeFi Liquidity Engine",
  "Solana Core Rustacean",
  "EVM Protocol Dev",
  "Wasm Kernel Engineer",
  "Multichain Relayer",
  "Cyberpunk Systems Dev",
  "Distributed Consensus Dev",
  "Fullstack Synthesizer",
  "AI Matrix Engineer",
  "Smart Contract Auditor",
];

export function getBuilderClass(name: string, stack: string): string {
  const seedStr = `${(name || "ANON").trim().toLowerCase()}:${(stack || "FULLSTACK").trim().toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % BUILDER_CLASSES.length;
  return BUILDER_CLASSES[index];
}
