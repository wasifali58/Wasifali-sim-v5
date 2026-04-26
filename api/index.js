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

function extractFromJS(html) {
  // Search for JavaScript objects that might contain SIM data
  const patterns = [
    /var\s+simData\s*=\s*({[^;]+});/i,
    /let\s+ownerInfo\s*=\s*({[^;]+});/i,
    /const\s+result\s*=\s*({[^;]+});/i,
    /data:\s*({[^}]+})/i,
    /"name":"([^"]+)",\s*"cnic":"([^"]+)"/i,
    /"Name":"([^"]+)",\s*"CNIC":"([^"]+)"/i,
    /owner_name:\s*["']([^"']+)["']/i,
    /cnic_number:\s*["'](\d{13})["']/i
  ];
  
  let extracted = {};
  for (let pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      if (match[1] && (match[1].includes('{') || match[1].includes('"'))) {
        try {
          let jsonStr = match[1];
          // Try to fix unquoted keys
          jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
          const obj = JSON.parse(jsonStr);
          extracted = { ...extracted, ...obj };
        } catch(e) {}
      }
      if (match[1] && !match[1].includes('{')) {
        if (pattern.toString().includes('name')) extracted.Name = match[1];
        if (pattern.toString().includes('cnic')) extracted.CNIC = match[2];
      }
    }
  }
  
  // Also search for any 13-digit number as CNIC
  const cnicMatch = html.match(/\b\d{13}\b/);
  if (cnicMatch && !extracted.CNIC) extracted.CNIC = cnicMatch[0];
  
  return extracted;
}

function extractFromHTMLTables(html) {
  let record = {};
  // Remove script/style
  let cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  
  const rows = cleanHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
  if (rows) {
    for (let row of rows) {
      const th = row.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
      const td = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
      if (th && td) {
        let label = clean(th[1]).toLowerCase();
        let value = clean(td[1]);
        if (value && !value.includes('placeholder') && value.length < 200) {
          if (label.includes('name')) record.Name = value;
          else if (label.includes('cnic')) record.CNIC = value;
          else if (label.includes('address')) record.Address = value;
          else if (label.includes('province')) record.Province = value;
          else if (label.includes('city')) record.City = value;
          else if (label.includes('network') || label.includes('operator')) record.Network = value;
          else if (label.includes('status')) record.Status = value;
          else if (label.includes('gender')) record.Gender = value;
          else if (label.includes('union')) record.Union_Council = value;
        }
      }
    }
  }
  return record;
}

function extractFromDivs(html) {
  let record = {};
  const divs = html.match(/<div[^>]*class="[^"]*(?:sim|owner|detail|result)[^"]*"[^>]*>[\s\S]*?<\/div>/gi);
  if (divs) {
    for (let div of divs) {
      const pairs = div.match(/<span[^>]*class="[^"]*label[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<span[^>]*class="[^"]*value[^"]*"[^>]*>([\s\S]*?)<\/span>/gi);
      if (pairs) {
        for (let pair of pairs) {
          const labelMatch = pair.match(/<span[^>]*class="[^"]*label[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
          const valueMatch = pair.match(/<span[^>]*class="[^"]*value[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
          if (labelMatch && valueMatch) {
            let label = clean(labelMatch[1]).toLowerCase();
            let value = clean(valueMatch[1]);
            if (value && !value.includes('placeholder')) {
              if (label.includes('name')) record.Name = value;
              else if (label.includes('cnic')) record.CNIC = value;
              else if (label.includes('address')) record.Address = value;
              else if (label.includes('province')) record.Province = value;
              else if (label.includes('city')) record.City = value;
              else if (label.includes('network')) record.Network = value;
              else if (label.includes('status')) record.Status = value;
              else if (label.includes('gender')) record.Gender = value;
            }
          }
        }
      }
    }
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
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/146.0.0.0 Mobile Safari/537.36',
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
    
    // Try all extraction methods
    let record = {
      Name: 'N/A',
      Mobile: phoneWithZero,
      CNIC: 'N/A',
      Address: 'N/A',
      Province: 'N/A',
      City: 'N/A',
      Network: 'N/A',
      Status: 'N/A',
      Gender: 'N/A',
      Union_Council: 'N/A'
    };
    
    const jsData = extractFromJS(html);
    const tableData = extractFromHTMLTables(html);
    const divData = extractFromDivs(html);
    
    // Merge all extracted data (priority: div > table > js)
    const merged = { ...jsData, ...tableData, ...divData };
    for (let key in merged) {
      if (merged[key] && merged[key] !== 'N/A') {
        record[key] = clean(merged[key]);
      }
    }
    
    // If still no name, try to find any capitalized words that look like a name
    if (record.Name === 'N/A' || record.Name === 'Sim Owner Details') {
      const nameMatch = html.match(/([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
      if (nameMatch && nameMatch[0].length < 30 && !nameMatch[0].includes('Script')) {
        record.Name = nameMatch[0];
      }
    }
    
    const hasData = record.Name !== 'N/A' && record.Name !== 'Sim Owner Details' ||
                    record.CNIC !== 'N/A' ||
                    record.Address !== 'N/A';
    
    if (!hasData) {
      return res.json({
        success: false,
        message: '❌ No data found – site may have changed or number not found',
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
