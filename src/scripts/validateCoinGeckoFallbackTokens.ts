#!/usr/bin/env bun
import { ChainId, COLLATERALS } from '../index'
import PQueue from 'p-queue'
import { isEmpty } from 'lodash'

const COINGECKO_ID: Partial<Record<ChainId, string>> = {
  [ChainId.MATIC]: 'polygon-pos',
  [ChainId.FANTOM]: 'fantom',
  [ChainId.AVALANCHE]: 'avalanche',
  [ChainId.METIS]: 'metis-andromeda',
  [ChainId.XDAI]: 'xdai',
  [ChainId.OPTIMISM]: 'optimistic-ethereum',
  [ChainId.ARBITRUM]: 'arbitrum-one',
  [ChainId.BSC]: 'binance-smart-chain',
  [ChainId.MAINNET]: 'ethereum',
  [ChainId.MOONRIVER]: 'moonriver',
  [ChainId.MOONBEAM]: 'moonbeam',
  [ChainId.HARMONY]: 'harmony-shard-0',
  [ChainId.BASE]: 'base',
  [ChainId.LINEA]: 'linea',
}

interface CoinGeckoResponse {
  name?: string
  [key: string]: unknown
}

type CollateralArrays = typeof COLLATERALS
type CollateralArray = CollateralArrays[keyof CollateralArrays]
type AnyCollateral = CollateralArray[number]
type CollateralWithFallback = Extract<AnyCollateral, { fallbackUnderlyingAddress: string }>

function collateralName(c: Record<string, unknown>): string {
  const snapshotName = typeof c?.snapshotName === 'string' ? c.snapshotName : undefined
  const tokenName = (c?.token as Record<string, unknown>)?.name
  const chainId = c?.chainId
  return snapshotName || (tokenName ? `${tokenName} on ${chainId}` : `Token on ${chainId}`)
}

async function fetchWithRetry(url: string, maxRetries = 5, baseDelay = 30000): Promise<CoinGeckoResponse> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url)
      const json = await response.json()

      // Check for rate limit error
      if (json.status?.error_code === 429) {
        if (attempt === maxRetries) {
          console.error(`Rate limit exceeded after ${maxRetries} retries`)
          return json
        }

        // Exponential backoff: 30s, 60s, 120s, 240s, 480s
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`Rate limited. Waiting ${delay / 1000}s before retry ${attempt + 1}/${maxRetries}...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      return json
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Fetch failed after ${maxRetries} retries:`, error)
        throw error
      }

      const delay = baseDelay * Math.pow(2, attempt)
      console.log(`Fetch error. Waiting ${delay / 1000}s before retry ${attempt + 1}/${maxRetries}...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw new Error('Unexpected retry loop exit')
}

const main = async (): Promise<void> => {
  // More conservative rate limiting: 1 request every 15 seconds (4 per minute)
  const queue = new PQueue({ concurrency: 1, interval: 15000, intervalCap: 1 })

  const fallBackCollaterals = (Object.values(COLLATERALS).flat() as AnyCollateral[]).filter(
    (c): c is CollateralWithFallback => {
      const coll = c as Record<string, unknown>
      return !coll.deprecated && typeof coll.fallbackUnderlyingAddress === 'string'
    }
  )

  console.log(
    `Checking ${fallBackCollaterals.length} tokens (this will take ~${Math.ceil(
      (fallBackCollaterals.length * 15) / 60
    )} minutes)...`
  )

  const failingTokens: Array<{ c: CollateralWithFallback; json: CoinGeckoResponse | void }> = []

  await Promise.all(
    fallBackCollaterals.map(async (c, index) => {
      const contractAddress = c.fallbackUnderlyingAddress
      const assetPlatform = COINGECKO_ID[c.chainId]

      const json = await queue.add(() =>
        fetchWithRetry(
          `https://api.coingecko.com/api/v3/coins/${assetPlatform}/contract/${contractAddress?.toLowerCase()}`
        )
      )

      console.log(`[${index + 1}/${fallBackCollaterals.length}] Checked ${collateralName(c)}`)

      if (!json || !json.name) {
        console.error(c)
        failingTokens.push({ c, json })
      } else {
        console.log(`  ✓ Found token: ${json.name}`)
      }
    })
  )

  if (!isEmpty(failingTokens)) {
    console.log('\n❌ Failing Tokens:')
    failingTokens.forEach((token) => {
      console.log(token)
    })
    process.exit(1)
  }

  console.log(`\n✅ All ${fallBackCollaterals.length} tokens validated successfully!`)
}

void main()
