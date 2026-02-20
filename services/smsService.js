let atSdkPromise = null;

function normalizeKenyanNumber(phone) {
  const p = String(phone).trim();
  if (p.startsWith('+')) return p;
  if (p.startsWith('0')) return `+254${p.slice(1)}`;
  if (p.startsWith('254')) return `+${p}`;
  if (p.startsWith('7')) return `+254${p}`;
  return p;
}

async function getSmsClient() {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;

  if (!username || !apiKey) {
    throw new Error("Missing AT_USERNAME or AT_API_KEY in .env");
  }

  // Dynamically import ESM module from CommonJS
  if (!atSdkPromise) {
    atSdkPromise = import('africastalking');
  }

  const mod = await atSdkPromise;
  const AfricasTalking = mod.default || mod;

  const at = AfricasTalking({ username, apiKey });
  return at.SMS;
}

async function sendSms(to, message) {
  const sms = await getSmsClient();

  const options = {
    to: normalizeKenyanNumber(to),
    message,
  };

  if (process.env.AT_SENDER_ID) {
    options.senderId = process.env.AT_SENDER_ID;
  }

  return sms.send(options);
}

module.exports = { sendSms };