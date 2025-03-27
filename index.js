const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

async function fetchTokenMetadata() {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json');
    const tokenMap = response.data.tokens.reduce((acc, token) => {
      acc[token.address] = {
        logoURI: token.logoURI,
        symbol: token.symbol
      };
      return acc;
    }, {});
    console.log('Token metadata sample:', {
      USDC: tokenMap['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
      SOL: tokenMap['So11111111111111111111111111111111111111112']
    });
    return tokenMap;
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
        const token0Mint = pool.tokenA?.mint; // Adjust if field is different
        const token1Mint = pool.tokenB?.mint; // Adjust if field is different

        console.log('Pool mints:', {
          name: pool.name,
          token0Mint,
          token1Mint,
          token0Icon: tokenMetadata[token0Mint]?.logoURI,
          token1Icon: tokenMetadata[token1Mint]?.logoURI
        });

        return {
          ...pool,
          source: 'Orca',
          token0Icon: tokenMetadata[token0Mint]?.logoURI || 'https://yellow-negative-parrotfish-381.mypinata.cloud/ipfs/bafkreicnzpaug4uuvlcehputfus4slesveg4a6gx7y6ehafvqzvp5j2z44',
          token1Icon: tokenMetadata[token1Mint]?.logoURI || 'https://yellow-negative-parrotfish-381.mypinata.cloud/ipfs/bafkreicnzpaug4uuvlcehputfus4slesveg4a6gx7y6ehafvqzvp5j2z44',
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
