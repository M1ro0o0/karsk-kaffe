const fetch = require("node-fetch");

async function getZohoAccessToken() {

  const response = await fetch(
    "https://accounts.zoho.eu/oauth/v2/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret:
          process.env.ZOHO_CLIENT_SECRET,
        refresh_token:
          process.env.ZOHO_REFRESH_TOKEN
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {

    console.error(
      "ZOHO TOKEN ERROR:",
      data
    );

    throw new Error(
      "Failed to get Zoho access token"
    );
  }

  return data.access_token;
}

async function getItem(itemId) {

  const token =
    await getZohoAccessToken();

  const response = await fetch(
    `https://www.zohoapis.eu/inventory/v1/items/${itemId}?organization_id=${process.env.ZOHO_ORG_ID}`,
    {
      headers: {
        Authorization:
          `Zoho-oauthtoken ${token}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {

    console.error(
      "ZOHO ITEM ERROR:",
      data
    );

    throw new Error(
      "Failed to fetch Zoho item"
    );
  }

  return data.item;
}

module.exports = {
  getZohoAccessToken,
  getItem
};