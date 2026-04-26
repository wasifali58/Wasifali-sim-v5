const axios = require('axios');

const AJAX_URL = 'https://ownerdetail.datacorporation.com.pk/wp-admin/admin-ajax.php';
const NONCE = '0adca5e953';

// Possible actions
const POSSIBLE_ACTIONS = [
  'sim_info_fetch',
  'get_sim_data',
  'fetch_sim_owner',
  'cnic_data_fetch',
  'lookup_fetch',
  'sim_info_mobile'
];

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

  // Try each action
  for (const action of POSSIBLE_ACTIONS) {
    try {
      const formData = new URLSearchParams();
      formData.append('action', action);
      formData.append('nonce', NONCE);
      formData.append('mobile', phoneWithZero);
      formData.append('sim_info_mobile', phoneWithZero);
      formData.append('cnic', phoneWithZero);

      const response = await axios.post(AJAX_URL, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 8000
      });

      if (response.data && response.data.success && response.data.data) {
        const record = response.data.data;
        return res.send(JSON.stringify({
          success: true,
          message: '✅ Record found',
          records: [{
            Name: record.name || record.full_name || 'N/A',
            Mobile: phoneWithZero,
            CNIC: record.cnic || record.nic || 'N/A',
            Network: record.network || record.operator || 'N/A',
            Address: record.address || 'N/A'
          }],
          developer: 'WASIF ALI',
          telegram: '@FREEHACKS95'
        }, null, 2));
      }
    } catch (e) {
      // Continue to next action
    }
  }

  // No record found after all actions
  return res.send(JSON.stringify({
    success: false,
    message: '❌ No record found',
    records: [],
    developer: 'WASIF ALI',
    telegram: '@FREEHACKS95'
  }, null, 2));
};
