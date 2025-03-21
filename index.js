const axios = require('axios');
const express = require('express');
const cors = require('cors'); // Add this
const app = express();

// Enable CORS for all origins (or specify your Webflow domain)
app.use(cors()); // Allows all origins, e.g., '*'

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

async function fetchUSDCPools() {
  try {
    console.log('Fetching Orca pools...');
    const orcaResponse = await axios.get('https://api.orca.so/pools');
    console.log('Orca response: ', orcaResponse.data.length, 'pools found');
    console.log('Sample Orca pool:', JSON.stringify(orcaResponse.data[0]));
    const orcaPools = (orcaResponse.data || [])
      .filter(pool => {
        const isUSDCPool = pool?.name?.includes('USDC');
        if (isUSDCPool) console.log('Orca USDC pool:', pool.name);
        return isUSDCPool;
      })
      .map(pool => ({
        pair: pool?.name || 'Unknown/Unknown',
        liquidity: pool?.liquidity || 0,
        source: 'Orca'
      }));

    const allPools = [...orcaPools];
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
