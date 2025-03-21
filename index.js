const axios = require('axios');
const express = require('express');
const app = express();

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

async function fetchUSDCPools() {
  try {
    // Fetch Orca pools
    const orcaResponse = await axios.get('https://api.orca.so/pools');
    const orcaPools = (orcaResponse.data || [])
      .filter(pool => 
        (pool?.tokenA?.mint === USDC_MINT) || (pool?.tokenB?.mint === USDC_MINT)
      )
      .map(pool => ({
        pair: `${pool?.tokenA?.symbol || 'Unknown'}/${pool?.tokenB?.symbol || 'Unknown'}`,
        liquidity: pool?.liquidity || 0,
        source: 'Orca'
      }));

    // Fetch Raydium pools
    const raydiumResponse = await axios.get('https://api.raydium.io/v2/amm/pools');
    const raydiumPools = (raydiumResponse.data || [])
      .filter(pool => 
        (pool?.baseMint === USDC_MINT) || (pool?.quoteMint === USDC_MINT)
      )
      .map(pool => ({
        pair: `${pool?.baseSymbol || pool?.baseMint || 'Unknown'}/${pool?.quoteSymbol || pool?.quoteMint || 'Unknown'}`,
        liquidity: pool?.liquidity || 0,
        source: 'Raydium'
      }));

    return [...orcaPools, ...raydiumPools];
  } catch (error) {
    console.error('Error fetching pools:', error.message);
    return []; // Return empty array on failure to prevent downstream errors
  }
}

app.get('/api/usdc-pools', async (req, res) => {
  const pools = await fetchUSDCPools();
  res.json(pools);
});

module.exports = app; // For Vercel compatibility
app.listen(3000, () => console.log('Server running'));
