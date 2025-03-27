const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

// Fetch token list for metadata (you could cache this)
async function fetchTokenMetadata() {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json');
    return response.data.tokens.reduce((acc, token) => {
      acc[token.address] = {
        logoURI: token.logoURI,
        symbol: token.symbol
      };
      return acc;
    }, {});
  } catch (error) {
    console.error('Error fetching token metadata:', error.message);
    return {};
  }
}

async function fetchUSDCPools() {
  try {
    console.log('Fetching Orca pools...');
    const orcaResponse = await axios.get('https://api.orca.so/pools');
    const tokenMetadata = await fetchTokenMetadata();

    console.log('Orca response: ', orcaResponse.data.length, 'pools found');
    console.log('Sample Orca pool:', JSON.stringify(orcaResponse.data[0]));

    const orcaPools = (orcaResponse.data || [])
      .filter(pool => pool?.name?.includes('USDC'))
      .map(pool => {
        // Extract token mints from pool data (adjust based on actual Orca API response structure)
        const token0Mint = pool.tokenA?.mint || pool.mintA;
        const token1Mint = pool.tokenB?.mint || pool.mintB;

        return {
          ...pool,
          source: 'Orca',
          token0Icon: tokenMetadata[token0Mint]?.logoURI || 'https://via.placeholder.com/24', // Fallback image
          token1Icon: tokenMetadata[token1Mint]?.logoURI || 'https://via.placeholder.com/24',
          token0Symbol: tokenMetadata[token0Mint]?.symbol || 'Unknown',
          token1Symbol: tokenMetadata[token1Mint]?.symbol || 'Unknown'
        };
      });

    console.log('Total USDC pools:', orcaPools.length);
    return orcaPools;
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
