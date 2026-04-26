// api/index.js
const axios = require('axios');

const TARGET_URL = 'https://ownerdetail.datacorporation.com.pk/result-page/';
const REFERER = 'https://ownerdetail.datacorporation.com.pk/track-number/';

const COOKIES = {
  _ga: 'GA1.1.1455301204.1770130461',
  __gads: 'ID=d6cf01242b53db4b:T=1770130463:RT=1770130463:S=ALNI_MakDvPYZ9f0HxxsHhucgw_Dqo7ibQ',
  __gpi: 'UID=000012ee6279eedc:T=1770130463:RT=1770130463:S=ALNI_Mbs-ZC8aSGArLlht0Qy47hxzx3O3w',
  __eoi: 'ID=a0a706ab0de49769:T=1770130463:RT=1770130463:S=AA-AfjYNXg4xUss8WrHIHleiA7gd',
  FCCDCF: '%5Bnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2C%5B%5B32%2C%22%5B%5C%22a813df56-e2da-42f4-a3cb-914a6cee0dae%5C%22%2C%5B1770130467%2C40000000%5D%5D%22%5D%5D%5D',
  FCNEC: '%5B%5B%22AKsRol-OBllkDa3agfw6pryCMA_wtnQrRBcRULJOV9GLR42iD32Xhn8LhpBj5KnpsapoSkk3Aho-TjgeySf7R9KJ0undJMvS2uf95hHWGQMCzyd-uxm3aeVnqiwARZ9YzruyFwUbwRCDE9wHYc0IhIKjcn5-rS8LRA%3D%3D%22%5D%5D',
  _ga_HZX03VHGDT: 'GS2.1.s1770130460$o1$g1$t1770130544$j60$l0$h21430292',
  _ga_2BL9GP4ZMR: 'GS2.1.s1770130463$o1$g1$t1770130544$j60$l0$h0'
};

function getCookieString() {
  return Object.entries(COOKIES)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

function cleanText(text) {
  if (!text) return 'N/A';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractRealData(html, phone) {
  // Remove script and style tags content so they don't interfere
  let cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  
  const record = {
    Name: 'N/A',
    Mobile: phone,
    CNIC: 'N/A',
    Address: 'N/A',
    Province: 'N/A',
    City: 'N/A',
    Network: 'N/A',
    Status: 'N/A',
    Gender: 'N/A',
    Union_Council: 'N/A'
  };

  // 1. Extract CNIC (13 digits) - most reliable
  const cnicMatch = cleanHtml.match(/\b\d{13}\b/);
  if (cnicMatch) record.CNIC = cnicMatch[0];

  // 2. Extract Name from visible text (not inside inputs)
  const namePatterns = [
    /Name<\/th>\s*<td[^>]*>([^<]+)<\/td>/i,
    /Owner\s*Name<\/th>\s*<td[^>]*>([^<]+)<\/td>/i,
    /<strong>Name<\/strong>\s*:\s*([^<]+)/i,
    /"name":"([^"]+)"/i
  ];
  for (let p of namePatterns) {
    const m = cleanHtml.match(p);
    if (m && m[1] && !m[1].includes('placeholder') && m[1].length < 100) {
      record.Name = cleanText(m[1]);
      break;
    }
  }

  // 3. Address
  const addrPatterns = [
    /Address<\/th>\s*<td[^>]*>([^<]+)<\/td>/i,
    /<strong>Address<\/strong>\s*:\s*([^<]+)/i,
    /"address":"([^"]+)"/i
  ];
  for (let p of addrPatterns) {
    const m = cleanHtml.match(p);
    if (m && m[1] && !m[1].includes('placeholder')) {
      record.Address = cleanText(m[1]);
      break;
    }
  }

  // 4. Province
  const provMatch = cleanHtml.match(/Province<\/th>\s*<td[^>]*>([^<]+)<\/td>/i) ||
                    cleanHtml.match(/Punjab|Sindh|KPK|Balochistan|Islamabad/i);
  if (provMatch) record.Province = cleanText(provMatch[1] || provMatch[0]);

  // 5. City
  const cityMatch = cleanHtml.match(/City<\/th>\s*<td[^>]*>([^<]+)<\/td>/i) ||
                    cleanHtml.match(/Lahore|Karachi|Islamabad|Rawalpindi|Multan|Faisalabad|Quetta|Peshawar/i);
  if (cityMatch) record.City = cleanText(cityMatch[1] || cityMatch[0]);

  // 6. Network
  const netMatch = cleanHtml.match(/Network<\/th>\s*<td[^>]*>([^<]+)<\/td>/i) ||
                   cleanHtml.match(/Jazz|Zong|Telenor|Ufone|Warid/i);
  if (netMatch) record.Network = cleanText(netMatch[1] || netMatch[0]);

  // 7. Status
  const statusMatch = cleanHtml.match(/Status<\/th>\s*<td[^>]*>([^<]+)<\/td>/i) ||
                      cleanHtml.match(/Active|Inactive|Blocked/i);
  if (statusMatch) record.Status = cleanText(statusMatch[1] || statusMatch[0]);

  // 8. Gender
  const genderMatch = cleanHtml.match(/Gender<\/th>\s*<td[^>]*>([^<]+)<\/td>/i) ||
                      cleanHtml.match(/Male|Female/i);
  if (genderMatch) record.Gender = cleanText(genderMatch[1] || genderMatch[0]);

  // 9. Union Council
  const ucMatch = cleanHtml.match(/Union\s*Council<\/th>\s*<td[^>]*>([^<]+)<\/td>/i) ||
                  cleanHtml.match(/UC<\/th>\s*<td[^>]*>([^<]+)<\/td>/i);
  if (ucMatch) record.Union_Council = cleanText(ucMatch[1]);

  // If still no name, try to find any text that looks like a person name (two words, not too long)
  if (record.Name === 'N/A') {
    const possibleName = cleanHtml.match(/([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
    if (possibleName && possibleName[0].length < 30) record.Name = possibleName[0];
  }

  return record;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { search } = req.method === 'GET' ? req.query : req.body;

  if (!search) {
    return res.json({
      success: false,
      message: '❌ Please provide phone number',
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });
  }

  const cleanPhone = search.replace(/\D/g, '');
  const phoneWithZero = cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone;

  try {
    const response = await axios.get(TARGET_URL, {
      params: { sim_info_mobile: phoneWithZero },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ur-PK;q=0.8,ur;q=0.7',
        'Referer': REFERER,
        'Cookie': getCookieString(),
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 20000
    });

    const html = response.data;
    const record = extractRealData(html, phoneWithZero);

    // Check if we got any real data
    const hasData = record.Name !== 'N/A' || record.CNIC !== 'N/A' || record.Address !== 'N/A';
    
    if (!hasData) {
      return res.json({
        success: false,
        message: '❌ No data found for this number',
        records: [],
        developer: 'WASIF ALI',
        telegram: '@FREEHACKS95'
      });
    }

    return res.json({
      success: true,
      message: '✅ Record found',
      records: [record],
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });

  } catch (error) {
    return res.json({
      success: false,
      message: '⚠️ Error: ' + error.message,
      records: [],
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });
  }
};
