const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

async function fetchUSDCPools() {
  try {
    console.log('Fetching Orca pools...');
    const orcaResponse = await axios.get('https://api.orca.so/pools');
    console.log('Orca response: ', orcaResponse.data.length, 'pools found');
    console.log('Sample Orca pool:', JSON.stringify(orcaResponse.data[0]));
    const orcaPools = (orcaResponse.data || [])
      .filter(pool => pool?.name?.includes('USDC'))
      .map(pool => ({ ...pool, source: 'Orca' })); // Spread all pool fields and add source

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
