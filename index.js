const axios = require('axios');
const express = require('express');
const app = express();

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

async function fetchUSDCPools() {
  try {
    // Fetch Orca pools
    console.log('Fetching Orca pools...');
    const orcaResponse = await axios.get('https://api.orca.so/pools');
    console.log('Orca response:', orcaResponse.data.length, 'pools found');
    const orcaPools = (orcaResponse.data || [])
      .filter(pool => {
        const isUSDCPool = (pool?.tokenA?.mint === USDC_MINT) || (pool?.tokenB?.mint === USDC_MINT);
        if (isUSDCPool) console.log('Orca USDC pool:', pool?.tokenA?.symbol, pool?.tokenB?.symbol);
        return isUSDCPool;
      })
      .map(pool => ({
        pair: `${pool?.tokenA?.symbol || 'Unknown'}/${pool?.tokenB?.symbol || 'Unknown'}`,
        liquidity: pool?.liquidity || 0,
        source: 'Orca'
      }));

    // Fetch Raydium pools
    console.log('Fetching Raydium pools...');
    const raydiumResponse = await axios.get('https://api.raydium.io/v2/amm/pools');
    console.log('Raydium response:', raydiumResponse.data.length, 'pools found');
    const raydiumPools = (raydiumResponse.data || [])
      .filter(pool => {
        const isUSDCPool = (pool?.baseMint === USDC_MINT) || (pool?.quoteMint === USDC_MINT);
        if (isUSDCPool) console.log('Raydium USDC pool:', pool?.baseSymbol, pool?.quoteSymbol);
        return isUSDCPool;
      })
      .map(pool => ({
        pair: `${pool?.baseSymbol || pool?.baseMint || 'Unknown'}/${pool?.quoteSymbol || pool?.quoteMint || 'Unknown'}`,
        liquidity: pool?.liquidity || 0,
        source: 'Raydium'
      }));

    const allPools = [...orcaPools, ...raydiumPools];
    console.log('Total USDC pools:', allPools.length);
    return allPools;
  } catch (error) {
    console.error('Error fetching pools:', error.message, error.response?.status);
    return [];
  }
}

app.get('/api/usdc-pools', async (req, res) => {
  const pools = await fetchUSDCPools();
  if (pools.length === 0) {
    res.json({ message: 'No USDC pools found', data: [] });
  } else {
    res.json(pools);
  }
});

module.exports = app;
