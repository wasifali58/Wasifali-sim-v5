// api/index.js
const axios = require('axios');

const TARGET_URL = 'https://ownerdetail.datacorporation.com.pk/result-page/';
const REFERER = 'https://ownerdetail.datacorporation.com.pk/track-number/';

// Complete cookies – including FCCDCF, FCNEC (jo pehle missing the)
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

// Advanced HTML parser – supports tables, divs, JSON, meta, etc.
function advancedParseHTML(html, phone) {
  const records = [];
  
  // Helper to clean text
  const clean = (text) => {
    if (!text) return 'N/A';
    return String(text)
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  // 1) Try to find JSON-LD or inline JSON
  const jsonMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonMatch) {
    try {
      const json = JSON.parse(jsonMatch[1]);
      if (json.name || json.description) {
        const record = {
          Name: clean(json.name || json.title || 'N/A'),
          Mobile: phone,
          CNIC: json.cnic || json.identifier || 'N/A',
          Address: clean(json.address || json.location || 'N/A'),
          Province: clean(json.province || json.area?.province || 'N/A'),
          City: clean(json.city || json.addressLocality || 'N/A'),
          Network: clean(json.network || json.operator || 'N/A'),
          Status: clean(json.status || 'Active'),
          Gender: clean(json.gender || 'N/A'),
          Union_Council: clean(json.unionCouncil || json.uc || 'N/A')
        };
        if (record.Name !== 'N/A') records.push(record);
      }
    } catch(e) {}
  }
  
  // 2) Table parsing (most common)
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const table = tableMatch[0];
    const rows = table.match(/<tr[\s\S]*?<\/tr>/gi);
    if (rows) {
      let record = { Mobile: phone };
      for (const row of rows) {
        const th = row.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
        const td = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
        if (th && td) {
          const label = clean(th[1]).toLowerCase();
          const value = clean(td[1]);
          if (label.includes('name')) record.Name = value;
          else if (label.includes('cnic')) record.CNIC = value;
          else if (label.includes('address')) record.Address = value;
          else if (label.includes('province')) record.Province = value;
          else if (label.includes('city')) record.City = value;
          else if (label.includes('network') || label.includes('operator')) record.Network = value;
          else if (label.includes('status')) record.Status = value;
          else if (label.includes('gender')) record.Gender = value;
          else if (label.includes('union') || label.includes('uc')) record.Union_Council = value;
        }
      }
      if (record.Name && record.Name !== 'N/A') records.push(record);
    }
  }
  
  // 3) Div with class="sim-details", "owner-info", etc.
  const divRegex = /<div[^>]*class="[^"]*(?:sim|owner|detail|info)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let divMatch;
  while ((divMatch = divRegex.exec(html)) !== null) {
    const div = divMatch[0];
    let record = { Mobile: phone };
    // Find label-value pairs inside div
    const pairs = div.match(/<span[^>]*class="[^"]*label[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<span[^>]*class="[^"]*value[^"]*"[^>]*>([\s\S]*?)<\/span>/gi);
    if (pairs) {
      for (const pair of pairs) {
        const labelMatch = pair.match(/<span[^>]*class="[^"]*label[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
        const valueMatch = pair.match(/<span[^>]*class="[^"]*value[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
        if (labelMatch && valueMatch) {
          const label = clean(labelMatch[1]).toLowerCase();
          const value = clean(valueMatch[1]);
          if (label.includes('name')) record.Name = value;
          else if (label.includes('cnic')) record.CNIC = value;
          else if (label.includes('address')) record.Address = value;
          else if (label.includes('province')) record.Province = value;
          else if (label.includes('city')) record.City = value;
          else if (label.includes('network')) record.Network = value;
          else if (label.includes('status')) record.Status = value;
          else if (label.includes('gender')) record.Gender = value;
          else if (label.includes('union')) record.Union_Council = value;
        }
      }
      if (record.Name && record.Name !== 'N/A') records.push(record);
    }
  }
  
  // 4) Generic key-value patterns (fallback)
  const patterns = [
    { name: 'Name', regex: /Name[:\s]*([^<\n]+)/i },
    { name: 'CNIC', regex: /\b(\d{13})\b/ },
    { name: 'Address', regex: /Address[:\s]*([^<\n]+)/i },
    { name: 'Province', regex: /Province[:\s]*([^<\n]+)/i },
    { name: 'City', regex: /City[:\s]*([^<\n]+)/i },
    { name: 'Network', regex: /Network[:\s]*([^<\n]+)/i },
    { name: 'Status', regex: /Status[:\s]*([^<\n]+)/i },
    { name: 'Gender', regex: /Gender[:\s]*([^<\n]+)/i },
    { name: 'Union_Council', regex: /Union\s*Council[:\s]*([^<\n]+)/i }
  ];
  
  let record = { Mobile: phone };
  for (const p of patterns) {
    const match = html.match(p.regex);
    if (match) {
      let val = clean(match[1] || match[0]);
      if (p.name === 'CNIC') val = val.replace(/\D/g, '');
      if (val !== 'N/A') record[p.name] = val;
    }
  }
  if (record.Name && record.Name !== 'N/A') records.push(record);
  
  // 5) Remove duplicates based on Name+CNIC
  const unique = new Map();
  for (const rec of records) {
    const key = `${rec.Name}_${rec.CNIC}`;
    if (!unique.has(key)) {
      // Fill missing fields with defaults
      unique.set(key, {
        Name: rec.Name || 'N/A',
        Mobile: phone,
        CNIC: rec.CNIC || 'N/A',
        Address: rec.Address || 'N/A',
        Province: rec.Province || 'N/A',
        City: rec.City || 'N/A',
        Network: rec.Network || 'N/A',
        Status: rec.Status || 'N/A',
        Gender: rec.Gender || 'N/A',
        Union_Council: rec.Union_Council || 'N/A'
      });
    }
  }
  
  return Array.from(unique.values());
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { search } = req.method === 'GET' ? req.query : req.body;

  if (!search) {
    return res.json({
      success: false,
      message: '❌ Please provide a phone number (e.g., 03001234567)',
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
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1'
      },
      timeout: 25000
    });

    const html = response.data;
    const records = advancedParseHTML(html, phoneWithZero);

    if (!records || records.length === 0) {
      return res.json({
        success: false,
        message: '❌ No record found for this number',
        records: [],
        developer: 'WASIF ALI',
        telegram: '@FREEHACKS95'
      });
    }

    return res.json({
      success: true,
      message: `✅ Record found - ${records.length} record(s)`,
      records: records,
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });

  } catch (error) {
    console.error('API Error:', error.message);
    return res.json({
      success: false,
      message: '⚠️ Error: ' + error.message,
      records: [],
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });
  }
};
