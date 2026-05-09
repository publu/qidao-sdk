# QiDao SDK

An SDK for building applications on top of QiDao Protocol — the protocol behind MAI, a decentralized stablecoin backed by collateralized debt positions (CDPs).

## Installation

```bash
npm install @qidao/sdk
```

## Features

- **Multi-chain support** — Ethereum, Polygon, Arbitrum, Base, Linea, Scroll, Optimism, Fantom, Avalanche, and 20+ other networks
- **Vault information** — Access vault addresses, collateral types, and parameters across all supported chains
- **Typed contracts** — TypeChain-generated contract bindings for ethers.js v5
- **Token utilities** — Token entities with decimal handling, currency abstractions, and fraction math
- **Zapper addresses** — Pre-configured zapper contracts for streamlined vault interactions
- **PSM support** — Peg Stability Module addresses and configurations

## Usage

```typescript
import { ChainId, VAULT_INFO, Token } from '@qidao/sdk'

// Get vault info for a specific chain
const polygonVaults = VAULT_INFO[ChainId.MATIC]

// Work with tokens
const token = new Token(ChainId.MATIC, '0x...', 18, 'MAI', 'Mai Stablecoin')
```

## Supported Networks

| Network | Chain ID |
|---------|----------|
| Ethereum | 1 |
| Polygon | 137 |
| Arbitrum | 42161 |
| Optimism | 10 |
| Base | 8453 |
| Linea | 59144 |
| Scroll | 534352 |
| Fantom | 250 |
| Avalanche | 43114 |
| Gnosis | 100 |

...and many more. See `ChainId` enum for the full list.

## Peer Dependencies

This SDK requires ethers.js v5:

```bash
npm install ethers@5.7.0 @ethersproject/address @ethersproject/contracts @ethersproject/providers
```

## License

MIT
