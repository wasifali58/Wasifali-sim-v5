// api/index.js (debug)
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
  return Object.entries(COOKIES)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { search } = req.method === 'GET' ? req.query : req.body;
  if (!search) {
    return res.json({ success: false, message: 'Phone number required' });
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
        'DNT': '1'
      },
      timeout: 20000
    });

    const html = response.data;

    // Return debug info
    return res.json({
      debug: true,
      url: TARGET_URL + '?sim_info_mobile=' + phoneWithZero,
      status: response.status,
      html_length: html.length,
      html_preview: html.substring(0, 1500),   // first 1500 chars
      contains_table: html.includes('<table') ? 'yes' : 'no',
      contains_cnic: /\d{13}/.test(html) ? 'yes' : 'no',
      phone_sent: phoneWithZero
    });

  } catch (error) {
    return res.json({
      debug: true,
      error: error.message,
      response_status: error.response?.status,
      response_data: error.response?.data?.substring?.(0, 500)
    });
  }
};
