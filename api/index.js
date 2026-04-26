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

function extractRealData(html, phone) {
  let cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  
  const result = {
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

  // 1. CNIC - 13 digits
  const cnicMatch = cleanHtml.match(/\b\d{13}\b/);
  if (cnicMatch) result.CNIC = cnicMatch[0];

  // 2. JSON data
  const jsonRegex = /<script[^>]*type=["'](?:application\/json|application\/ld\+json)["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const extractJson = (obj) => {
        if (typeof obj !== 'object') return;
        if (obj.name && typeof obj.name === 'string' && !obj.name.includes('{') && obj.name.length < 100) result.Name = clean(obj.name);
        if (obj.cnic && typeof obj.cnic === 'string') result.CNIC = clean(obj.cnic);
        if (obj.address) result.Address = clean(obj.address);
        if (obj.province) result.Province = clean(obj.province);
        if (obj.city) result.City = clean(obj.city);
        if (obj.network || obj.operator) result.Network = clean(obj.network || obj.operator);
        if (obj.status) result.Status = clean(obj.status);
        if (obj.gender) result.Gender = clean(obj.gender);
        for (let key in obj) {
          if (typeof obj[key] === 'object') extractJson(obj[key]);
        }
      };
      extractJson(json);
    } catch(e) {}
  }

  // 3. Table rows
  const tableRows = cleanHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
  if (tableRows) {
    for (let row of tableRows) {
      const th = row.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
      const td = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
      if (th && td) {
        let label = clean(th[1]).toLowerCase();
        let value = clean(td[1]);
        if (value === 'N/A' || value.includes('placeholder')) continue;
        if (label.includes('name') && !label.includes('placeholder')) result.Name = value;
        else if (label.includes('cnic')) result.CNIC = value;
        else if (label.includes('address')) result.Address = value;
        else if (label.includes('province')) result.Province = value;
        else if (label.includes('city') || label.includes('district')) result.City = value;
        else if (label.includes('network') || label.includes('operator')) result.Network = value;
        else if (label.includes('status')) result.Status = value;
        else if (label.includes('gender')) result.Gender = value;
        else if (label.includes('union') || label.includes('uc')) result.Union_Council = value;
      }
    }
  }

  // 4. Div blocks
  const divBlocks = cleanHtml.match(/<div[^>]*class="[^"]*(?:sim|owner|detail|info)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
  if (divBlocks) {
    for (let div of divBlocks) {
      const pairs = div.match(/<span[^>]*class="[^"]*label[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<span[^>]*class="[^"]*value[^"]*"[^>]*>([\s\S]*?)<\/span>/gi);
      if (pairs) {
        for (let pair of pairs) {
          const labelMatch = pair.match(/<span[^>]*class="[^"]*label[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
          const valueMatch = pair.match(/<span[^>]*class="[^"]*value[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
          if (labelMatch && valueMatch) {
            let label = clean(labelMatch[1]).toLowerCase();
            let value = clean(valueMatch[1]);
            if (value === 'N/A' || value.includes('placeholder')) continue;
            if (label.includes('name')) result.Name = value;
            else if (label.includes('cnic')) result.CNIC = value;
            else if (label.includes('address')) result.Address = value;
            else if (label.includes('province')) result.Province = value;
            else if (label.includes('city')) result.City = value;
            else if (label.includes('network')) result.Network = value;
            else if (label.includes('status')) result.Status = value;
            else if (label.includes('gender')) result.Gender = value;
          }
        }
      }
    }
  }

  // 5. Fallback direct patterns (avoid placeholders)
  const patterns = {
    Name: /(?:Name|Owner)\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    Address: /Address\s*:\s*([^<\n]+)/i,
    Province: /Province\s*:\s*([^<\n]+)/i,
    City: /City\s*:\s*([^<\n]+)/i,
    Network: /(?:Network|Operator)\s*:\s*([^<\n]+)/i,
    Status: /Status\s*:\s*([^<\n]+)/i,
    Gender: /Gender\s*:\s*([^<\n]+)/i
  };
  for (let [key, regex] of Object.entries(patterns)) {
    if (result[key] === 'N/A') {
      const m = cleanHtml.match(regex);
      if (m && m[1] && !m[1].includes('placeholder') && m[1].length < 50) result[key] = clean(m[1]);
    }
  }

  // 6. If Name still generic, try proper name pattern
  if (result.Name === 'N/A' || result.Name === 'Sim Owner' || result.Name.length < 3) {
    const possibleName = cleanHtml.match(/([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
    if (possibleName && possibleName[0].length < 30 && !possibleName[0].includes('Script')) result.Name = possibleName[0];
  }

  // Final cleanup
  for (let key in result) {
    if (typeof result[key] === 'string') result[key] = result[key].replace(/&[a-z]+;/g, ' ').trim();
    if (result[key] === '' || result[key] === 'N/A') result[key] = 'N/A';
  }

  return result;
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
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/146.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': REFERER,
        'Cookie': getCookieString(),
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 20000
    });

    const record = extractRealData(response.data, phoneWithZero);
    const hasData = record.Name !== 'N/A' || record.CNIC !== 'N/A' || record.Address !== 'N/A';

    return res.json({
      success: hasData,
      message: hasData ? '✅ Record found' : '❌ No data found',
      records: hasData ? [record] : [],
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
