const axios = require('axios');

const TARGET_URL = 'https://ownerdetail.datacorporation.com.pk/result-page/';
const REFERER = 'https://ownerdetail.datacorporation.com.pk/track-number/';

const COOKIES = {
  _ga: 'GA1.1.1455301204.1770130461',
  __gads: 'ID=d6cf01242b53db4b:T=1770130463:RT=1770130463:S=ALNI_MakDvPYZ9f0HxxsHhucgw_Dqo7ibQ',
  __gpi: 'UID=000012ee6279eedc:T=1770130463:RT=1770130463:S=ALNI_Mbs-ZC8aSGArLlht0Qy47hxzx3O3w',
  __eoi: 'ID=a0a706ab0de49769:T=1770130463:RT=1770130463:S=AA-AfjYNXg4xUss8WrHIHleiA7gd',
  _ga_HZX03VHGDT: 'GS2.1.s1770130460$o1$g1$t1770130544$j60$l0$h21430292',
  _ga_2BL9GP4ZMR: 'GS2.1.s1770130463$o1$g1$t1770130544$j60$l0$h0'
};

function getCookieString() {
  return Object.entries(COOKIES).map(([k, v]) => `${k}=${v}`).join('; ');
}

function cleanText(text) {
  if (!text) return 'N/A';
  return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { search } = req.method === 'GET' ? req.query : req.body;
  if (!search) {
    return res.send(JSON.stringify({
      success: false,
      message: '❌ Please provide a phone number',
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    }, null, 2));
  }

  const digits = search.replace(/\D/g, '');
  if (digits.length === 13) {
    return res.send(JSON.stringify({
      success: false,
      message: '❌ CNIC not allowed. Use mobile number.',
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    }, null, 2));
  }

  const phoneWithZero = digits.startsWith('0') ? digits : '0' + digits;

  try {
    const response = await axios.get(TARGET_URL, {
      params: { sim_info_mobile: phoneWithZero },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': REFERER,
        'Cookie': getCookieString(),
        'DNT': '1'
      },
      timeout: 20000
    });

    const html = response.data;
    const record = extractSimpleData(html, phoneWithZero);

    if (record.Name !== 'N/A' || record.CNIC !== 'N/A') {
      return res.send(JSON.stringify({
        success: true,
        message: '✅ Record found',
        records: [record],
        developer: 'WASIF ALI',
        telegram: '@FREEHACKS95'
      }, null, 2));
    } else {
      return res.send(JSON.stringify({
        success: false,
        message: '❌ No record found',
        records: [],
        developer: 'WASIF ALI',
        telegram: '@FREEHACKS95'
      }, null, 2));
    }
  } catch (error) {
    return res.send(JSON.stringify({
      success: false,
      message: '⚠️ Error: ' + error.message,
      records: [],
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    }, null, 2));
  }
};

function extractSimpleData(html, phone) {
  // Clean HTML
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  clean = clean.replace(/<meta[^>]*>/gi, ' ');
  clean = clean.replace(/<link[^>]*>/gi, ' ');
  clean = clean.replace(/\n|\r/g, ' ').replace(/&nbsp;/g, ' ');

  function extract(keyword) {
    // Table pattern
    let regex = new RegExp(`<th[^>]*>\\s*${keyword}\\s*<\\/th>\\s*<td[^>]*>\\s*([\\s\\S]*?)\\s*<\\/td>`, 'i');
    let match = clean.match(regex);
    if (match && match[1]) {
      let val = match[1].replace(/<[^>]*>/g, '').trim();
      if (val && val.length < 200 && !/viewport|transform/i.test(val)) return val;
    }
    // Label: Value pattern
    regex = new RegExp(`${keyword}\\s*[:=-]\\s*([^<\\n]{1,150})`, 'i');
    match = clean.match(regex);
    if (match && match[1]) return match[1].trim();
    return 'N/A';
  }

  let name = extract('Name');
  if (name === 'N/A') name = extract('Owner');
  
  let cnic = extract('CNIC');
  if (cnic === 'N/A') cnic = extract('ID');
  cnic = cnic.replace(/\D/g, '');
  if (cnic.length !== 13) cnic = 'N/A';
  
  let network = extract('Network');
  if (network === 'N/A') network = extract('Operator');
  
  let address = extract('Address');
  
  // Final check – if nothing found, return defaults
  return {
    Name: name,
    Mobile: phone,
    CNIC: cnic,
    Network: network,
    Address: address
  };
}
