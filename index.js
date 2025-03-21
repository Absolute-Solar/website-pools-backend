const axios = require('axios');
const express = require('express');
const app = express();

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

async function fetchUSDCPools() {
  try {
    // Fetch Orca pools
    console.log('Fetching Orca pools...');
    const orcaResponse = await axios.get('https://api.orca.so/pools');
    console.log('Orca response: ', orcaResponse.data.length, 'pools found');
    console.log('Sample Orca pool:', JSON.stringify(orcaResponse.data[0])); // Log first pool
    const orcaPools = (orcaResponse.data || [])
      .filter(pool => {
        // Check if 'USDC' is in the pool name
        const isUSDCPool = pool?.name?.includes('USDC');
        if (isUSDCPool) console.log('Orca USDC pool:', pool.name);
        return isUSDCPool;
      })
      .map(pool => ({
        pair: pool?.name || 'Unknown/Unknown', // Use name directly as pair
        liquidity: pool?.liquidity || 0,
        source: 'Orca'
      }));

    // Skip Raydium for now due to 404
    /*
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
    */

    const allPools = [...orcaPools /*, ...raydiumPools*/];
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
