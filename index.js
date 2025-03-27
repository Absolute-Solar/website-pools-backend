const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

// Fetch token metadata from Solana token list
async function fetchTokenMetadata() {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json');
    const tokenMap = {};
    response.data.tokens.forEach(token => {
      tokenMap[token.symbol] = {
        mint: token.address,
        logoURI: token.logoURI
      };
    });
    console.log('Token metadata sample:', {
      USDC: tokenMap['USDC'],
      SOL: tokenMap['SOL']
    });
    return tokenMap;
  } catch (error) {
    console.error('Error fetching token metadata:', error.message);
    return {};
  }
}

// Fetch USDC pools from Orca API
async function fetchUSDCPools() {
  try {
    console.log('Fetching Orca pools...');
    const orcaResponse = await axios.get('https://api.orca.so/pools');
    const tokenMetadata = await fetchTokenMetadata();

    console.log('Orca response:', orcaResponse.data.length, 'pools found');
    console.log('Sample Orca pool:', JSON.stringify(orcaResponse.data[0]));

    const orcaPools = (orcaResponse.data || [])
      .filter(pool => pool?.name?.includes('USDC')) // Filter for USDC pools
      .map(pool => {
        // Split the name to get token symbols (e.g., "SOL/USDC" -> ["SOL", "USDC"])
        const [token0Symbol, token1Symbol] = pool.name.split('/');

        // Look up metadata for each token symbol
        const token0Data = tokenMetadata[token0Symbol] || {
          mint: 'unknown',
          logoURI: 'https://example.com/fallback.png' // Replace with your fallback image URL
        };
        const token1Data = tokenMetadata[token1Symbol] || {
          mint: 'unknown',
          logoURI: 'https://example.com/fallback.png' // Replace with your fallback image URL
        };

        // Log for debugging
        console.log('Pool tokens:', {
          name: pool.name,
          token0Symbol,
          token1Symbol,
          token0Mint: token0Data.mint,
          token1Mint: token1Data.mint,
          token0Icon: token0Data.logoURI,
          token1Icon: token1Data.logoURI
        });

        // Return pool data with added token info
        return {
          ...pool,
          source: 'Orca',
          token0Icon: token0Data.logoURI,
          token1Icon: token1Data.logoURI,
          token0Symbol,
          token1Symbol,
          token0Mint: token0Data.mint,
          token1Mint: token1Data.mint
        };
      });

    console.log('Total USDC pools:', orcaPools.length);
    return orcaPools;
  } catch (error) {
    console.error('Error fetching pools:', error.message, error.response?.status);
    return [];
  }
}

// API endpoint
app.get('/api/usdc-pools', async (req, res) => {
  const pools = await fetchUSDCPools();
  if (pools.length === 0) {
    res.json({ message: 'No USDC pools found', data: [] });
  } else {
    res.json(pools);
  }
});

module.exports = app;
