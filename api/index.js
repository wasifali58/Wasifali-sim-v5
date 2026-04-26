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
  return Object.entries(COOKIES).map(([k,v]) => `${k}=${v}`).join('; ');
}

function clean(str) {
  if (!str) return 'N/A';
  return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractVisibleText(html) {
  // Remove script, style, noscript tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                 .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
                 .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
                 .replace(/<[^>]+>/g, ' ')           // all HTML tags
                 .replace(/\s+/g, ' ')               // collapse whitespace
                 .trim();
  return text;
}

function extractDataFromText(text, phone) {
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

  // 1. CNIC – 13 digits
  const cnicMatch = text.match(/\b\d{13}\b/);
  if (cnicMatch) record.CNIC = cnicMatch[0];

  // 2. Name – look after "Name", "Owner", "Customer", etc.
  const namePatterns = [
    /Name\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
    /Owner\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
    /Customer\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
    /Full Name\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i
  ];
  for (let p of namePatterns) {
    const m = text.match(p);
    if (m && m[1] && m[1].length < 40 && !m[1].includes('Sim') && !m[1].includes('Details')) {
      record.Name = clean(m[1]);
      break;
    }
  }
  // If still N/A, take any two consecutive capitalized words not containing "Sim Owner"
  if (record.Name === 'N/A') {
    const fallback = text.match(/([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
    if (fallback && fallback[0].length < 30 && !fallback[0].includes('Sim Owner')) {
      record.Name = fallback[0];
    }
  }

  // 3. Address – after "Address"
  const addrMatch = text.match(/Address\s*:\s*([^,.]+(?:,[^,.]+){0,2})/i);
  if (addrMatch) record.Address = clean(addrMatch[1]);

  // 4. Province – after "Province" or match known provinces
  let provMatch = text.match(/Province\s*:\s*([A-Za-z]+)/i);
  if (!provMatch) provMatch = text.match(/\b(Punjab|Sindh|Khyber|KPK|Balochistan|Islamabad)\b/i);
  if (provMatch) record.Province = clean(provMatch[1] || provMatch[0]);

  // 5. City – after "City" or "District"
  let cityMatch = text.match(/City\s*:\s*([A-Za-z\s]+)/i);
  if (!cityMatch) cityMatch = text.match(/District\s*:\s*([A-Za-z\s]+)/i);
  if (cityMatch) record.City = clean(cityMatch[1]);

  // 6. Network – after "Network" or "Operator", or match known names
  let netMatch = text.match(/Network\s*:\s*([A-Za-z]+)/i);
  if (!netMatch) netMatch = text.match(/Operator\s*:\s*([A-Za-z]+)/i);
  if (!netMatch) netMatch = text.match(/\b(Jazz|Zong|Telenor|Ufone|Warid)\b/i);
  if (netMatch) record.Network = clean(netMatch[1] || netMatch[0]);

  // 7. Status
  const statusMatch = text.match(/Status\s*:\s*([A-Za-z]+)/i);
  if (statusMatch) record.Status = clean(statusMatch[1]);

  // 8. Gender
  const genderMatch = text.match(/Gender\s*:\s*([A-Za-z]+)/i);
  if (genderMatch) record.Gender = clean(genderMatch[1]);

  // 9. Union Council
  const ucMatch = text.match(/Union\s*Council\s*:\s*([A-Za-z0-9\s]+)/i);
  if (ucMatch) record.Union_Council = clean(ucMatch[1]);

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ur-PK;q=0.8',
        'Referer': REFERER,
        'Cookie': getCookieString(),
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 20000
    });

    const html = response.data;
    const visibleText = extractVisibleText(html);
    const record = extractDataFromText(visibleText, phoneWithZero);

    const hasData = record.Name !== 'N/A' && record.Name !== 'Sim Owner Details' &&
                    (record.CNIC !== 'N/A' || record.Address !== 'N/A' || record.Network !== 'N/A');

    if (!hasData) {
      return res.json({
        success: false,
        message: '❌ No data found. The site may have changed or the number is not in database.',
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
