const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();

// Configure CORS to allow requests from your Webflow domain
const corsOptions = {
  origin: 'https://3rdtest.webflow.io', // Explicitly allow your Webflow domain
  optionsSuccessStatus: 200 // Ensure preflight OPTIONS requests succeed
};
app.use(cors(corsOptions));

// Fetch token metadata including mint addresses
async function fetchTokenMetadata() {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json');
    const tokenMap = response.data.tokens.reduce((acc, token) => {
      acc[token.symbol] = {
        mint: token.address,
        logoURI: token.logoURI,
        symbol: token.symbol
      };
      return acc;
    }, {});
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

// Fetch Orca USDC pools and add tradeUrl
async function fetchOrcaUSDCPools() {
  try {
    console.log('Fetching Orca pools...');
    const orcaResponse = await axios.get('https://api.orca.so/pools');
    const tokenMetadata = await fetchTokenMetadata();

    console.log('Orca response: ', orcaResponse.data.length, 'pools found');
    console.log('Sample Orca pool:', JSON.stringify(orcaResponse.data[0]));

    const orcaPools = (orcaResponse.data || [])
      .filter(pool => pool?.name?.includes('USDC'))
      .map(pool => {
        const [token0Part, token1Part] = pool.name.split('/');
        const token0Symbol = token0Part.replace(/\[.*\]/, '').trim();
        const token1Symbol = token1Part.replace(/\[.*\]/, '').trim();

        const token0Data = tokenMetadata[token0Symbol] || {
          mint: 'unknown',
          logoURI: 'https://your-fallback-image-url.com/fallback.png',
          symbol: token0Symbol
        };
        const token1Data = tokenMetadata[token1Symbol] || {
          mint: 'unknown',
          logoURI: 'https://your-fallback-image-url.com/fallback.png',
          symbol: token1Symbol
        };

        // Construct the Orca trade URL using mint addresses
        const tradeUrl = `https://www.orca.so/?tokenIn=${token0Data.mint}&tokenOut=${token1Data.mint}`;

        return {
          ...pool,
          source: 'Orca',
          token0Icon: token0Data.logoURI,
          token1Icon: token1Data.logoURI,
          token0Symbol,
          token1Symbol,
          token0Mint: token0Data.mint,
          token1Mint: token1Data.mint,
          tradeUrl // Add tradeUrl to the pool object
        };
      });

    console.log('Total Orca USDC pools:', orcaPools.length);
    return orcaPools;
  } catch (error) {
    console.error('Error fetching Orca pools:', error.message, error.response?.status);
    return [];
  }
}

// Fetch Raydium USDC pools and add tradeUrl
async function fetchRaydiumUSDCPools() {
  try {
    console.log('Fetching Raydium pools...');
    const raydiumResponse = await axios.get('https://api.raydium.io/v2/sdk/liquidity/mainnet.json');
    const tokenMetadata = await fetchTokenMetadata();

    const allPools = raydiumResponse.data.official || raydiumResponse.data; // Adjust based on API response structure
    const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC mint address on Solana

    // Filter for USDC pools and limit to the first 3
    const raydiumPools = allPools
      .filter(pool => pool.baseMint === usdcMint || pool.quoteMint === usdcMint)
      .slice(0, 3) // Take only the first 3 pools
      .map(pool => {
        const baseToken = tokenMetadata[pool.baseMint] || {
          symbol: 'Unknown',
          logoURI: 'https://your-fallback-image-url.com/fallback.png',
          mint: pool.baseMint
        };
        const quoteToken = tokenMetadata[pool.quoteMint] || {
          symbol: 'Unknown',
          logoURI: 'https://your-fallback-image-url.com/fallback.png',
          mint: pool.quoteMint
        };

        // Construct the Raydium trade URL using mint addresses
        const tradeUrl = `https://raydium.io/swap/?inputMint=${pool.baseMint}&outputMint=${pool.quoteMint}`;

        return {
          name: `${baseToken.symbol}/${quoteToken.symbol}`,
          token0Mint: pool.baseMint,
          token1Mint: pool.quoteMint,
          token0Icon: baseToken.logoURI,
          token1Icon: quoteToken.logoURI,
          liquidity: pool.liquidity || 'N/A',
          price: pool.price || 'N/A',
          source: 'Raydium',
          tradeUrl
        };
      });

    console.log('Total Raydium USDC pools fetched:', raydiumPools.length);
    return raydiumPools;
  } catch (error) {
    console.error('Error fetching Raydium pools:', error.message, error.response?.status);
    return [];
  }
}
// API endpoint for Orca USDC pools
app.get('/api/usdc-pools', async (req, res) => {
  try {
    const pools = await fetchOrcaUSDCPools();
    if (pools.length === 0) {
      res.json({ message: 'No Orca USDC pools found', data: [] });
    } else {
      res.json(pools);
    }
  } catch (error) {
    console.error('Error in /api/usdc-pools:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// API endpoint for Raydium USDC pools
app.get('/api/raydium-usdc-pools', async (req, res) => {
  try {
    const pools = await fetchRaydiumUSDCPools();
    if (pools.length === 0) {
      res.json({ message: 'No Raydium USDC pools found', data: [] });
    } else {
      res.json(pools);
    }
  } catch (error) {
    console.error('Error in /api/raydium-usdc-pools:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Optional: Add a catch-all for 404s to ensure CORS headers are included
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;
