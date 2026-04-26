const axios = require('axios');

const AJAX_URL = 'https://ownerdetail.datacorporation.com.pk/wp-admin/admin-ajax.php';
const NONCE = 'e33826f1b7';

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
    const formData = new URLSearchParams();
    formData.append('action', 'sim_info_fetch');
    formData.append('nonce', NONCE);
    formData.append('sim_info_mobile', phoneWithZero);

    const response = await axios.post(AJAX_URL, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://ownerdetail.datacorporation.com.pk/track-number/',
        'Origin': 'https://ownerdetail.datacorporation.com.pk'
      },
      timeout: 15000
    });

    // Debug: Poora response dikhao
    return res.json({
      debug: true,
      status: response.status,
      data_received: response.data,
      message: 'Raw response from their API'
    });

  } catch (error) {
    // Debug: Error details dikhao
    return res.json({
      success: false,
      debug: true,
      error_message: error.message,
      status_code: error.response?.status,
      status_text: error.response?.statusText,
      response_data: error.response?.data,
      config_headers: error.config?.headers,
      developer: 'WASIF ALI',
      telegram: '@FREEHACKS95'
    });
  }
};
