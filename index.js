const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const serverless = require("serverless-http");

const app = express();
const port = process.env.PORT || 3001; // Use the provided port or default to 3001

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Function to check domain availability (asynchronously)
async function checkDomainAvailability(domainName) {
  const apiKey = 'f2825c140329e4cb2d600';
  const endpoint = `https://www.namesilo.com/api/checkRegisterAvailability?version=1&type=json&key=${apiKey}&domains=${encodeURIComponent(domainName)}`;

  try {
    const response = await axios.get(endpoint);
    const data = response.data;

    if (data.reply.code === 300 && data.reply.detail === 'success') {
      if (data.reply.available) {
        return { available: true, price: data.reply.available.domain.price };
      } else {
        return { available: false };
      }
    } else {
      throw new Error('Failed to check domain availability');
    }
  } catch (error) {
    console.error('Error checking domain availability:', error);
    throw error;
  }
}

// Endpoint to check domain availability
app.get('/checkDomain', async (req, res) => {
  const domainName = req.query.domain;

  if (!domainName) {
    return res.status(400).json({ error: 'Domain name is required' });
  }

  try {
    const result = await checkDomainAvailability(domainName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


async function getCryptoPrice(id) {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${id}`;
  const options = {
    method: 'GET',
    headers: { 
      accept: 'application/json',
      'x-cg-demo-api-key': 'CG-igXaxww4mqKs2rbrhpHrVBWc' 
    }
  };

  try {
    const response = await axios(url, options);
    const data = response.data;
    
    if (data && data.length > 0) {
      const crypto = data[0];
      return {
        [crypto.id]: {
          usd: crypto.current_price,
          usd_market_cap: crypto.market_cap,
          usd_24h_vol: crypto.total_volume,
          usd_24h_change: crypto.price_change_percentage_24h,
          last_updated_at: crypto.last_updated
        }
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('error:', error);
    return null;
  }
}

// Endpoint to get crypto price
app.get('/getCryptoPrice', async (req, res) => {
  const id = req.query.id;

  if (!id) {
    return res.status(400).json({ error: 'Cryptocurrency ID is required' });
  }

  try {
    const result = await getCryptoPrice(id);
    if (result) {
      res.json(result);
    } else {
      res.status(404).json({ error: 'Cryptocurrency not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Example endpoint: '/getTokenDetails' (from your original code)
app.get('/getTokenDetails', async (req, res) => {
  try {
    // Assuming you receive tokenAddress from the React app as a query parameter
    const tokenAddress = req.query.tokenAddress;
    const headers = {
      'X-QKNTL-KEY': 'ae43ddc3e7c4442f905d89336b960563',
    };
    // Make the POST request to the external API
    const response = await axios.post('https://api.quickintel.io/v1/getquickiauditfull', {
      chain: 'eth', // 'eth' is hardcoded based on your requirements
      tokenAddress: tokenAddress,
    }, {headers});

    // Extract the required information from the response
    const {
      tokenDetails: { tokenName, tokenSymbol, tokenOwner, tokenSupply },
      tokenDynamicDetails: { is_Honeypot, lp_Locks },
    } = response.data;

    // Construct the object to be returned
    const result = {
      tokenName: tokenName,
      tokenSymbol: tokenSymbol,
      tokenOwner: tokenOwner,
      tokenSupply: tokenSupply,
      isHoneypot: is_Honeypot,
      lpLocks: lp_Locks !== null ? lp_Locks : "Burned",
    };

    // Send the result back to the React app
    res.json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Example endpoint: '/getTokenEvents' (from your original code)
app.get('/getTokenEvents', async (req, res) => {
  try {
    // Make the GET request to the CoinMarketCal API
    const response = await axios.get('https://developers.coinmarketcal.com/v1/events', {
      headers: {
        'x-api-key': 'CO9FGdFk1s3vS3PuPY4XV5tJU43PBeuC8V5QUBqx',
        'Accept-Encoding': 'deflate, gzip',
        'Accept': 'application/json',
      },
    });

    // Extract the top 6 events from the response
    const top5Events = response.data.body.slice(0, 5).map(event => ({
      title: event.title.en,
      fullname: event.coins[0].fullname,
    }));

    // Send the top 5 events back to the React app
    res.json(top5Events);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Example endpoint: '/getTopGainers' (from your original code)
app.get('/getTopGainers', async (req, res) => {
  try {
    // Make the POST request to the Defined.fi GraphQL API
    const response = await axios.post(
      'https://graph.defined.fi/graphql',
      {
        query: `
          {
            listTopTokens(limit: 10, networkFilter: 1, resolution: "1D") {
              address
              decimals
              exchanges {
                address
                id
                name
                iconUrl
                networkId
                tradeUrl
              }
              id
              liquidity
              name
              networkId
              price
              priceChange
              priceChange1
              priceChange4
              priceChange12
              priceChange24
              resolution
              symbol
              topPairId
              volume
            }
          }
        `,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: '7b7401b9f6ca72eeb7fd977c113dc0dd20b1c034',
        },
      }
    );

    // Extract relevant data from the response
    const topGainers = response.data.data.listTopTokens.map(token => ({
      name: token.name,
      symbol: token.symbol,
      price: token.price,
      priceChange: token.priceChange,
      priceChange1: token.priceChange1,
      priceChange4: token.priceChange4,
      priceChange12: token.priceChange12,
      priceChange24: token.priceChange24,
      volume: token.volume,
    }));

    // Send the top gainers back to the React app
    res.json(topGainers);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Example endpoint: '/getLatestTokens' (from your original code)
app.get('/getLatestTokens', async (req, res) => {
  try {
    // Make the POST request to the Defined.fi GraphQL API
    const response = await axios.post(
      'https://graph.defined.fi/graphql',
      {
        query: `
          {
            getLatestTokens(limit: 5, networkFilter: 1) {
              items {
                id
                tokenAddress
                networkId
                blockNumber
                transactionIndex
                traceIndex
                transactionHash
                blockHash
                timeCreated
                creatorAddress
                creatorBalance
                tokenName
                totalSupply
                tokenSymbol
                decimals
                simulationResults {
                  buySuccess
                  buyTax
                  buyGasUsed
                  sellSuccess
                  sellTax
                  sellGasUsed
                  canTransferOwnership
                  canRenounceOwnership
                  isOwnerRenounced
                  openTradingCall
                }
              }
            }
          }
        `,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: '57efd78a3f4001cdd24b36f13358e407e86e4f22',
        },
      }
    );

    // Extract relevant data from the response
    const latestTokens = response.data.data.getLatestTokens.items.map(token => ({
      id: token.id,
      tokenAddress: token.tokenAddress,
      networkId: token.networkId,
      blockNumber: token.blockNumber,
      transactionIndex: token.transactionIndex,
      // ... (add more fields as needed)
    }));

    // Send the latest tokens back to the React app
    res.json(latestTokens);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Example endpoint: '/listCoins' (from your original code)
app.get('/listCoins', async (req, res) => {
  try {
    const response = await axios.post(
      'https://www.livecoinwatch.com/tools/api',
      {
        currency: "USD",
        sort: "rank",
        order: "ascending",
        offset: 0,
        limit: 5,
        meta: true
      },
      {
        headers: {
          'x-api-key': "4a181ab9-993f-47b4-a51a-891731192a49",
          'Content-Type': 'application/json'
        }
      }
    );

    const data = response.data;
    const result = data.map(coin => ({
      name: coin.name,
      symbol: coin.symbol,
      price: coin.rate
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Server start
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports.handler = serverless(app);
